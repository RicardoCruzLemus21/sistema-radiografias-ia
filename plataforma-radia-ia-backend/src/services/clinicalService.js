const pool = require('../config/database');
const dict = require('../config/dbDictionary');
const { DISTRACTORES, ORDEN_NIVELES } = require('../config/distractoresConfig');

const MAX_CASOS_EJERCICIO = 50;

// Error causado por datos del usuario (no por un fallo del servidor): el controlador responde 400
class ErrorNegocio extends Error {}

const nivelesHasta = (nivel) => {
    const indice = ORDEN_NIVELES.indexOf(nivel);
    return indice >= 0 ? ORDEN_NIVELES.slice(0, indice + 1) : ORDEN_NIVELES;
};

const normalizarIdCurso = (id) => {
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
};

// Un docente solo puede componer/asignar ejercicios en sus propios cursos
const verificarCursoDelDocente = async (id_docente, id_curso) => {
    const idCurso = normalizarIdCurso(id_curso);
    if (!idCurso) return false;
    const [res] = await pool.query('CALL sp_obtener_cursos_catedratico(?)', [id_docente]);
    return res[0].some(c => c.id_curso === idCurso);
};

// 1. Crear el paciente simulado
const crearPaciente = async (datosPaciente) => {
    const { codigo_paciente, edad, genero, antecedentes_medicos } = datosPaciente;
    const [resultado] = await pool.query('CALL sp_crear_paciente_simulado(?, ?, ?, ?)', [codigo_paciente, edad, genero, antecedentes_medicos]);
    return { id_paciente: resultado[0][0].id_paciente, codigo_paciente };
};

// 2. Crear el caso clínico asociándolo al curso y al paciente
const crearCaso = async (datosCaso) => {
    const { id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad } = datosCaso;
    const [resultado] = await pool.query('CALL sp_crear_caso_clinico(?, ?, ?, ?, ?)', [id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad]);
    return { id_caso: resultado[0][0].id_caso, titulo_caso };
};

// 3. Guardar el registro de la radiografía en la BD
const guardarRadiografia = async (id_caso, tipo_proyeccion, ruta_imagen) => {
    const [resultado] = await pool.query('CALL sp_guardar_radiografia(?, ?, ?)', [id_caso, tipo_proyeccion, ruta_imagen]);
    return { id_radiografia: resultado[0][0].id_radiografia, id_caso, tipo_proyeccion, ruta_imagen };
};

// 4. Crear Caso Completo (Paciente + Caso + Radiografía) en una sola transacción
const crearCasoCompleto = async (datos) => {
    const {
        codigo_paciente,
        edad,
        genero,
        antecedentes_medicos,
        id_curso,
        id_catedratico,
        titulo_caso,
        motivo_consulta,
        nivel_dificultad,
        tipo_proyeccion,
        ruta_imagen,
        hallazgos_docente // Array de patologías enviadas por el docente
    } = datos;

    try {
        const [resultado] = await pool.query('CALL sp_crear_caso_completo(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            codigo_paciente, edad, genero, antecedentes_medicos,
            id_curso, id_catedratico, titulo_caso, motivo_consulta, nivel_dificultad,
            tipo_proyeccion, ruta_imagen
        ]);

        const ids = resultado[0][0];

        // Modificación RADIA-EDU: Actualizar el caso para que sea 'pendiente' y origen 'docente'
        let hallazgosJSON = null;
        if (hallazgos_docente) {
            try {
                // Puede venir como array o como string JSON desde FormData
                const arr = typeof hallazgos_docente === 'string' ? JSON.parse(hallazgos_docente) : hallazgos_docente;
                if (Array.isArray(arr)) hallazgosJSON = JSON.stringify(arr);
            } catch(e) {
                console.error("Error parseando hallazgos_docente:", e);
            }
        }

        await pool.query(
            "UPDATE Casos_Clinicos SET origen = 'docente', estado = 'pendiente', hallazgos_docente = ? WHERE id_caso = ?",
            [hallazgosJSON, ids.id_caso]
        );

        return {
            id_caso: ids.id_caso,
            id_paciente: ids.id_paciente,
            id_curso: ids.id_curso,
            id_radiografia: ids.id_radiografia,
            codigo_paciente,
            titulo_caso,
            tipo_proyeccion,
            ruta_imagen,
            mensaje: "El caso ha sido propuesto y añadido a la Cola de Procesamiento IA."
        };
    } catch (error) {
        throw error;
    }
};

// 5. Obtener todos los casos con información completa para gestión del catedrático
const obtenerCasosDetallados = async (id_catedratico) => {
    const [casos] = await pool.query('CALL sp_obtener_casos_detallados(?)', [id_catedratico]);
    return casos[0];
};

// 6. Obtener caso por ID
const obtenerDetalleCaso = async (id_caso) => {
    const [casos] = await pool.query('CALL sp_obtener_detalle_caso(?)', [id_caso]);
    if (casos[0].length === 0) throw new Error('Caso clínico no encontrado');
    return casos[0][0];
};

// 7. Obtener el siguiente código secuencial para Paciente
const obtenerSiguienteCodigoPaciente = async () => {
    const [rowsArray] = await pool.query('CALL sp_obtener_codigos_pacientes()');
    const rows = rowsArray[0];

    let maxNum = 0;
    for (const row of rows) {
        const numPart = row.codigo_paciente.replace('PAC-', '');
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    }

    const nextNum = maxNum + 1;
    return 'PAC-' + nextNum.toString().padStart(3, '0');
};


// 8. Editar Caso y Paciente
const editarCaso = async (id_caso, datos) => {
    try {
        const { titulo_caso, motivo_consulta, nivel_dificultad, id_paciente, edad, genero, antecedentes_medicos } = datos;
        await pool.query('CALL sp_editar_caso_paciente(?, ?, ?, ?, ?, ?, ?, ?)', [
            id_caso, titulo_caso, motivo_consulta, nivel_dificultad,
            id_paciente, edad, genero, antecedentes_medicos
        ]);
        return true;
    } catch (error) {
        throw error;
    }
};

// 9. Eliminar Caso (con borrado en cascada de hijos, vía sp_eliminar_caso)
const eliminarCaso = async (id_caso) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('CALL sp_eliminar_caso(?)', [id_caso]);
        await conn.commit();
        return true;
    } catch (error) {
        await conn.rollback();
        throw new Error(`Error al eliminar el caso: ${error.message}`);
    } finally {
        conn.release();
    }
};

// 10. Obtener Info de Patología: elige al azar una de las variantes pre-generadas por IA.
// La generación con Gemini se hace de forma independiente (scripts_temporales/generar_variantes_patologias.js),
// nunca en esta ruta, para que el estudiante nunca dependa de la disponibilidad ni la cuota de la IA.
const generarInfoPatologia = async (patologia) => {
    const [catalogoRows] = await pool.query(
        `SELECT ficha_ia_json FROM ${dict.TABLAS.CATALOGO_PATOLOGIAS} WHERE ${dict.COLUMNAS.NOMBRE_PATOLOGIA} = ?`,
        [patologia]
    );

    if (catalogoRows.length === 0) {
        throw new Error('Patología no encontrada en el catálogo.');
    }

    let variantes = [];
    if (catalogoRows[0].ficha_ia_json) {
        try {
            const parseado = JSON.parse(catalogoRows[0].ficha_ia_json);
            variantes = Array.isArray(parseado) ? parseado : [parseado];
        } catch (e) {
            variantes = [];
        }
    }

    if (variantes.length === 0) {
        throw new Error('El contenido educativo de esta patología todavía no ha sido generado. Intenta más tarde.');
    }

    const indiceAleatorio = Math.floor(Math.random() * variantes.length);
    return variantes[indiceAleatorio];
};

// Elimina un ejercicio completo con sus casos (solo si es de un curso del docente)
const eliminarEjercicio = async (id_ejercicio, id_docente) => {
    const id = normalizarIdCurso(id_ejercicio);
    if (!id) throw new ErrorNegocio('Ejercicio no válido.');
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [res] = await conn.query('CALL sp_eliminar_ejercicio(?, ?)', [id, id_docente]);
        await conn.commit();
        const eliminados = res[0][0].casos_eliminados;
        if (!eliminados) throw new ErrorNegocio('Ese ejercicio no existe o no te pertenece.');
        return eliminados;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const asignarCasosBanco = async (id_curso, ids_casos) => {
    // Cada id debe ser un caso del banco global con imagen, y su radiografía no debe estar ya en el curso.
    // Si alguno no cumple se cancela TODO el lote (transacción): no queremos ejercicios a medias.
    if (!Array.isArray(ids_casos) || ids_casos.length === 0 || ids_casos.length > MAX_CASOS_EJERCICIO) {
        throw new ErrorNegocio(`Debes elegir entre 1 y ${MAX_CASOS_EJERCICIO} casos para publicar.`);
    }
    const ids = ids_casos.map(Number);
    if (ids.some(id => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
        throw new ErrorNegocio('La lista de casos no es válida (ids repetidos o incorrectos).');
    }

    const conn = await pool.getConnection();
    const idsInsertados = [];
    try {
        await conn.beginTransaction();

        // Cada publicación es un ejercicio nuevo del curso (Ejercicio 1, 2, ...)
        const [ejercicio] = await conn.query('CALL sp_crear_ejercicio(?)', [id_curso]);
        const { id_ejercicio, nombre } = ejercicio[0][0];

        for (const id of ids) {
            const [result] = await conn.query('CALL sp_clonar_caso_a_curso(?, ?, ?)', [id_curso, id, id_ejercicio]);
            const nuevoIdCaso = result[0][0]?.nuevo_id_caso;
            if (!nuevoIdCaso) {
                throw new ErrorNegocio(`El caso ${id} ya no está disponible en el banco o el curso ya tiene esa radiografía. Vuelve a componer el ejercicio.`);
            }
            idsInsertados.push(nuevoIdCaso);
        }

        await conn.commit();
        return { id_ejercicio, nombre, ids_casos: idsInsertados };
    } catch (error) {
        await conn.rollback();
        if (error instanceof ErrorNegocio) throw error;
        throw new Error(`Error al asignar casos del banco: ${error.message}`);
    } finally {
        conn.release();
    }
};

// NUEVA FUNCIÓN: Componer un ejercicio automáticamente por criterios (diana + normales + distractores).
// El docente sigue pudiendo ajustar el resultado a mano en el carrito (agregar/quitar), esto solo
// rellena la selección inicial para no obligarlo a buscar caso por caso.
const componerEjercicio = async (criterios) => {
    const {
        patologias_objetivo = [],
        nivel_dificultad = 'Avanzado',
        total_casos = 10,
        porcentaje_normales = 0.3,
        id_curso = null
    } = criterios;

    if (!Array.isArray(patologias_objetivo) || patologias_objetivo.length === 0 || patologias_objetivo.some(p => typeof p !== 'string')) {
        throw new ErrorNegocio('Debes seleccionar al menos una patología objetivo.');
    }

    const idCurso = normalizarIdCurso(id_curso); // con curso, se excluyen las radiografías que ya tiene
    const total = Math.min(Math.max(parseInt(total_casos, 10) || 10, 1), MAX_CASOS_EJERCICIO);
    const pn = parseFloat(porcentaje_normales); // ojo: 0 % es válido, no debe caer al valor por defecto
    const propNormales = Math.min(Math.max(Number.isFinite(pn) ? pn : 0.3, 0), 1);

    // Fórmula de mezcla (ver documento de diseño): diana + normales + el resto como distractores
    const casosNormales = Math.round(total * propNormales);
    const casosDiana = Math.round(total * (1 - propNormales) * 0.7);
    const casosDistractores = Math.max(0, total - casosNormales - casosDiana);

    const patologiasDistractor = [...new Set(
        patologias_objetivo.flatMap(p => DISTRACTORES[p] || [])
    )].filter(p => !patologias_objetivo.includes(p) && p !== 'Normal');

    const nivelesIncluidos = nivelesHasta(nivel_dificultad);

    // El universo de patologías es una constante fija de producto (8, ver Catalogo_Patologias),
    // así que en vez de armar SQL dinámico dentro del SP, se pasan hasta 8 slots nullable.
    const patSlots = (patologiasSet) => {
        const slots = patologiasSet.slice(0, 8);
        while (slots.length < 8) slots.push(null);
        return slots;
    };

    const seleccionarCasos = async (patologiasSet, cantidad, excluirIds) => {
        if (cantidad <= 0 || patologiasSet.length === 0) return [];

        const nivelesCsv = nivelesIncluidos.join(',');
        const excluirCsv = excluirIds.join(',');

        const [countResult] = await pool.query(
            'CALL sp_contar_casos_banco_nih(?,?,?,?,?,?,?,?,?,?,?)',
            [...patSlots(patologiasSet), nivelesCsv, excluirCsv, idCurso]
        );
        const totalDisponibles = countResult[0][0]?.total || 0;
        if (totalDisponibles === 0) return [];

        const tomar = Math.min(cantidad, totalDisponibles);
        const maxOffset = Math.max(0, totalDisponibles - tomar);
        const randomOffset = Math.floor(Math.random() * (maxOffset + 1));

        const [dataResult] = await pool.query(
            'CALL sp_listar_casos_banco_nih(?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [...patSlots(patologiasSet), nivelesCsv, excluirCsv, idCurso, tomar, randomOffset]
        );
        return dataResult[0];
    };

    const seededRandomAge = (id) => Math.floor(Math.abs(Math.sin(id) * 60)) + 20;
    const seededRandomGender = (id) => (id % 2 === 0) ? 'M' : 'F';

    const formatear = (rows, tipo) => rows.map(r => {
        const docInfo = typeof r.hallazgos_docente === 'string' ? JSON.parse(r.hallazgos_docente) : r.hallazgos_docente;
        return {
            id_caso: r.id_caso,
            titulo_caso: r.titulo_caso,
            nivel_dificultad: r.nivel_dificultad,
            edad: r.edad || seededRandomAge(r.id_caso),
            genero: r.genero || seededRandomGender(r.id_caso),
            ruta_imagen: r.ruta_imagen,
            hallazgos_docente: docInfo?.etiquetas_reales || [],
            tipo_composicion: tipo
        };
    });

    const filasDiana = await seleccionarCasos(patologias_objetivo, casosDiana, []);
    const idsUsados = filasDiana.map(r => r.id_caso);

    const filasNormales = await seleccionarCasos(['Normal'], casosNormales, idsUsados);
    idsUsados.push(...filasNormales.map(r => r.id_caso));

    const filasDistractor = patologiasDistractor.length > 0
        ? await seleccionarCasos(patologiasDistractor, casosDistractores, idsUsados)
        : [];

    const resultado = [
        ...formatear(filasDiana, 'diana'),
        ...formatear(filasNormales, 'normal'),
        ...formatear(filasDistractor, 'distractor')
    ];

    // Barajar para que no aparezcan agrupados por tipo en la grilla
    for (let i = resultado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
    }

    return {
        casos: resultado,
        resumen: {
            solicitados: total,
            obtenidos: resultado.length,
            diana: filasDiana.length,
            normales: filasNormales.length,
            distractores: filasDistractor.length
        }
    };
};

// Cuántos casos utilizables tiene el banco por patología para un nivel máximo (y, si se indica el
// curso, sin contar las radiografías que ese curso ya tiene). Permite avisar en el modal antes de
// componer: p. ej. en "Básico" solo existen casos normales, y Atelectasia solo tiene casos avanzados.
const obtenerDisponibilidadBanco = async ({ nivel_dificultad = 'Avanzado', id_curso = null } = {}) => {
    const niveles = nivelesHasta(nivel_dificultad).join(',');
    const idCurso = normalizarIdCurso(id_curso);
    const disponibilidad = [];
    for (const patologia of Object.keys(DISTRACTORES)) {
        const [res] = await pool.query(
            'CALL sp_contar_casos_banco_nih(?,?,?,?,?,?,?,?,?,?,?)',
            [patologia, null, null, null, null, null, null, null, niveles, '', idCurso]
        );
        disponibilidad.push({ patologia, total: res[0][0]?.total || 0 });
    }
    return disponibilidad;
};

// NUEVA FUNCIÓN: Métricas reales del modelo por patología (Metricas_Modelo_Patologia).
// Alimenta la Fase 3 del visor del estudiante para dar contexto real a la opinión
// del modelo ("acierta ~X% de las veces que señala esto") en vez de un texto fijo.
const obtenerMetricasModelo = async () => {
    const [rows] = await pool.query('CALL sp_obtener_metricas_modelo()');
    return rows[0];
};

// NUEVA FUNCIÓN: Estadísticas reales del estudiante para su dashboard
// (reemplaza los valores hardcodeados casosResueltos/precisionPromedio del frontend).
const obtenerEstadisticasEstudiante = async (id_estudiante) => {
    const [resultado] = await pool.query('CALL sp_obtener_resumen_estudiante_edu(?)', [id_estudiante]);
    const [resumen, porDificultad] = resultado; // el SP devuelve 2 result sets

    return {
        casos_resueltos: Number(resumen[0]?.casos_resueltos) || 0,
        precision_promedio: Number(resumen[0]?.precision_promedio) || 0,
        desglose_por_dificultad: porDificultad
    };
};

// NUEVA FUNCIÓN: Obtener Caso Seguro para Estudiante (Oculta Fase 2 y 3)
const obtenerCasoEstudianteSeguro = async (id_caso) => {
    const [resultado] = await pool.query('CALL sp_obtener_caso_estudiante_raw(?)', [id_caso]);
    const casos = resultado[0];

    if (casos.length === 0) throw new Error('Caso clínico no encontrado');

    const caso = casos[0];
    const docInfo = typeof caso.hallazgos_docente === 'string' ? JSON.parse(caso.hallazgos_docente) : caso.hallazgos_docente || {};

    // Seguridad Crítica: whitelist explícito de lo que SÍ puede viajar en Fase 1.
    // A diferencia de un blacklist, un campo nuevo que se agregue a hallazgos_docente
    // (p.ej. una futura salida del modelo) queda oculto por defecto hasta que se
    // añada aquí a propósito, en vez de filtrarse antes de tiempo al estudiante.
    const CAMPOS_SEGUROS_FASE1 = ['origen_metadata', 'nota_docente'];
    const metadataSegura = {};
    CAMPOS_SEGUROS_FASE1.forEach(campo => {
        if (docInfo[campo] !== undefined) metadataSegura[campo] = docInfo[campo];
    });

    return {
        id_caso: caso.id_caso,
        titulo_caso: `Caso #${caso.id_caso}`, // el título real puede revelar el diagnóstico
        motivo_consulta: caso.motivo_consulta,
        nivel_dificultad: caso.nivel_dificultad,
        ruta_imagen: caso.ruta_imagen,
        metadata_segura: metadataSegura
    };
};

// NUEVA FUNCIÓN: Guardar Respuesta Estudiante y Retornar Verdad
const guardarRespuestaEstudiante = async (payload) => {
    const { id_estudiante, id_caso, tiempo_analisis_segundos, justificacion_clinica, nivel_confianza, marcador_estudiante, patologias } = payload;

    // Un caso se responde una sola vez: repetirlo duplicaría el resultado y alteraría el promedio del estudiante
    const [existe] = await pool.query('CALL sp_existe_evaluacion_estudiante(?, ?)', [id_estudiante, id_caso]);
    if (existe[0][0].total > 0) {
        throw new ErrorNegocio('Ya respondiste este caso. Puedes ver tu retroalimentación desde la worklist.');
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Guardar la evaluación base
        const markerStr = marcador_estudiante ? JSON.stringify(marcador_estudiante) : null;

        const [resEval] = await conn.query(
            'CALL sp_crear_evaluacion_estudiante_edu(?, ?, ?, ?, ?, ?)',
            [id_caso, id_estudiante, tiempo_analisis_segundos, justificacion_clinica, nivel_confianza, markerStr]
        );
        const idEvaluacion = resEval[0][0].id_evaluacion;

        // 2. Guardar las patologías seleccionadas
        if (patologias && patologias.length > 0) {
            for (const id_patologia of patologias) {
                await conn.query('CALL sp_crear_detalle_hallazgo(?, ?)', [idEvaluacion, id_patologia]);
            }
        }

        await conn.commit();

        // 3. Obtener la Verdad de Referencia completa para retornar al cliente y calcular puntajes
        const [verdadResult] = await pool.query('CALL sp_obtener_verdad_caso(?)', [id_caso]);
        const casos = verdadResult[0];
        let docInfo = {};
        if (casos.length > 0) {
            docInfo = typeof casos[0].hallazgos_docente === 'string' ? JSON.parse(casos[0].hallazgos_docente) : casos[0].hallazgos_docente;
        }

        // === CÁLCULO DE PUNTUACIÓN DE 3 EJES ===
        const etiquetasReales = docInfo.etiquetas_reales || [];
        
        // Eje 1: Diagnóstico (Intersección sobre Unión)
        const normalizeStr = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const realesNombres = etiquetasReales.map(n => normalizeStr(n));
        
        const [catalogoResult] = await pool.query('CALL sp_obtener_catalogo_patologias()');
        const patRows = catalogoResult[0];
        const mapPatologias = {};
        patRows.forEach(r => { mapPatologias[r.id_patologia] = r.nombre_patologia; });
        
        const elegidasNombres = (patologias || []).map(id => normalizeStr(mapPatologias[id] || ''));
        
        let correctas = 0;
        elegidasNombres.forEach(n => { if (realesNombres.includes(n)) correctas++; });
        const totalUnicas = new Set([...elegidasNombres, ...realesNombres]).size;
        let eje1 = totalUnicas === 0 ? 100 : Math.round((correctas / totalUnicas) * 100);

        // Eje 2: Localización (IoU Bounding Box)
        let eje2 = null;
        // bbox real: lista de {patologia, x, y, ancho, alto} en proporciones (0-1) de la imagen.
        // Estudiante: {x, y, w, h} también en proporciones. Se toma el mejor solapamiento con cualquiera de los recuadros.
        const cajasReales = Array.isArray(docInfo.bbox) ? docInfo.bbox.filter(b => b && Number.isFinite(b.x) && Number.isFinite(b.ancho)) : [];
        if (docInfo.tiene_bbox && cajasReales.length > 0 && marcador_estudiante) {
            const e = marcador_estudiante;
            let mejorIou = 0;
            for (const r of cajasReales) {
                const iw = Math.min(r.x + r.ancho, e.x + e.w) - Math.max(r.x, e.x);
                const ih = Math.min(r.y + r.alto, e.y + e.h) - Math.max(r.y, e.y);
                if (iw > 0 && ih > 0) {
                    const interArea = iw * ih;
                    const iou = interArea / (r.ancho * r.alto + e.w * e.h - interArea);
                    if (iou > mejorIou) mejorIou = iou;
                }
            }
            eje2 = Math.round(mejorIou * 100);
        }

        // Eje 3: Calibración
        let eje3 = 100 - Math.abs(nivel_confianza - eje1);

        // Guardar calificaciones en la BD
        await conn.query('CALL sp_actualizar_puntajes_evaluacion(?, ?, ?, ?)', [idEvaluacion, eje1, eje2, eje3]);

        // Retornar solo lo estrictamente necesario para las Fases 2, 3 y 4
        return {
            id_evaluacion: idEvaluacion,
            etiquetas_nih: docInfo.etiquetas_reales || [],
            bbox: docInfo.tiene_bbox && Array.isArray(docInfo.bbox) && docInfo.bbox.length > 0 ? docInfo.bbox : null,
            opinion_modelo: docInfo.opinion_modelo || [],
            modelo_se_abstiene: docInfo.modelo_se_abstiene || false,
            gradcam: docInfo.gradcam || {},
            puntajes: {
                diagnostico: eje1,
                localizacion: eje2,
                calibracion: eje3
            }
        };

    } catch (error) {
        await conn.rollback();
        throw new Error(`Error al guardar evaluación: ${error.message}`);
    } finally {
        conn.release();
    }
};

// Retroalimentación completa de un caso YA respondido por el estudiante (su respuesta + la verdad + IA + Grad-CAM).
// Devuelve null si todavía no lo respondió: así no se puede consultar la verdad de un caso pendiente.
const obtenerRetroalimentacionEstudiante = async (id_estudiante, id_caso) => {
    const [res] = await pool.query('CALL sp_obtener_retroalimentacion_estudiante(?, ?)', [id_estudiante, id_caso]);
    const ev = res[0][0];
    if (!ev) return null;

    const docInfo = typeof ev.hallazgos_docente === 'string' ? JSON.parse(ev.hallazgos_docente) : (ev.hallazgos_docente || {});
    let marcador = ev.marcador_estudiante;
    if (typeof marcador === 'string') { try { marcador = JSON.parse(marcador); } catch (e) { marcador = null; } }
    const num = (v) => (v === null || v === undefined ? null : Number(v));

    return {
        id_evaluacion: ev.id_evaluacion,
        id_caso: Number(id_caso),
        ruta_imagen: ev.ruta_imagen,
        fecha_evaluacion: ev.fecha_evaluacion,
        // Lo que respondió el estudiante
        patologias_marcadas: res[1].map(p => ({ id: p.id_patologia, nombre: p.nombre_patologia })),
        marcador_estudiante: marcador || null,
        justificacion_clinica: ev.justificacion_clinica || '',
        nivel_confianza: num(ev.nivel_confianza),
        tiempo_analisis_segundos: num(ev.tiempo_analisis_segundos),
        // La verdad y la opinión del modelo (mismo formato que al terminar la fase 1)
        etiquetas_nih: docInfo.etiquetas_reales || [],
        bbox: docInfo.tiene_bbox && Array.isArray(docInfo.bbox) && docInfo.bbox.length > 0 ? docInfo.bbox : null,
        opinion_modelo: docInfo.opinion_modelo || [],
        modelo_se_abstiene: docInfo.modelo_se_abstiene || false,
        gradcam: docInfo.gradcam || {},
        puntajes: {
            diagnostico: num(ev.eje1_diagnostico),
            localizacion: num(ev.eje2_localizacion),
            calibracion: num(ev.eje3_calibracion)
        }
    };
};

module.exports = {
    obtenerRetroalimentacionEstudiante,
    ErrorNegocio,
    crearPaciente,
    crearCaso,
    guardarRadiografia,
    crearCasoCompleto,
    obtenerCasosDetallados,
    obtenerDetalleCaso,
    obtenerSiguienteCodigoPaciente,
    editarCaso,
    eliminarCaso,
    generarInfoPatologia,
    asignarCasosBanco,
    eliminarEjercicio,
    obtenerDisponibilidadBanco,
    verificarCursoDelDocente,
    componerEjercicio,
    obtenerMetricasModelo,
    obtenerEstadisticasEstudiante,
    obtenerCasoEstudianteSeguro,
    guardarRespuestaEstudiante
};

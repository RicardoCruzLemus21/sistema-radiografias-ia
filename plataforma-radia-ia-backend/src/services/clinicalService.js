const pool = require('../config/database');
const dict = require('../config/dbDictionary');
const { DISTRACTORES, ORDEN_NIVELES } = require('../config/distractoresConfig');

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

// NUEVA FUNCION: Obtener casos del banco NIH (con paginación aleatoria rápida)
const obtenerBancoCasosIA = async (filtros) => {
    const { patologia, dificultad, limit } = filtros || {};
    const parsedLimit = limit ? parseInt(limit) : 20; // Reducimos a 20 para carga más rápida
    const patologiaParam = patologia || null;
    const dificultadParam = dificultad || null;

    // PASO 1: Contar filas que coinciden (rápido con índice)
    const [countResult] = await pool.query('CALL sp_contar_banco_casos_ia(?, ?)', [patologiaParam, dificultadParam]);
    const total = countResult[0][0]?.total || 0;

    if (total === 0) return [];

    // PASO 2: Calcular offset aleatorio y traer los registros con LIMIT + OFFSET (sin ORDER BY RAND)
    const maxOffset = Math.max(0, total - parsedLimit);
    const randomOffset = Math.floor(Math.random() * (maxOffset + 1));

    const [dataResult] = await pool.query(
        'CALL sp_listar_banco_casos_ia(?, ?, ?, ?)',
        [patologiaParam, dificultadParam, parsedLimit, randomOffset]
    );
    const rows = dataResult[0];
    // Función para generar edad aleatoria basada en un id (seed)
    const seededRandomAge = (id) => Math.floor(Math.abs(Math.sin(id) * 60)) + 20; // 20 a 80
    const seededRandomGender = (id) => (id % 2 === 0) ? 'M' : 'F';

    // Parse JSON y generar fallback para paciente
    return rows.map(r => {
        const docInfo = typeof r.hallazgos_docente === 'string' ? JSON.parse(r.hallazgos_docente) : r.hallazgos_docente;
        return {
            ...r,
            edad: r.edad || seededRandomAge(r.id_caso),
            genero: r.genero || seededRandomGender(r.id_caso),
            titulo_caso: r.titulo_caso !== 'Caso NIH: Normal' ? r.titulo_caso : `Caso NIH: ${docInfo?.etiquetas_reales?.[0] || 'Normal'}`,
            hallazgos_docente: docInfo?.etiquetas_reales || []
        };
    });
};

const asignarCasosBanco = async (id_curso, ids_casos) => {
    // Para cada ID, clonamos el caso del banco a un nuevo caso asignado al curso
    // (sp_clonar_caso_a_curso hace SELECT original + INSERT caso + INSERT radiografía).
    // Transacción: si falla a mitad del lote, no queremos casos huérfanos sin radiografía.
    const conn = await pool.getConnection();
    const idsInsertados = [];
    try {
        await conn.beginTransaction();

        for (const id of ids_casos) {
            const [result] = await conn.query('CALL sp_clonar_caso_a_curso(?, ?)', [id_curso, id]);
            const nuevoIdCaso = result[0][0]?.nuevo_id_caso;
            if (nuevoIdCaso) idsInsertados.push(nuevoIdCaso);
        }

        await conn.commit();
        return idsInsertados;
    } catch (error) {
        await conn.rollback();
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
        porcentaje_normales = 0.3
    } = criterios;

    if (!Array.isArray(patologias_objetivo) || patologias_objetivo.length === 0) {
        throw new Error('Debes seleccionar al menos una patología objetivo.');
    }

    const total = parseInt(total_casos, 10) || 10;
    const propNormales = Math.min(Math.max(parseFloat(porcentaje_normales) || 0.3, 0), 1);

    // Fórmula de mezcla (ver documento de diseño): diana + normales + el resto como distractores
    const casosNormales = Math.round(total * propNormales);
    const casosDiana = Math.round(total * (1 - propNormales) * 0.7);
    const casosDistractores = Math.max(0, total - casosNormales - casosDiana);

    const patologiasDistractor = [...new Set(
        patologias_objetivo.flatMap(p => DISTRACTORES[p] || [])
    )].filter(p => !patologias_objetivo.includes(p) && p !== 'Normal');

    const nivelIndex = ORDEN_NIVELES.indexOf(nivel_dificultad);
    const nivelesIncluidos = nivelIndex >= 0 ? ORDEN_NIVELES.slice(0, nivelIndex + 1) : ORDEN_NIVELES;

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
            'CALL sp_contar_casos_banco_nih(?,?,?,?,?,?,?,?,?,?)',
            [...patSlots(patologiasSet), nivelesCsv, excluirCsv]
        );
        const totalDisponibles = countResult[0][0]?.total || 0;
        if (totalDisponibles === 0) return [];

        const tomar = Math.min(cantidad, totalDisponibles);
        const maxOffset = Math.max(0, totalDisponibles - tomar);
        const randomOffset = Math.floor(Math.random() * (maxOffset + 1));

        const [dataResult] = await pool.query(
            'CALL sp_listar_casos_banco_nih(?,?,?,?,?,?,?,?,?,?,?,?)',
            [...patSlots(patologiasSet), nivelesCsv, excluirCsv, tomar, randomOffset]
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
        casos_resueltos: resumen[0]?.casos_resueltos || 0,
        precision_promedio: resumen[0]?.precision_promedio || 0,
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
        titulo_caso: caso.titulo_caso,
        motivo_consulta: caso.motivo_consulta,
        nivel_dificultad: caso.nivel_dificultad,
        ruta_imagen: caso.ruta_imagen,
        metadata_segura: metadataSegura
    };
};

// NUEVA FUNCIÓN: Guardar Respuesta Estudiante y Retornar Verdad
const guardarRespuestaEstudiante = async (payload) => {
    const { id_estudiante, id_caso, tiempo_analisis_segundos, justificacion_clinica, nivel_confianza, marcador_estudiante, patologias } = payload;
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
        if (docInfo.tiene_bbox && docInfo.bbox && docInfo.bbox[0] && marcador_estudiante) {
            const r = docInfo.bbox[0]; // Real: [x, y, w, h] relativas
            const e = marcador_estudiante; // Estudiante: {x, y, w, h} relativas
            if (Array.isArray(r) && r.length === 4) {
                const rx = r[0], ry = r[1], rw = r[2], rh = r[3];
                const ix = Math.max(rx, e.x);
                const iy = Math.max(ry, e.y);
                const iw = Math.min(rx + rw, e.x + e.w) - ix;
                const ih = Math.min(ry + rh, e.y + e.h) - iy;
                
                if (iw > 0 && ih > 0) {
                    const interArea = iw * ih;
                    const rArea = rw * rh;
                    const eArea = e.w * e.h;
                    const iou = interArea / (rArea + eArea - interArea);
                    eje2 = Math.round(iou * 100);
                } else {
                    eje2 = 0;
                }
            }
        }

        // Eje 3: Calibración
        let eje3 = 100 - Math.abs(nivel_confianza - eje1);

        // Guardar calificaciones en la BD
        await conn.query('CALL sp_actualizar_puntajes_evaluacion(?, ?, ?, ?)', [idEvaluacion, eje1, eje2, eje3]);

        // Retornar solo lo estrictamente necesario para las Fases 2, 3 y 4
        return {
            id_evaluacion: idEvaluacion,
            etiquetas_nih: docInfo.etiquetas_reales || [],
            bbox: docInfo.tiene_bbox ? (docInfo.bbox[0] || null) : null,
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

module.exports = {
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
    obtenerBancoCasosIA,
    asignarCasosBanco,
    componerEjercicio,
    obtenerMetricasModelo,
    obtenerEstadisticasEstudiante,
    obtenerCasoEstudianteSeguro,
    guardarRespuestaEstudiante
};

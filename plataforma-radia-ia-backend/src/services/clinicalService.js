const pool = require('../config/database');
const dict = require('../config/dbDictionary');

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
    const query = `
        SELECT 
            c.id_caso AS id,
            c.id_paciente,
            c.titulo_caso AS titulo,
            c.motivo_consulta,
            c.nivel_dificultad,
            c.origen,
            c.estado,
            c.hallazgos_docente,
            p.codigo_paciente AS paciente,
            p.edad,
            p.genero,
            p.antecedentes_medicos AS antecedentes,
            r.tipo_proyeccion,
            r.ruta_imagen
        FROM Casos_Clinicos c
        JOIN Pacientes_Simulados p ON c.id_paciente = p.id_paciente
        LEFT JOIN Radiografias r ON c.id_caso = r.id_caso
        WHERE c.id_curso IN (SELECT id_curso FROM Cursos_Secciones WHERE id_catedratico = ?)
        ORDER BY c.id_caso DESC
    `;
    const [casos] = await pool.query(query, [id_catedratico]);
    return casos;
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

// 9. Eliminar Caso
const eliminarCaso = async (id_caso) => {
    try {
        await pool.query('CALL sp_eliminar_caso(?)', [id_caso]);
        return true;
    } catch (error) {
        throw new Error('No se puede eliminar el caso porque ya tiene evaluaciones asociadas.');
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
    generarInfoPatologia
};
const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const guardarEvaluacionEstudiante = async (bodyData) => {
    // 1. Extraemos los datos basándonos en tu script SQL real
    const { 
        id_estudiante, 
        id_caso, 
        tiempo_analisis_segundos, 
        justificacion_clinica, 
        patologias, 
        regiones    
    } = bodyData;

    if (!id_estudiante || !id_caso) {
        throw new Error("Faltan identificadores del estudiante o caso clínico.");
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // PASO A: Crear la cabecera de la evaluación
        const queryEvaluacion = `
            INSERT INTO ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} 
            (${dict.COLUMNAS.ID_CASO}, ${dict.COLUMNAS.ID_ESTUDIANTE}, ${dict.COLUMNAS.TIEMPO_ANALISIS}, ${dict.COLUMNAS.JUSTIFICACION}) 
            VALUES (?, ?, ?, ?)
        `;
        const [resEvaluacion] = await connection.query(queryEvaluacion, [
            id_caso, 
            id_estudiante, 
            tiempo_analisis_segundos || 0, // Por si el frontend no envía el tiempo
            justificacion_clinica || 'Sin justificación proporcionada'
        ]);
        const id_evaluacion = resEvaluacion.insertId;

        // PASO B y C: Insertar Patologías y vincularles las Regiones
        if (patologias && patologias.length > 0) {
            for (const id_patologia of patologias) {
                // 1. Insertamos la patología
                const queryPatologia = `
                    INSERT INTO ${dict.TABLAS.DETALLE_HALLAZGOS} 
                    (${dict.COLUMNAS.ID_EVALUACION}, ${dict.COLUMNAS.ID_PATOLOGIA}) 
                    VALUES (?, ?)
                `;
                const [resPatologia] = await connection.query(queryPatologia, [id_evaluacion, id_patologia]);
                const id_detalle_hallazgo = resPatologia.insertId; // Este es el ID clave que pedía tu tabla 19

                // 2. Insertamos las regiones vinculadas a este hallazgo específico
                if (regiones && regiones.length > 0) {
                    const queryRegiones = `
                        INSERT INTO ${dict.TABLAS.LOCALIZACION_LESIONES} 
                        (${dict.COLUMNAS.ID_DETALLE_HALLAZGO}, ${dict.COLUMNAS.ID_REGION}) 
                        VALUES ?
                    `;
                    const valoresRegiones = regiones.map(id_region => [id_detalle_hallazgo, id_region]);
                    await connection.query(queryRegiones, [valoresRegiones]);
                }
            }
        }

        await connection.commit();
        connection.release();

        return {
            id_evaluacion,
            mensaje: "Diagnóstico guardado respetando la estructura estricta de MySQL."
        };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

const obtenerCatalogos = async () => {
    const connection = await pool.getConnection();
    try {
        // Consultamos ambas tablas de catálogo al mismo tiempo
        const [patologias] = await connection.query(`SELECT * FROM ${dict.TABLAS.CATALOGO_PATOLOGIAS}`);
        const [regiones] = await connection.query(`SELECT * FROM ${dict.TABLAS.REGIONES_ANATOMICAS}`);
        
        connection.release();
        
        return {
            patologias,
            regiones
        };
    } catch (error) {
        connection.release();
        throw error;
    }
};

const obtenerEvaluacionesPorCurso = async (id_curso) => {
    // Aseguramos que la columna exista
    try {
        await pool.query(`ALTER TABLE ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ADD COLUMN feedback_profesor TEXT;`);
    } catch(e) {} // Ya existe

    const query = `
        SELECT e.${dict.COLUMNAS.ID_EVALUACION} AS id, 
               u.${dict.COLUMNAS.NOMBRE_COMPLETO} AS estudiante, 
               c.${dict.COLUMNAS.TITULO_CASO} AS caso, 
               e.${dict.COLUMNAS.FECHA_EVALUACION} AS fecha, 
               e.${dict.COLUMNAS.JUSTIFICACION} AS justificacion,
               e.feedback_profesor
        FROM ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} e
        INNER JOIN ${dict.TABLAS.USUARIOS} u ON e.${dict.COLUMNAS.ID_ESTUDIANTE} = u.${dict.COLUMNAS.ID_USUARIO}
        INNER JOIN ${dict.TABLAS.CASOS} c ON e.${dict.COLUMNAS.ID_CASO} = c.${dict.COLUMNAS.ID_CASO}
        WHERE c.${dict.COLUMNAS.ID_CURSO} = ?
        ORDER BY e.${dict.COLUMNAS.FECHA_EVALUACION} DESC
    `;
    const [evaluaciones] = await pool.query(query, [id_curso]);
    return evaluaciones;
};

const agregarFeedback = async (id_evaluacion, feedback) => {
    const query = `UPDATE ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} SET feedback_profesor = ? WHERE ${dict.COLUMNAS.ID_EVALUACION} = ?`;
    await pool.query(query, [feedback, id_evaluacion]);
    return true;
};

const invalidarEvaluacion = async (id_evaluacion) => {
    try {
        await pool.query(`DELETE FROM ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} WHERE ${dict.COLUMNAS.ID_EVALUACION} = ?`, [id_evaluacion]);
        return true;
    } catch (error) {
        throw new Error('Error al invalidar evaluación.');
    }
};

module.exports = {
    guardarEvaluacionEstudiante,
    obtenerCatalogos,
    obtenerEvaluacionesPorCurso,
    agregarFeedback,
    invalidarEvaluacion
};
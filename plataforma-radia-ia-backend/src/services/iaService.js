 
const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const procesarResultadoYConcordancia = async (datosIA) => {
    const { 
        id_evaluacion, 
        id_radiografia, 
        id_patologia_detectada, 
        probabilidad_porcentaje, 
        ruta_mapa_calor 
    } = datosIA;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Guardar el veredicto de la Inteligencia Artificial
        const queryIA = `
            INSERT INTO ${dict.TABLAS.RESULTADOS_IA} 
            (${dict.COLUMNAS.ID_RADIOGRAFIA}, ${dict.COLUMNAS.ID_PATOLOGIA_DETECTADA}, ${dict.COLUMNAS.PROBABILIDAD}, ${dict.COLUMNAS.RUTA_MAPA_CALOR}) 
            VALUES (?, ?, ?, ?)
        `;
        const [resIA] = await connection.query(queryIA, [
            id_radiografia, 
            id_patologia_detectada, 
            probabilidad_porcentaje, 
            ruta_mapa_calor || '/uploads/mapas_calor/default.png'
        ]);
        const id_resultado_ia = resIA.insertId;

        // 2. Extraer el diagnóstico que hizo el estudiante en esa evaluación
        const queryEstudiante = `
            SELECT ${dict.COLUMNAS.ID_PATOLOGIA} 
            FROM ${dict.TABLAS.DETALLE_HALLAZGOS} 
            WHERE ${dict.COLUMNAS.ID_EVALUACION} = ?
        `;
        const [hallazgosEstudiante] = await connection.query(queryEstudiante, [id_evaluacion]);

        // 3. Motor Lógico de Concordancia Diagnóstica (Variable 2)
        let porcentaje_concordancia = 0.00;
        let nivel_precision = 'Baja';

        // Verificamos si la patología detectada por la IA está dentro de las que marcó el estudiante
        const acierto = hallazgosEstudiante.some(h => h[dict.COLUMNAS.ID_PATOLOGIA] === id_patologia_detectada);

        if (acierto) {
            // Si el alumno marcó la misma patología que la IA, la concordancia es exitosa
            porcentaje_concordancia = 100.00; 
            nivel_precision = 'Alta';
        }

        // 4. Guardar la calificación final en la tabla de Concordancia
        const queryConcordancia = `
            INSERT INTO ${dict.TABLAS.CONCORDANCIA} 
            (${dict.COLUMNAS.ID_EVALUACION}, ${dict.COLUMNAS.ID_RESULTADO_IA}, ${dict.COLUMNAS.PORCENTAJE_CONCORDANCIA}, ${dict.COLUMNAS.NIVEL_PRECISION}) 
            VALUES (?, ?, ?, ?)
        `;
        await connection.query(queryConcordancia, [
            id_evaluacion, 
            id_resultado_ia, 
            porcentaje_concordancia, 
            nivel_precision
        ]);

        // 5. Consolidamos todo en la base de datos
        await connection.commit();
        connection.release();

        return {
            id_resultado_ia,
            metricas: {
                porcentaje_concordancia,
                nivel_precision,
                acierto_estudiante: acierto
            },
            mensaje: "Resultados de la IA y métricas de concordancia generados exitosamente."
        };

    } catch (error) {
        // Si hay error (ej. llaves foráneas inexistentes), revertimos las tablas
        await connection.rollback();
        connection.release();
        throw error;
    }
};

module.exports = {
    procesarResultadoYConcordancia
};
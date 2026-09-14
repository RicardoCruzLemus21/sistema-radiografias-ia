const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const guardarEvaluacionEstudiante = async (bodyData) => {
    const { 
        id_estudiante, 
        id_caso, 
        tiempo_analisis_segundos, 
        justificacion_clinica, 
        patologias, 
        regiones,
        nivel_confianza,
        marcador_estudiante
    } = bodyData;

    if (!id_estudiante || !id_caso) {
        throw new Error("Faltan identificadores del estudiante o caso clínico.");
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [resEvaluacionArray] = await pool.query('CALL sp_crear_evaluacion_cabecera(?, ?, ?, ?)', [
            id_caso, 
            id_estudiante, 
            tiempo_analisis_segundos || 0,
            justificacion_clinica || 'Sin justificación proporcionada'
        ]);
        const id_evaluacion = resEvaluacionArray[0][0].id_evaluacion;

        // Actualizamos los campos nuevos que no soporta el SP original (Mock MVP)
        await connection.query(
            'UPDATE Evaluaciones_Estudiantes SET nivel_confianza = ?, marcador_estudiante = ? WHERE id_evaluacion = ?',
            [nivel_confianza || 0, marcador_estudiante ? JSON.stringify(marcador_estudiante) : null, id_evaluacion]
        );

        if (patologias && patologias.length > 0) {
            for (const id_patologia of patologias) {
                const [resPatologiaArray] = await pool.query('CALL sp_crear_detalle_hallazgo(?, ?)', [id_evaluacion, id_patologia]);
                const id_detalle_hallazgo = resPatologiaArray[0][0].id_detalle;

                if (regiones && regiones.length > 0) {
                    for (const id_region of regiones) {
                        await pool.query('CALL sp_crear_localizacion_lesion(?, ?)', [id_detalle_hallazgo, id_region]);
                    }
                }
            }
        }

        await connection.commit();
        connection.release();

        // MOCK MVP: Devolver datos simulados para Fase 2 (Verdad) y Fase 3 (IA)
        return {
            id_evaluacion,
            mensaje: "Diagnóstico guardado respetando la estructura estricta de MySQL.",
            fase2_verdad: {
                etiquetas_nih: ["Infiltración", "Cardiomegalia"],
                bbox: { x: 150, y: 120, width: 80, height: 90 }
            },
            fase3_ia: {
                prediccion: "Infiltración",
                probabilidad: 88,
                gradcam_mock: "https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=800&q=80" // Imagen placeholder para MVP
            }
        };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

const obtenerCatalogos = async () => {
    try {
        const [patologiasArray] = await pool.query('CALL sp_obtener_catalogo_patologias()');
        const [regionesArray] = await pool.query('CALL sp_obtener_catalogo_regiones()');
        
        return {
            patologias: patologiasArray[0],
            regiones: regionesArray[0]
        };
    } catch (error) {
        throw error;
    }
};

const obtenerEvaluacionesPorCurso = async (id_curso) => {
    // Aseguramos que la columna exista
    try {
        await pool.query(`ALTER TABLE ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ADD COLUMN feedback_profesor TEXT;`);
    } catch(e) {} // Ya existe

    const [evaluacionesArray] = await pool.query('CALL sp_obtener_evaluaciones_curso(?)', [id_curso]);
    return evaluacionesArray[0];
};

const agregarFeedback = async (id_evaluacion, feedback) => {
    await pool.query('CALL sp_agregar_feedback_evaluacion(?, ?)', [id_evaluacion, feedback]);
    return true;
};

const invalidarEvaluacion = async (id_evaluacion) => {
    try {
        await pool.query('CALL sp_invalidar_evaluacion(?)', [id_evaluacion]);
        return true;
    } catch (error) {
        throw new Error('Error al invalidar evaluación.');
    }
};

const obtenerTodasLasEvaluaciones = async () => {
    // Aseguramos que la columna exista
    try {
        await pool.query(`ALTER TABLE ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ADD COLUMN feedback_profesor TEXT;`);
    } catch(e) {} // Ya existe

    const [evaluacionesArray] = await pool.query('CALL sp_obtener_todas_evaluaciones()');
    return evaluacionesArray[0];
};

module.exports = {
    guardarEvaluacionEstudiante,
    obtenerCatalogos,
    obtenerEvaluacionesPorCurso,
    obtenerTodasLasEvaluaciones,
    agregarFeedback,
    invalidarEvaluacion
};
const pool = require('../src/config/database');

const sps = [
    // === MÓDULO 4: IA Y PATOLOGÍAS ===
    {
        name: 'sp_obtener_ruta_radiografia',
        query: `
            CREATE PROCEDURE sp_obtener_ruta_radiografia(IN p_id INT)
            BEGIN
                SELECT ruta_imagen FROM Radiografias WHERE id_radiografia = p_id;
            END
        `
    },
    {
        name: 'sp_obtener_hallazgos_estudiante',
        query: `
            CREATE PROCEDURE sp_obtener_hallazgos_estudiante(IN p_id_evaluacion INT)
            BEGIN
                SELECT id_patologia FROM Detalle_Hallazgos WHERE id_evaluacion = p_id_evaluacion;
            END
        `
    },
    {
        name: 'sp_guardar_resultado_ia_y_concordancia',
        query: `
            CREATE PROCEDURE sp_guardar_resultado_ia_y_concordancia(
                IN p_id_radiografia INT, IN p_id_patologia INT, IN p_probabilidad DECIMAL(5,2), IN p_ruta_mapa VARCHAR(255),
                IN p_id_evaluacion INT, IN p_concordancia DECIMAL(5,2), IN p_nivel VARCHAR(50)
            )
            BEGIN
                DECLARE v_id_resultado_ia INT;
                DECLARE EXIT HANDLER FOR SQLEXCEPTION
                BEGIN
                    ROLLBACK;
                    RESIGNAL;
                END;

                START TRANSACTION;
                
                INSERT INTO Resultados_IA (id_radiografia, id_patologia_detectada, probabilidad, ruta_mapa_calor) 
                VALUES (p_id_radiografia, p_id_patologia, p_probabilidad, p_ruta_mapa);
                SET v_id_resultado_ia = LAST_INSERT_ID();
                
                INSERT INTO Concordancia_NLP (id_evaluacion, id_resultado_ia, porcentaje_concordancia, nivel_precision) 
                VALUES (p_id_evaluacion, v_id_resultado_ia, p_concordancia, p_nivel);
                
                COMMIT;
                
                SELECT v_id_resultado_ia AS id_resultado_ia;
            END
        `
    },

    // === MÓDULO 5: EVALUACIÓN ===
    {
        name: 'sp_crear_evaluacion_cabecera',
        query: `
            CREATE PROCEDURE sp_crear_evaluacion_cabecera(IN p_id_caso INT, IN p_id_estudiante INT, IN p_tiempo INT, IN p_justificacion TEXT)
            BEGIN
                INSERT INTO Evaluaciones_Estudiantes (id_caso, id_estudiante, tiempo_analisis_segundos, justificacion_clinica) 
                VALUES (p_id_caso, p_id_estudiante, p_tiempo, p_justificacion);
                SELECT LAST_INSERT_ID() AS id_evaluacion;
            END
        `
    },
    {
        name: 'sp_crear_detalle_hallazgo',
        query: `
            CREATE PROCEDURE sp_crear_detalle_hallazgo(IN p_id_evaluacion INT, IN p_id_patologia INT)
            BEGIN
                INSERT INTO Detalle_Hallazgos (id_evaluacion, id_patologia) VALUES (p_id_evaluacion, p_id_patologia);
                SELECT LAST_INSERT_ID() AS id_detalle;
            END
        `
    },
    {
        name: 'sp_crear_localizacion_lesion',
        query: `
            CREATE PROCEDURE sp_crear_localizacion_lesion(IN p_id_detalle INT, IN p_id_region INT)
            BEGIN
                INSERT INTO Localizacion_Lesiones (id_detalle_hallazgo, id_region) VALUES (p_id_detalle, p_id_region);
            END
        `
    },
    {
        name: 'sp_obtener_catalogo_patologias',
        query: `
            CREATE PROCEDURE sp_obtener_catalogo_patologias()
            BEGIN
                SELECT * FROM Catalogo_Patologias;
            END
        `
    },
    {
        name: 'sp_obtener_catalogo_regiones',
        query: `
            CREATE PROCEDURE sp_obtener_catalogo_regiones()
            BEGIN
                SELECT * FROM Regiones_Anatomicas;
            END
        `
    },
    {
        name: 'sp_obtener_evaluaciones_curso',
        query: `
            CREATE PROCEDURE sp_obtener_evaluaciones_curso(IN p_id_curso INT)
            BEGIN
                SELECT e.id_evaluacion AS id, u.nombre_completo AS estudiante, c.titulo_caso AS caso, 
                       e.fecha_evaluacion AS fecha, e.justificacion_clinica AS justificacion, e.feedback_profesor
                FROM Evaluaciones_Estudiantes e
                INNER JOIN Usuarios u ON e.id_estudiante = u.id_usuario
                INNER JOIN Casos_Clinicos c ON e.id_caso = c.id_caso
                WHERE c.id_curso = p_id_curso
                ORDER BY e.fecha_evaluacion DESC;
            END
        `
    },
    {
        name: 'sp_obtener_todas_evaluaciones',
        query: `
            CREATE PROCEDURE sp_obtener_todas_evaluaciones()
            BEGIN
                SELECT e.id_evaluacion AS id, u.nombre_completo AS estudiante, c.titulo_caso AS caso, 
                       e.fecha_evaluacion AS fecha, e.justificacion_clinica AS justificacion, e.feedback_profesor
                FROM Evaluaciones_Estudiantes e
                INNER JOIN Usuarios u ON e.id_estudiante = u.id_usuario
                INNER JOIN Casos_Clinicos c ON e.id_caso = c.id_caso
                ORDER BY e.fecha_evaluacion DESC;
            END
        `
    },
    {
        name: 'sp_agregar_feedback_evaluacion',
        query: `
            CREATE PROCEDURE sp_agregar_feedback_evaluacion(IN p_id INT, IN p_feedback TEXT)
            BEGIN
                UPDATE Evaluaciones_Estudiantes SET feedback_profesor = p_feedback WHERE id_evaluacion = p_id;
            END
        `
    },
    {
        name: 'sp_invalidar_evaluacion',
        query: `
            CREATE PROCEDURE sp_invalidar_evaluacion(IN p_id INT)
            BEGIN
                DELETE FROM Evaluaciones_Estudiantes WHERE id_evaluacion = p_id;
            END
        `
    },

    // === MÓDULO 6: METRICAS ===
    {
        name: 'sp_guardar_calificacion_rubrica',
        query: `
            CREATE PROCEDURE sp_guardar_calificacion_rubrica(IN p_id_evaluacion INT, IN p_id_criterio INT, IN p_puntaje INT)
            BEGIN
                INSERT INTO Calificaciones_Rubrica_Estudiantes (id_evaluacion, id_criterio, puntaje_obtenido) 
                VALUES (p_id_evaluacion, p_id_criterio, p_puntaje);
            END
        `
    },
    {
        name: 'sp_guardar_respuesta_likert',
        query: `
            CREATE PROCEDURE sp_guardar_respuesta_likert(IN p_id_cuestionario INT, IN p_id_estudiante INT, IN p_dimension VARCHAR(100), IN p_puntaje INT)
            BEGIN
                INSERT INTO Respuestas_Likert (id_cuestionario, id_estudiante, dimension_evaluada, puntaje_likert) 
                VALUES (p_id_cuestionario, p_id_estudiante, p_dimension, p_puntaje);
            END
        `
    },
    {
        name: 'sp_obtener_catalogo_rubricas',
        query: `
            CREATE PROCEDURE sp_obtener_catalogo_rubricas()
            BEGIN
                SELECT * FROM Rubricas_Evaluacion;
            END
        `
    },
    {
        name: 'sp_obtener_catalogo_cuestionarios',
        query: `
            CREATE PROCEDURE sp_obtener_catalogo_cuestionarios()
            BEGIN
                SELECT * FROM Cuestionarios_Percepcion;
            END
        `
    },
    {
        name: 'sp_obtener_resultados_likert',
        query: `
            CREATE PROCEDURE sp_obtener_resultados_likert()
            BEGIN
                SELECT dimension_evaluada AS dimension, COUNT(*) AS total_respuestas, ROUND(AVG(puntaje_likert), 1) AS promedio
                FROM Respuestas_Likert
                GROUP BY dimension_evaluada;
            END
        `
    }
];

async function migrarSps() {
    try {
        console.log('Iniciando migración de SPs Módulos 4, 5 y 6...');
        // Modificación de tabla asegurada para feedback_profesor
        try {
            await pool.query('ALTER TABLE Evaluaciones_Estudiantes ADD COLUMN feedback_profesor TEXT');
            console.log('✅ Columna feedback_profesor agregada.');
        } catch (e) { } // Si ya existe, ignorar
        
        for (const sp of sps) {
            console.log('Creando ' + sp.name + '...');
            await pool.query('DROP PROCEDURE IF EXISTS ' + sp.name);
            await pool.query(sp.query);
            console.log('✅ ' + sp.name + ' creado.');
        }
        console.log('\\n🎉 Migración de Módulos 4, 5 y 6 completada.');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}
migrarSps();

const pool = require('../src/config/database');

async function fixStudentSPs() {
    try {
        console.log('=== CORRIGIENDO SPs DE ESTUDIANTES ===\n');

        // ============================================================
        // FIX 1: sp_crear_detalle_hallazgo
        // ERROR: Table 'radia_ia_schema.detalle_hallazgos' doesn't exist
        // ============================================================
        console.log('🔧 Recreando sp_crear_detalle_hallazgo...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_crear_detalle_hallazgo');
        await pool.query(`
            CREATE PROCEDURE sp_crear_detalle_hallazgo(
                IN p_id_evaluacion INT,
                IN p_id_patologia INT
            )
            BEGIN
                INSERT INTO detalle_hallazgos_estudiante (id_evaluacion, id_patologia)
                VALUES (p_id_evaluacion, p_id_patologia);
                SELECT LAST_INSERT_ID() AS id_detalle_hallazgo;
            END
        `);

        // ============================================================
        // FIX 2: sp_crear_localizacion_lesion
        // ERROR: Table 'radia_ia_schema.localizacion_lesiones' doesn't exist
        // ============================================================
        console.log('🔧 Recreando sp_crear_localizacion_lesion...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_crear_localizacion_lesion');
        await pool.query(`
            CREATE PROCEDURE sp_crear_localizacion_lesion(
                IN p_id_detalle_hallazgo INT,
                IN p_id_region INT
            )
            BEGIN
                INSERT INTO localizacion_lesiones_estudiante (id_detalle_hallazgo, id_region)
                VALUES (p_id_detalle_hallazgo, p_id_region);
            END
        `);

        // ============================================================
        // FIX 3: sp_guardar_calificacion_rubrica
        // ERROR: Table 'radia_ia_schema.calificaciones_rubrica_estudiantes' doesn't exist
        // ============================================================
        console.log('🔧 Recreando sp_guardar_calificacion_rubrica...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_guardar_calificacion_rubrica');
        await pool.query(`
            CREATE PROCEDURE sp_guardar_calificacion_rubrica(
                IN p_id_evaluacion INT,
                IN p_id_criterio INT,
                IN p_puntaje INT
            )
            BEGIN
                INSERT INTO calificaciones_rubrica (id_evaluacion, id_criterio, puntaje_obtenido)
                VALUES (p_id_evaluacion, p_id_criterio, p_puntaje)
                ON DUPLICATE KEY UPDATE puntaje_obtenido = p_puntaje;
            END
        `);

        // ============================================================
        // FIX 4: sp_guardar_respuesta_likert
        // ERROR: Unknown column 'puntaje_likert' in 'field list'
        // ============================================================
        console.log('🔧 Recreando sp_guardar_respuesta_likert...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_guardar_respuesta_likert');
        await pool.query(`
            CREATE PROCEDURE sp_guardar_respuesta_likert(
                IN p_id_cuestionario INT,
                IN p_id_estudiante INT,
                IN p_dimension VARCHAR(255),
                IN p_puntaje INT
            )
            BEGIN
                INSERT INTO respuestas_likert (id_cuestionario, id_estudiante, dimension_evaluada, puntaje)
                VALUES (p_id_cuestionario, p_id_estudiante, p_dimension, p_puntaje)
                ON DUPLICATE KEY UPDATE puntaje = p_puntaje;
            END
        `);

        // ============================================================
        // FIX 5: sp_obtener_hallazgos_estudiante
        // ERROR: Table 'radia_ia_schema.detalle_hallazgos' doesn't exist
        // ============================================================
        console.log('🔧 Recreando sp_obtener_hallazgos_estudiante...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_hallazgos_estudiante');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_hallazgos_estudiante(
                IN p_id_evaluacion INT
            )
            BEGIN
                SELECT 
                    dhe.id_detalle_hallazgo,
                    cp.nombre_patologia,
                    GROUP_CONCAT(cr.nombre_region SEPARATOR ', ') AS regiones
                FROM detalle_hallazgos_estudiante dhe
                INNER JOIN catalogo_patologias cp ON dhe.id_patologia = cp.id_patologia
                LEFT JOIN localizacion_lesiones_estudiante lle ON dhe.id_detalle_hallazgo = lle.id_detalle_hallazgo
                LEFT JOIN catalogo_regiones cr ON lle.id_region = cr.id_region
                WHERE dhe.id_evaluacion = p_id_evaluacion
                GROUP BY dhe.id_detalle_hallazgo, cp.nombre_patologia;
            END
        `);

        // ============================================================
        // FIX 6: sp_guardar_resultado_ia_y_concordancia
        // ERROR: Unknown column 'probabilidad' in 'field list'
        // ============================================================
        console.log('🔧 Recreando sp_guardar_resultado_ia_y_concordancia...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_guardar_resultado_ia_y_concordancia');
        await pool.query(`
            CREATE PROCEDURE sp_guardar_resultado_ia_y_concordancia(
                IN p_id_evaluacion INT,
                IN p_id_radiografia INT,
                IN p_id_patologia_detectada INT,
                IN p_probabilidad_porcentaje DECIMAL(5,2),
                IN p_ruta_mapa_calor VARCHAR(255),
                IN p_porcentaje_concordancia DECIMAL(5,2),
                IN p_nivel_precision VARCHAR(50)
            )
            BEGIN
                DECLARE v_id_resultado_ia INT;
                
                -- 1. Guardar resultado de la IA
                INSERT INTO resultados_ia (id_radiografia, id_patologia_detectada, probabilidad_porcentaje, ruta_mapa_calor)
                VALUES (p_id_radiografia, p_id_patologia_detectada, p_probabilidad_porcentaje, p_ruta_mapa_calor);
                
                SET v_id_resultado_ia = LAST_INSERT_ID();
                
                -- 2. Guardar concordancia
                INSERT INTO concordancia_diagnostica (id_evaluacion, id_resultado_ia, porcentaje_concordancia, nivel_precision)
                VALUES (p_id_evaluacion, v_id_resultado_ia, p_porcentaje_concordancia, p_nivel_precision)
                ON DUPLICATE KEY UPDATE 
                    id_resultado_ia = v_id_resultado_ia,
                    porcentaje_concordancia = p_porcentaje_concordancia,
                    nivel_precision = p_nivel_precision;
                    
                SELECT v_id_resultado_ia AS id_resultado_ia;
            END
        `);

        console.log('\n🎉 Todos los SPs de estudiantes corregidos exitosamente');
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}
fixStudentSPs();

const pool = require('../src/config/database');

async function fix() {
    try {
        console.log('=== CORRIGIENDO SPs DEL DASHBOARD ===\n');

        // ============================================================
        // FIX 1: sp_obtener_estadisticas_curso
        // ERROR: Unknown column 'e.precision_promedio' in 'field list'
        // ============================================================
        console.log('🔧 Recreando sp_obtener_estadisticas_curso...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_estadisticas_curso');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_estadisticas_curso(IN p_id_curso INT)
            BEGIN
                SELECT 
                    cc.nivel_dificultad AS nivel,
                    COUNT(ee.id_evaluacion) AS total_evaluaciones,
                    COALESCE(AVG(cd.porcentaje_concordancia), 0) AS precision_promedio,
                    COALESCE(AVG(ee.tiempo_analisis_segundos), 0) AS tiempo_promedio_seg
                FROM casos_clinicos cc
                LEFT JOIN evaluaciones_estudiantes ee ON cc.id_caso = ee.id_caso
                LEFT JOIN concordancia_diagnostica cd ON ee.id_evaluacion = cd.id_evaluacion
                WHERE cc.id_curso = p_id_curso
                GROUP BY cc.nivel_dificultad;
            END
        `);
        console.log('✅ sp_obtener_estadisticas_curso - OK');

        // ============================================================
        // FIX 2: sp_obtener_detalle_estudiante_evaluaciones
        // ERROR: Table 'radia_ia_schema.detalle_hallazgos' doesn't exist (es detalle_hallazgos_estudiante)
        // ============================================================
        console.log('\n🔧 Recreando sp_obtener_detalle_estudiante_evaluaciones...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_detalle_estudiante_evaluaciones');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_detalle_estudiante_evaluaciones(IN p_id_estudiante INT)
            BEGIN
                SELECT 
                    ee.id_evaluacion,
                    ee.fecha_evaluacion,
                    ee.tiempo_analisis_segundos,
                    ee.justificacion_clinica,
                    ee.feedback_profesor,
                    cc.titulo_caso,
                    cc.nivel_dificultad,
                    cd.porcentaje_concordancia,
                    cd.nivel_precision,
                    COUNT(dhe.id_detalle_hallazgo) AS total_hallazgos_detectados
                FROM evaluaciones_estudiantes ee
                INNER JOIN casos_clinicos cc ON ee.id_caso = cc.id_caso
                LEFT JOIN concordancia_diagnostica cd ON ee.id_evaluacion = cd.id_evaluacion
                LEFT JOIN detalle_hallazgos_estudiante dhe ON ee.id_evaluacion = dhe.id_evaluacion
                WHERE ee.id_estudiante = p_id_estudiante
                GROUP BY ee.id_evaluacion, ee.fecha_evaluacion, ee.tiempo_analisis_segundos,
                         ee.justificacion_clinica, ee.feedback_profesor, cc.titulo_caso,
                         cc.nivel_dificultad, cd.porcentaje_concordancia, cd.nivel_precision
                ORDER BY ee.fecha_evaluacion DESC;
            END
        `);
        console.log('✅ sp_obtener_detalle_estudiante_evaluaciones - OK');

        // ============================================================
        // FIX 3: sp_obtener_mi_rendimiento_estadisticas
        // ERROR: Table 'radia_ia_schema.concordancia_nlp' doesn't exist (es concordancia_diagnostica)
        // ============================================================
        console.log('\n🔧 Recreando sp_obtener_mi_rendimiento_estadisticas...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_mi_rendimiento_estadisticas');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_mi_rendimiento_estadisticas(IN p_id_estudiante INT)
            BEGIN
                SELECT 
                    COUNT(DISTINCT ee.id_caso) AS total_casos,
                    COALESCE(AVG(cd.porcentaje_concordancia), 0) AS precision_promedio
                FROM evaluaciones_estudiantes ee
                LEFT JOIN concordancia_diagnostica cd ON ee.id_evaluacion = cd.id_evaluacion
                WHERE ee.id_estudiante = p_id_estudiante;
            END
        `);
        console.log('✅ sp_obtener_mi_rendimiento_estadisticas - OK');

        console.log('\n🎉 SPs restantes corregidos exitosamente');
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}
fix();

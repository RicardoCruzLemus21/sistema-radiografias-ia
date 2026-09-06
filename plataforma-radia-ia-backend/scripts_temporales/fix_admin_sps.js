const pool = require('../src/config/database');

async function fixAdminSPs() {
    try {
        console.log('=== CORRIGIENDO SPs DE ADMINISTRADOR ===\n');

        // ============================================================
        // FIX 1: sp_obtener_codigos_pacientes
        // ERROR: Table 'radia_ia_schema.pacientes' doesn't exist
        // ============================================================
        console.log('🔧 Recreando sp_obtener_codigos_pacientes...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_codigos_pacientes');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_codigos_pacientes()
            BEGIN
                SELECT codigo_paciente FROM pacientes_simulados;
            END
        `);
        console.log('✅ sp_obtener_codigos_pacientes - OK');

        // ============================================================
        // FIX 2: sp_obtener_catalogo_rubricas
        // ERROR: Table 'radia_ia_schema.rubricas_evaluacion' doesn't exist
        // ============================================================
        console.log('\n🔧 Recreando sp_obtener_catalogo_rubricas...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_catalogo_rubricas');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_catalogo_rubricas()
            BEGIN
                SELECT * FROM rubricas_definicion ORDER BY id_criterio ASC;
            END
        `);
        console.log('✅ sp_obtener_catalogo_rubricas - OK');

        // ============================================================
        // FIX 3: sp_obtener_resultados_likert
        // ERROR: Unknown column 'puntaje_likert' in 'field list'
        // ============================================================
        console.log('\n🔧 Recreando sp_obtener_resultados_likert...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_resultados_likert');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_resultados_likert()
            BEGIN
                SELECT 
                    rl.id_respuesta,
                    rl.id_cuestionario,
                    rl.id_estudiante,
                    rl.dimension_evaluada,
                    rl.puntaje,
                    u.nombre_completo AS nombre_estudiante
                FROM respuestas_likert rl
                INNER JOIN usuarios u ON rl.id_estudiante = u.id_usuario;
            END
        `);
        console.log('✅ sp_obtener_resultados_likert - OK');

        console.log('\n🎉 Todos los SPs de administrador corregidos exitosamente');
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}
fixAdminSPs();

const pool = require('../src/config/database');

async function fix() {
    try {
        console.log('=== CORRIGIENDO SPs CON NOMBRES DE TABLA INCORRECTOS ===\n');

        // Ver columnas de las tablas que necesitamos
        const [colsConcordancia] = await pool.query('DESCRIBE concordancia_diagnostica');
        console.log('📋 concordancia_diagnostica:', colsConcordancia.map(c => c.Field).join(', '));

        const [colsPacientes] = await pool.query('DESCRIBE pacientes_simulados');
        console.log('📋 pacientes_simulados:', colsPacientes.map(c => c.Field).join(', '));

        const [colsCasos] = await pool.query('DESCRIBE casos_clinicos');
        console.log('📋 casos_clinicos:', colsCasos.map(c => c.Field).join(', '));

        const [colsRadio] = await pool.query('DESCRIBE radiografias');
        console.log('📋 radiografias:', colsRadio.map(c => c.Field).join(', '));

        const [colsResultados] = await pool.query('DESCRIBE resultados_ia');
        console.log('📋 resultados_ia:', colsResultados.map(c => c.Field).join(', '));

        // ============================================================
        // FIX 1: sp_obtener_estudiantes_resumen_catedratico
        // ============================================================
        console.log('\n🔧 Recreando sp_obtener_estudiantes_resumen_catedratico...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_estudiantes_resumen_catedratico');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_estudiantes_resumen_catedratico(IN p_id_catedratico INT)
            BEGIN
                SELECT 
                    u.id_usuario AS id,
                    u.carnet,
                    u.nombre_completo AS nombre,
                    u.correo_electronico AS correo,
                    COUNT(DISTINCT ee.id_evaluacion) AS casosResueltos,
                    COALESCE(AVG(cd.porcentaje_concordancia), 0) AS precision_promedio
                FROM usuarios u
                INNER JOIN asignaciones_estudiantes ae ON u.id_usuario = ae.id_estudiante
                INNER JOIN cursos_secciones cs ON ae.id_curso = cs.id_curso
                LEFT JOIN evaluaciones_estudiantes ee ON u.id_usuario = ee.id_estudiante
                LEFT JOIN concordancia_diagnostica cd ON ee.id_evaluacion = cd.id_evaluacion
                WHERE cs.id_catedratico = p_id_catedratico
                GROUP BY u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico;
            END
        `);
        console.log('✅ sp_obtener_estudiantes_resumen_catedratico - OK');

        // ============================================================
        // FIX 2: sp_obtener_casos_detallados
        // ============================================================
        console.log('\n🔧 Recreando sp_obtener_casos_detallados...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_casos_detallados');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_casos_detallados(IN p_id_catedratico INT)
            BEGIN
                SELECT 
                    cc.id_caso,
                    cc.titulo_caso,
                    cc.motivo_consulta,
                    cc.nivel_dificultad,
                    cs.nombre_curso,
                    ps.codigo_paciente,
                    ps.edad,
                    ps.genero,
                    r.id_radiografia,
                    r.ruta_imagen,
                    r.tipo_proyeccion,
                    COUNT(DISTINCT ee.id_evaluacion) AS total_evaluaciones
                FROM casos_clinicos cc
                INNER JOIN cursos_secciones cs ON cc.id_curso = cs.id_curso
                INNER JOIN pacientes_simulados ps ON cc.id_paciente = ps.id_paciente
                LEFT JOIN radiografias r ON cc.id_caso = r.id_caso
                LEFT JOIN evaluaciones_estudiantes ee ON cc.id_caso = ee.id_caso
                WHERE cs.id_catedratico = p_id_catedratico
                GROUP BY cc.id_caso, cc.titulo_caso, cc.motivo_consulta, cc.nivel_dificultad,
                         cs.nombre_curso, ps.codigo_paciente, ps.edad, ps.genero,
                         r.id_radiografia, r.ruta_imagen, r.tipo_proyeccion
                ORDER BY cc.id_caso DESC;
            END
        `);
        console.log('✅ sp_obtener_casos_detallados - OK');

        // ============================================================
        // FIX 3: sp_obtener_detalle_caso (también usa tablas incorrectas probablemente)
        // ============================================================
        console.log('\n🔧 Recreando sp_obtener_detalle_caso...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_detalle_caso');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_detalle_caso(IN p_id_caso INT)
            BEGIN
                SELECT 
                    cc.id_caso,
                    cc.titulo_caso,
                    cc.motivo_consulta,
                    cc.nivel_dificultad,
                    cc.id_curso,
                    cs.nombre_curso,
                    ps.id_paciente,
                    ps.codigo_paciente,
                    ps.edad,
                    ps.genero,
                    ps.antecedentes_medicos,
                    r.id_radiografia,
                    r.ruta_imagen,
                    r.tipo_proyeccion
                FROM casos_clinicos cc
                INNER JOIN cursos_secciones cs ON cc.id_curso = cs.id_curso
                INNER JOIN pacientes_simulados ps ON cc.id_paciente = ps.id_paciente
                LEFT JOIN radiografias r ON cc.id_caso = r.id_caso
                WHERE cc.id_caso = p_id_caso
                LIMIT 1;
            END
        `);
        console.log('✅ sp_obtener_detalle_caso - OK');

        // ============================================================
        // Verificar los 3 SPs
        // ============================================================
        console.log('\n=== VERIFICACIÓN FINAL ===');
        
        await pool.query('CALL sp_obtener_estudiantes_resumen_catedratico(1)');
        console.log('✅ sp_obtener_estudiantes_resumen_catedratico ejecuta sin errores');
        
        await pool.query('CALL sp_obtener_casos_detallados(1)');
        console.log('✅ sp_obtener_casos_detallados ejecuta sin errores');

        await pool.query('CALL sp_obtener_detalle_caso(1)');
        console.log('✅ sp_obtener_detalle_caso ejecuta sin errores');

        console.log('\n🎉 Todos los SPs corregidos exitosamente');
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}
fix();

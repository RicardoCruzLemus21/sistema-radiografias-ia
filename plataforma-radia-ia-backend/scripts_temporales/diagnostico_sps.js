const pool = require('../src/config/database');

async function diagnosticar() {
    const sps = [
        'sp_obtener_total_casos_catedratico',
        'sp_obtener_estudiantes_resumen_catedratico',
        'sp_obtener_cursos_catedratico',
        'sp_obtener_estudiantes_por_curso',
        'sp_obtener_casos_detallados',
    ];

    console.log('=== DIAGNÓSTICO DE SPs ===\n');
    
    for (const sp of sps) {
        try {
            await pool.query(`CALL ${sp}(1)`);
            console.log(`✅ ${sp} - OK`);
        } catch(e) {
            console.log(`❌ ${sp} - ERROR: ${e.message}`);
        }
    }

    // Ver las columnas de tablas clave
    const tablas = ['cursos_secciones', 'asignaciones_estudiantes', 'usuarios', 'evaluaciones_estudiantes', 'casos_clinicos'];
    console.log('\n=== COLUMNAS DE TABLAS ===\n');
    for (const tabla of tablas) {
        try {
            const [cols] = await pool.query(`DESCRIBE ${tabla}`);
            console.log(`📋 ${tabla}: ${cols.map(c => c.Field).join(', ')}`);
        } catch(e) {
            console.log(`❌ ${tabla}: ${e.message}`);
        }
    }

    process.exit(0);
}
diagnosticar();

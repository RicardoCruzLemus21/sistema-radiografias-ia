const pool = require('../src/config/database');

const studentSPs = [
    { sp: 'sp_crear_evaluacion_cabecera', args: '1, 1, 1, 60' },
    { sp: 'sp_crear_detalle_hallazgo', args: '1, 1' },
    { sp: 'sp_crear_localizacion_lesion', args: '1, 1' },
    { sp: 'sp_obtener_catalogo_patologias', args: '' },
    { sp: 'sp_obtener_catalogo_regiones', args: '' },
    { sp: 'sp_obtener_evaluaciones_curso', args: '1' },
    { sp: 'sp_agregar_feedback_evaluacion', args: '1, "test"' },
    { sp: 'sp_invalidar_evaluacion', args: '1' },
    { sp: 'sp_guardar_calificacion_rubrica', args: '1, 1, 5' },
    { sp: 'sp_guardar_respuesta_likert', args: '1, 1, "test", 5' },
    { sp: 'sp_obtener_catalogo_cuestionarios', args: '' },
    { sp: 'sp_obtener_ruta_radiografia', args: '1' },
    { sp: 'sp_obtener_hallazgos_estudiante', args: '1' },
    { sp: 'sp_guardar_resultado_ia_y_concordancia', args: '1, 1, 90, 80, "Alta", "Baja", "test.jpg"' }
];

async function diagnosticarEstudiante() {
    console.log('=== DIAGNÓSTICO DE SPs DE ESTUDIANTES ===\n');

    let errores = [];
    for (const { sp, args } of studentSPs) {
        try {
            // Se usa START TRANSACTION para no guardar basura en la BD
            await pool.query('START TRANSACTION');
            await pool.query(`CALL ${sp}(${args})`);
            await pool.query('ROLLBACK');
            console.log(`✅ ${sp}`);
        } catch(e) {
            await pool.query('ROLLBACK');
            
            // Ignorar errores de Foreign Key porque estamos mandando IDs inventados (1, 1, etc.)
            // Nos importan los errores de sintaxis o tablas inexistentes
            if (e.message.includes('foreign key constraint fails')) {
                console.log(`✅ ${sp} (Validado, rechaza ID dummy correctamente)`);
            } else if (e.message.includes('Unknown column') || e.message.includes("doesn't exist")) {
                console.log(`❌ ${sp} - ERROR ESTRUCTURAL: ${e.message}`);
                errores.push({ sp, error: e.message });
            } else {
                console.log(`⚠️  ${sp} - Otro error: ${e.message}`);
            }
        }
    }

    if (errores.length === 0) {
        console.log('\n🎉 No se encontraron errores estructurales (nombres de tablas o columnas) en los SPs de estudiantes.');
    } else {
        console.log(`\n⚠️ Se encontraron ${errores.length} SPs de estudiantes con errores estructurales:`);
        errores.forEach(e => console.log(`  - ${e.sp}: ${e.error}`));
    }

    process.exit(0);
}
diagnosticarEstudiante();

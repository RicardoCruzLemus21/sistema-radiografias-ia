const pool = require('../src/config/database');

const actionSPs = [
    { sp: 'sp_obtener_info_correo_asignacion', args: '1, 1' },
    { sp: 'sp_editar_estudiante_basico', args: '1, "test", "test@test.com"' },
    { sp: 'sp_eliminar_estudiante_curso', args: '1, 1' },
    { sp: 'sp_editar_curso', args: '1, "test", "test", 2026' },
    { sp: 'sp_eliminar_curso', args: '1, 1' },
    { sp: 'sp_crear_paciente_simulado', args: '"PAC-TEST", 20, "M", "Ninguno"' },
    { sp: 'sp_crear_caso_clinico', args: '1, 1, "Test", "Test", "Fácil"' },
    { sp: 'sp_guardar_radiografia', args: '1, "PA", "test.jpg"' },
    { sp: 'sp_crear_caso_completo', args: '"PAC-T2", 20, "M", "N", 1, 1, "T", "M", "F", "PA", "r.jpg"' },
    { sp: 'sp_editar_caso_paciente', args: '1, "T", "M", "F", 1, 20, "M", "N"' },
    { sp: 'sp_eliminar_caso', args: '1' },
    { sp: 'sp_registrar_usuario', args: '1, "Test", "test2@test.com", "hash", "123"' },
    { sp: 'sp_asignar_curso_inicial', args: '1, "Test", 2026' },
    { sp: 'sp_editar_usuario_con_password', args: '1, "123", "Test", "test3@t.com", "h", 1' },
    { sp: 'sp_editar_usuario_sin_password', args: '1, "123", "Test", "test3@t.com", 1' },
    { sp: 'sp_registrar_auditoria_actividad', args: '1, "Acción", "Detalle"' }
];

async function diagnosticarAcciones() {
    console.log('=== DIAGNÓSTICO DE SPs DE ACCIÓN (CRUD) ===\n');

    let errores = [];
    for (const { sp, args } of actionSPs) {
        try {
            await pool.query('START TRANSACTION');
            await pool.query(`CALL ${sp}(${args})`);
            await pool.query('ROLLBACK');
            console.log(`✅ ${sp}`);
        } catch(e) {
            await pool.query('ROLLBACK');
            
            // Ignorar errores lógicos como Foreign Keys o validaciones internas
            if (e.message.includes('foreign key constraint fails') || 
                e.message.includes('No se pudo') || 
                e.message.includes('Duplicate entry')) {
                console.log(`✅ ${sp} (Validado correctamente)`);
            } else if (e.message.includes('Unknown column') || e.message.includes("doesn't exist")) {
                console.log(`❌ ${sp} - ERROR ESTRUCTURAL: ${e.message}`);
                errores.push({ sp, error: e.message });
            } else {
                console.log(`⚠️  ${sp} - ERROR POTENCIAL: ${e.message}`);
                // Agregar a errores potenciales si el mensaje parece indicar una falla de estructura
                if(e.message.includes('PROCEDURE') && e.message.includes('does not exist')) {
                    errores.push({ sp, error: e.message });
                }
            }
        }
    }

    if (errores.length === 0) {
        console.log('\n🎉 No se encontraron errores estructurales en los SPs de acción.');
    } else {
        console.log(`\n⚠️ Se encontraron ${errores.length} SPs con errores:`);
        errores.forEach(e => console.log(`  - ${e.sp}: ${e.error}`));
    }
    process.exit(0);
}
diagnosticarAcciones();

const pool = require('../src/config/database');

const adminSPs = [
    { sp: 'sp_obtener_auditoria_accesos', args: '' },
    { sp: 'sp_obtener_lista_usuarios', args: '' },
    { sp: 'sp_listar_usuarios_completos', args: '' },
    { sp: 'sp_obtener_todas_evaluaciones', args: '' },
    { sp: 'sp_obtener_roles', args: '' },
    { sp: 'sp_obtener_codigos_pacientes', args: '' },
    { sp: 'sp_obtener_catalogo_patologias', args: '' },
    { sp: 'sp_obtener_catalogo_regiones', args: '' },
    { sp: 'sp_obtener_catalogo_rubricas', args: '' },
    { sp: 'sp_obtener_catalogo_cuestionarios', args: '' },
    { sp: 'sp_obtener_resultados_likert', args: '' },
    { sp: 'sp_obtener_logs_actividad', args: '10' }
];

async function diagnosticarAdmin() {
    console.log('=== DIAGNÓSTICO DE SPs DE ADMINISTRADOR ===\n');

    let errores = 0;
    for (const { sp, args } of adminSPs) {
        try {
            await pool.query(`CALL ${sp}(${args})`);
            console.log(`✅ ${sp} - OK`);
        } catch(e) {
            console.log(`❌ ${sp} - ERROR: ${e.message}`);
            errores++;
        }
    }

    if (errores === 0) {
        console.log('\n🎉 Todos los SPs de administrador están funcionando perfectamente.');
    } else {
        console.log(`\n⚠️ Se encontraron ${errores} SPs de administrador rotos.`);
    }

    process.exit(0);
}
diagnosticarAdmin();

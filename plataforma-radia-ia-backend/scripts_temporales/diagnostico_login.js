const pool = require('../src/config/database');

const loginSPs = [
    { sp: 'sp_verificar_correo_existe', args: '"test@test.com"' },
    { sp: 'sp_obtener_usuario_por_correo', args: '"test@test.com"' },
    { sp: 'sp_cambiar_clave_inicial', args: '"hash", 1' }
];

async function diagnosticarLogin() {
    console.log('=== VERIFICANDO SPs DE INICIO DE SESIÓN ===\n');

    let errores = 0;
    for (const { sp, args } of loginSPs) {
        try {
            await pool.query('START TRANSACTION');
            await pool.query(`CALL ${sp}(${args})`);
            await pool.query('ROLLBACK');
            console.log(`✅ ${sp} - Funciona correctamente`);
        } catch(e) {
            await pool.query('ROLLBACK');
            if (e.message.includes('foreign key constraint fails') || e.message.includes('No se pudo')) {
                console.log(`✅ ${sp} - Funciona correctamente (rechazo de ID dummy validado)`);
            } else {
                console.log(`❌ ${sp} - ERROR: ${e.message}`);
                errores++;
            }
        }
    }

    if (errores === 0) {
        console.log('\n🎉 Ningún SP de inicio de sesión tiene errores estructurales.');
    }
    process.exit(0);
}
diagnosticarLogin();

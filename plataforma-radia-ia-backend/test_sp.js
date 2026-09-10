const db = require('./src/config/database');

async function testSp() {
    try {
        const [res] = await db.query('CALL sp_crear_caso_completo(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            'PAC-TEST', 30, 'M', 'Ninguno',
            1, 1, 'Caso de Prueba', 'Dolor', 'Básico',
            'Tórax', '/test.jpg'
        ]);
        console.log("Exito:", res);
    } catch (e) {
        console.error("Error SQL:", e.message);
    } finally {
        process.exit(0);
    }
}

testSp();

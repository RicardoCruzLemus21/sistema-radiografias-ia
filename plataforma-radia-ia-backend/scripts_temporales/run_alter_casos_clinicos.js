const db = require('../src/config/database');

async function runAlter() {
    try {
        await db.query(`
            ALTER TABLE Casos_Clinicos
            MODIFY id_curso INT NULL,
            MODIFY id_paciente INT NULL;
        `);
        console.log("Tabla Casos_Clinicos alterada con éxito (id_curso/id_paciente ahora nullable).");
    } catch (e) {
        console.error("Error alterando tabla:", e.message);
    } finally {
        process.exit(0);
    }
}
runAlter();

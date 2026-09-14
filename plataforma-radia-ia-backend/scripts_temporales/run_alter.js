const db = require('../src/config/database');

async function runAlter() {
    try {
        await db.query(`
            ALTER TABLE Evaluaciones_Estudiantes
            ADD COLUMN nivel_confianza INT DEFAULT 0 AFTER justificacion_clinica,
            ADD COLUMN marcador_estudiante JSON NULL AFTER nivel_confianza;
        `);
        console.log("Tabla alterada con éxito.");
    } catch (e) {
        console.error("Error alterando tabla:", e.message);
    } finally {
        process.exit(0);
    }
}
runAlter();

// Reiniciar el aprendizaje de UNA patología para un estudiante: borra su avance de lección/comparador,
// su historial de casos guiados/repaso de esa categoría y las tarjetas de repaso ligadas a ella.
// No toca evaluaciones_estudiantes (las notas de los ejercicios del curso quedan intactas): si algún caso
// de esa categoría se falló en un ejercicio real, su tarjeta de repaso se recrea sola en la próxima consulta.
const pool = require('../src/config/database');

const statements = [
    `DROP PROCEDURE IF EXISTS sp_apr_reiniciar_clase`,
    `CREATE PROCEDURE sp_apr_reiniciar_clase(IN p_est INT, IN p_clase VARCHAR(30))
    BEGIN
        START TRANSACTION;
        DELETE FROM aprendizaje_progreso WHERE id_estudiante = p_est AND clase = p_clase;
        DELETE FROM aprendizaje_intentos WHERE id_estudiante = p_est AND clase_objetivo = p_clase;
        DELETE FROM aprendizaje_tarjetas WHERE id_estudiante = p_est AND clase = p_clase;
        COMMIT;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ sp_apr_reiniciar_clase creado');
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

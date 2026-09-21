// La worklist del estudiante usaba un JOIN interno con Pacientes_Simulados: los casos NIH asignados
// desde el banco no tienen paciente (id_paciente NULL) y quedaban fuera. Ahora es LEFT JOIN, solo
// muestra casos 'disponible' (los 'pendiente' aún no pasan por la IA) e incluye el ejercicio.
const pool = require('../src/config/database');

const statements = [
    `DROP PROCEDURE IF EXISTS sp_obtener_worklist_estudiante`,
    `CREATE PROCEDURE sp_obtener_worklist_estudiante(IN p_id_estudiante INT)
    BEGIN
        SELECT
            c.id_caso AS id,
            p.codigo_paciente AS paciente,
            p.edad AS edad,
            -- El título (p. ej. "Caso NIH: Neumonia") revela la respuesta: el estudiante solo ve "Caso 1, 2, ..." dentro de su ejercicio
            CONVERT(CONCAT('Caso ', ROW_NUMBER() OVER (PARTITION BY c.id_curso, c.id_ejercicio ORDER BY c.id_caso)) USING utf8mb4) AS estudio,
            c.id_ejercicio,
            ej.nombre AS ejercicio,
            DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d') AS fecha,
            CASE WHEN EXISTS (
                SELECT 1 FROM evaluaciones_estudiantes ee
                WHERE ee.id_caso = c.id_caso AND ee.id_estudiante = p_id_estudiante
            ) THEN 'Completado' ELSE 'Pendiente' END AS estado
        FROM casos_clinicos c
        INNER JOIN asignaciones_estudiantes ae ON c.id_curso = ae.id_curso
        LEFT JOIN pacientes_simulados p ON c.id_paciente = p.id_paciente
        LEFT JOIN ejercicios ej ON c.id_ejercicio = ej.id_ejercicio
        WHERE ae.id_estudiante = p_id_estudiante AND c.estado = 'disponible'
        ORDER BY ej.numero, c.id_caso;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ sp_obtener_worklist_estudiante creado');
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

// Worklist con resultado por caso + retroalimentación completa de una respuesta ya enviada.
const pool = require('../src/config/database');

const statements = [
    // Worklist del estudiante: agrega id_evaluacion y puntaje (diagnóstico) de la última respuesta de cada caso
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
            ev.id_evaluacion,
            ROUND(ev.eje1_diagnostico) AS puntaje,
            CASE WHEN ev.id_evaluacion IS NOT NULL THEN 'Completado' ELSE 'Pendiente' END AS estado
        FROM casos_clinicos c
        INNER JOIN asignaciones_estudiantes ae ON c.id_curso = ae.id_curso
        LEFT JOIN pacientes_simulados p ON c.id_paciente = p.id_paciente
        LEFT JOIN ejercicios ej ON c.id_ejercicio = ej.id_ejercicio
        LEFT JOIN evaluaciones_estudiantes ev ON ev.id_evaluacion = (
            SELECT MAX(e2.id_evaluacion) FROM evaluaciones_estudiantes e2
            WHERE e2.id_caso = c.id_caso AND e2.id_estudiante = p_id_estudiante)
        WHERE ae.id_estudiante = p_id_estudiante AND c.estado = 'disponible'
        ORDER BY ej.numero, c.id_caso;
    END`,

    // ¿Ya respondió este estudiante este caso?
    `DROP PROCEDURE IF EXISTS sp_existe_evaluacion_estudiante`,
    `CREATE PROCEDURE sp_existe_evaluacion_estudiante(IN p_id_estudiante INT, IN p_id_caso INT)
    BEGIN
        SELECT COUNT(*) AS total FROM evaluaciones_estudiantes WHERE id_estudiante = p_id_estudiante AND id_caso = p_id_caso;
    END`,

    // Retroalimentación de una respuesta ya enviada: su respuesta + la verdad del caso.
    // Devuelve filas solo si el estudiante YA respondió (así no se puede espiar la verdad de un caso pendiente).
    `DROP PROCEDURE IF EXISTS sp_obtener_retroalimentacion_estudiante`,
    `CREATE PROCEDURE sp_obtener_retroalimentacion_estudiante(IN p_id_estudiante INT, IN p_id_caso INT)
    BEGIN
        DECLARE v_id_eval INT DEFAULT NULL;
        SELECT MAX(id_evaluacion) INTO v_id_eval FROM evaluaciones_estudiantes
        WHERE id_estudiante = p_id_estudiante AND id_caso = p_id_caso;

        SELECT ee.id_evaluacion, ee.fecha_evaluacion, ee.tiempo_analisis_segundos, ee.justificacion_clinica, ee.nivel_confianza,
               ee.marcador_estudiante, ee.eje1_diagnostico, ee.eje2_localizacion, ee.eje3_calibracion,
               c.hallazgos_docente, r.ruta_imagen
        FROM evaluaciones_estudiantes ee
        INNER JOIN casos_clinicos c ON c.id_caso = ee.id_caso
        LEFT JOIN radiografias r ON r.id_caso = c.id_caso
        WHERE ee.id_evaluacion = v_id_eval
        LIMIT 1;

        SELECT cp.id_patologia, cp.nombre_patologia
        FROM detalle_hallazgos_estudiante d
        INNER JOIN catalogo_patologias cp ON cp.id_patologia = d.id_patologia
        WHERE d.id_evaluacion = v_id_eval;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ worklist con puntaje, sp_existe_evaluacion_estudiante y sp_obtener_retroalimentacion_estudiante creados');
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

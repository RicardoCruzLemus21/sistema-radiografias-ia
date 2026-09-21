// Datos de apoyo para generar notificaciones: curso, estudiantes de un curso, progreso en un ejercicio y dueño de una evaluación.
const pool = require('../src/config/database');

const statements = [
    `DROP PROCEDURE IF EXISTS sp_datos_curso_notificacion`,
    `CREATE PROCEDURE sp_datos_curso_notificacion(IN p_id_curso INT)
    BEGIN
        SELECT id_curso, nombre_curso, id_catedratico FROM cursos_secciones WHERE id_curso = p_id_curso;
    END`,

    `DROP PROCEDURE IF EXISTS sp_ids_estudiantes_curso`,
    `CREATE PROCEDURE sp_ids_estudiantes_curso(IN p_id_curso INT)
    BEGIN
        SELECT id_estudiante FROM asignaciones_estudiantes WHERE id_curso = p_id_curso;
    END`,

    // Después de responder un caso: ¿cuántos casos lleva el estudiante en ese ejercicio?
    // Si el caso no pertenece a un ejercicio, total y resueltos valen 1 (aviso por caso).
    `DROP PROCEDURE IF EXISTS sp_progreso_ejercicio_estudiante`,
    `CREATE PROCEDURE sp_progreso_ejercicio_estudiante(IN p_id_estudiante INT, IN p_id_caso INT)
    BEGIN
        DECLARE v_ejercicio INT DEFAULT NULL;
        SELECT id_ejercicio INTO v_ejercicio FROM casos_clinicos WHERE id_caso = p_id_caso;

        SELECT
            v_ejercicio AS id_ejercicio,
            ej.nombre AS ejercicio,
            cs.id_curso,
            cs.nombre_curso,
            cs.id_catedratico,
            u.nombre_completo AS nombre_estudiante,
            CASE WHEN v_ejercicio IS NULL THEN 1 ELSE
                (SELECT COUNT(*) FROM casos_clinicos c2 WHERE c2.id_ejercicio = v_ejercicio) END AS total_casos,
            CASE WHEN v_ejercicio IS NULL THEN 1 ELSE
                (SELECT COUNT(DISTINCT e2.id_caso) FROM evaluaciones_estudiantes e2
                 INNER JOIN casos_clinicos c3 ON c3.id_caso = e2.id_caso
                 WHERE e2.id_estudiante = p_id_estudiante AND c3.id_ejercicio = v_ejercicio) END AS resueltos,
            CASE WHEN v_ejercicio IS NULL THEN
                (SELECT ROUND(AVG(e4.eje1_diagnostico)) FROM evaluaciones_estudiantes e4 WHERE e4.id_estudiante = p_id_estudiante AND e4.id_caso = p_id_caso)
            ELSE
                (SELECT ROUND(AVG(e5.eje1_diagnostico)) FROM evaluaciones_estudiantes e5
                 INNER JOIN casos_clinicos c5 ON c5.id_caso = e5.id_caso
                 WHERE e5.id_estudiante = p_id_estudiante AND c5.id_ejercicio = v_ejercicio) END AS promedio
        FROM casos_clinicos cc
        INNER JOIN cursos_secciones cs ON cs.id_curso = cc.id_curso
        INNER JOIN usuarios u ON u.id_usuario = p_id_estudiante
        LEFT JOIN ejercicios ej ON ej.id_ejercicio = cc.id_ejercicio
        WHERE cc.id_caso = p_id_caso;
    END`,

    // Dueño de una evaluación (para avisarle que el docente comentó su respuesta)
    `DROP PROCEDURE IF EXISTS sp_dueno_evaluacion`,
    `CREATE PROCEDURE sp_dueno_evaluacion(IN p_id_evaluacion INT)
    BEGIN
        SELECT ee.id_estudiante, ee.id_caso, cc.id_ejercicio, ej.nombre AS ejercicio
        FROM evaluaciones_estudiantes ee
        INNER JOIN casos_clinicos cc ON cc.id_caso = ee.id_caso
        LEFT JOIN ejercicios ej ON ej.id_ejercicio = cc.id_ejercicio
        WHERE ee.id_evaluacion = p_id_evaluacion;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ SPs de apoyo para notificaciones creados');
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

// Informe PDF de calificaciones por ejercicio (o por conjunto de ejercicios) para el docente.
const pool = require('../src/config/database');

const statements = [
    // Ejercicios de todos los cursos del docente (para elegirlos en el informe)
    `DROP PROCEDURE IF EXISTS sp_listar_ejercicios_catedratico`,
    `CREATE PROCEDURE sp_listar_ejercicios_catedratico(IN p_id_catedratico INT)
    BEGIN
        SELECT ej.id_ejercicio, ej.id_curso, cs.nombre_curso, ej.numero, ej.nombre, ej.fecha_creacion,
               (SELECT COUNT(*) FROM casos_clinicos c WHERE c.id_ejercicio = ej.id_ejercicio) AS total_casos
        FROM ejercicios ej
        INNER JOIN cursos_secciones cs ON cs.id_curso = ej.id_curso
        WHERE cs.id_catedratico = p_id_catedratico
        ORDER BY ej.id_curso, ej.numero;
    END`,

    // Una fila por (ejercicio, estudiante inscrito en el curso), aunque aún no haya resuelto nada
    `DROP PROCEDURE IF EXISTS sp_informe_calificaciones`,
    `CREATE PROCEDURE sp_informe_calificaciones(IN p_id_catedratico INT, IN p_id_curso INT, IN p_ids_ejercicios_csv VARCHAR(500))
    BEGIN
        SELECT
            ej.id_ejercicio,
            ej.numero AS ejercicio_numero,
            ej.nombre AS ejercicio,
            u.id_usuario,
            u.carnet,
            u.nombre_completo AS estudiante,
            COUNT(DISTINCT c.id_caso) AS total_casos,
            COUNT(DISTINCT ee.id_caso) AS casos_resueltos,
            ROUND(AVG(ee.eje1_diagnostico), 1) AS prom_diagnostico,
            ROUND(AVG(ee.eje2_localizacion), 1) AS prom_localizacion,
            ROUND(AVG(ee.eje3_calibracion), 1) AS prom_calibracion,
            ROUND(AVG(ee.tiempo_analisis_segundos)) AS tiempo_promedio_seg
        FROM ejercicios ej
        INNER JOIN cursos_secciones cs ON cs.id_curso = ej.id_curso AND cs.id_catedratico = p_id_catedratico
        INNER JOIN asignaciones_estudiantes ae ON ae.id_curso = ej.id_curso
        INNER JOIN usuarios u ON u.id_usuario = ae.id_estudiante
        LEFT JOIN casos_clinicos c ON c.id_ejercicio = ej.id_ejercicio
        LEFT JOIN evaluaciones_estudiantes ee ON ee.id_caso = c.id_caso AND ee.id_estudiante = u.id_usuario
        WHERE ej.id_curso = p_id_curso AND FIND_IN_SET(ej.id_ejercicio, p_ids_ejercicios_csv) > 0
        GROUP BY ej.id_ejercicio, ej.numero, ej.nombre, u.id_usuario, u.carnet, u.nombre_completo
        ORDER BY ej.numero, u.nombre_completo;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ sp_listar_ejercicios_catedratico y sp_informe_calificaciones creados');
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

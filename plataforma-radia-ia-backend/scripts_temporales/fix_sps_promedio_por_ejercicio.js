// La precisión promedio general de un estudiante es el promedio de los porcentajes de sus ejercicios
// (cada ejercicio pesa igual, redondeado a entero como se muestra), y no el promedio de todos sus casos sueltos.
// Además, si un caso quedó respondido más de una vez (datos antiguos), solo cuenta la última respuesta.
// Los casos sin ejercicio forman un grupo aparte ("Casos individuales") que pesa como un ejercicio más.
const pool = require('../src/config/database');

// Subconsulta: promedio por ejercicio de cada estudiante (última respuesta de cada caso)
const porEjercicio = (filtroExtra = '', joinExtra = '') => `
    SELECT ee.id_estudiante, COALESCE(cc.id_ejercicio, 0) AS grupo,
           ROUND(AVG(ee.eje1_diagnostico)) AS prom_ej, COUNT(*) AS casos
    FROM evaluaciones_estudiantes ee
    INNER JOIN casos_clinicos cc ON cc.id_caso = ee.id_caso
    ${joinExtra}
    WHERE ee.id_evaluacion = (SELECT MAX(e2.id_evaluacion) FROM evaluaciones_estudiantes e2
                              WHERE e2.id_estudiante = ee.id_estudiante AND e2.id_caso = ee.id_caso)
    ${filtroExtra}
    GROUP BY ee.id_estudiante, COALESCE(cc.id_ejercicio, 0)`;

const statements = [
    // Panel del docente: una fila por estudiante inscrito en sus cursos (solo cuentan casos de los cursos de este docente)
    `DROP PROCEDURE IF EXISTS sp_obtener_estudiantes_resumen_catedratico`,
    `CREATE PROCEDURE sp_obtener_estudiantes_resumen_catedratico(IN p_id_catedratico INT)
    BEGIN
        SELECT
            u.id_usuario AS id,
            u.carnet,
            u.nombre_completo AS nombre,
            u.correo_electronico AS correo,
            COALESCE(pr.casos, 0) AS casosResueltos,
            COALESCE(pr.promedio, 0) AS precision_promedio
        FROM usuarios u
        INNER JOIN asignaciones_estudiantes ae ON u.id_usuario = ae.id_estudiante
        INNER JOIN cursos_secciones cs ON ae.id_curso = cs.id_curso
        LEFT JOIN (
            SELECT g.id_estudiante, ROUND(AVG(g.prom_ej), 1) AS promedio, SUM(g.casos) AS casos
            FROM (${porEjercicio('', 'INNER JOIN cursos_secciones cs2 ON cs2.id_curso = cc.id_curso AND cs2.id_catedratico = p_id_catedratico')}) g
            GROUP BY g.id_estudiante
        ) pr ON pr.id_estudiante = u.id_usuario
        WHERE cs.id_catedratico = p_id_catedratico
        GROUP BY u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico, pr.casos, pr.promedio;
    END`,

    // Panel del estudiante
    `DROP PROCEDURE IF EXISTS sp_obtener_resumen_estudiante_edu`,
    `CREATE PROCEDURE sp_obtener_resumen_estudiante_edu(IN p_id_estudiante INT)
    BEGIN
        SELECT COALESCE(SUM(g.casos), 0) AS casos_resueltos, COALESCE(ROUND(AVG(g.prom_ej), 1), 0) AS precision_promedio
        FROM (${porEjercicio('AND ee.id_estudiante = p_id_estudiante')}) g;

        SELECT c.nivel_dificultad, COUNT(*) AS total, ROUND(AVG(e.eje1_diagnostico)) AS precision_promedio
        FROM evaluaciones_estudiantes e
        JOIN Casos_Clinicos c ON e.id_caso = c.id_caso
        WHERE e.id_estudiante = p_id_estudiante
          AND e.id_evaluacion = (SELECT MAX(e3.id_evaluacion) FROM evaluaciones_estudiantes e3 WHERE e3.id_estudiante = e.id_estudiante AND e3.id_caso = e.id_caso)
        GROUP BY c.nivel_dificultad;
    END`,

    // "Mi Rendimiento"
    `DROP PROCEDURE IF EXISTS sp_obtener_mi_rendimiento_estadisticas`,
    `CREATE PROCEDURE sp_obtener_mi_rendimiento_estadisticas(IN p_id_estudiante INT)
    BEGIN
        SELECT COALESCE(SUM(g.casos), 0) AS total_casos, COALESCE(ROUND(AVG(g.prom_ej), 1), 0) AS precision_promedio
        FROM (${porEjercicio('AND ee.id_estudiante = p_id_estudiante')}) g;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ 3 procedimientos actualizados: promedio general = promedio de los ejercicios');
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

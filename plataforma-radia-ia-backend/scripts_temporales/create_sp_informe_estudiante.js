// Informe individual de un estudiante (evolución del diagnóstico). Solo devuelve datos si el estudiante
// está inscrito en un curso del docente y solo cuenta evaluaciones de casos de los cursos de ese docente.
const pool = require('../src/config/database');

const statements = [
    `DROP PROCEDURE IF EXISTS sp_informe_estudiante`,
    `CREATE PROCEDURE sp_informe_estudiante(IN p_id_catedratico INT, IN p_id_estudiante INT, IN p_ids_ejercicios_csv VARCHAR(500))
    BEGIN
        -- 1) Datos del estudiante (vacío si no está inscrito en ningún curso del docente)
        SELECT u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico,
               GROUP_CONCAT(DISTINCT cs.nombre_curso ORDER BY cs.nombre_curso SEPARATOR ', ') AS cursos
        FROM usuarios u
        INNER JOIN asignaciones_estudiantes ae ON ae.id_estudiante = u.id_usuario
        INNER JOIN cursos_secciones cs ON cs.id_curso = ae.id_curso AND cs.id_catedratico = p_id_catedratico
        WHERE u.id_usuario = p_id_estudiante
        GROUP BY u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico;

        -- 2) Evaluaciones en orden cronológico
        SELECT ee.id_evaluacion, ee.fecha_evaluacion,
               cc.id_ejercicio, ej.nombre AS ejercicio, ej.numero AS ejercicio_numero,
               cc.id_caso, cc.titulo_caso, cc.nivel_dificultad,
               ee.eje1_diagnostico, ee.eje2_localizacion, ee.eje3_calibracion,
               ee.nivel_confianza, ee.tiempo_analisis_segundos
        FROM evaluaciones_estudiantes ee
        INNER JOIN casos_clinicos cc ON cc.id_caso = ee.id_caso
        INNER JOIN cursos_secciones cs ON cs.id_curso = cc.id_curso AND cs.id_catedratico = p_id_catedratico
        LEFT JOIN ejercicios ej ON ej.id_ejercicio = cc.id_ejercicio
        WHERE ee.id_estudiante = p_id_estudiante
          AND (p_ids_ejercicios_csv IS NULL OR p_ids_ejercicios_csv = '' OR FIND_IN_SET(cc.id_ejercicio, p_ids_ejercicios_csv) > 0)
        ORDER BY ee.fecha_evaluacion, ee.id_evaluacion;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ sp_informe_estudiante creado');
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

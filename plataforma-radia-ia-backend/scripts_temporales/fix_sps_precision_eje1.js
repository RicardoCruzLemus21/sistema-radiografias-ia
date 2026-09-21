// La precisión que ve el docente (y "Mi Rendimiento" del estudiante) salía de Concordancia_Diagnostica,
// una tabla del flujo anterior que ya no se llena (0 filas). El flujo educativo guarda el puntaje de
// diagnóstico en Evaluaciones_Estudiantes.eje1_diagnostico: es el mismo valor que el estudiante ve en su panel.
const pool = require('../src/config/database');

const statements = [
    `DROP PROCEDURE IF EXISTS sp_obtener_estudiantes_resumen_catedratico`,
    `CREATE PROCEDURE sp_obtener_estudiantes_resumen_catedratico(IN p_id_catedratico INT)
    BEGIN
        SELECT
            u.id_usuario AS id,
            u.carnet,
            u.nombre_completo AS nombre,
            u.correo_electronico AS correo,
            COUNT(DISTINCT ee.id_evaluacion) AS casosResueltos,
            COALESCE(ROUND(AVG(ee.eje1_diagnostico)), 0) AS precision_promedio
        FROM usuarios u
        INNER JOIN asignaciones_estudiantes ae ON u.id_usuario = ae.id_estudiante
        INNER JOIN cursos_secciones cs ON ae.id_curso = cs.id_curso
        LEFT JOIN evaluaciones_estudiantes ee ON u.id_usuario = ee.id_estudiante
        WHERE cs.id_catedratico = p_id_catedratico
        GROUP BY u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico;
    END`,

    `DROP PROCEDURE IF EXISTS sp_obtener_estadisticas_curso`,
    `CREATE PROCEDURE sp_obtener_estadisticas_curso(IN p_id_curso INT)
    BEGIN
        SELECT
            cc.nivel_dificultad AS nivel,
            COUNT(ee.id_evaluacion) AS total_evaluaciones,
            COALESCE(ROUND(AVG(ee.eje1_diagnostico)), 0) AS precision_promedio,
            COALESCE(AVG(ee.tiempo_analisis_segundos), 0) AS tiempo_promedio_seg
        FROM casos_clinicos cc
        LEFT JOIN evaluaciones_estudiantes ee ON cc.id_caso = ee.id_caso
        WHERE cc.id_curso = p_id_curso
        GROUP BY cc.nivel_dificultad;
    END`,

    `DROP PROCEDURE IF EXISTS sp_obtener_detalle_estudiante_evaluaciones`,
    `CREATE PROCEDURE sp_obtener_detalle_estudiante_evaluaciones(IN p_id_estudiante INT)
    BEGIN
        SELECT
            ee.id_evaluacion,
            ee.id_caso,
            ee.fecha_evaluacion,
            ee.tiempo_analisis_segundos,
            ee.justificacion_clinica,
            ee.feedback_profesor,
            cc.titulo_caso,
            cc.nivel_dificultad,
            cc.id_ejercicio,
            ej.nombre AS ejercicio,
            ej.numero AS ejercicio_numero,
            COALESCE(ROUND(ee.eje1_diagnostico), 0) AS concordancia_ia,
            CASE WHEN ee.eje1_diagnostico >= 80 THEN 'Alta'
                 WHEN ee.eje1_diagnostico >= 50 THEN 'Media'
                 ELSE 'Baja' END AS nivel_precision,
            COUNT(dhe.id_detalle_hallazgo) AS total_hallazgos_detectados
        FROM evaluaciones_estudiantes ee
        INNER JOIN casos_clinicos cc ON ee.id_caso = cc.id_caso
        LEFT JOIN ejercicios ej ON cc.id_ejercicio = ej.id_ejercicio
        LEFT JOIN detalle_hallazgos_estudiante dhe ON ee.id_evaluacion = dhe.id_evaluacion
        WHERE ee.id_estudiante = p_id_estudiante
        GROUP BY ee.id_evaluacion, ee.id_caso, ee.fecha_evaluacion, ee.tiempo_analisis_segundos,
                 ee.justificacion_clinica, ee.feedback_profesor, cc.titulo_caso,
                 cc.nivel_dificultad, cc.id_ejercicio, ej.nombre, ej.numero, ee.eje1_diagnostico
        ORDER BY ej.numero, ee.fecha_evaluacion DESC;
    END`,

    `DROP PROCEDURE IF EXISTS sp_obtener_mi_rendimiento_estadisticas`,
    `CREATE PROCEDURE sp_obtener_mi_rendimiento_estadisticas(IN p_id_estudiante INT)
    BEGIN
        SELECT
            COUNT(DISTINCT ee.id_caso) AS total_casos,
            COALESCE(ROUND(AVG(ee.eje1_diagnostico)), 0) AS precision_promedio
        FROM evaluaciones_estudiantes ee
        WHERE ee.id_estudiante = p_id_estudiante;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ 4 procedimientos actualizados para usar eje1_diagnostico');
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

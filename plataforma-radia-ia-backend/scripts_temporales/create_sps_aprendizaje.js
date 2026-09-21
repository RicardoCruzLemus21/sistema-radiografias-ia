// Procedimientos almacenados del módulo de aprendizaje.
const pool = require('../src/config/database');

// Un caso del banco global sirve para practicar si: es del NIH, está disponible y su imagen NO forma parte de un
// ejercicio de los cursos del estudiante (esos casos se evalúan, no se practican: verlos antes revelaría la respuesta).
const ELEGIBLE_BANCO = (c = 'c', r = 'r') => `
        ${c}.origen = 'nih' AND ${c}.id_curso IS NULL AND ${c}.estado = 'disponible' AND ${c}.hallazgos_docente IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM casos_clinicos cx
            JOIN radiografias rx ON rx.id_caso = cx.id_caso
            JOIN asignaciones_estudiantes ae ON ae.id_curso = cx.id_curso
            WHERE ae.id_estudiante = p_est AND rx.ruta_imagen = ${r}.ruta_imagen)`;

const statements = [
    // ===== Progreso y resumen del estudiante =====
    `DROP PROCEDURE IF EXISTS sp_apr_progreso`,
    `CREATE PROCEDURE sp_apr_progreso(IN p_est INT)
    BEGIN
        SELECT clase, leccion_vista, comparador_visto FROM aprendizaje_progreso WHERE id_estudiante = p_est;

        -- Últimos 10 intentos guiados de cada categoría
        SELECT t.clase_objetivo AS clase, COUNT(*) AS intentos, SUM(t.resultado = 'acierto') AS aciertos
        FROM (
            SELECT clase_objetivo, resultado,
                   ROW_NUMBER() OVER (PARTITION BY clase_objetivo ORDER BY fecha DESC, id_intento DESC) AS rn
            FROM aprendizaje_intentos
            WHERE id_estudiante = p_est AND origen = 'guiado' AND clase_objetivo IS NOT NULL
        ) t
        WHERE t.rn <= 10
        GROUP BY t.clase_objetivo;

        SELECT COUNT(*) AS total, SUM(due <= NOW()) AS vencidas, MIN(CASE WHEN due > NOW() THEN due END) AS proxima
        FROM aprendizaje_tarjetas WHERE id_estudiante = p_est;
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_marcar_paso`,
    `CREATE PROCEDURE sp_apr_marcar_paso(IN p_est INT, IN p_clase VARCHAR(30), IN p_paso VARCHAR(20))
    BEGIN
        INSERT INTO aprendizaje_progreso (id_estudiante, clase, leccion_vista, comparador_visto)
        VALUES (p_est, p_clase, IF(p_paso = 'leccion', 1, 0), IF(p_paso = 'comparador', 1, 0))
        ON DUPLICATE KEY UPDATE
            leccion_vista = IF(p_paso = 'leccion', 1, leccion_vista),
            comparador_visto = IF(p_paso = 'comparador', 1, comparador_visto);
    END`,

    // ===== Lecciones y explicaciones =====
    `DROP PROCEDURE IF EXISTS sp_apr_leccion`,
    `CREATE PROCEDURE sp_apr_leccion(IN p_clase VARCHAR(30))
    BEGIN
        SELECT contenido FROM aprendizaje_lecciones WHERE clase = p_clase AND estado = 'aprobado';
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_lecciones_admin`,
    `CREATE PROCEDURE sp_apr_lecciones_admin()
    BEGIN
        SELECT l.clase, l.contenido, l.estado, l.fecha_revision, u.nombre_completo AS revisado_por
        FROM aprendizaje_lecciones l LEFT JOIN usuarios u ON u.id_usuario = l.revisado_por
        ORDER BY l.clase;
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_guardar_leccion`,
    `CREATE PROCEDURE sp_apr_guardar_leccion(IN p_clase VARCHAR(30), IN p_contenido LONGTEXT, IN p_estado VARCHAR(20), IN p_docente INT)
    BEGIN
        UPDATE aprendizaje_lecciones
        SET contenido = p_contenido, estado = p_estado, revisado_por = p_docente, fecha_revision = NOW()
        WHERE clase = p_clase;
        SELECT ROW_COUNT() AS filas;
    END`,

    // La explicación aprobada de un par. Si hay una de IA aprobada se prefiere sobre la plantilla.
    `DROP PROCEDURE IF EXISTS sp_apr_explicacion`,
    `CREATE PROCEDURE sp_apr_explicacion(IN p_real VARCHAR(30), IN p_marcada VARCHAR(30))
    BEGIN
        SELECT contenido, origen FROM aprendizaje_explicaciones
        WHERE clase_real = p_real AND clase_marcada = p_marcada AND estado = 'aprobada'
        ORDER BY (origen = 'ia') DESC
        LIMIT 1;
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_explicaciones_admin`,
    `CREATE PROCEDURE sp_apr_explicaciones_admin(IN p_estado VARCHAR(20))
    BEGIN
        SELECT e.id_explicacion, e.clase_real, e.clase_marcada, e.contenido, e.origen, e.modelo, e.estado,
               e.fecha_creacion, e.fecha_revision, u.nombre_completo AS revisado_por
        FROM aprendizaje_explicaciones e LEFT JOIN usuarios u ON u.id_usuario = e.revisado_por
        WHERE p_estado IS NULL OR p_estado = '' OR e.estado = p_estado
        ORDER BY e.origen DESC, e.clase_real, e.clase_marcada;
    END`,

    // Pares para los que todavía no existe una explicación generada con IA
    `DROP PROCEDURE IF EXISTS sp_apr_pares_ia_faltantes`,
    `CREATE PROCEDURE sp_apr_pares_ia_faltantes()
    BEGIN
        SELECT a.clase AS clase_real, b.clase AS clase_marcada
        FROM aprendizaje_lecciones a
        JOIN aprendizaje_lecciones b ON b.clase <> a.clase
        LEFT JOIN aprendizaje_explicaciones e ON e.clase_real = a.clase AND e.clase_marcada = b.clase AND e.origen = 'ia'
        WHERE e.id_explicacion IS NULL
        ORDER BY a.clase, b.clase;
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_insertar_explicacion_ia`,
    `CREATE PROCEDURE sp_apr_insertar_explicacion_ia(IN p_real VARCHAR(30), IN p_marcada VARCHAR(30), IN p_contenido LONGTEXT, IN p_modelo VARCHAR(60))
    BEGIN
        INSERT IGNORE INTO aprendizaje_explicaciones (clase_real, clase_marcada, contenido, origen, modelo, estado)
        VALUES (p_real, p_marcada, p_contenido, 'ia', p_modelo, 'pendiente');
        SELECT ROW_COUNT() AS filas;
    END`,

    // El docente edita y/o cambia el estado de una explicación
    `DROP PROCEDURE IF EXISTS sp_apr_revisar_explicacion`,
    `CREATE PROCEDURE sp_apr_revisar_explicacion(IN p_id INT, IN p_contenido LONGTEXT, IN p_estado VARCHAR(20), IN p_docente INT)
    BEGIN
        UPDATE aprendizaje_explicaciones
        SET contenido = p_contenido, estado = p_estado, revisado_por = p_docente, fecha_revision = NOW()
        WHERE id_explicacion = p_id;
        SELECT ROW_COUNT() AS filas;
    END`,

    // ===== Casos para practicar =====
    // Casos del banco con la categoría dada. p_puro = 1: solo casos con una única etiqueta (más claros para enseñar).
    `DROP PROCEDURE IF EXISTS sp_apr_casos_practica`,
    `CREATE PROCEDURE sp_apr_casos_practica(IN p_est INT, IN p_clase VARCHAR(30), IN p_puro TINYINT, IN p_limite INT, IN p_excluir_csv TEXT)
    BEGIN
        SELECT c.id_caso, r.ruta_imagen
        FROM casos_clinicos c
        JOIN radiografias r ON r.id_caso = c.id_caso
        WHERE ${ELEGIBLE_BANCO('c', 'r')}
          AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_clase), '$.etiquetas_reales')
          AND (p_puro = 0 OR JSON_LENGTH(c.hallazgos_docente, '$.etiquetas_reales') = 1)
          AND (p_excluir_csv IS NULL OR p_excluir_csv = '' OR FIND_IN_SET(c.id_caso, p_excluir_csv) = 0)
        ORDER BY RAND()
        LIMIT p_limite;
    END`,

    // Un caso concreto, solo si es elegible para practicar (comprobación antes de revelar su verdad)
    `DROP PROCEDURE IF EXISTS sp_apr_caso_practica`,
    `CREATE PROCEDURE sp_apr_caso_practica(IN p_est INT, IN p_id_caso INT)
    BEGIN
        SELECT c.id_caso, r.ruta_imagen, c.hallazgos_docente
        FROM casos_clinicos c
        JOIN radiografias r ON r.id_caso = c.id_caso
        WHERE c.id_caso = p_id_caso AND ${ELEGIBLE_BANCO('c', 'r')};
    END`,

    // Un caso de repaso: solo si el estudiante tiene una tarjeta de él
    `DROP PROCEDURE IF EXISTS sp_apr_caso_tarjeta`,
    `CREATE PROCEDURE sp_apr_caso_tarjeta(IN p_est INT, IN p_id_caso INT)
    BEGIN
        SELECT c.id_caso, r.ruta_imagen, c.hallazgos_docente, t.clase
        FROM aprendizaje_tarjetas t
        JOIN casos_clinicos c ON c.id_caso = t.id_caso
        JOIN radiografias r ON r.id_caso = c.id_caso
        WHERE t.id_estudiante = p_est AND t.id_caso = p_id_caso;
    END`,

    // Dos ejemplos para el comparador: una categoría y otra. Solo casos con una única etiqueta, para que el contraste sea claro.
    `DROP PROCEDURE IF EXISTS sp_apr_ejemplo_comparador`,
    `CREATE PROCEDURE sp_apr_ejemplo_comparador(IN p_est INT, IN p_clase VARCHAR(30), IN p_excluir INT)
    BEGIN
        SELECT c.id_caso, r.ruta_imagen, c.hallazgos_docente
        FROM casos_clinicos c
        JOIN radiografias r ON r.id_caso = c.id_caso
        WHERE ${ELEGIBLE_BANCO('c', 'r')}
          AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_clase), '$.etiquetas_reales')
          AND JSON_LENGTH(c.hallazgos_docente, '$.etiquetas_reales') = 1
          AND (p_excluir IS NULL OR c.id_caso <> p_excluir)
        ORDER BY RAND()
        LIMIT 1;
    END`,

    // ===== Intentos y tarjetas =====
    `DROP PROCEDURE IF EXISTS sp_apr_registrar_intento`,
    `CREATE PROCEDURE sp_apr_registrar_intento(IN p_est INT, IN p_caso INT, IN p_clase VARCHAR(30), IN p_origen VARCHAR(10),
                                                 IN p_marcadas VARCHAR(255), IN p_reales VARCHAR(255), IN p_resultado VARCHAR(10),
                                                 IN p_pista TINYINT, IN p_tiempo INT)
    BEGIN
        INSERT INTO aprendizaje_intentos (id_estudiante, id_caso, clase_objetivo, origen, marcadas, etiquetas_reales, resultado, uso_pista, tiempo_seg)
        VALUES (p_est, p_caso, p_clase, p_origen, p_marcadas, p_reales, p_resultado, p_pista, p_tiempo);
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_tarjeta`,
    `CREATE PROCEDURE sp_apr_tarjeta(IN p_est INT, IN p_caso INT)
    BEGIN
        SELECT estado_fsrs, repasos FROM aprendizaje_tarjetas WHERE id_estudiante = p_est AND id_caso = p_caso;
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_guardar_tarjeta`,
    `CREATE PROCEDURE sp_apr_guardar_tarjeta(IN p_est INT, IN p_caso INT, IN p_clase VARCHAR(30), IN p_due DATETIME, IN p_estado LONGTEXT, IN p_resultado VARCHAR(10))
    BEGIN
        INSERT INTO aprendizaje_tarjetas (id_estudiante, id_caso, clase, due, estado_fsrs, ultimo_resultado, repasos)
        VALUES (p_est, p_caso, p_clase, p_due, p_estado, p_resultado, 1)
        ON DUPLICATE KEY UPDATE due = p_due, estado_fsrs = p_estado, ultimo_resultado = p_resultado, repasos = repasos + 1;
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_tarjetas_vencidas`,
    `CREATE PROCEDURE sp_apr_tarjetas_vencidas(IN p_est INT, IN p_limite INT)
    BEGIN
        SELECT t.id_caso, t.clase, r.ruta_imagen
        FROM aprendizaje_tarjetas t
        JOIN radiografias r ON r.id_caso = t.id_caso
        WHERE t.id_estudiante = p_est AND t.due <= NOW()
        ORDER BY t.due
        LIMIT p_limite;
    END`,

    // ===== Datos para "Mis errores" y para crear tarjetas desde los ejercicios =====
    // Última respuesta de cada caso evaluado, con las categorías marcadas y la verdad del caso
    `DROP PROCEDURE IF EXISTS sp_apr_evaluaciones_estudiante`,
    `CREATE PROCEDURE sp_apr_evaluaciones_estudiante(IN p_est INT)
    BEGIN
        SELECT ee.id_evaluacion, ee.id_caso, ee.fecha_evaluacion, ee.nivel_confianza, ee.eje1_diagnostico,
               c.hallazgos_docente,
               (SELECT GROUP_CONCAT(cp.nombre_patologia SEPARATOR '|')
                FROM detalle_hallazgos_estudiante d JOIN catalogo_patologias cp ON cp.id_patologia = d.id_patologia
                WHERE d.id_evaluacion = ee.id_evaluacion) AS marcadas
        FROM evaluaciones_estudiantes ee
        JOIN casos_clinicos c ON c.id_caso = ee.id_caso
        WHERE ee.id_estudiante = p_est
          AND ee.id_evaluacion = (SELECT MAX(e2.id_evaluacion) FROM evaluaciones_estudiantes e2 WHERE e2.id_estudiante = ee.id_estudiante AND e2.id_caso = ee.id_caso)
        ORDER BY ee.fecha_evaluacion;
    END`,

    `DROP PROCEDURE IF EXISTS sp_apr_intentos_estudiante`,
    `CREATE PROCEDURE sp_apr_intentos_estudiante(IN p_est INT)
    BEGIN
        SELECT id_caso, clase_objetivo, origen, marcadas, etiquetas_reales, resultado, fecha
        FROM aprendizaje_intentos WHERE id_estudiante = p_est ORDER BY fecha;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log(`✅ ${statements.filter(s => s.startsWith('CREATE')).length} procedimientos del módulo de aprendizaje creados`);
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

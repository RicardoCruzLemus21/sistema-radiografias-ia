// Convierte a Stored Procedures todo el SQL que vivía "quemado" en clinicalService.js
// (módulo de banco NIH / composición / evaluación educativa). No toca los SPs del
// módulo paralelo "clásico" (diagnosticoService.js / iaService.js / academicService.js),
// que sigue vivo (página "Rendimiento del Estudiante") y usa sus propios SPs con
// nombres parecidos pero firmas distintas.
//
// sp_eliminar_caso y sp_obtener_casos_detallados ya existían pero estaban huérfanos
// (ningún archivo los llamaba) y con bugs (sin cascada / INNER JOIN que excluye casos
// NIH sin paciente) — se corrigen aquí en el mismo nombre.
//
// MariaDB 10.4 no tiene JSON_OVERLAPS ni JSON_TABLE, así que las listas de patologías
// de longitud variable (máx. 7 posibles, universo fijo de 8 patologías) se resuelven
// con 8 parámetros nullable en vez de SQL dinámico.
const pool = require('../src/config/database');

const statements = [
    // === 1. Corrige el SP huérfano sp_eliminar_caso: agrega la cascada de borrado ===
    `DROP PROCEDURE IF EXISTS sp_eliminar_caso`,
    `CREATE PROCEDURE sp_eliminar_caso(IN p_id_caso INT)
    BEGIN
        DELETE l FROM localizacion_lesiones_estudiante l
        INNER JOIN detalle_hallazgos_estudiante d ON l.id_detalle_hallazgo = d.id_detalle_hallazgo
        INNER JOIN evaluaciones_estudiantes e ON d.id_evaluacion = e.id_evaluacion
        WHERE e.id_caso = p_id_caso;

        DELETE d FROM detalle_hallazgos_estudiante d
        INNER JOIN evaluaciones_estudiantes e ON d.id_evaluacion = e.id_evaluacion
        WHERE e.id_caso = p_id_caso;

        DELETE FROM evaluaciones_estudiantes WHERE id_caso = p_id_caso;
        DELETE FROM radiografias WHERE id_caso = p_id_caso;
        DELETE FROM casos_clinicos WHERE id_caso = p_id_caso;
    END`,

    // === 2. Corrige el SP huérfano sp_obtener_casos_detallados: LEFT JOIN paciente
    //         (los casos NIH clonados tienen id_paciente NULL), agrega hallazgos_docente/
    //         origen/estado, y de paso repara total_evaluaciones (hoy siempre 0 en el
    //         frontend porque la consulta cruda de la que viene nunca lo calculaba) ===
    `DROP PROCEDURE IF EXISTS sp_obtener_casos_detallados`,
    `CREATE PROCEDURE sp_obtener_casos_detallados(IN p_id_catedratico INT)
    BEGIN
        SELECT
            cc.id_caso AS id,
            cc.id_paciente,
            cc.titulo_caso AS titulo,
            cc.motivo_consulta,
            cc.nivel_dificultad,
            cc.origen,
            cc.estado,
            cc.hallazgos_docente,
            ps.codigo_paciente AS paciente,
            ps.edad,
            ps.genero,
            ps.antecedentes_medicos AS antecedentes,
            r.tipo_proyeccion,
            r.ruta_imagen,
            COUNT(DISTINCT ee.id_evaluacion) AS total_evaluaciones
        FROM casos_clinicos cc
        INNER JOIN cursos_secciones cs ON cc.id_curso = cs.id_curso
        LEFT JOIN pacientes_simulados ps ON cc.id_paciente = ps.id_paciente
        LEFT JOIN radiografias r ON cc.id_caso = r.id_caso
        LEFT JOIN evaluaciones_estudiantes ee ON cc.id_caso = ee.id_caso
        WHERE cs.id_catedratico = p_id_catedratico
        GROUP BY cc.id_caso, cc.id_paciente, cc.titulo_caso, cc.motivo_consulta, cc.nivel_dificultad,
                 cc.origen, cc.estado, cc.hallazgos_docente, ps.codigo_paciente, ps.edad, ps.genero,
                 ps.antecedentes_medicos, r.tipo_proyeccion, r.ruta_imagen
        ORDER BY cc.id_caso DESC;
    END`,

    // === 3-4. obtenerBancoCasosIA ===
    `DROP PROCEDURE IF EXISTS sp_contar_banco_casos_ia`,
    `CREATE PROCEDURE sp_contar_banco_casos_ia(IN p_patologia VARCHAR(100), IN p_dificultad VARCHAR(20))
    BEGIN
        SELECT COUNT(*) AS total
        FROM Casos_Clinicos c
        JOIN Radiografias r ON c.id_caso = r.id_caso
        WHERE c.origen = 'nih'
          AND (p_patologia IS NULL OR JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_patologia), '$.etiquetas_reales'))
          AND (p_dificultad IS NULL OR c.nivel_dificultad = p_dificultad);
    END`,

    `DROP PROCEDURE IF EXISTS sp_listar_banco_casos_ia`,
    `CREATE PROCEDURE sp_listar_banco_casos_ia(IN p_patologia VARCHAR(100), IN p_dificultad VARCHAR(20), IN p_limit INT, IN p_offset INT)
    BEGIN
        SELECT
            c.id_caso, c.titulo_caso, c.nivel_dificultad,
            p.edad, p.genero, r.ruta_imagen, c.hallazgos_docente
        FROM Casos_Clinicos c
        JOIN Radiografias r ON c.id_caso = r.id_caso
        LEFT JOIN pacientes_simulados p ON c.id_paciente = p.id_paciente
        WHERE c.origen = 'nih'
          AND (p_patologia IS NULL OR JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_patologia), '$.etiquetas_reales'))
          AND (p_dificultad IS NULL OR c.nivel_dificultad = p_dificultad)
        LIMIT p_limit OFFSET p_offset;
    END`,

    // === 5-6. componerEjercicio (seleccionarCasos): 8 slots de patología nullable
    //           (universo fijo de 8 patologías), niveles y exclusión por CSV+FIND_IN_SET ===
    `DROP PROCEDURE IF EXISTS sp_contar_casos_banco_nih`,
    `CREATE PROCEDURE sp_contar_casos_banco_nih(
        IN p_pat1 VARCHAR(50), IN p_pat2 VARCHAR(50), IN p_pat3 VARCHAR(50), IN p_pat4 VARCHAR(50),
        IN p_pat5 VARCHAR(50), IN p_pat6 VARCHAR(50), IN p_pat7 VARCHAR(50), IN p_pat8 VARCHAR(50),
        IN p_niveles_csv VARCHAR(100), IN p_excluir_csv TEXT
    )
    BEGIN
        SELECT COUNT(*) AS total
        FROM casos_clinicos c
        JOIN radiografias r ON c.id_caso = r.id_caso
        WHERE c.origen = 'nih'
          AND c.hallazgos_docente IS NOT NULL
          AND FIND_IN_SET(c.nivel_dificultad, p_niveles_csv) > 0
          AND (p_excluir_csv IS NULL OR p_excluir_csv = '' OR FIND_IN_SET(c.id_caso, p_excluir_csv) = 0)
          AND (
            (p_pat1 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat1), '$.etiquetas_reales')) OR
            (p_pat2 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat2), '$.etiquetas_reales')) OR
            (p_pat3 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat3), '$.etiquetas_reales')) OR
            (p_pat4 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat4), '$.etiquetas_reales')) OR
            (p_pat5 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat5), '$.etiquetas_reales')) OR
            (p_pat6 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat6), '$.etiquetas_reales')) OR
            (p_pat7 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat7), '$.etiquetas_reales')) OR
            (p_pat8 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat8), '$.etiquetas_reales'))
          );
    END`,

    `DROP PROCEDURE IF EXISTS sp_listar_casos_banco_nih`,
    `CREATE PROCEDURE sp_listar_casos_banco_nih(
        IN p_pat1 VARCHAR(50), IN p_pat2 VARCHAR(50), IN p_pat3 VARCHAR(50), IN p_pat4 VARCHAR(50),
        IN p_pat5 VARCHAR(50), IN p_pat6 VARCHAR(50), IN p_pat7 VARCHAR(50), IN p_pat8 VARCHAR(50),
        IN p_niveles_csv VARCHAR(100), IN p_excluir_csv TEXT,
        IN p_limit INT, IN p_offset INT
    )
    BEGIN
        SELECT c.id_caso, c.titulo_caso, c.nivel_dificultad, p.edad, p.genero, r.ruta_imagen, c.hallazgos_docente
        FROM casos_clinicos c
        JOIN radiografias r ON c.id_caso = r.id_caso
        LEFT JOIN pacientes_simulados p ON c.id_paciente = p.id_paciente
        WHERE c.origen = 'nih'
          AND c.hallazgos_docente IS NOT NULL
          AND FIND_IN_SET(c.nivel_dificultad, p_niveles_csv) > 0
          AND (p_excluir_csv IS NULL OR p_excluir_csv = '' OR FIND_IN_SET(c.id_caso, p_excluir_csv) = 0)
          AND (
            (p_pat1 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat1), '$.etiquetas_reales')) OR
            (p_pat2 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat2), '$.etiquetas_reales')) OR
            (p_pat3 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat3), '$.etiquetas_reales')) OR
            (p_pat4 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat4), '$.etiquetas_reales')) OR
            (p_pat5 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat5), '$.etiquetas_reales')) OR
            (p_pat6 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat6), '$.etiquetas_reales')) OR
            (p_pat7 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat7), '$.etiquetas_reales')) OR
            (p_pat8 IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat8), '$.etiquetas_reales'))
          )
        LIMIT p_limit OFFSET p_offset;
    END`,

    // === 7. asignarCasosBanco: clona caso + radiografía en un solo CALL ===
    `DROP PROCEDURE IF EXISTS sp_clonar_caso_a_curso`,
    `CREATE PROCEDURE sp_clonar_caso_a_curso(IN p_id_curso INT, IN p_id_caso_origen INT)
    BEGIN
        DECLARE v_titulo VARCHAR(255);
        DECLARE v_motivo TEXT;
        DECLARE v_nivel VARCHAR(20);
        DECLARE v_hallazgos LONGTEXT;
        DECLARE v_ruta_imagen VARCHAR(255);
        DECLARE v_tipo_proyeccion VARCHAR(100);
        DECLARE v_nuevo_id_caso INT DEFAULT NULL;

        IF EXISTS (SELECT 1 FROM casos_clinicos WHERE id_caso = p_id_caso_origen) THEN
            SELECT titulo_caso, motivo_consulta, nivel_dificultad, hallazgos_docente
              INTO v_titulo, v_motivo, v_nivel, v_hallazgos
            FROM casos_clinicos WHERE id_caso = p_id_caso_origen;

            INSERT INTO Casos_Clinicos (id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad, origen, estado, hallazgos_docente)
            VALUES (p_id_curso, NULL, v_titulo, v_motivo, v_nivel, 'nih', 'disponible', v_hallazgos);

            SET v_nuevo_id_caso = LAST_INSERT_ID();

            IF EXISTS (SELECT 1 FROM radiografias WHERE id_caso = p_id_caso_origen) THEN
                SELECT ruta_imagen, tipo_proyeccion INTO v_ruta_imagen, v_tipo_proyeccion
                FROM radiografias WHERE id_caso = p_id_caso_origen LIMIT 1;

                INSERT INTO Radiografias (id_caso, ruta_imagen, tipo_proyeccion)
                VALUES (v_nuevo_id_caso, v_ruta_imagen, v_tipo_proyeccion);
            END IF;
        END IF;

        SELECT v_nuevo_id_caso AS nuevo_id_caso;
    END`,

    // === 8. obtenerMetricasModelo ===
    `DROP PROCEDURE IF EXISTS sp_obtener_metricas_modelo`,
    `CREATE PROCEDURE sp_obtener_metricas_modelo()
    BEGIN
        SELECT p.nombre_patologia, m.auc, m.localizacion_pct, m.precision_valor, m.se_abstiene_siempre, m.nota_clinica
        FROM Metricas_Modelo_Patologia m
        JOIN Catalogo_Patologias p ON m.id_patologia = p.id_patologia
        ORDER BY m.auc DESC;
    END`,

    // === 9. obtenerEstadisticasEstudiante: 2 result sets (resumen + desglose) ===
    `DROP PROCEDURE IF EXISTS sp_obtener_resumen_estudiante_edu`,
    `CREATE PROCEDURE sp_obtener_resumen_estudiante_edu(IN p_id_estudiante INT)
    BEGIN
        SELECT COUNT(*) AS casos_resueltos, ROUND(AVG(eje1_diagnostico)) AS precision_promedio
        FROM evaluaciones_estudiantes WHERE id_estudiante = p_id_estudiante;

        SELECT c.nivel_dificultad, COUNT(*) AS total, ROUND(AVG(e.eje1_diagnostico)) AS precision_promedio
        FROM evaluaciones_estudiantes e
        JOIN Casos_Clinicos c ON e.id_caso = c.id_caso
        WHERE e.id_estudiante = p_id_estudiante
        GROUP BY c.nivel_dificultad;
    END`,

    // === 10. obtenerCasoEstudianteSeguro (Fase 1): el whitelist se queda en JS ===
    `DROP PROCEDURE IF EXISTS sp_obtener_caso_estudiante_raw`,
    `CREATE PROCEDURE sp_obtener_caso_estudiante_raw(IN p_id_caso INT)
    BEGIN
        SELECT c.id_caso, c.titulo_caso, c.motivo_consulta, c.nivel_dificultad, r.ruta_imagen, c.hallazgos_docente
        FROM Casos_Clinicos c
        JOIN Radiografias r ON c.id_caso = r.id_caso
        WHERE c.id_caso = p_id_caso;
    END`,

    // === 11-13. guardarRespuestaEstudiante ===
    // Distinto de sp_crear_evaluacion_cabecera (legacy, usado por diagnosticoService.js):
    // ese no tiene nivel_confianza/marcador_estudiante y no se debe tocar.
    `DROP PROCEDURE IF EXISTS sp_crear_evaluacion_estudiante_edu`,
    `CREATE PROCEDURE sp_crear_evaluacion_estudiante_edu(
        IN p_id_caso INT, IN p_id_estudiante INT, IN p_tiempo INT, IN p_justificacion TEXT,
        IN p_nivel_confianza INT, IN p_marcador_json TEXT
    )
    BEGIN
        INSERT INTO evaluaciones_estudiantes
          (id_caso, id_estudiante, tiempo_analisis_segundos, justificacion_clinica, nivel_confianza, marcador_estudiante)
        VALUES (p_id_caso, p_id_estudiante, p_tiempo, p_justificacion, p_nivel_confianza, p_marcador_json);
        SELECT LAST_INSERT_ID() AS id_evaluacion;
    END`,

    `DROP PROCEDURE IF EXISTS sp_obtener_verdad_caso`,
    `CREATE PROCEDURE sp_obtener_verdad_caso(IN p_id_caso INT)
    BEGIN
        SELECT hallazgos_docente FROM Casos_Clinicos WHERE id_caso = p_id_caso;
    END`,

    `DROP PROCEDURE IF EXISTS sp_actualizar_puntajes_evaluacion`,
    `CREATE PROCEDURE sp_actualizar_puntajes_evaluacion(IN p_id_evaluacion INT, IN p_eje1 INT, IN p_eje2 INT, IN p_eje3 INT)
    BEGIN
        UPDATE evaluaciones_estudiantes
        SET eje1_diagnostico = p_eje1, eje2_localizacion = p_eje2, eje3_calibracion = p_eje3
        WHERE id_evaluacion = p_id_evaluacion;
    END`
];

async function run() {
    try {
        for (const sql of statements) {
            await pool.query(sql);
        }
        console.log(`✅ ${statements.length} sentencias ejecutadas (13 SPs creados/corregidos).`);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error creando SPs:', e.message);
        process.exit(1);
    }
}
run();

// Rediseño del flujo "asignar casos del banco a un curso":
//  - El banco solo ofrece casos del banco global (id_curso NULL) con imagen (estado 'disponible').
//    Antes las copias ya asignadas a cursos volvían a aparecer en la composición.
//  - Si se indica un curso, se excluyen las radiografías que ese curso ya tiene (sin repetir casos).
//  - sp_clonar_caso_a_curso solo clona casos elegibles del banco: antes clonaba cualquier id
//    (incluso casos de otro docente) y no avisaba cuando un id no servía.
//  - Se eliminan los SPs de "explorar banco" con filtros sueltos, que el nuevo flujo ya no usa.
const pool = require('../src/config/database');

const CONDICION_PATOLOGIAS = [1, 2, 3, 4, 5, 6, 7, 8]
    .map(n => `(p_pat${n} IS NOT NULL AND JSON_CONTAINS(c.hallazgos_docente, JSON_QUOTE(p_pat${n}), '$.etiquetas_reales'))`)
    .join(' OR\n            ');

const FILTROS_BANCO = `
        WHERE c.origen = 'nih'
          AND c.id_curso IS NULL
          AND c.estado = 'disponible'
          AND c.hallazgos_docente IS NOT NULL
          AND FIND_IN_SET(c.nivel_dificultad, p_niveles_csv) > 0
          AND (p_excluir_csv IS NULL OR p_excluir_csv = '' OR FIND_IN_SET(c.id_caso, p_excluir_csv) = 0)
          AND (p_id_curso IS NULL OR NOT EXISTS (
                SELECT 1 FROM casos_clinicos cx JOIN radiografias rx ON rx.id_caso = cx.id_caso
                WHERE cx.id_curso = p_id_curso AND rx.ruta_imagen = r.ruta_imagen))
          AND (
            ${CONDICION_PATOLOGIAS}
          )`;

const PARAMS_PAT = 'IN p_pat1 VARCHAR(50), IN p_pat2 VARCHAR(50), IN p_pat3 VARCHAR(50), IN p_pat4 VARCHAR(50),\n        IN p_pat5 VARCHAR(50), IN p_pat6 VARCHAR(50), IN p_pat7 VARCHAR(50), IN p_pat8 VARCHAR(50)';

const statements = [
    `DROP PROCEDURE IF EXISTS sp_contar_casos_banco_nih`,
    `CREATE PROCEDURE sp_contar_casos_banco_nih(
        ${PARAMS_PAT},
        IN p_niveles_csv VARCHAR(100), IN p_excluir_csv TEXT, IN p_id_curso INT
    )
    BEGIN
        SELECT COUNT(*) AS total
        FROM casos_clinicos c
        JOIN radiografias r ON c.id_caso = r.id_caso
        ${FILTROS_BANCO};
    END`,

    `DROP PROCEDURE IF EXISTS sp_listar_casos_banco_nih`,
    `CREATE PROCEDURE sp_listar_casos_banco_nih(
        ${PARAMS_PAT},
        IN p_niveles_csv VARCHAR(100), IN p_excluir_csv TEXT, IN p_id_curso INT,
        IN p_limit INT, IN p_offset INT
    )
    BEGIN
        SELECT c.id_caso, c.titulo_caso, c.nivel_dificultad, p.edad, p.genero, r.ruta_imagen, c.hallazgos_docente
        FROM casos_clinicos c
        JOIN radiografias r ON c.id_caso = r.id_caso
        LEFT JOIN pacientes_simulados p ON c.id_paciente = p.id_paciente
        ${FILTROS_BANCO}
        LIMIT p_limit OFFSET p_offset;
    END`,

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

        -- Elegible: caso del banco global con imagen, y cuya radiografía el curso aún no tiene
        IF EXISTS (
            SELECT 1 FROM casos_clinicos c JOIN radiografias r ON r.id_caso = c.id_caso
            WHERE c.id_caso = p_id_caso_origen AND c.origen = 'nih' AND c.id_curso IS NULL AND c.estado = 'disponible'
              AND NOT EXISTS (
                SELECT 1 FROM casos_clinicos cx JOIN radiografias rx ON rx.id_caso = cx.id_caso
                WHERE cx.id_curso = p_id_curso AND rx.ruta_imagen = r.ruta_imagen)
        ) THEN
            SELECT titulo_caso, motivo_consulta, nivel_dificultad, hallazgos_docente
              INTO v_titulo, v_motivo, v_nivel, v_hallazgos
            FROM casos_clinicos WHERE id_caso = p_id_caso_origen;

            INSERT INTO Casos_Clinicos (id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad, origen, estado, hallazgos_docente)
            VALUES (p_id_curso, NULL, v_titulo, v_motivo, v_nivel, 'nih', 'disponible', v_hallazgos);

            SET v_nuevo_id_caso = LAST_INSERT_ID();

            SELECT ruta_imagen, tipo_proyeccion INTO v_ruta_imagen, v_tipo_proyeccion
            FROM radiografias WHERE id_caso = p_id_caso_origen LIMIT 1;

            INSERT INTO Radiografias (id_caso, ruta_imagen, tipo_proyeccion)
            VALUES (v_nuevo_id_caso, v_ruta_imagen, v_tipo_proyeccion);
        END IF;

        SELECT v_nuevo_id_caso AS nuevo_id_caso;
    END`,

    `DROP PROCEDURE IF EXISTS sp_contar_banco_casos_ia`,
    `DROP PROCEDURE IF EXISTS sp_listar_banco_casos_ia`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ SPs del flujo de asignación actualizados (y SPs de exploración del banco eliminados).');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();

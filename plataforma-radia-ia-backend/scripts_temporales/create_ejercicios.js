// Concepto de "Ejercicio": un conjunto de casos que el docente publica junto en un curso.
//  - Tabla Ejercicios (uno por publicación, con número consecutivo por curso: Ejercicio 1, 2, ...).
//  - Casos_Clinicos.id_ejercicio: los casos clonados del banco pertenecen a su ejercicio.
//    Los casos creados a mano por el docente quedan sin ejercicio (sueltos).
//  - Los casos NIH ya asignados a un curso se agrupan en el "Ejercicio 1" de ese curso.
const pool = require('../src/config/database');

const statements = [
    `CREATE TABLE IF NOT EXISTS Ejercicios (
        id_ejercicio INT AUTO_INCREMENT PRIMARY KEY,
        id_curso INT NOT NULL,
        numero INT NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_ejercicio_curso_numero (id_curso, numero),
        CONSTRAINT fk_ejercicio_curso FOREIGN KEY (id_curso) REFERENCES Cursos_Secciones(id_curso) ON DELETE CASCADE
    )`,

    `DROP PROCEDURE IF EXISTS sp_crear_ejercicio`,
    `CREATE PROCEDURE sp_crear_ejercicio(IN p_id_curso INT)
    BEGIN
        DECLARE v_numero INT;
        SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero FROM Ejercicios WHERE id_curso = p_id_curso FOR UPDATE;
        INSERT INTO Ejercicios (id_curso, numero, nombre) VALUES (p_id_curso, v_numero, CONCAT('Ejercicio ', v_numero));
        SELECT LAST_INSERT_ID() AS id_ejercicio, CONCAT('Ejercicio ', v_numero) AS nombre;
    END`,

    `DROP PROCEDURE IF EXISTS sp_clonar_caso_a_curso`,
    `CREATE PROCEDURE sp_clonar_caso_a_curso(IN p_id_curso INT, IN p_id_caso_origen INT, IN p_id_ejercicio INT)
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

            INSERT INTO Casos_Clinicos (id_curso, id_ejercicio, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad, origen, estado, hallazgos_docente)
            VALUES (p_id_curso, p_id_ejercicio, NULL, v_titulo, v_motivo, v_nivel, 'nih', 'disponible', v_hallazgos);

            SET v_nuevo_id_caso = LAST_INSERT_ID();

            SELECT ruta_imagen, tipo_proyeccion INTO v_ruta_imagen, v_tipo_proyeccion
            FROM radiografias WHERE id_caso = p_id_caso_origen LIMIT 1;

            INSERT INTO Radiografias (id_caso, ruta_imagen, tipo_proyeccion)
            VALUES (v_nuevo_id_caso, v_ruta_imagen, v_tipo_proyeccion);
        END IF;

        SELECT v_nuevo_id_caso AS nuevo_id_caso;
    END`,

    `DROP PROCEDURE IF EXISTS sp_obtener_casos_detallados`,
    `CREATE PROCEDURE sp_obtener_casos_detallados(IN p_id_catedratico INT)
    BEGIN
        SELECT
            cc.id_caso AS id,
            cc.id_curso,
            cc.id_ejercicio,
            ej.nombre AS ejercicio_nombre,
            ej.numero AS ejercicio_numero,
            cs.nombre_curso,
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
        LEFT JOIN ejercicios ej ON cc.id_ejercicio = ej.id_ejercicio
        LEFT JOIN pacientes_simulados ps ON cc.id_paciente = ps.id_paciente
        LEFT JOIN radiografias r ON cc.id_caso = r.id_caso
        LEFT JOIN evaluaciones_estudiantes ee ON cc.id_caso = ee.id_caso
        WHERE cs.id_catedratico = p_id_catedratico
        GROUP BY cc.id_caso, cc.id_curso, cc.id_ejercicio, ej.nombre, ej.numero, cs.nombre_curso, cc.id_paciente,
                 cc.titulo_caso, cc.motivo_consulta, cc.nivel_dificultad, cc.origen, cc.estado, cc.hallazgos_docente,
                 ps.codigo_paciente, ps.edad, ps.genero, ps.antecedentes_medicos, r.tipo_proyeccion, r.ruta_imagen
        ORDER BY cc.id_caso DESC;
    END`,

    // Borra el ejercicio completo (casos, radiografías y evaluaciones de sus casos). Devuelve cuántos casos se borraron.
    // Solo si el curso del ejercicio pertenece al docente indicado.
    `DROP PROCEDURE IF EXISTS sp_eliminar_ejercicio`,
    `CREATE PROCEDURE sp_eliminar_ejercicio(IN p_id_ejercicio INT, IN p_id_catedratico INT)
    BEGIN
        DECLARE v_casos INT DEFAULT 0;

        IF EXISTS (
            SELECT 1 FROM Ejercicios e JOIN Cursos_Secciones cs ON cs.id_curso = e.id_curso
            WHERE e.id_ejercicio = p_id_ejercicio AND cs.id_catedratico = p_id_catedratico
        ) THEN
            SELECT COUNT(*) INTO v_casos FROM Casos_Clinicos WHERE id_ejercicio = p_id_ejercicio;

            DELETE l FROM localizacion_lesiones_estudiante l
            INNER JOIN detalle_hallazgos_estudiante d ON l.id_detalle_hallazgo = d.id_detalle_hallazgo
            INNER JOIN evaluaciones_estudiantes e ON d.id_evaluacion = e.id_evaluacion
            INNER JOIN Casos_Clinicos c ON c.id_caso = e.id_caso
            WHERE c.id_ejercicio = p_id_ejercicio;

            DELETE d FROM detalle_hallazgos_estudiante d
            INNER JOIN evaluaciones_estudiantes e ON d.id_evaluacion = e.id_evaluacion
            INNER JOIN Casos_Clinicos c ON c.id_caso = e.id_caso
            WHERE c.id_ejercicio = p_id_ejercicio;

            DELETE e FROM evaluaciones_estudiantes e
            INNER JOIN Casos_Clinicos c ON c.id_caso = e.id_caso
            WHERE c.id_ejercicio = p_id_ejercicio;

            DELETE r FROM Radiografias r
            INNER JOIN Casos_Clinicos c ON c.id_caso = r.id_caso
            WHERE c.id_ejercicio = p_id_ejercicio;

            DELETE FROM Casos_Clinicos WHERE id_ejercicio = p_id_ejercicio;
            DELETE FROM Ejercicios WHERE id_ejercicio = p_id_ejercicio;
        END IF;

        SELECT v_casos AS casos_eliminados;
    END`
];

(async () => {
    try {
        for (const sql of statements.slice(0, 1)) await pool.query(sql);

        const [col] = await pool.query("SHOW COLUMNS FROM Casos_Clinicos LIKE 'id_ejercicio'");
        if (col.length === 0) {
            await pool.query(`ALTER TABLE Casos_Clinicos
                ADD COLUMN id_ejercicio INT NULL AFTER id_curso,
                ADD KEY fk_caso_ejercicio (id_ejercicio),
                ADD CONSTRAINT fk_caso_ejercicio FOREIGN KEY (id_ejercicio) REFERENCES Ejercicios(id_ejercicio) ON DELETE SET NULL`);
        }

        // Casos NIH que ya estaban en cursos: quedan agrupados en el Ejercicio 1 del curso
        const [huerfanos] = await pool.query(
            `SELECT DISTINCT id_curso FROM Casos_Clinicos WHERE origen = 'nih' AND id_curso IS NOT NULL AND id_ejercicio IS NULL`);
        for (const { id_curso } of huerfanos) {
            const [ej] = await pool.query(
                `INSERT INTO Ejercicios (id_curso, numero, nombre)
                 SELECT ?, COALESCE(MAX(numero), 0) + 1, CONCAT('Ejercicio ', COALESCE(MAX(numero), 0) + 1) FROM Ejercicios WHERE id_curso = ?`,
                [id_curso, id_curso]);
            await pool.query(
                `UPDATE Casos_Clinicos SET id_ejercicio = ? WHERE origen = 'nih' AND id_curso = ? AND id_ejercicio IS NULL`,
                [ej.insertId, id_curso]);
        }

        for (const sql of statements.slice(1)) await pool.query(sql);
        console.log(`✅ Ejercicios listos. Cursos con casos previos agrupados: ${huerfanos.length}`);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();

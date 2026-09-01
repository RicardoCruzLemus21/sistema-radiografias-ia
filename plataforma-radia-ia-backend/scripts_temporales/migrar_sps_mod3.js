const pool = require('../src/config/database');

const sps = [
    {
        name: 'sp_crear_paciente_simulado',
        query: `
            CREATE PROCEDURE sp_crear_paciente_simulado(IN p_codigo VARCHAR(50), IN p_edad INT, IN p_genero VARCHAR(50), IN p_antecedentes TEXT)
            BEGIN
                INSERT INTO Pacientes (codigo_paciente, edad, genero, antecedentes_medicos) 
                VALUES (p_codigo, p_edad, p_genero, p_antecedentes);
                SELECT LAST_INSERT_ID() AS id_paciente;
            END
        `
    },
    {
        name: 'sp_crear_caso_clinico',
        query: `
            CREATE PROCEDURE sp_crear_caso_clinico(IN p_id_curso INT, IN p_id_paciente INT, IN p_titulo VARCHAR(150), IN p_motivo TEXT, IN p_nivel VARCHAR(50))
            BEGIN
                INSERT INTO Casos_Clinicos (id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad) 
                VALUES (p_id_curso, p_id_paciente, p_titulo, p_motivo, p_nivel);
                SELECT LAST_INSERT_ID() AS id_caso;
            END
        `
    },
    {
        name: 'sp_guardar_radiografia',
        query: `
            CREATE PROCEDURE sp_guardar_radiografia(IN p_id_caso INT, IN p_proyeccion VARCHAR(50), IN p_ruta VARCHAR(255))
            BEGIN
                INSERT INTO Radiografias (id_caso, tipo_proyeccion, ruta_imagen) 
                VALUES (p_id_caso, p_proyeccion, p_ruta);
                SELECT LAST_INSERT_ID() AS id_radiografia;
            END
        `
    },
    {
        name: 'sp_crear_caso_completo',
        query: `
            CREATE PROCEDURE sp_crear_caso_completo(
                IN p_codigo VARCHAR(50), IN p_edad INT, IN p_genero VARCHAR(50), IN p_antecedentes TEXT,
                IN p_id_curso INT, IN p_id_catedratico INT, 
                IN p_titulo VARCHAR(150), IN p_motivo TEXT, IN p_nivel VARCHAR(50),
                IN p_proyeccion VARCHAR(50), IN p_ruta VARCHAR(255)
            )
            BEGIN
                DECLARE v_id_paciente INT;
                DECLARE v_id_curso INT;
                DECLARE v_id_caso INT;
                DECLARE v_id_radiografia INT;

                DECLARE EXIT HANDLER FOR SQLEXCEPTION
                BEGIN
                    ROLLBACK;
                    RESIGNAL;
                END;

                START TRANSACTION;

                INSERT INTO Pacientes (codigo_paciente, edad, genero, antecedentes_medicos) 
                VALUES (p_codigo, COALESCE(p_edad, 30), COALESCE(p_genero, 'Otro'), COALESCE(p_antecedentes, 'Sin antecedentes relevantes reportados'));
                SET v_id_paciente = LAST_INSERT_ID();

                IF p_id_curso IS NULL OR p_id_curso = 0 THEN
                    SELECT id_curso INTO v_id_curso FROM Cursos_Secciones WHERE id_catedratico = COALESCE(p_id_catedratico, 1) LIMIT 1;
                    IF v_id_curso IS NULL THEN
                        INSERT INTO Cursos_Secciones (id_catedratico, nombre_curso, semestre, anio) 
                        VALUES (COALESCE(p_id_catedratico, 1), 'Radiología Clínica I', 1, 2026);
                        SET v_id_curso = LAST_INSERT_ID();
                    END IF;
                ELSE
                    SET v_id_curso = p_id_curso;
                END IF;

                INSERT INTO Casos_Clinicos (id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad) 
                VALUES (v_id_curso, v_id_paciente, p_titulo, p_motivo, COALESCE(p_nivel, 'Intermedio'));
                SET v_id_caso = LAST_INSERT_ID();

                INSERT INTO Radiografias (id_caso, tipo_proyeccion, ruta_imagen) 
                VALUES (v_id_caso, COALESCE(p_proyeccion, 'Tórax PA'), COALESCE(p_ruta, '/uploads/radiografias/rx-default.jpg'));
                SET v_id_radiografia = LAST_INSERT_ID();

                COMMIT;

                SELECT v_id_caso AS id_caso, v_id_paciente AS id_paciente, v_id_curso AS id_curso, v_id_radiografia AS id_radiografia;
            END
        `
    },
    {
        name: 'sp_obtener_casos_detallados',
        query: `
            CREATE PROCEDURE sp_obtener_casos_detallados(IN p_id_catedratico INT)
            BEGIN
                SELECT 
                    c.id_caso AS id, c.titulo_caso AS titulo, c.motivo_consulta, c.nivel_dificultad,
                    p.id_paciente, p.codigo_paciente AS paciente, p.edad, p.genero, p.antecedentes_medicos AS antecedentes,
                    r.id_radiografia, r.tipo_proyeccion AS proyeccion, r.ruta_imagen,
                    DATE_FORMAT(r.fecha_subida, '%Y-%m-%d') AS fecha_creacion,
                    (SELECT COUNT(*) FROM Evaluaciones_Estudiantes ee WHERE ee.id_caso = c.id_caso) AS total_evaluaciones
                FROM Casos_Clinicos c
                INNER JOIN Pacientes p ON c.id_paciente = p.id_paciente
                LEFT JOIN Radiografias r ON c.id_caso = r.id_caso
                INNER JOIN Cursos_Secciones cs ON c.id_curso = cs.id_curso
                WHERE cs.id_catedratico = p_id_catedratico
                ORDER BY c.id_caso DESC;
            END
        `
    },
    {
        name: 'sp_obtener_detalle_caso',
        query: `
            CREATE PROCEDURE sp_obtener_detalle_caso(IN p_id_caso INT)
            BEGIN
                SELECT 
                    c.id_caso AS id, c.titulo_caso AS titulo, c.motivo_consulta, c.nivel_dificultad,
                    p.id_paciente, p.codigo_paciente AS paciente, p.edad, p.genero, p.antecedentes_medicos AS antecedentes,
                    r.id_radiografia, r.tipo_proyeccion AS proyeccion, r.ruta_imagen
                FROM Casos_Clinicos c
                INNER JOIN Pacientes p ON c.id_paciente = p.id_paciente
                LEFT JOIN Radiografias r ON c.id_caso = r.id_caso
                WHERE c.id_caso = p_id_caso;
            END
        `
    },
    {
        name: 'sp_obtener_codigos_pacientes',
        query: `
            CREATE PROCEDURE sp_obtener_codigos_pacientes()
            BEGIN
                SELECT codigo_paciente 
                FROM Pacientes 
                WHERE codigo_paciente LIKE 'PAC-%';
            END
        `
    },
    {
        name: 'sp_editar_caso_paciente',
        query: `
            CREATE PROCEDURE sp_editar_caso_paciente(
                IN p_id_caso INT, IN p_titulo VARCHAR(150), IN p_motivo TEXT, IN p_nivel VARCHAR(50),
                IN p_id_paciente INT, IN p_edad INT, IN p_genero VARCHAR(50), IN p_antecedentes TEXT
            )
            BEGIN
                DECLARE EXIT HANDLER FOR SQLEXCEPTION
                BEGIN
                    ROLLBACK;
                    RESIGNAL;
                END;

                START TRANSACTION;
                
                UPDATE Casos_Clinicos SET titulo_caso = p_titulo, motivo_consulta = p_motivo, nivel_dificultad = p_nivel WHERE id_caso = p_id_caso;
                
                IF p_id_paciente IS NOT NULL THEN
                    UPDATE Pacientes SET edad = p_edad, genero = p_genero, antecedentes_medicos = p_antecedentes WHERE id_paciente = p_id_paciente;
                END IF;

                COMMIT;
            END
        `
    },
    {
        name: 'sp_eliminar_caso',
        query: `
            CREATE PROCEDURE sp_eliminar_caso(IN p_id_caso INT)
            BEGIN
                DELETE FROM Casos_Clinicos WHERE id_caso = p_id_caso;
            END
        `
    }
];

async function migrarSps() {
    try {
        console.log('Iniciando migración de SPs del Módulo 3...');
        for (const sp of sps) {
            console.log('Creando ' + sp.name + '...');
            await pool.query('DROP PROCEDURE IF EXISTS ' + sp.name);
            await pool.query(sp.query);
            console.log('✅ ' + sp.name + ' creado.');
        }
        console.log('\\n🎉 Migración del Módulo 3 completada.');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}
migrarSps();

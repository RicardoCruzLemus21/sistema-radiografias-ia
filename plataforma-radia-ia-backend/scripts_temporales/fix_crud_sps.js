const pool = require('../src/config/database');

async function fixCRUDSPs() {
    try {
        console.log('=== CORRIGIENDO SPs CRUD FINALES ===\n');

        // ============================================================
        // FIX 1: sp_crear_paciente_simulado
        // ERROR: Table 'radia_ia_schema.pacientes' doesn't exist
        // ============================================================
        console.log('🔧 Recreando sp_crear_paciente_simulado...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_crear_paciente_simulado');
        await pool.query(`
            CREATE PROCEDURE sp_crear_paciente_simulado(
                IN p_codigo_paciente VARCHAR(50),
                IN p_edad INT,
                IN p_genero VARCHAR(20),
                IN p_antecedentes TEXT
            )
            BEGIN
                INSERT INTO pacientes_simulados (codigo_paciente, edad, genero, antecedentes_medicos)
                VALUES (p_codigo_paciente, p_edad, p_genero, p_antecedentes);
                SELECT LAST_INSERT_ID() AS id_paciente;
            END
        `);
        console.log('✅ sp_crear_paciente_simulado - OK');

        // ============================================================
        // FIX 2: sp_crear_caso_completo
        // ERROR: Table 'radia_ia_schema.pacientes' doesn't exist
        // ============================================================
        console.log('\n🔧 Recreando sp_crear_caso_completo...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_crear_caso_completo');
        await pool.query(`
            CREATE PROCEDURE sp_crear_caso_completo(
                IN p_codigo_paciente VARCHAR(50),
                IN p_edad INT,
                IN p_genero VARCHAR(20),
                IN p_antecedentes_medicos TEXT,
                IN p_id_curso INT,
                IN p_id_catedratico INT,
                IN p_titulo_caso VARCHAR(255),
                IN p_motivo_consulta TEXT,
                IN p_nivel_dificultad VARCHAR(50),
                IN p_tipo_proyeccion VARCHAR(100),
                IN p_ruta_imagen VARCHAR(255)
            )
            BEGIN
                DECLARE v_id_paciente INT;
                DECLARE v_id_caso INT;
                DECLARE v_id_radiografia INT;

                DECLARE EXIT HANDLER FOR SQLEXCEPTION
                BEGIN
                    ROLLBACK;
                    RESIGNAL;
                END;

                START TRANSACTION;

                -- 1. Crear Paciente
                INSERT INTO pacientes_simulados (codigo_paciente, edad, genero, antecedentes_medicos)
                VALUES (p_codigo_paciente, p_edad, p_genero, p_antecedentes_medicos);
                SET v_id_paciente = LAST_INSERT_ID();

                -- 2. Crear Caso
                INSERT INTO casos_clinicos (id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad)
                VALUES (p_id_curso, v_id_paciente, p_titulo_caso, p_motivo_consulta, p_nivel_dificultad);
                SET v_id_caso = LAST_INSERT_ID();

                -- 3. Crear Radiografía
                INSERT INTO radiografias (id_caso, tipo_proyeccion, ruta_imagen)
                VALUES (v_id_caso, p_tipo_proyeccion, p_ruta_imagen);
                SET v_id_radiografia = LAST_INSERT_ID();

                COMMIT;

                SELECT 
                    v_id_caso AS id_caso, 
                    v_id_paciente AS id_paciente, 
                    p_id_curso AS id_curso, 
                    v_id_radiografia AS id_radiografia;
            END
        `);
        console.log('✅ sp_crear_caso_completo - OK');

        // ============================================================
        // FIX 3: sp_editar_caso_paciente
        // ERROR: Table 'radia_ia_schema.pacientes' doesn't exist
        // ============================================================
        console.log('\n🔧 Recreando sp_editar_caso_paciente...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_editar_caso_paciente');
        await pool.query(`
            CREATE PROCEDURE sp_editar_caso_paciente(
                IN p_id_caso INT,
                IN p_titulo_caso VARCHAR(255),
                IN p_motivo_consulta TEXT,
                IN p_nivel_dificultad VARCHAR(50),
                IN p_id_paciente INT,
                IN p_edad INT,
                IN p_genero VARCHAR(20),
                IN p_antecedentes TEXT
            )
            BEGIN
                DECLARE EXIT HANDLER FOR SQLEXCEPTION
                BEGIN
                    ROLLBACK;
                    RESIGNAL;
                END;

                START TRANSACTION;

                -- Actualizar Caso
                UPDATE casos_clinicos 
                SET titulo_caso = p_titulo_caso,
                    motivo_consulta = p_motivo_consulta,
                    nivel_dificultad = p_nivel_dificultad
                WHERE id_caso = p_id_caso;

                -- Actualizar Paciente
                UPDATE pacientes_simulados
                SET edad = p_edad,
                    genero = p_genero,
                    antecedentes_medicos = p_antecedentes
                WHERE id_paciente = p_id_paciente;

                COMMIT;
            END
        `);
        console.log('✅ sp_editar_caso_paciente - OK');

        console.log('\n🎉 Todos los SPs CRUD corregidos exitosamente');
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}
fixCRUDSPs();

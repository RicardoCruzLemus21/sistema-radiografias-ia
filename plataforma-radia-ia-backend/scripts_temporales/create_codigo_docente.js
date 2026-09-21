// Registro de estudiantes con código de docente:
//  - Usuarios.codigo_docente (UNIQUE, NULL para quien no es docente)
//  - SPs para asignar/leer el código, buscar al docente por código y verificar el carnet
//  - Rellena el código de los docentes que ya existen
const pool = require('../src/config/database');
const { asignarCodigoNuevo } = require('../src/services/codigoDocenteService');

const statements = [
    `DROP PROCEDURE IF EXISTS sp_asignar_codigo_docente`,
    `CREATE PROCEDURE sp_asignar_codigo_docente(IN p_id_usuario INT, IN p_codigo VARCHAR(10))
    BEGIN
        UPDATE Usuarios SET codigo_docente = p_codigo WHERE id_usuario = p_id_usuario AND id_rol = 1;
        SELECT ROW_COUNT() AS filas;
    END`,

    `DROP PROCEDURE IF EXISTS sp_obtener_codigo_docente`,
    `CREATE PROCEDURE sp_obtener_codigo_docente(IN p_id_usuario INT)
    BEGIN
        SELECT codigo_docente FROM Usuarios WHERE id_usuario = p_id_usuario AND id_rol = 1;
    END`,

    // Una fila por curso del docente; si aún no tiene cursos, una fila con id_curso NULL.
    `DROP PROCEDURE IF EXISTS sp_obtener_docente_por_codigo`,
    `CREATE PROCEDURE sp_obtener_docente_por_codigo(IN p_codigo VARCHAR(10))
    BEGIN
        SELECT u.id_usuario, u.nombre_completo, cs.id_curso, cs.nombre_curso, cs.semestre, cs.anio
        FROM Usuarios u
        LEFT JOIN Cursos_Secciones cs ON cs.id_catedratico = u.id_usuario
        WHERE u.codigo_docente = p_codigo AND u.id_rol = 1 AND u.estado = 'Activo'
        ORDER BY cs.anio DESC, cs.id_curso;
    END`,

    `DROP PROCEDURE IF EXISTS sp_verificar_carnet_existe`,
    `CREATE PROCEDURE sp_verificar_carnet_existe(IN p_carnet VARCHAR(20))
    BEGIN
        SELECT id_usuario FROM Usuarios WHERE carnet = p_carnet;
    END`
];

(async () => {
    try {
        const [col] = await pool.query("SHOW COLUMNS FROM Usuarios WHERE Field = 'codigo_docente'");
        if (col.length === 0) {
            await pool.query('ALTER TABLE Usuarios ADD COLUMN codigo_docente VARCHAR(10) NULL, ADD UNIQUE KEY uq_usuarios_codigo_docente (codigo_docente)');
            console.log('✅ Columna Usuarios.codigo_docente creada.');
        } else {
            console.log('ℹ️  Usuarios.codigo_docente ya existía.');
        }

        for (const sql of statements) await pool.query(sql);
        console.log('✅ SPs de código de docente creados.');

        const [docentes] = await pool.query('SELECT id_usuario, nombre_completo FROM Usuarios WHERE id_rol = 1 AND codigo_docente IS NULL');
        for (const d of docentes) {
            const codigo = await asignarCodigoNuevo(d.id_usuario);
            console.log(`   ${d.nombre_completo} (id ${d.id_usuario}) -> ${codigo}`);
        }
        console.log(`✅ ${docentes.length} docente(s) existente(s) con código asignado.`);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();

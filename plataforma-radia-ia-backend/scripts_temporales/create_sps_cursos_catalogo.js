// Permite que el admin cree un curso nuevo al registrar un catedrático.
// - sp_obtener_nombres_cursos_disponibles: nombres del catálogo + nombres ya usados en
//   secciones, sin duplicados (el desplegable antes solo mostraba secciones existentes).
// - sp_crear_curso_catalogo: inserta el nombre si no existe y devuelve la versión canónica
//   (la unicidad de Catalogo_Cursos.nombre_curso ignora mayúsculas/tildes).
const pool = require('../src/config/database');

const statements = [
    `DROP PROCEDURE IF EXISTS sp_obtener_nombres_cursos_disponibles`,
    `CREATE PROCEDURE sp_obtener_nombres_cursos_disponibles()
    BEGIN
        SELECT nombre_curso FROM Catalogo_Cursos
        UNION
        SELECT nombre_curso FROM Cursos_Secciones
        ORDER BY nombre_curso;
    END`,

    `DROP PROCEDURE IF EXISTS sp_crear_curso_catalogo`,
    `CREATE PROCEDURE sp_crear_curso_catalogo(IN p_nombre VARCHAR(150))
    BEGIN
        INSERT IGNORE INTO Catalogo_Cursos (nombre_curso) VALUES (TRIM(p_nombre));
        SELECT id_curso_catalogo, nombre_curso FROM Catalogo_Cursos WHERE nombre_curso = TRIM(p_nombre) LIMIT 1;
    END`
];

(async () => {
    try {
        for (const sql of statements) await pool.query(sql);
        console.log('✅ SPs de catálogo de cursos creados.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();

// Crea sp_admin_resumen_global(): KPIs de toda la plataforma para el Panel de Administración
// (hoy esa pantalla solo tenía 3 tarjetas de navegación y nada de datos reales).
require('dotenv').config();
const pool = require('../src/config/database');

const statements = [
  `DROP PROCEDURE IF EXISTS sp_admin_resumen_global`,
  `CREATE PROCEDURE sp_admin_resumen_global()
  BEGIN
      SELECT
          (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
          (SELECT COUNT(*) FROM usuarios WHERE id_rol = 1) AS total_docentes,
          (SELECT COUNT(*) FROM usuarios WHERE id_rol = 2) AS total_estudiantes,
          (SELECT COUNT(*) FROM cursos_secciones) AS total_cursos,
          (SELECT COUNT(*) FROM casos_clinicos) AS total_casos,
          (SELECT COUNT(*) FROM evaluaciones_estudiantes) AS total_evaluaciones;
  END`
];

(async () => {
  try {
    for (const sql of statements) await pool.query(sql);
    console.log('✅ sp_admin_resumen_global creado correctamente');
    const [r] = await pool.query('CALL sp_admin_resumen_global()');
    console.log('Prueba:', r[0][0]);
    process.exit(0);
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
})();

// Crea sp_purgar_auditoria_antigua(): borra registros de auditoría de más de 30 días
// (tanto las acciones del sistema como el historial de accesos/login).
require('dotenv').config();
const pool = require('../src/config/database');

const statements = [
  `DROP PROCEDURE IF EXISTS sp_purgar_auditoria_antigua`,
  `CREATE PROCEDURE sp_purgar_auditoria_antigua()
  BEGIN
      DELETE FROM Auditoria_Acciones WHERE fecha_accion < (NOW() - INTERVAL 30 DAY);
      SELECT ROW_COUNT() AS acciones_eliminadas;

      DELETE FROM Auditoria_Accesos WHERE fecha_hora_login < (NOW() - INTERVAL 30 DAY);
      SELECT ROW_COUNT() AS accesos_eliminados;
  END`
];

(async () => {
  try {
    for (const sql of statements) await pool.query(sql);
    console.log('✅ sp_purgar_auditoria_antigua creado correctamente');
    const [r] = await pool.query('CALL sp_purgar_auditoria_antigua()');
    console.log('Prueba (no debería borrar nada nuevo si ya se corrió antes):', r[0][0], r[1][0]);
    process.exit(0);
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
})();

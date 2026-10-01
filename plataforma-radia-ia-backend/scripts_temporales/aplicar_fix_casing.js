// Aplica scripts_temporales/fix_casing_tablas.sql contra la base de datos indicada por .env
// (usa el mismo pool/config que el servidor real: src/config/database.js).
// Reemplaza 54 procedimientos almacenados que referenciaban tablas con mayusculas
// (ej. "FROM Usuarios") por sus nombres reales en minusculas ("FROM usuarios"), necesario
// porque MySQL en Linux (Railway) es sensible a mayusculas en nombres de tabla.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ override: true });

function dividirEnSentencias(contenido) {
  const lineas = contenido.split(/\r?\n/);
  let delimitador = ';';
  let actual = '';
  const sentencias = [];
  for (const linea of lineas) {
    const trimmed = linea.trim();
    const matchDelim = trimmed.match(/^DELIMITER\s+(\S+)$/i);
    if (matchDelim) { delimitador = matchDelim[1]; continue; }
    if (trimmed.startsWith('--') || trimmed === '') continue;
    actual += linea + '\n';
    if (actual.trimEnd().endsWith(delimitador)) {
      let sql = actual.trimEnd();
      sql = sql.slice(0, -delimitador.length).trim();
      if (sql.length > 0) sentencias.push(sql);
      actual = '';
    }
  }
  const resto = actual.trim();
  if (resto.length > 0) sentencias.push(resto);
  return sentencias;
}

(async () => {
  const archivo = path.join(__dirname, 'fix_casing_tablas.sql');
  const contenido = fs.readFileSync(archivo, 'utf8');
  const sentencias = dividirEnSentencias(contenido);
  console.log(`Total de sentencias a ejecutar: ${sentencias.length}`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log(`Conectado a ${process.env.DB_HOST}:${process.env.DB_PORT || 3306} / ${process.env.DB_NAME}`);

  let ok = 0, fallos = 0;
  const detalles = [];
  for (const sql of sentencias) {
    try {
      await conn.query(sql);
      ok++;
    } catch (e) {
      fallos++;
      detalles.push({ mensaje: e.message, extracto: sql.slice(0, 100) });
    }
  }
  console.log(`\nCompletado: ${ok} OK, ${fallos} fallos.`);
  if (detalles.length) {
    console.log('--- errores ---');
    detalles.forEach(d => console.log(d.mensaje, '->', d.extracto));
  }

  await conn.end();
  process.exit(fallos > 0 ? 1 : 0);
})().catch(e => { console.error('FALLO GENERAL:', e.message); process.exit(1); });

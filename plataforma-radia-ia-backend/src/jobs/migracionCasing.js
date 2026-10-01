// Migración de arranque: corrige 54 procedimientos almacenados que referenciaban nombres de
// tabla con mayúsculas (ej. "FROM Usuarios") en vez de los nombres reales en minúsculas
// ("FROM usuarios"). MariaDB/Windows (desarrollo local con XAMPP) es insensible a mayúsculas
// en nombres de tabla, así que el error nunca apareció ahí; MySQL en Linux (Railway) sí es
// sensible, por lo que el login y otras operaciones fallaban en producción con
// "Table 'railway.Usuarios' doesn't exist".
//
// Se ejecuta una sola vez al iniciar el servidor. Es seguro correrlo en cada arranque:
// DROP PROCEDURE IF EXISTS + CREATE PROCEDURE siempre deja los procedimientos en el mismo
// estado correcto (idempotente), y tarda milisegundos. Se puede eliminar este archivo y su
// llamada en server.js una vez confirmado que producción quedó corregida.
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

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

const aplicarMigracionCasing = async () => {
    try {
        const archivo = path.join(__dirname, '../../scripts_temporales/fix_casing_tablas.sql');
        const contenido = fs.readFileSync(archivo, 'utf8');
        const sentencias = dividirEnSentencias(contenido);

        const conn = await pool.getConnection();
        let ok = 0, fallos = 0;
        for (const sql of sentencias) {
            try {
                await conn.query(sql);
                ok++;
            } catch (e) {
                fallos++;
                console.error('   -> error en migración de casing:', e.message);
            }
        }
        conn.release();
        console.log(`🔧 Migración de casing de tablas: ${ok}/${sentencias.length} sentencias aplicadas` + (fallos ? ` (${fallos} fallos)` : ''));
    } catch (error) {
        console.error('Error al aplicar la migración de casing:', error.message);
    }
};

module.exports = { aplicarMigracionCasing };

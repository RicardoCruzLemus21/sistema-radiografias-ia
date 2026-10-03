// Migración de arranque: corrige dos problemas propios de desplegar en Railway (MySQL en
// Linux) una base de datos exportada desde MariaDB/XAMPP en Windows.
//
// 1) 54 procedimientos almacenados referenciaban nombres de tabla con mayúsculas
//    (ej. "FROM Usuarios") en vez de los nombres reales en minúsculas ("FROM usuarios").
//    MariaDB/Windows es insensible a mayúsculas en nombres de tabla, así que el error nunca
//    apareció ahí; MySQL en Linux sí es sensible, por lo que el login y otras operaciones
//    fallaban en producción con "Table 'railway.Usuarios' doesn't exist".
//
// 2) Tras corregir lo anterior, aparecía "Illegal mix of collations": las tablas se crearon
//    con collation utf8mb4_unicode_ci (el default de MariaDB), pero en MySQL 8/9 los
//    parámetros VARCHAR de un procedimiento sin COLLATE explícito se compilan con la collation
//    de la variable de servidor "default_collation_for_utf8mb4", que en MySQL 8/9 solo admite
//    'utf8mb4_0900_ai_ci' o 'utf8mb4_general_ci' (nunca 'utf8mb4_unicode_ci'), así que no hay
//    forma de hacer que los procedimientos "hablen" la collation de las tablas. La solución es
//    la inversa: convertir las tablas a utf8mb4_0900_ai_ci (el default real de MySQL 8/9), que
//    es exactamente la collation con la que ya se compilan los parámetros. Ambas collations son
//    insensibles a mayúsculas/acentos para comparaciones normales, así que no cambia el
//    comportamiento de la aplicación.
//
// Este segundo paso solo se ejecuta si el motor es MySQL 8/9 (se detecta comprobando si existe
// la collation utf8mb4_0900_ai_ci); en MariaDB local no existe y el paso se omite por completo.
//
// Se ejecuta una sola vez al iniciar el servidor. Es seguro correrlo en cada arranque: ambos
// pasos son idempotentes y tardan milisegundos. Se puede eliminar este archivo y su llamada en
// server.js una vez confirmado que producción quedó corregida.
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

const corregirNombresDeTabla = async (conn) => {
    const archivo = path.join(__dirname, '../../scripts_temporales/fix_casing_tablas.sql');
    const contenido = fs.readFileSync(archivo, 'utf8');
    const sentencias = dividirEnSentencias(contenido);

    let ok = 0, fallos = 0;
    for (const sql of sentencias) {
        try {
            await conn.query(sql);
            ok++;
        } catch (e) {
            fallos++;
            console.error('   -> error al corregir nombres de tabla:', e.message);
        }
    }
    console.log(`🔧 Nombres de tabla en procedimientos: ${ok}/${sentencias.length} sentencias aplicadas` + (fallos ? ` (${fallos} fallos)` : ''));
};

const convertirTablasACollationMySQL8 = async (conn) => {
    const [existeCollation] = await conn.query("SHOW COLLATION LIKE 'utf8mb4_0900_ai_ci'");
    if (existeCollation.length === 0) {
        console.log('   -> motor sin utf8mb4_0900_ai_ci (MariaDB local): se omite la conversión de collation.');
        return;
    }

    const [tablas] = await conn.query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'"
    );

    let ok = 0, fallos = 0;
    for (const { TABLE_NAME } of tablas) {
        try {
            await conn.query('ALTER TABLE `' + TABLE_NAME + '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci');
            ok++;
        } catch (e) {
            fallos++;
            console.error(`   -> error al convertir la tabla ${TABLE_NAME}:`, e.message);
        }
    }
    console.log(`🔧 Collation de tablas a utf8mb4_0900_ai_ci: ${ok}/${tablas.length} tablas convertidas` + (fallos ? ` (${fallos} fallos)` : ''));
};

// Desactiva las explicaciones antiguas generadas con IA (quedan como 'rechazada', no se borran)
const desactivarExplicacionesIa = async (conn) => {
    const archivo = path.join(__dirname, '../../scripts_temporales/desactivar_explicaciones_ia.sql');
    const sentencias = dividirEnSentencias(fs.readFileSync(archivo, 'utf8'));
    for (const sql of sentencias) {
        try {
            await conn.query(sql);
        } catch (e) {
            console.error('   -> error al desactivar explicaciones de IA:', e.message);
        }
    }
};

const aplicarMigracionCasing = async () => {
    try {
        const conn = await pool.getConnection();
        await corregirNombresDeTabla(conn);
        await convertirTablasACollationMySQL8(conn);
        await desactivarExplicacionesIa(conn);
        conn.release();
    } catch (error) {
        console.error('Error al aplicar la migración de casing/collation:', error.message);
    }
};

module.exports = { aplicarMigracionCasing };

const mysql = require('mysql2/promise');
require('dotenv').config({ override: true });

// Creación del Pool de conexiones para manejar múltiples peticiones asíncronas
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306, // XAMPP local usa 3306; Railway (y la mayoría de hosts en la nube) usan otro puerto
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // Obliga a usar radia_ia_schema
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificación inicial de la conexión
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexión exitosa a MySQL (Esquema: radia_ia_schema)');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error crítico al conectar con la Base de Datos:', err.message);
    });

module.exports = pool;
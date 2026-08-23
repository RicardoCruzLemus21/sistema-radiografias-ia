const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'radia_ia_schema'
    });

    try {
        console.log("Conectado a MySQL.");

        // Crear la tabla
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Catalogo_Cursos (
                id_curso_catalogo INT AUTO_INCREMENT PRIMARY KEY,
                nombre_curso VARCHAR(255) UNIQUE NOT NULL
            )
        `);
        console.log("Tabla Catalogo_Cursos verificada/creada.");

        // Insertar los cursos
        const cursos = [
            'Física de las radiaciones e instalaciones seguras',
            'Radiología convencional y fluoroscopia',
            'Tomografía Computarizada (TC) y Resonancia Magnética (RM)',
            'Ecografía / Ultrasonografía general y especializada',
            'Radiología pediátrica, cardiotorácica y musculoesquelética',
            'Neurorradiología e imagen oncológica',
            'Radiología Aplicada'
        ];

        for (const c of cursos) {
            await connection.execute(`INSERT IGNORE INTO Catalogo_Cursos (nombre_curso) VALUES (?)`, [c]);
        }
        
        console.log("Cursos insertados exitosamente.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await connection.end();
    }
}

run();

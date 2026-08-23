const mysql = require('mysql2/promise');
require('dotenv').config();

function generateRandomCarnet() {
    const p1 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    const p2 = Math.floor(Math.random() * 90) + 10;     // 10-99
    const p3 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    return `${p1}-${p2}-${p3}`;
}

async function updateDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'radia_ia_schema'
    });

    try {
        console.log("Añadiendo columna 'carnet' a la tabla Usuarios...");
        await connection.execute(`ALTER TABLE Usuarios ADD COLUMN carnet VARCHAR(20) UNIQUE AFTER id_rol`);
        console.log("Columna añadida con éxito.");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("La columna 'carnet' ya existe.");
        } else {
            console.error("Error añadiendo columna:", e);
        }
    }

    try {
        console.log("Obteniendo usuarios sin carnet...");
        const [usuarios] = await connection.execute('SELECT id_usuario FROM Usuarios WHERE carnet IS NULL');
        
        for (const u of usuarios) {
            let carnet = generateRandomCarnet();
            // Evitar duplicados
            while (true) {
                try {
                    await connection.execute('UPDATE Usuarios SET carnet = ? WHERE id_usuario = ?', [carnet, u.id_usuario]);
                    console.log(`Usuario ID ${u.id_usuario} actualizado con carnet: ${carnet}`);
                    break;
                } catch (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        carnet = generateRandomCarnet(); // Generar de nuevo si hay colisión
                    } else {
                        throw err;
                    }
                }
            }
        }
        console.log("Proceso completado exitosamente.");
    } catch (error) {
        console.error("Error actualizando usuarios:", error);
    } finally {
        await connection.end();
    }
}

updateDatabase();

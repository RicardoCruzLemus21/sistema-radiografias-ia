require('dotenv').config({override:true});
const mysql = require('mysql2/promise');

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await pool.query(`
            INSERT IGNORE INTO Cursos_Secciones (id_curso, id_catedratico, nombre_curso, semestre, anio) VALUES 
            (2, 1, 'Física de las radiaciones e instalaciones seguras', 1, 2026),
            (3, 1, 'Radiología convencional y fluoroscopia', 1, 2026),
            (4, 2, 'Tomografía Computarizada (TC) y Resonancia Magnética (RM)', 2, 2026),
            (5, 2, 'Ecografía / Ultrasonografía general y especializada', 2, 2026),
            (6, 1, 'Radiología pediátrica, cardiotorácica y musculoesquelética', 1, 2026),
            (7, 2, 'Neurorradiología e imagen oncológica', 2, 2026)
        `);

        await pool.query(`
            INSERT IGNORE INTO Asignaciones_Estudiantes (id_curso, id_estudiante) VALUES 
            (6, 3), (6, 4), (4, 5), (7, 6), (7, 8), (2, 9), (3, 10), (5, 11)
        `);

        console.log('Cursos y asignaciones creados');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
})();

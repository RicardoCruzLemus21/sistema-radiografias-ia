const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'radia_ia_schema'
    });

    console.log("Conectado a la base de datos.");

    try {
        // Insertar Roles si no existen
        await connection.execute(`INSERT IGNORE INTO Roles (id_rol, nombre_rol) VALUES (1, 'Catedrático'), (2, 'Estudiante'), (3, 'Admin')`);

        // Contraseña por defecto
        const passHash = await bcrypt.hash('123456', 10);
        const adminHash = await bcrypt.hash('123', 10);

        // Insertar Usuarios
        console.log("Insertando usuarios...");
        await connection.execute(`
            INSERT IGNORE INTO Usuarios (id_usuario, nombre_completo, correo_electronico, contrasena_hash, id_rol, carnet) VALUES 
            (2, 'Carlos Julio Peralta', 'carlos.peralta@miumg.edu.gt', ?, 2, '1001-22-3333'),
            (3, 'Dra. Gabriela Mendoza', 'gabriela.mendoza@miumg.edu.gt', ?, 2, '1002-22-3333'),
            (4, 'Luis Alejandro Ruiz', 'luis.ruiz@miumg.edu.gt', ?, 2, '1003-22-3333'),
            (5, 'Sonia Sofía Delgado', 'sonia.delgado@miumg.edu.gt', ?, 2, '1004-22-3333'),
            (99, 'Administrador Global', 'admin@miumg.edu.gt', ?, 3, '0000-00-0000')
        `, [passHash, passHash, passHash, passHash, adminHash]);

        // Insertar Curso (ID 1)
        console.log("Insertando cursos y carreras...");
        await connection.execute(`
            INSERT IGNORE INTO Cursos_Secciones (id_curso, id_catedratico, nombre_curso, semestre, anio) VALUES 
            (1, 1, 'Radiología Médica', 2, 2026),
            (2, 1, 'Física de las radiaciones e instalaciones seguras', 1, 2026),
            (3, 1, 'Radiología convencional y fluoroscopia', 1, 2026),
            (4, 2, 'Tomografía Computarizada (TC) y Resonancia Magnética (RM)', 2, 2026),
            (5, 2, 'Ecografía / Ultrasonografía general y especializada', 2, 2026),
            (6, 1, 'Radiología pediátrica, cardiotorácica y musculoesquelética', 1, 2026),
            (7, 2, 'Neurorradiología e imagen oncológica', 2, 2026)
        `);

        // Asignar Estudiantes al Curso
        console.log("Asignando estudiantes...");
        await connection.execute(`INSERT IGNORE INTO Asignaciones_Estudiantes (id_curso, id_estudiante) VALUES (1, 2), (1, 3), (1, 4), (1, 5)`);

        // Insertar Casos
        console.log("Insertando Casos Clínicos...");
        await connection.execute(`
            INSERT IGNORE INTO Casos_Clinicos (id_caso, id_curso, titulo_caso, nivel_dificultad, motivo_consulta) VALUES 
            (1, 1, 'Neumonía Atípica', 'Intermedio', 'Fiebre de 5 días y disnea'),
            (2, 1, 'Derrame Pleural Derecho', 'Avanzado', 'Dolor pleurítico agudo'),
            (3, 1, 'Cardiomegalia Grado II', 'Básico', 'Preoperatorio')
        `);

        // Insertar Radiografías para Casos
        console.log("Insertando Radiografías...");
        await connection.execute(`
            INSERT IGNORE INTO Radiografias (id_radiografia, id_caso, ruta_imagen, tipo_proyeccion) VALUES
            (1, 1, 'https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=800&q=80', 'Tórax PA (Posteroanterior)'),
            (2, 2, 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=800&q=80', 'Tórax AP (Anteroposterior)'),
            (3, 3, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', 'Tórax PA (Posteroanterior)')
        `);

        // Actualizar estadísticas globales (Estadisticas_Dashboard)
        console.log("Generando estadísticas de dashboard...");
        await connection.execute(`
            INSERT INTO Estadisticas_Dashboard (id_estudiante, total_casos_resueltos, promedio_precision, ultima_actualizacion) VALUES
            (2, 3, 94.00, NOW()),
            (3, 3, 89.00, NOW()),
            (4, 2, 78.00, NOW()),
            (5, 1, 55.00, NOW())
            ON DUPLICATE KEY UPDATE promedio_precision = VALUES(promedio_precision)
        `);

        console.log("¡Base de datos sembrada correctamente con datos dinámicos!");

    } catch (error) {
        console.error("Error al poblar la base de datos:", error);
    } finally {
        await connection.end();
    }
}

seed();

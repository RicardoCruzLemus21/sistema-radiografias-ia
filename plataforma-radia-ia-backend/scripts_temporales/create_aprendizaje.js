// Módulo de aprendizaje: tablas + contenido base (lecciones y explicaciones por par de categorías).
// Es idempotente: no borra ni pisa lo que el docente haya editado.
const pool = require('../src/config/database');
const { LECCIONES, CLASES } = require('../src/data/leccionesBase');
const { construirExplicacionPlantilla } = require('../src/data/plantillasExplicacion');

const tablas = [
    // Lección de cada categoría (contenido en JSON). El docente puede editarla y aprobarla.
    `CREATE TABLE IF NOT EXISTS aprendizaje_lecciones (
        id_leccion INT AUTO_INCREMENT PRIMARY KEY,
        clase VARCHAR(30) NOT NULL,
        contenido LONGTEXT NOT NULL,
        estado ENUM('borrador','aprobado') NOT NULL DEFAULT 'aprobado',
        revisado_por INT NULL,
        fecha_revision DATETIME NULL,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_leccion_clase (clase)
    )`,

    // Explicación de un error concreto: "era clase_real y el estudiante marcó clase_marcada".
    // 'plantilla' = armada con las lecciones; 'ia' = generada con un LLM. Los estudiantes solo ven las aprobadas.
    `CREATE TABLE IF NOT EXISTS aprendizaje_explicaciones (
        id_explicacion INT AUTO_INCREMENT PRIMARY KEY,
        clase_real VARCHAR(30) NOT NULL,
        clase_marcada VARCHAR(30) NOT NULL,
        contenido LONGTEXT NOT NULL,
        origen ENUM('plantilla','ia') NOT NULL,
        modelo VARCHAR(60) NULL,
        estado ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
        revisado_por INT NULL,
        fecha_revision DATETIME NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_explicacion (clase_real, clase_marcada, origen)
    )`,

    // Avance del estudiante en la ruta de cada categoría
    `CREATE TABLE IF NOT EXISTS aprendizaje_progreso (
        id_estudiante INT NOT NULL,
        clase VARCHAR(30) NOT NULL,
        leccion_vista TINYINT(1) NOT NULL DEFAULT 0,
        comparador_visto TINYINT(1) NOT NULL DEFAULT 0,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_estudiante, clase),
        CONSTRAINT fk_apr_prog_est FOREIGN KEY (id_estudiante) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
    )`,

    // Cada vez que el estudiante responde un caso en práctica guiada o repaso
    `CREATE TABLE IF NOT EXISTS aprendizaje_intentos (
        id_intento INT AUTO_INCREMENT PRIMARY KEY,
        id_estudiante INT NOT NULL,
        id_caso INT NOT NULL,
        clase_objetivo VARCHAR(30) NULL,
        origen ENUM('guiado','repaso') NOT NULL,
        marcadas VARCHAR(255) NOT NULL,
        etiquetas_reales VARCHAR(255) NOT NULL,
        resultado ENUM('acierto','parcial','error') NOT NULL,
        uso_pista TINYINT(1) NOT NULL DEFAULT 0,
        tiempo_seg INT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_apr_int_est (id_estudiante, fecha),
        INDEX idx_apr_int_clase (id_estudiante, clase_objetivo),
        CONSTRAINT fk_apr_int_est FOREIGN KEY (id_estudiante) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
        CONSTRAINT fk_apr_int_caso FOREIGN KEY (id_caso) REFERENCES Casos_Clinicos(id_caso) ON DELETE CASCADE
    )`,

    // Tarjetas de repaso espaciado (una por caso y estudiante). estado_fsrs guarda la tarjeta de ts-fsrs completa.
    `CREATE TABLE IF NOT EXISTS aprendizaje_tarjetas (
        id_estudiante INT NOT NULL,
        id_caso INT NOT NULL,
        clase VARCHAR(30) NOT NULL,
        due DATETIME NOT NULL,
        estado_fsrs LONGTEXT NOT NULL,
        ultimo_resultado ENUM('acierto','parcial','error') NOT NULL,
        repasos INT NOT NULL DEFAULT 1,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_estudiante, id_caso),
        INDEX idx_apr_tar_due (id_estudiante, due),
        CONSTRAINT fk_apr_tar_est FOREIGN KEY (id_estudiante) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
        CONSTRAINT fk_apr_tar_caso FOREIGN KEY (id_caso) REFERENCES Casos_Clinicos(id_caso) ON DELETE CASCADE
    )`
];

(async () => {
    try {
        for (const sql of tablas) await pool.query(sql);

        // Lecciones base (no pisa las que ya existan)
        let lecciones = 0;
        for (const clase of CLASES) {
            const [r] = await pool.query(
                'INSERT INTO aprendizaje_lecciones (clase, contenido, estado) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE contenido = IF(revisado_por IS NULL, VALUES(contenido), contenido)',
                [clase, JSON.stringify(LECCIONES[clase]), 'aprobado']);
            lecciones += r.affectedRows === 1 ? 1 : 0;
        }

        // Explicaciones base por par (56 = 8 x 7). Se aprueban solas porque salen de las lecciones.
        let explicaciones = 0;
        for (const real of CLASES) {
            for (const marcada of CLASES) {
                if (real === marcada) continue;
                const contenido = construirExplicacionPlantilla(real, marcada);
                const [r] = await pool.query(
                    "INSERT INTO aprendizaje_explicaciones (clase_real, clase_marcada, contenido, origen, estado) VALUES (?, ?, ?, 'plantilla', 'aprobada') ON DUPLICATE KEY UPDATE contenido = IF(revisado_por IS NULL, VALUES(contenido), contenido)",
                    [real, marcada, JSON.stringify(contenido)]);
                explicaciones += r.affectedRows === 1 ? 1 : 0;
            }
        }
        console.log(`✅ Tablas de aprendizaje listas. Lecciones al día: ${lecciones}. Explicaciones base al día: ${explicaciones} (lo editado por un docente no se modifica).`);
        process.exit(0);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
})();

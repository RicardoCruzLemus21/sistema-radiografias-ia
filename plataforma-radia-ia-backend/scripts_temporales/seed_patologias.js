const pool = require('./src/config/database');
const dict = require('./src/config/dbDictionary');

const patologias = [
    { nombre: 'Normal', descripcion: 'Radiografía sana, sin hallazgos patológicos.' },
    { nombre: 'Neumonía', descripcion: 'Zonas blancas y opacas (consolidación pulmonar).' },
    { nombre: 'Derrame Pleural', descripcion: 'Acumulación de líquido en las bases pulmonares (borramiento de los ángulos costodiafragmáticos).' },
    { nombre: 'Cardiomegalia', descripcion: 'Corazón agrandado (evaluación de la proporción de la silueta cardíaca).' },
    { nombre: 'Nódulos', descripcion: 'Manchas circulares pequeñas o masas en el tejido pulmonar.' },
    { nombre: 'Neumotórax', descripcion: 'Colapso pulmonar (ausencia de trama vascular en la periferia).' },
    { nombre: 'Atelectasia', descripcion: 'Pérdida de volumen pulmonar (colapso parcial o total de un lóbulo).' },
    { nombre: 'Infiltración', descripcion: 'Patrones difusos en el tejido pulmonar (similares a algodón).' }
];

async function seedPatologias() {
    try {
        console.log('Iniciando reseteo del catálogo de patologías...');
        
        // 1. Limpiar la tabla ignorando validaciones de llaves foráneas temporalmente (en caso haya datos)
        await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
        await pool.query(`TRUNCATE TABLE ${dict.TABLAS.CATALOGO_PATOLOGIAS};`);
        await pool.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        console.log('Tabla Catalogo_Patologias limpiada correctamente.');

        // Asegurarnos de que exista la columna descripcion
        try {
            await pool.query(`ALTER TABLE ${dict.TABLAS.CATALOGO_PATOLOGIAS} ADD COLUMN descripcion TEXT;`);
        } catch(e) {
            // Ya existe, no pasa nada
        }

        // 2. Insertar las 8 patologías requeridas
        for (const p of patologias) {
            await pool.query(
                `INSERT INTO ${dict.TABLAS.CATALOGO_PATOLOGIAS} (nombre_patologia, descripcion) VALUES (?, ?)`,
                [p.nombre, p.descripcion]
            );
        }

        console.log('✅ Catálogo de patologías poblado exitosamente con las 8 clases de IA.');
    } catch (error) {
        console.error('❌ Error al popular el catálogo:', error);
    } finally {
        process.exit();
    }
}

seedPatologias();

const pool = require('../config/database');
const dict = require('../config/dbDictionary');
const tf = require('@tensorflow/tfjs');
const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURACIÓN DEL MOTOR DE INFERENCIA
// ==========================================

// Clases de salida de la Red Neuronal (ResNet50) en el orden alfabético en que fue entrenada
const CLASES_IA = [
    { index: 0, nombre: 'Atelectasia', id_patologia: 7 },
    { index: 1, nombre: 'Cardiomegalia', id_patologia: 4 },
    { index: 2, nombre: 'Derrame Pleural', id_patologia: 3 },
    { index: 3, nombre: 'Infiltracion', id_patologia: 8 },
    { index: 4, nombre: 'Neumonia', id_patologia: 2 },
    { index: 5, nombre: 'Neumotorax', id_patologia: 6 },
    { index: 6, nombre: 'Nodulos', id_patologia: 5 },
    { index: 7, nombre: 'Normal', id_patologia: 1 }
];

// Adaptador Custom para cargar modelos locales en Pure JS
class NodeLocalFileSystem {
    constructor(modelPath) {
        this.modelPath = modelPath;
    }
    async load() {
        const modelJSON = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
        const weightsPath = path.dirname(this.modelPath);
        const weightSpecs = modelJSON.weightsManifest[0].weights;
        const weightPaths = modelJSON.weightsManifest[0].paths.map(p => path.join(weightsPath, p));
        const buffers = weightPaths.map(p => fs.readFileSync(p));
        const weightData = Buffer.concat(buffers).buffer;
        return {
            modelTopology: modelJSON.modelTopology,
            weightSpecs: weightSpecs,
            weightData: weightData
        };
    }
}

let modeloIA = null;

const cargarModeloIA = async () => {
    if (!modeloIA) {
        const modelPath = path.resolve(process.env.MODEL_PATH || './ml_models/model.json');
        console.log(`🧠 [Motor IA] Cargando modelo ResNet50 desde: ${modelPath}`);
        modeloIA = await tf.loadLayersModel(new NodeLocalFileSystem(modelPath));
        console.log('✅ [Motor IA] Modelo de Inteligencia Artificial cargado en memoria exitosamente.');
    }
    return modeloIA;
};

// ==========================================
// FUNCIONES PRINCIPALES
// ==========================================

const procesarResultadoYConcordancia = async (datosPeticion) => {
    const { id_evaluacion, id_radiografia } = datosPeticion;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obtener la ruta de la radiografía
        const [radiografiaRows] = await connection.query(
            `SELECT ${dict.COLUMNAS.RUTA_IMAGEN} FROM ${dict.TABLAS.RADIOGRAFIAS} WHERE ${dict.COLUMNAS.ID_RADIOGRAFIA} = ?`, 
            [id_radiografia]
        );
        if (radiografiaRows.length === 0) throw new Error("Radiografía no encontrada.");
        
        const ruta_imagen_relativa = radiografiaRows[0][dict.COLUMNAS.RUTA_IMAGEN];
        const rutaAbsoluta = path.join(__dirname, '../../', ruta_imagen_relativa);

        // 2. Ejecutar el Motor de Inferencia (ResNet50)
        console.log(`🔍 [Motor IA] Procesando imagen: ${rutaAbsoluta}`);
        const model = await cargarModeloIA();
        const image = await Jimp.read(rutaAbsoluta);
        image.resize({w: 224, h: 224}); // Tamaño esperado por ResNet50
        
        const values = new Float32Array(224 * 224 * 3);
        let i = 0;
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            values[i * 3 + 0] = this.bitmap.data[idx + 0] / 255.0; // R
            values[i * 3 + 1] = this.bitmap.data[idx + 1] / 255.0; // G
            values[i * 3 + 2] = this.bitmap.data[idx + 2] / 255.0; // B
            i++;
        });

        const tensor = tf.tensor4d(values, [1, 224, 224, 3]);
        const prediccion = model.predict(tensor);
        const resultadosArray = await prediccion.data();
        
        tensor.dispose();
        prediccion.dispose();

        let maxProb = 0;
        let maxIndex = 0;
        for(let j=0; j<resultadosArray.length; j++) {
            if(resultadosArray[j] > maxProb) {
                maxProb = resultadosArray[j];
                maxIndex = j;
            }
        }

        const claseDetectada = CLASES_IA.find(c => c.index === maxIndex);
        const probabilidad_porcentaje = (maxProb * 100).toFixed(2);
        console.log(`🤖 [Motor IA] Diagnóstico: ${claseDetectada.nombre} (${probabilidad_porcentaje}%)`);

        // 3. Guardar el veredicto de la Inteligencia Artificial
        const queryIA = `
            INSERT INTO ${dict.TABLAS.RESULTADOS_IA} 
            (${dict.COLUMNAS.ID_RADIOGRAFIA}, ${dict.COLUMNAS.ID_PATOLOGIA_DETECTADA}, ${dict.COLUMNAS.PROBABILIDAD}, ${dict.COLUMNAS.RUTA_MAPA_CALOR}) 
            VALUES (?, ?, ?, ?)
        `;
        const [resIA] = await connection.query(queryIA, [
            id_radiografia, 
            claseDetectada.id_patologia, 
            probabilidad_porcentaje, 
            '/uploads/mapas_calor/default.png' // Fase C (Grad-CAM) pendiente
        ]);
        const id_resultado_ia = resIA.insertId;

        // 4. Extraer el diagnóstico que hizo el estudiante
        const queryEstudiante = `
            SELECT ${dict.COLUMNAS.ID_PATOLOGIA} 
            FROM ${dict.TABLAS.DETALLE_HALLAZGOS} 
            WHERE ${dict.COLUMNAS.ID_EVALUACION} = ?
        `;
        const [hallazgosEstudiante] = await connection.query(queryEstudiante, [id_evaluacion]);

        // 5. Motor Lógico de Concordancia Diagnóstica
        let porcentaje_concordancia = 0.00;
        let nivel_precision = 'Baja';

        const acierto = hallazgosEstudiante.some(h => h[dict.COLUMNAS.ID_PATOLOGIA] === claseDetectada.id_patologia);

        if (acierto) {
            porcentaje_concordancia = 100.00; 
            nivel_precision = 'Alta';
        }

        // 6. Guardar la calificación final en la tabla de Concordancia
        const queryConcordancia = `
            INSERT INTO ${dict.TABLAS.CONCORDANCIA} 
            (${dict.COLUMNAS.ID_EVALUACION}, ${dict.COLUMNAS.ID_RESULTADO_IA}, ${dict.COLUMNAS.PORCENTAJE_CONCORDANCIA}, ${dict.COLUMNAS.NIVEL_PRECISION}) 
            VALUES (?, ?, ?, ?)
        `;
        await connection.query(queryConcordancia, [
            id_evaluacion, 
            id_resultado_ia, 
            porcentaje_concordancia, 
            nivel_precision
        ]);

        await connection.commit();
        connection.release();

        return {
            id_resultado_ia,
            diagnostico_ia: {
                patologia: claseDetectada.nombre,
                probabilidad: probabilidad_porcentaje
            },
            metricas: {
                porcentaje_concordancia,
                nivel_precision,
                acierto_estudiante: acierto
            },
            mensaje: "Inferencia y métricas de concordancia generadas exitosamente."
        };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

module.exports = {
    procesarResultadoYConcordancia,
    cargarModeloIA // Útil si queremos precargar el modelo al arrancar el servidor
};
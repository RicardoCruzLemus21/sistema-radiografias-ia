// Puebla Metricas_Modelo_Patologia con los valores reales del modelo v2 (Colab),
// documentados en RESULTADOS_Y_DEFENSA_RADIA.md (tabla "Cuadro para memorizar",
// Parte 9). No son estimaciones: son las cifras evaluadas sobre 2,990 radiografías
// de test. Solo Cardiomegalia tiene precision_valor propia documentada (0.503);
// el resto de patologías que sí opinan quedan con precision_valor NULL y el
// frontend usa la cifra global (~51%, "3.7 a 6.1 veces mejor que el azar") como
// contexto genérico en vez de inventar un valor por patología que no se midió.
const pool = require('../src/config/database');
const dict = require('../src/config/dbDictionary');

const metricas = [
    {
        nombre: 'Cardiomegalia', auc: 0.926, localizacion_pct: 97.1, precision_valor: 0.503,
        se_abstiene_siempre: false,
        nota_clinica: 'Medición geométrica sobre una estructura grande y de posición fija; localiza el corazón en 97.1% de los casos anotados.'
    },
    {
        nombre: 'Derrame Pleural', auc: 0.875, localizacion_pct: 45.9, precision_valor: null,
        se_abstiene_siempre: false,
        nota_clinica: 'Signo definido (ángulo costodiafragmático borrado) con alto contraste frente al pulmón.'
    },
    {
        nombre: 'Neumotórax', auc: 0.871, localizacion_pct: 29.7, precision_valor: null,
        se_abstiene_siempre: false,
        nota_clinica: 'Límite visible y definido entre el pulmón colapsado y el aire.'
    },
    {
        nombre: 'Atelectasia', auc: 0.784, localizacion_pct: 36.2, precision_valor: null,
        se_abstiene_siempre: false,
        nota_clinica: 'Opacidad de forma variable, más difícil de delimitar que un signo fijo.'
    },
    {
        nombre: 'Nódulos', auc: 0.754, localizacion_pct: 10.3, precision_valor: null,
        se_abstiene_siempre: false,
        nota_clinica: 'Detecta bien la presencia, pero el nódulo es menor que la resolución del mapa de calor.'
    },
    {
        nombre: 'Normal', auc: 0.732, localizacion_pct: null, precision_valor: null,
        se_abstiene_siempre: false,
        nota_clinica: 'Demostrar ausencia de hallazgos es más exigente que demostrar presencia.'
    },
    {
        nombre: 'Neumonía', auc: 0.712, localizacion_pct: 36.2, precision_valor: null,
        se_abstiene_siempre: true,
        nota_clinica: 'Requiere contexto clínico además de la imagen; el modelo se abstiene siempre en esta clase.'
    },
    {
        nombre: 'Infiltración', auc: 0.673, localizacion_pct: null, precision_valor: null,
        se_abstiene_siempre: true,
        nota_clinica: 'Patrón difuso sin bordes definidos; única de las 8 clases sin anotaciones de bbox en el dataset NIH.'
    }
];

async function seedMetricas() {
    try {
        console.log('Poblando Metricas_Modelo_Patologia...');
        for (const m of metricas) {
            const [rows] = await pool.query(
                `SELECT id_patologia FROM ${dict.TABLAS.CATALOGO_PATOLOGIAS} WHERE nombre_patologia = ?`,
                [m.nombre]
            );
            if (rows.length === 0) {
                console.warn(`⚠️  No se encontró "${m.nombre}" en Catalogo_Patologias, se omite.`);
                continue;
            }
            const idPatologia = rows[0].id_patologia;
            await pool.query(
                `INSERT INTO ${dict.TABLAS.METRICAS_MODELO_PATOLOGIA}
                    (id_patologia, auc, localizacion_pct, precision_valor, se_abstiene_siempre, nota_clinica)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    auc = VALUES(auc), localizacion_pct = VALUES(localizacion_pct),
                    precision_valor = VALUES(precision_valor),
                    se_abstiene_siempre = VALUES(se_abstiene_siempre),
                    nota_clinica = VALUES(nota_clinica)`,
                [idPatologia, m.auc, m.localizacion_pct, m.precision_valor, m.se_abstiene_siempre, m.nota_clinica]
            );
        }
        console.log('✅ Metricas_Modelo_Patologia poblada exitosamente.');
    } catch (error) {
        console.error('❌ Error poblando métricas del modelo:', error);
    } finally {
        process.exit();
    }
}

seedMetricas();

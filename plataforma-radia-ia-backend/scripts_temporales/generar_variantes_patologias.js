// Genera y guarda en catalogo_patologias.ficha_ia_json un array de hasta 10 variantes
// de la ficha educativa de cada patología, usando Gemini. Es resumible: cada vez que se
// corre, solo genera las variantes que falten (respeta lo que ya existe en la BD) y guarda
// el progreso después de cada variante, así que puede interrumpirse o toparse con la cuota
// diaria de Gemini sin perder lo ya generado. El endpoint que consumen los estudiantes
// (clinicalService.generarInfoPatologia) NUNCA llama a Gemini: solo lee lo que este script
// ya guardó y elige una variante al azar.
require('dotenv').config();
const pool = require('../src/config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const VARIANTES_OBJETIVO = 10;
const PATOLOGIAS = ['Normal', 'Neumonía', 'Derrame Pleural', 'Cardiomegalia', 'Nódulos', 'Neumotórax', 'Atelectasia', 'Infiltración'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const esErrorDeCuotaDiaria = (err) => {
    const msg = err?.message || '';
    return msg.includes('GenerateRequestsPerDayPerProjectPerModel') || (err?.status === 429 && msg.toLowerCase().includes('quota'));
};

const esErrorTransitorio = (err) => {
    return err?.status === 503 || err?.status === 429;
};

function construirPrompt(patologia, numeroVariante) {
    return "Actúa como un médico radiólogo experto y profesor universitario. Explica la patología radiológica: " + patologia + ".\n" +
        `Esta es la variante educativa número ${numeroVariante} de ${VARIANTES_OBJETIVO} sobre la misma patología. ` +
        "Redáctala de forma claramente distinta a como la explicarías en otras ocasiones: cambia el orden de explicación, los ejemplos clínicos, el mnemónico o dato clave, y el énfasis pedagógico, pero mantén siempre el rigor médico.\n" +
        "Devuelve tu respuesta estrictamente en formato JSON válido, en idioma español, sin bloques de código markdown, con la siguiente estructura exacta:\n" +
        "{\n" +
        "  \"definicion\": \"Descripción médica clara y profesional de la patología.\",\n" +
        "  \"fisiopatologia\": \"Breve explicación de cómo y por qué ocurre esta patología a nivel fisiológico o anatómico.\",\n" +
        "  \"signos_radiologicos\": [\"Signo radiológico 1\", \"Signo radiológico 2\", \"Signo radiológico 3\"],\n" +
        "  \"presentacion_clinica\": \"Breve lista de los síntomas más comunes con los que se presenta el paciente.\",\n" +
        "  \"epidemiologia\": \"Información sobre qué tipo de pacientes suelen padecerla o factores de riesgo principales.\",\n" +
        "  \"diagnostico_diferencial\": \"Otras patologías que se ven similares en Rayos X y cómo distinguirlas de esta.\",\n" +
        "  \"dato_clave\": \"Una frase corta, mnemónico o perla clínica memorable para que un estudiante no olvide esta patología.\"\n" +
        "}";
}

async function generarUnaVariante(model, patologia, numeroVariante) {
    let intentos = 3;
    while (intentos > 0) {
        try {
            const result = await model.generateContent(construirPrompt(patologia, numeroVariante));
            const textoLimpio = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(textoLimpio);
        } catch (err) {
            if (esErrorDeCuotaDiaria(err)) throw err; // no reintentar: hay que abortar el script completo
            if (esErrorTransitorio(err)) {
                intentos--;
                if (intentos === 0) throw err;
                await sleep(3000);
            } else {
                throw err;
            }
        }
    }
}

(async () => {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
        console.error('GEMINI_API_KEY no configurada.');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        generationConfig: { responseMimeType: 'application/json', temperature: 1 }
    });

    let cuotaAgotada = false;
    const resumen = {};

    for (const patologia of PATOLOGIAS) {
        const [rows] = await pool.query('SELECT id_patologia, ficha_ia_json FROM catalogo_patologias WHERE nombre_patologia = ?', [patologia]);
        if (rows.length === 0) {
            console.log(`[SKIP] "${patologia}" no existe en catalogo_patologias.`);
            continue;
        }

        const { id_patologia } = rows[0];
        let variantes = [];
        if (rows[0].ficha_ia_json) {
            try {
                const parseado = JSON.parse(rows[0].ficha_ia_json);
                variantes = Array.isArray(parseado) ? parseado : [parseado];
            } catch (e) { variantes = []; }
        }

        console.log(`\n--- ${patologia}: ${variantes.length}/${VARIANTES_OBJETIVO} variantes existentes ---`);

        if (cuotaAgotada) {
            resumen[patologia] = variantes.length;
            continue;
        }

        while (variantes.length < VARIANTES_OBJETIVO) {
            const numeroVariante = variantes.length + 1;
            try {
                const start = Date.now();
                const nueva = await generarUnaVariante(model, patologia, numeroVariante);
                variantes.push(nueva);
                await pool.query('UPDATE catalogo_patologias SET ficha_ia_json = ? WHERE id_patologia = ?', [JSON.stringify(variantes), id_patologia]);
                console.log(`  [OK] variante ${numeroVariante}/${VARIANTES_OBJETIVO} (${Date.now() - start}ms) guardada.`);
                await sleep(1500);
            } catch (err) {
                if (esErrorDeCuotaDiaria(err)) {
                    console.log(`  [CUOTA AGOTADA] Se detiene el script. Progreso guardado: ${variantes.length}/${VARIANTES_OBJETIVO} para "${patologia}".`);
                    cuotaAgotada = true;
                    break;
                }
                console.log(`  [FALLO] variante ${numeroVariante}: ${err.message}`);
                break; // error no recuperable para esta patología en esta corrida; seguimos con la siguiente
            }
        }

        resumen[patologia] = variantes.length;
    }

    console.log('\n=== RESUMEN FINAL (variantes guardadas por patología) ===');
    for (const [pat, count] of Object.entries(resumen)) {
        console.log(`${pat}: ${count}/${VARIANTES_OBJETIVO}`);
    }
    const total = Object.values(resumen).reduce((a, b) => a + b, 0);
    console.log(`TOTAL: ${total}/${PATOLOGIAS.length * VARIANTES_OBJETIVO}`);
    if (cuotaAgotada) {
        console.log('\nLa cuota diaria de Gemini se agotó durante esta corrida. Vuelve a correr este script mañana para continuar donde quedó.');
    }

    await pool.end();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERROR FATAL:', e.message);
    await pool.end().catch(() => {});
    process.exit(1);
});

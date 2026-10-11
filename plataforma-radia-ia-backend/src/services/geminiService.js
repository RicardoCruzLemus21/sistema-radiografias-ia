// Cliente genérico para pedirle a Gemini una respuesta en JSON, validada contra un esquema.
// No depende de ningún SDK (usa fetch, incluido en Node 18+): un solo archivo, fácil de reemplazar
// por otro proveedor si hace falta.
const MODELO_POR_DEFECTO = 'gemini-flash-latest';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const unaLlamada = async (prompt, schema) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Falta configurar GEMINI_API_KEY en el servidor.');
    const modelo = process.env.GEMINI_MODEL || MODELO_POR_DEFECTO;

    const respuesta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: 'application/json',
                    response_schema: schema
                }
            })
        }
    );

    if (!respuesta.ok) {
        if (respuesta.status === 429) { const e = new Error('Se agotó la cuota gratuita de Gemini por ahora. Intenta de nuevo más tarde.'); e.reintentable = true; throw e; }
        if (respuesta.status === 503) { const e = new Error('Gemini está saturado en este momento. Intenta de nuevo en unos minutos.'); e.reintentable = true; throw e; }
        const detalle = await respuesta.text().catch(() => '');
        throw new Error(`Gemini respondió ${respuesta.status}: ${detalle.slice(0, 300)}`);
    }

    const datos = await respuesta.json();
    const texto = datos?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) throw new Error('Gemini no devolvió contenido.');

    try {
        return JSON.parse(texto);
    } catch (e) {
        throw new Error('Gemini devolvió un JSON inválido.');
    }
};

// Reintenta solo los errores transitorios (429 cuota / 503 saturado): 3 intentos en total,
// con pausas crecientes (3 s, 6 s). Un JSON invalido o un esquema roto no se reintenta, porque
// repetir la misma peticion da el mismo resultado.
const generarJSON = async ({ prompt, schema }) => {
    const pausas = [3000, 6000];
    let ultimoError;
    for (let intento = 0; intento <= pausas.length; intento++) {
        try {
            return await unaLlamada(prompt, schema);
        } catch (error) {
            ultimoError = error;
            if (!error.reintentable || intento === pausas.length) throw error;
            await esperar(pausas[intento]);
        }
    }
    throw ultimoError;
};

module.exports = { generarJSON };

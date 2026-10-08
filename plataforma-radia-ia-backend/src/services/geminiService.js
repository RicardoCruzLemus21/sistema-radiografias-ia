// Cliente genérico para pedirle a Gemini una respuesta en JSON, validada contra un esquema.
// No depende de ningún SDK (usa fetch, incluido en Node 18+): un solo archivo, fácil de reemplazar
// por otro proveedor si hace falta.
const MODELO_POR_DEFECTO = 'gemini-flash-latest';

const generarJSON = async ({ prompt, schema }) => {
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
        if (respuesta.status === 429) throw new Error('Se agotó la cuota gratuita de Gemini por ahora. Intenta de nuevo más tarde.');
        if (respuesta.status === 503) throw new Error('Gemini está saturado en este momento. Intenta de nuevo en unos minutos.');
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

module.exports = { generarJSON };

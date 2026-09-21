const pool = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LECCIONES, CLASES } = require('../data/leccionesBase');
const { ErrorAprendizaje } = require('./aprendizajeService');

const MODELO = 'gemini-flash-latest';
// El plan gratuito de Gemini permite 5 solicitudes por minuto por modelo: se deja ~13 s entre llamadas.
// Con un plan de pago se puede bajar con GEMINI_PAUSA_MS.
const PAUSA_ENTRE_LLAMADAS_MS = Number(process.env.GEMINI_PAUSA_MS) || 13000;
const ESPERA_MAXIMA_REINTENTO_MS = 70000;
const MENSAJE_CUOTA_DIARIA = 'Se agotó el límite diario de solicitudes de Gemini (el plan gratuito permite unas 20 al día). Continúa mañana o usa una clave con facturación activa.';
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const parseJson = (v, def) => { try { return typeof v === 'string' ? JSON.parse(v) : (v ?? def); } catch (e) { return def; } };

const validarClase = (c) => { if (!CLASES.includes(c)) throw new ErrorAprendizaje('Categoría no válida.'); return c; };
const texto = (v, min, max, campo) => {
    const t = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
    if (t.length < min || t.length > max) throw new ErrorAprendizaje(`"${campo}" debe tener entre ${min} y ${max} caracteres.`);
    return t;
};

// Estructura de una explicación: la misma para las de IA, las de plantilla y las que edita el docente
const validarExplicacion = (c) => {
    if (!c || typeof c !== 'object') throw new ErrorAprendizaje('La explicación no tiene el formato esperado.');
    const pasos = Array.isArray(c.como_distinguir) ? c.como_distinguir : [];
    if (pasos.length < 1 || pasos.length > 4) throw new ErrorAprendizaje('"como_distinguir" debe tener entre 1 y 4 pasos.');
    return {
        resumen: texto(c.resumen, 10, 600, 'resumen'),
        como_distinguir: pasos.map((p, i) => texto(p, 8, 350, `paso ${i + 1}`)),
        pista: texto(c.pista, 5, 300, 'pista'),
        proxima_vez: texto(c.proxima_vez, 5, 350, 'próxima vez')
    };
};

// Estructura de una lección
const validarLeccion = (c, clase) => {
    if (!c || typeof c !== 'object') throw new ErrorAprendizaje('La lección no tiene el formato esperado.');
    const lista = (v, campo, min, max) => {
        if (!Array.isArray(v) || v.length < min || v.length > max) throw new ErrorAprendizaje(`"${campo}" debe tener entre ${min} y ${max} elementos.`);
        return v.map((x, i) => texto(x, 8, 400, `${campo} ${i + 1}`));
    };
    const base = LECCIONES[clase];
    const confusiones = Array.isArray(c.se_confunde_con) ? c.se_confunde_con : [];
    return {
        nombre: base.nombre,
        resumen: texto(c.resumen, 10, 600, 'resumen'),
        que_buscar: lista(c.que_buscar, 'qué buscar', 2, 8),
        se_confunde_con: confusiones.map(x => {
            validarClase(x?.clase);
            if (x.clase === clase) throw new ErrorAprendizaje('Una categoría no se confunde consigo misma.');
            return { clase: x.clase, clave: texto(x.clave, 10, 500, `clave (${x.clase})`) };
        }),
        errores_tipicos: lista(c.errores_tipicos, 'errores típicos', 1, 6),
        dato_clave: texto(c.dato_clave, 5, 300, 'dato clave')
    };
};

// ===== Lecciones =====
const listarLecciones = async () => {
    const [res] = await pool.query('CALL sp_apr_lecciones_admin()');
    return res[0].map(l => ({ clase: l.clase, nombre: LECCIONES[l.clase]?.nombre || l.clase, contenido: parseJson(l.contenido, {}), estado: l.estado, revisado_por: l.revisado_por, fecha_revision: l.fecha_revision }));
};

const guardarLeccion = async (clase, contenido, estado, idDocente) => {
    validarClase(clase);
    if (!['borrador', 'aprobado'].includes(estado)) throw new ErrorAprendizaje('Estado no válido.');
    const limpio = validarLeccion(contenido, clase);
    const [res] = await pool.query('CALL sp_apr_guardar_leccion(?, ?, ?, ?)', [clase, JSON.stringify(limpio), estado, idDocente]);
    if (!res[0][0].filas) throw new ErrorAprendizaje('Lección no encontrada.');
    return { clase, estado, contenido: limpio };
};

// ===== Explicaciones =====
const listarExplicaciones = async (estado) => {
    if (estado && !['pendiente', 'aprobada', 'rechazada'].includes(estado)) throw new ErrorAprendizaje('Estado no válido.');
    const [res] = await pool.query('CALL sp_apr_explicaciones_admin(?)', [estado || '']);
    const [faltantes] = await pool.query('CALL sp_apr_pares_ia_faltantes()');
    return {
        explicaciones: res[0].map(e => ({
            id_explicacion: e.id_explicacion,
            clase_real: e.clase_real, nombre_real: LECCIONES[e.clase_real]?.nombre,
            clase_marcada: e.clase_marcada, nombre_marcada: LECCIONES[e.clase_marcada]?.nombre,
            contenido: parseJson(e.contenido, {}), origen: e.origen, modelo: e.modelo, estado: e.estado,
            revisado_por: e.revisado_por, fecha_revision: e.fecha_revision
        })),
        pares_sin_ia: faltantes[0].length
    };
};

const revisarExplicacion = async (id, contenido, estado, idDocente) => {
    const idExp = Number(id);
    if (!Number.isInteger(idExp) || idExp <= 0) throw new ErrorAprendizaje('Explicación no válida.');
    if (!['pendiente', 'aprobada', 'rechazada'].includes(estado)) throw new ErrorAprendizaje('Estado no válido.');
    const limpio = validarExplicacion(contenido);
    const [res] = await pool.query('CALL sp_apr_revisar_explicacion(?, ?, ?, ?)', [idExp, JSON.stringify(limpio), estado, idDocente]);
    if (!res[0][0].filas) throw new ErrorAprendizaje('Explicación no encontrada.');
    return { id_explicacion: idExp, estado, contenido: limpio };
};

// ===== Generación con IA (Gemini) =====
// El modelo solo REDACTA a partir de hechos ya revisados (las lecciones). Nunca califica ni interpreta imágenes.
// Todo lo que genera queda "pendiente": los estudiantes solo ven lo que el docente aprueba.
const construirPrompt = (real, marcada) => {
    const R = LECCIONES[real], M = LECCIONES[marcada];
    const situacion = real === 'Normal'
        ? `La radiografía era NORMAL, pero el estudiante marcó "${M.nombre}" (una falsa alarma).`
        : marcada === 'Normal'
            ? `La radiografía tenía "${R.nombre}" pero el estudiante la marcó como NORMAL (se le escapó el hallazgo).`
            : `La radiografía tenía "${R.nombre}" pero el estudiante marcó "${M.nombre}" (las confundió).`;
    const par = R.se_confunde_con.find(x => x.clase === marcada);
    const hechos = [
        `Cómo se ve ${R.nombre}: ${R.que_buscar.join(' ')}`,
        marcada !== 'Normal' || real === 'Normal' ? `Cómo se ve ${M.nombre}: ${M.que_buscar.join(' ')}` : null,
        par ? `Cómo distinguirlas según el temario: ${par.clave}` : null,
        `Dato clave de ${R.nombre}: ${R.dato_clave}`
    ].filter(Boolean).map(h => `- ${h}`).join('\n');

    return `Eres un profesor de radiología que enseña a estudiantes de medicina a leer radiografías de tórax en proyección PA.
${situacion}

HECHOS VERIFICADOS (usa solo esto; no agregues datos, cifras ni signos que no aparezcan aquí):
${hechos}

Escribe una explicación breve, clara y amable, en español, que ayude al estudiante a no repetir este error.
Reglas:
- "resumen": máximo 2 frases sobre por qué se produce esta confusión.
- "como_distinguir": 2 o 3 pasos concretos, cada uno algo que se pueda comprobar mirando la imagen.
- "pista": una frase corta y fácil de recordar.
- "proxima_vez": una instrucción sobre qué mirar primero la próxima vez.
- No des tratamientos ni recomendaciones clínicas. No menciones que eres una IA. No uses viñetas dentro de los textos.

Devuelve SOLO un JSON válido con exactamente estas claves:
{"resumen": "...", "como_distinguir": ["...", "..."], "pista": "...", "proxima_vez": "..."}`;
};

// Límite DIARIO agotado: no tiene sentido reintentar hasta mañana
const textoDelError = (err) => `${err?.message || ''} ${JSON.stringify(err?.errorDetails || [])}`;
const esErrorDeCuota = (err) => textoDelError(err).includes('PerDay');
// Límite por minuto: Gemini indica cuánto esperar (RetryInfo). Si no, se espera un tiempo prudente.
const esperaSugerida = (err) => {
    const info = (err?.errorDetails || []).find(d => String(d['@type'] || '').includes('RetryInfo'));
    const seg = Number(String(info?.retryDelay || '').match(/(\d+)/)?.[1]);
    return (Number.isFinite(seg) && seg > 0 ? seg * 1000 : 15000) + 1000;
};
const esTransitorio = (err) => err?.status === 503 || err?.status === 429;

const generarContenido = async (modelo, real, marcada) => {
    let intentos = 3;
    while (intentos > 0) {
        try {
            const r = await modelo.generateContent(construirPrompt(real, marcada));
            const limpio = r.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            return validarExplicacion(JSON.parse(limpio));
        } catch (err) {
            if (esErrorDeCuota(err)) throw err;
            if (esTransitorio(err) && --intentos > 0) {
                const espera = err.status === 429 ? esperaSugerida(err) : 3000;
                if (espera > ESPERA_MAXIMA_REINTENTO_MS) throw err;
                await dormir(espera);
                continue;
            }
            throw err;
        }
    }
};

const crearModelo = () => {
    if (!process.env.GEMINI_API_KEY) throw new ErrorAprendizaje('Falta configurar GEMINI_API_KEY en el servidor.');
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
        model: MODELO,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 }
    });
};

// Genera hasta `limite` explicaciones nuevas (por lotes pequeños para no exceder el tiempo de una petición)
const generarExplicaciones = async (limite = 3) => {
    const lote = Math.min(Math.max(parseInt(limite, 10) || 3, 1), 5);
    const modelo = crearModelo();
    const [faltantes] = await pool.query('CALL sp_apr_pares_ia_faltantes()');
    const pendientes = faltantes[0];

    const generadas = [], errores = [];
    let cuotaAgotada = false;
    for (const par of pendientes.slice(0, lote)) {
        try {
            const contenido = await generarContenido(modelo, par.clase_real, par.clase_marcada);
            await pool.query('CALL sp_apr_insertar_explicacion_ia(?, ?, ?, ?)', [par.clase_real, par.clase_marcada, JSON.stringify(contenido), MODELO]);
            generadas.push(`${par.clase_real} → ${par.clase_marcada}`);
        } catch (err) {
            if (esErrorDeCuota(err)) { cuotaAgotada = true; break; }
            errores.push({ par: `${par.clase_real} → ${par.clase_marcada}`, motivo: (err instanceof ErrorAprendizaje ? err.message : (err?.message || 'error').slice(0, 120)) });
        }
        if (par !== pendientes.slice(0, lote).at(-1)) await dormir(PAUSA_ENTRE_LLAMADAS_MS);
    }
    const [restantes] = await pool.query('CALL sp_apr_pares_ia_faltantes()');
    return { generadas: generadas.length, errores, restantes: restantes[0].length, cuota_agotada: cuotaAgotada, mensaje: cuotaAgotada ? MENSAJE_CUOTA_DIARIA : null };
};

// Vuelve a generar el texto de una explicación de IA que el docente no quedó conforme (queda pendiente otra vez)
const regenerarExplicacion = async (id, idDocente) => {
    const [res] = await pool.query('CALL sp_apr_explicaciones_admin(?)', ['']);
    const fila = res[0].find(e => e.id_explicacion === Number(id));
    if (!fila) throw new ErrorAprendizaje('Explicación no encontrada.');
    if (fila.origen !== 'ia') throw new ErrorAprendizaje('Solo se pueden regenerar las explicaciones generadas con IA.');
    let contenido;
    try {
        contenido = await generarContenido(crearModelo(), fila.clase_real, fila.clase_marcada);
    } catch (err) {
        if (err instanceof ErrorAprendizaje) throw err;
        if (esErrorDeCuota(err)) throw new ErrorAprendizaje(MENSAJE_CUOTA_DIARIA);
        if (err?.status === 429) throw new ErrorAprendizaje('Gemini alcanzó su límite por minuto. Espera un momento e inténtalo de nuevo.');
        throw new ErrorAprendizaje('Gemini no pudo generar el texto ahora. Inténtalo de nuevo en unos minutos.');
    }
    return revisarExplicacion(id, contenido, 'pendiente', idDocente);
};

module.exports = { listarLecciones, guardarLeccion, listarExplicaciones, revisarExplicacion, generarExplicaciones, regenerarExplicacion, validarExplicacion, construirPrompt };

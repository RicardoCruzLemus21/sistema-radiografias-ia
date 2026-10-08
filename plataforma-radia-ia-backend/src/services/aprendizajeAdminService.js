const pool = require('../config/database');
const { obtenerLecciones, obtenerClases } = require('../config/catalogoLecciones');
const { ErrorAprendizaje } = require('./aprendizajeService');
const geminiService = require('./geminiService');

const parseJson = (v, def) => { try { return typeof v === 'string' ? JSON.parse(v) : (v ?? def); } catch (e) { return def; } };

const validarClase = (c) => { if (!obtenerClases().includes(c)) throw new ErrorAprendizaje('Categoría no válida.'); return c; };
const texto = (v, min, max, campo) => {
    const t = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
    if (t.length < min || t.length > max) throw new ErrorAprendizaje(`"${campo}" debe tener entre ${min} y ${max} caracteres.`);
    return t;
};

// Estructura de una explicación (la base del sistema y las que edita el docente)
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
    const base = obtenerLecciones()[clase];
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
    return res[0].map(l => ({ clase: l.clase, nombre: obtenerLecciones()[l.clase]?.nombre || l.clase, contenido: parseJson(l.contenido, {}), estado: l.estado, revisado_por: l.revisado_por, fecha_revision: l.fecha_revision }));
};

const guardarLeccion = async (clase, contenido, estado, idDocente) => {
    validarClase(clase);
    if (!['borrador', 'aprobado'].includes(estado)) throw new ErrorAprendizaje('Estado no válido.');
    const limpio = validarLeccion(contenido, clase);
    const [res] = await pool.query('CALL sp_apr_guardar_leccion(?, ?, ?, ?)', [clase, JSON.stringify(limpio), estado, idDocente]);
    if (!res[0][0].filas) throw new ErrorAprendizaje('Lección no encontrada.');
    return { clase, estado, contenido: limpio };
};

// ===== Generación de lecciones con IA =====
// El docente presiona un botón y se generan 8 candidatas (una por patología), sin publicarlas todavía.
const esquemaLeccionIA = {
    type: 'OBJECT',
    properties: {
        resumen: { type: 'STRING' },
        que_buscar: { type: 'ARRAY', items: { type: 'STRING' } },
        errores_tipicos: { type: 'ARRAY', items: { type: 'STRING' } },
        dato_clave: { type: 'STRING' },
        se_confunde_con: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: { clase: { type: 'STRING' }, clave: { type: 'STRING' } },
                required: ['clase', 'clave']
            }
        }
    },
    required: ['resumen', 'que_buscar', 'errores_tipicos', 'dato_clave', 'se_confunde_con']
};

const promptLeccion = (clase, nombre) => {
    const otras = obtenerClases().filter(c => c !== clase);
    const listaOtras = otras.map(c => `${c} (${obtenerLecciones()[c]?.nombre || c})`).join(', ');
    return `Eres un radiólogo que escribe material educativo en español para estudiantes de medicina sobre cómo reconocer "${nombre}" en una radiografía de tórax.
Responde SOLO con un JSON (sin texto adicional) con estos campos:
- resumen: 1 a 3 frases (10 a 600 caracteres) de cómo se reconoce ${nombre} en la radiografía.
- que_buscar: entre 2 y 8 señales radiológicas concretas (cada una de 8 a 400 caracteres).
- errores_tipicos: entre 1 y 6 errores comunes que cometen los estudiantes al diagnosticar esto (cada uno de 8 a 400 caracteres).
- dato_clave: un dato breve y memorable (5 a 300 caracteres).
- se_confunde_con: 2 o 3 objetos {clase, clave}. "clase" debe ser EXACTAMENTE uno de estos valores (tal cual, sin acentos ni cambios): ${otras.join(', ')}. "clave" (10 a 500 caracteres) explica cómo distinguir ${nombre} de esa otra condición. Las otras categorías del sistema son: ${listaOtras}.
No repitas "${clase}" en se_confunde_con.`;
};

// Cada click en "Generar lección" crea un LOTE: hasta 8 candidatas (una por patología), agrupadas.
// El docente/admin publica el lote completo (no patología por patología) desde publicarLoteLeccion.
const generarLecciones = async (idDocente) => {
    const [loteRes] = await pool.query('CALL sp_apr_crear_lote_leccion(?)', [idDocente]);
    const idLote = loteRes[0][0].id_lote;

    const clases = obtenerClases();
    const generadas = [];
    const errores = [];
    for (const clase of clases) {
        const nombre = obtenerLecciones()[clase]?.nombre || clase;
        try {
            const crudo = await geminiService.generarJSON({ prompt: promptLeccion(clase, nombre), schema: esquemaLeccionIA });
            const limpio = validarLeccion(crudo, clase);
            const [res] = await pool.query('CALL sp_apr_crear_version_leccion(?, ?, ?)', [idLote, clase, JSON.stringify(limpio)]);
            generadas.push({ id_version: res[0][0].id_version, clase, nombre, contenido: limpio });
        } catch (error) {
            errores.push({ clase, nombre, mensaje: error.message });
        }
    }
    return { id_lote: idLote, generadas, errores };
};

const listarLotesLeccion = async () => {
    const [res] = await pool.query('CALL sp_apr_listar_lotes_leccion()');
    return res[0];
};

const listarVersionesLote = async (idLote) => {
    const id = Number(idLote);
    if (!Number.isInteger(id) || id <= 0) throw new ErrorAprendizaje('Conjunto no válido.');
    const [res] = await pool.query('CALL sp_apr_listar_versiones_lote(?)', [id]);
    return res[0].map(v => ({ id_version: v.id_version, clase: v.clase, nombre: obtenerLecciones()[v.clase]?.nombre || v.clase, contenido: parseJson(v.contenido, {}) }));
};

const publicarLoteLeccion = async (idLote, idDocente) => {
    const versiones = await listarVersionesLote(idLote);
    if (versiones.length === 0) throw new ErrorAprendizaje('Ese conjunto no tiene lecciones generadas.');
    const publicadas = [];
    for (const v of versiones) {
        publicadas.push(await guardarLeccion(v.clase, v.contenido, 'aprobado', idDocente));
    }
    return { publicadas };
};

// ===== Explicaciones =====
// Solo se listan las explicaciones base (origen 'plantilla'). Las antiguas generadas con IA quedan
// en la base de datos, desactivadas, pero ya no se muestran ni se pueden editar desde aquí.
const listarExplicaciones = async (estado) => {
    if (estado && !['pendiente', 'aprobada', 'rechazada'].includes(estado)) throw new ErrorAprendizaje('Estado no válido.');
    const [res] = await pool.query('CALL sp_apr_explicaciones_admin(?)', [estado || '']);
    return {
        explicaciones: res[0]
            .filter(e => e.origen !== 'ia')
            .map(e => ({
                id_explicacion: e.id_explicacion,
                clase_real: e.clase_real, nombre_real: obtenerLecciones()[e.clase_real]?.nombre,
                clase_marcada: e.clase_marcada, nombre_marcada: obtenerLecciones()[e.clase_marcada]?.nombre,
                contenido: parseJson(e.contenido, {}), estado: e.estado,
                revisado_por: e.revisado_por, fecha_revision: e.fecha_revision
            }))
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

module.exports = {
    listarLecciones, guardarLeccion, listarExplicaciones, revisarExplicacion, validarExplicacion,
    generarLecciones, listarLotesLeccion, listarVersionesLote, publicarLoteLeccion
};

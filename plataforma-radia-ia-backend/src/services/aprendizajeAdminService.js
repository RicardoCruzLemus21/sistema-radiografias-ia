const pool = require('../config/database');
const { LECCIONES, CLASES } = require('../data/leccionesBase');
const { ErrorAprendizaje } = require('./aprendizajeService');

const parseJson = (v, def) => { try { return typeof v === 'string' ? JSON.parse(v) : (v ?? def); } catch (e) { return def; } };

const validarClase = (c) => { if (!CLASES.includes(c)) throw new ErrorAprendizaje('Categoría no válida.'); return c; };
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
                clase_real: e.clase_real, nombre_real: LECCIONES[e.clase_real]?.nombre,
                clase_marcada: e.clase_marcada, nombre_marcada: LECCIONES[e.clase_marcada]?.nombre,
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

module.exports = { listarLecciones, guardarLeccion, listarExplicaciones, revisarExplicacion, validarExplicacion };

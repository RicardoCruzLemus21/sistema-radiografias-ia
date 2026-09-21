const pool = require('../config/database');
const { fsrs, createEmptyCard, generatorParameters, Rating } = require('ts-fsrs');
const { LECCIONES, CLASES } = require('../data/leccionesBase');
const { construirExplicacionPlantilla } = require('../data/plantillasExplicacion');
const { DISTRACTORES } = require('../config/distractoresConfig');

// Error causado por datos del usuario (el controlador responde 400)
class ErrorAprendizaje extends Error {}

const TAMANO_SESION = 6;
const TARJETAS_POR_SESION = 10;
const MIN_INTENTOS_DOMINIO = 5;
const UMBRAL_DOMINIO = 0.7;

// Repaso espaciado (FSRS). Sin pasos cortos: cada tarjeta es un caso y las sesiones son diarias, no de minutos.
const algoritmo = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false, learning_steps: [], relearning_steps: [] }));

const quitarTildes = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
const CATALOGO_A_CLASE = Object.fromEntries(CLASES.map(c => [quitarTildes(LECCIONES[c].nombre).toLowerCase(), c]));
// Nombre del catálogo (con tilde) o del banco -> categoría canónica del banco. null si no es una de las 8.
const claseDe = (nombre) => CATALOGO_A_CLASE[quitarTildes(nombre || '').toLowerCase()] || null;
const NOMBRE_CATALOGO = { Infiltracion: 'Infiltración', Neumonia: 'Neumonía', Neumotorax: 'Neumotórax', Nodulos: 'Nódulos' };

const validarClase = (clase) => {
    if (!CLASES.includes(clase)) throw new ErrorAprendizaje('Categoría no válida.');
    return clase;
};

const urlGradcam = (ruta) => (ruta ? `/uploads/banco_casos/${String(ruta).replace(/^\/+/, '')}` : null);
const parseJson = (v, def) => { try { return typeof v === 'string' ? JSON.parse(v) : (v ?? def); } catch (e) { return def; } };
const barajar = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const elegir = (a) => a[Math.floor(Math.random() * a.length)];

// ===== Evaluación de una respuesta =====
// acierto = mismas categorías que la verdad; parcial = alguna coincide pero no todas; error = ninguna
const evaluar = (marcadas, reales) => {
    const m = new Set(marcadas), r = new Set(reales);
    const iguales = m.size === r.size && [...m].every(x => r.has(x));
    if (iguales) return 'acierto';
    return [...m].some(x => r.has(x)) ? 'parcial' : 'error';
};

// Pares (era X, marcaste Y) que explican los fallos de una respuesta
const paresDeError = (marcadas, reales) => {
    const omitidas = reales.filter(r => !marcadas.includes(r));
    const sobrantes = marcadas.filter(m => !reales.includes(m));
    return omitidas.map((r, i) => ({ real: r, marcada: sobrantes[i] || sobrantes[0] || 'Normal' }));
};

const explicacionDelPar = async (real, marcada) => {
    const [res] = await pool.query('CALL sp_apr_explicacion(?, ?)', [real, marcada]);
    const fila = res[0][0];
    if (fila) return { ...parseJson(fila.contenido, {}), origen: fila.origen };
    return { ...construirExplicacionPlantilla(real, marcada), origen: 'plantilla' };
};

// ===== Repaso espaciado =====
const ratingDe = (resultado, usoPista) => {
    if (resultado === 'acierto') return usoPista ? Rating.Hard : Rating.Good;
    if (resultado === 'parcial') return Rating.Hard;
    return Rating.Again;
};

const cargarTarjeta = (json) => {
    const c = parseJson(json, null);
    if (!c) return null;
    c.due = new Date(c.due);
    if (c.last_review) c.last_review = new Date(c.last_review);
    return c;
};

// Programa el próximo repaso de un caso y lo guarda. `ahora` permite reprogramar con la fecha real de una respuesta anterior.
const programarTarjeta = async (idEst, idCaso, clase, rating, resultado, ahora = new Date()) => {
    const [res] = await pool.query('CALL sp_apr_tarjeta(?, ?)', [idEst, idCaso]);
    const previa = res[0][0] ? cargarTarjeta(res[0][0].estado_fsrs) : null;
    const nueva = algoritmo.repeat(previa || createEmptyCard(ahora), ahora)[rating].card;
    await pool.query('CALL sp_apr_guardar_tarjeta(?, ?, ?, ?, ?, ?)', [idEst, idCaso, clase, nueva.due, JSON.stringify(nueva), resultado]);
    return nueva.due;
};

// Las respuestas dadas en los ejercicios del curso que salieron mal también se repasan.
// Cada respuesta con menos de 100 % crea una tarjeta (si aún no existe), programada desde la fecha en que se respondió.
const sincronizarTarjetas = async (idEst, soloCaso = null) => {
    const [res] = await pool.query('CALL sp_apr_evaluaciones_estudiante(?)', [idEst]);
    for (const ev of res[0]) {
        if (soloCaso && ev.id_caso !== Number(soloCaso)) continue;
        const puntaje = Number(ev.eje1_diagnostico);
        if (!Number.isFinite(puntaje) || puntaje >= 100) continue;
        const [t] = await pool.query('CALL sp_apr_tarjeta(?, ?)', [idEst, ev.id_caso]);
        if (t[0][0]) continue; // ya tiene tarjeta: su programación manda
        const reales = parseJson(ev.hallazgos_docente, {}).etiquetas_reales || [];
        const clase = reales.find(r => r !== 'Normal') || reales[0] || 'Normal';
        await programarTarjeta(idEst, ev.id_caso, clase, puntaje < 50 ? Rating.Again : Rating.Hard, puntaje < 50 ? 'error' : 'parcial', new Date(ev.fecha_evaluacion));
    }
};

// ===== Estudiante: resumen de la ruta =====
const obtenerResumen = async (idEst) => {
    await sincronizarTarjetas(idEst).catch(e => console.error('Error sincronizando tarjetas:', e.message));
    const [res] = await pool.query('CALL sp_apr_progreso(?)', [idEst]);
    const progreso = Object.fromEntries(res[0].map(p => [p.clase, p]));
    const intentos = Object.fromEntries(res[1].map(i => [i.clase, i]));
    const t = res[2][0] || {};

    const clases = CLASES.map(clase => {
        const p = progreso[clase] || {};
        const i = intentos[clase] || {};
        const n = Number(i.intentos) || 0, ok = Number(i.aciertos) || 0;
        const guiados = n >= MIN_INTENTOS_DOMINIO && ok / n >= UMBRAL_DOMINIO;
        const dominada = !!p.leccion_vista && !!p.comparador_visto && guiados;
        const activa = !!p.leccion_vista || !!p.comparador_visto || n > 0;
        return {
            clase,
            nombre: LECCIONES[clase].nombre,
            leccion_vista: !!p.leccion_vista,
            comparador_visto: !!p.comparador_visto,
            intentos_guiados: n,
            aciertos_guiados: ok,
            dominio: n > 0 ? Math.round((ok / n) * 100) : null,
            estado: dominada ? 'dominada' : (activa ? 'en_curso' : 'nueva')
        };
    });

    return {
        clases,
        repaso: { total: Number(t.total) || 0, vencidas: Number(t.vencidas) || 0, proxima: t.proxima || null },
        reglas: { min_intentos: MIN_INTENTOS_DOMINIO, umbral: UMBRAL_DOMINIO * 100 }
    };
};

// ===== Lección =====
const obtenerLeccion = async (clase) => {
    validarClase(clase);
    const [res] = await pool.query('CALL sp_apr_leccion(?)', [clase]);
    const fila = res[0][0];
    if (!fila) throw new ErrorAprendizaje('Esta lección todavía no está disponible.');
    const leccion = parseJson(fila.contenido, {});

    // Ficha ampliada (definición, fisiopatología...) que ya existe en la Biblioteca Clínica; si no está generada, se omite
    let ficha = null;
    try {
        const { generarInfoPatologia } = require('./clinicalService');
        ficha = await generarInfoPatologia(NOMBRE_CATALOGO[clase] || clase);
    } catch (e) { ficha = null; }

    return { ...leccion, clase, ficha };
};

const marcarPaso = async (idEst, clase, paso) => {
    validarClase(clase);
    if (!['leccion', 'comparador'].includes(paso)) throw new ErrorAprendizaje('Paso no válido.');
    await pool.query('CALL sp_apr_marcar_paso(?, ?, ?)', [idEst, clase, paso]);
};

// ===== Comparador =====
const ejemploComparador = async (idEst, clase, excluir = null) => {
    const [res] = await pool.query('CALL sp_apr_ejemplo_comparador(?, ?, ?)', [idEst, clase, excluir]);
    const c = res[0][0];
    if (!c) return null;
    const h = parseJson(c.hallazgos_docente, {});
    const bbox = Array.isArray(h.bbox) ? h.bbox.filter(b => b && b.patologia === clase) : [];
    return {
        clase,
        nombre: LECCIONES[clase].nombre,
        id_caso: c.id_caso,
        imagen: c.ruta_imagen,
        gradcam: urlGradcam((h.gradcam || {})[clase]),
        bbox
    };
};

const obtenerComparador = async (idEst, clase, contra) => {
    validarClase(clase);
    validarClase(contra);
    if (clase === contra) throw new ErrorAprendizaje('Elige dos categorías distintas para comparar.');
    const [a, b] = await Promise.all([ejemploComparador(idEst, clase), ejemploComparador(idEst, contra)]);
    if (!a || !b) throw new ErrorAprendizaje('No hay ejemplos suficientes de esas categorías.');
    return {
        a, b,
        claves: { [clase]: LECCIONES[clase].que_buscar.slice(0, 3), [contra]: LECCIONES[contra].que_buscar.slice(0, 3) },
        explicacion: await explicacionDelPar(clase, contra)
    };
};

// ===== Práctica guiada =====
const casosPractica = async (idEst, clase, limite, excluir, puro = 1) => {
    const [res] = await pool.query('CALL sp_apr_casos_practica(?, ?, ?, ?, ?)', [idEst, clase, puro, limite, excluir.join(',')]);
    return res[0];
};

const obtenerSesionGuiada = async (idEst, clase) => {
    validarClase(clase);
    // Se evitan los últimos casos practicados para que cada sesión traiga imágenes nuevas
    const [hist] = await pool.query('CALL sp_apr_intentos_estudiante(?)', [idEst]);
    const excluir = hist[0].slice(-40).map(i => i.id_caso);

    // Mezcla: la mayoría de la categoría elegida, más casos con los que se suele confundir y casos normales
    const confundibles = clase === 'Normal'
        ? barajar(CLASES.filter(c => c !== 'Normal')).slice(0, 3)
        : (DISTRACTORES[clase] || []).map(d => claseDe(d)).filter(c => c && c !== 'Normal' && c !== clase);
    const plan = clase === 'Normal'
        ? [['Normal', 3], ...confundibles.map(c => [c, 1])]
        : [[clase, 4], ['Normal', 1], [elegir(confundibles.length ? confundibles : CLASES.filter(c => c !== clase && c !== 'Normal')), 1]];

    const casos = [];
    for (const [c, n] of plan) {
        const usados = [...excluir, ...casos.map(x => x.id_caso)];
        for (const caso of await casosPractica(idEst, c, n, usados)) casos.push({ id_caso: caso.id_caso, imagen: caso.ruta_imagen });
    }
    if (casos.length === 0) throw new ErrorAprendizaje('No hay casos disponibles para practicar esta categoría.');

    return {
        clase,
        nombre: LECCIONES[clase].nombre,
        casos: barajar(casos).slice(0, TAMANO_SESION),
        pistas: LECCIONES[clase].que_buscar.slice(0, 2)
    };
};

// ===== Responder un caso (práctica guiada o repaso) =====
const responder = async (idEst, { id_caso, marcadas, origen, clase_objetivo, uso_pista, tiempo }) => {
    if (!['guiado', 'repaso'].includes(origen)) throw new ErrorAprendizaje('Origen no válido.');
    const idCaso = Number(id_caso);
    if (!Number.isInteger(idCaso) || idCaso <= 0) throw new ErrorAprendizaje('Caso no válido.');
    if (!Array.isArray(marcadas) || marcadas.length === 0 || marcadas.length > CLASES.length || marcadas.some(m => !CLASES.includes(m))) {
        throw new ErrorAprendizaje('Marca al menos una categoría.');
    }
    const marcadasUnicas = [...new Set(marcadas)];
    if (marcadasUnicas.includes('Normal') && marcadasUnicas.length > 1) throw new ErrorAprendizaje('"Normal" no se combina con otras categorías.');
    if (origen === 'guiado') validarClase(clase_objetivo);

    // Solo se revela la verdad de casos que el estudiante puede practicar (o que ya tiene en su repaso)
    const [res] = origen === 'guiado'
        ? await pool.query('CALL sp_apr_caso_practica(?, ?)', [idEst, idCaso])
        : await pool.query('CALL sp_apr_caso_tarjeta(?, ?)', [idEst, idCaso]);
    const caso = res[0][0];
    if (!caso) throw new ErrorAprendizaje('Ese caso no está disponible para practicar.');

    const h = parseJson(caso.hallazgos_docente, {});
    const reales = h.etiquetas_reales || [];
    const resultado = evaluar(marcadasUnicas, reales);
    const claseTarjeta = origen === 'guiado' ? clase_objetivo : (caso.clase || reales.find(r => r !== 'Normal') || 'Normal');
    const tiempoSeg = Number.isFinite(Number(tiempo)) ? Math.min(Math.max(Math.round(Number(tiempo)), 0), 3600) : null;

    await pool.query('CALL sp_apr_registrar_intento(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [idEst, idCaso, claseTarjeta, origen, marcadasUnicas.join('|'), reales.join('|'), resultado, uso_pista ? 1 : 0, tiempoSeg]);
    const proxima = await programarTarjeta(idEst, idCaso, claseTarjeta, ratingDe(resultado, !!uso_pista), resultado);

    // Explicaciones: una por cada hallazgo que se le escapó o confundió; si acertó, se refuerza con el dato clave
    const explicaciones = [];
    for (const par of paresDeError(marcadasUnicas, reales)) {
        explicaciones.push({ ...par, nombre_real: LECCIONES[par.real].nombre, nombre_marcada: LECCIONES[par.marcada].nombre, ...(await explicacionDelPar(par.real, par.marcada)) });
    }

    return {
        resultado,
        marcadas: marcadasUnicas,
        etiquetas_reales: reales,
        explicaciones,
        refuerzo: resultado === 'acierto' ? reales.map(r => ({ clase: r, nombre: LECCIONES[r].nombre, dato_clave: LECCIONES[r].dato_clave })) : [],
        gradcam: reales.filter(r => (h.gradcam || {})[r]).map(r => ({ clase: r, nombre: LECCIONES[r].nombre, url: urlGradcam(h.gradcam[r]) })),
        bbox: Array.isArray(h.bbox) ? h.bbox : [],
        proxima_revision: proxima
    };
};

// ===== Repaso =====
const obtenerRepaso = async (idEst) => {
    await sincronizarTarjetas(idEst).catch(e => console.error('Error sincronizando tarjetas:', e.message));
    const [res] = await pool.query('CALL sp_apr_tarjetas_vencidas(?, ?)', [idEst, TARJETAS_POR_SESION]);
    const [resumen] = await pool.query('CALL sp_apr_progreso(?)', [idEst]);
    const t = resumen[2][0] || {};
    return {
        // No se envía la categoría: sería la respuesta
        casos: res[0].map(c => ({ id_caso: c.id_caso, imagen: c.ruta_imagen })),
        vencidas: Number(t.vencidas) || 0,
        total: Number(t.total) || 0,
        proxima: t.proxima || null
    };
};

// ===== Mis errores frecuentes =====
const obtenerMisErrores = async (idEst) => {
    const [ev] = await pool.query('CALL sp_apr_evaluaciones_estudiante(?)', [idEst]);
    const [it] = await pool.query('CALL sp_apr_intentos_estudiante(?)', [idEst]);

    // Todos los eventos con la misma forma: qué era, qué marcó
    const eventos = [];
    for (const e of ev[0]) {
        const reales = parseJson(e.hallazgos_docente, {}).etiquetas_reales || [];
        const marcadas = (e.marcadas ? e.marcadas.split('|') : []).map(claseDe).filter(Boolean);
        eventos.push({ fuente: 'ejercicio', reales, marcadas, confianza: e.nivel_confianza !== null ? Number(e.nivel_confianza) : null, puntaje: Number(e.eje1_diagnostico), fecha: e.fecha_evaluacion });
    }
    for (const i of it[0]) {
        eventos.push({ fuente: i.origen, reales: i.etiquetas_reales.split('|'), marcadas: i.marcadas.split('|'), confianza: null, puntaje: null, fecha: i.fecha });
    }

    // Matriz: filas = lo que era, columnas = lo que marcó (la diagonal son los aciertos)
    const matriz = Object.fromEntries(CLASES.map(r => [r, Object.fromEntries(CLASES.map(m => [m, 0]))]));
    const porClase = Object.fromEntries(CLASES.map(c => [c, { apariciones: 0, detectadas: 0, falsas_alarmas: 0 }]));
    for (const e of eventos) {
        for (const r of e.reales) {
            if (!porClase[r]) continue;
            porClase[r].apariciones++;
            if (e.marcadas.includes(r)) { porClase[r].detectadas++; matriz[r][r]++; }
        }
        for (const par of paresDeError(e.marcadas, e.reales)) matriz[par.real][par.marcada]++;
        for (const m of e.marcadas) if (porClase[m] && !e.reales.includes(m)) porClase[m].falsas_alarmas++;
    }

    const clases = CLASES.map(c => ({
        clase: c,
        nombre: LECCIONES[c].nombre,
        ...porClase[c],
        sensibilidad: porClase[c].apariciones > 0 ? Math.round((porClase[c].detectadas / porClase[c].apariciones) * 100) : null
    }));

    const confusiones = [];
    for (const r of CLASES) for (const m of CLASES) if (r !== m && matriz[r][m] > 0) confusiones.push({ real: r, marcada: m, nombre_real: LECCIONES[r].nombre, nombre_marcada: LECCIONES[m].nombre, veces: matriz[r][m] });
    confusiones.sort((a, b) => b.veces - a.veces);

    // Confianza frente a resultado (solo ejercicios, donde el estudiante declara su confianza)
    const conConfianza = eventos.filter(e => e.confianza !== null && Number.isFinite(e.puntaje));
    const tramos = [['Baja (0-33)', 0, 33], ['Media (34-66)', 34, 66], ['Alta (67-100)', 67, 100]].map(([nombre, min, max]) => {
        const g = conConfianza.filter(e => e.confianza >= min && e.confianza <= max);
        return { tramo: nombre, casos: g.length, confianza_media: g.length ? Math.round(g.reduce((s, e) => s + e.confianza, 0) / g.length) : null, acierto_medio: g.length ? Math.round(g.reduce((s, e) => s + e.puntaje, 0) / g.length) : null };
    });
    const confMedia = conConfianza.length ? conConfianza.reduce((s, e) => s + e.confianza, 0) / conConfianza.length : null;
    const acMedio = conConfianza.length ? conConfianza.reduce((s, e) => s + e.puntaje, 0) / conConfianza.length : null;
    const diferencia = confMedia !== null ? Math.round(confMedia - acMedio) : null;

    // Qué reforzar primero: las categorías con peor sensibilidad (al menos 2 apariciones)
    const debiles = clases.filter(c => c.apariciones >= 2 && c.sensibilidad !== null).sort((a, b) => a.sensibilidad - b.sensibilidad).slice(0, 3);

    return {
        total_eventos: eventos.length,
        por_fuente: { ejercicio: eventos.filter(e => e.fuente === 'ejercicio').length, guiado: eventos.filter(e => e.fuente === 'guiado').length, repaso: eventos.filter(e => e.fuente === 'repaso').length },
        clases,
        matriz,
        confusiones: confusiones.slice(0, 6),
        calibracion: { tramos, confianza_media: confMedia !== null ? Math.round(confMedia) : null, acierto_medio: acMedio !== null ? Math.round(acMedio) : null, diferencia, casos: conConfianza.length },
        reforzar: debiles
    };
};

module.exports = {
    ErrorAprendizaje,
    CLASES,
    claseDe,
    obtenerResumen,
    obtenerLeccion,
    marcarPaso,
    obtenerComparador,
    obtenerSesionGuiada,
    responder,
    obtenerRepaso,
    obtenerMisErrores,
    sincronizarTarjetas,
    evaluar,
    paresDeError
};

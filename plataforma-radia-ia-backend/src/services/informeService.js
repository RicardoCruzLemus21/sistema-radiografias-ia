const PDFDocument = require('pdfkit');
const pool = require('../config/database');

const MAX_EJERCICIOS = 50;

// Error causado por datos del usuario (el controlador responde 400)
class ErrorInforme extends Error {}

const COLOR = { titulo: '#0f172a', acento: '#0369a1', texto: '#1e293b', suave: '#64748b', linea: '#cbd5e1', fondoCab: '#e2e8f0', fondoAlt: '#f8fafc', ok: '#047857', medio: '#b45309', riesgo: '#b91c1c' };

const num = (v) => (v === null || v === undefined ? null : Number(v));
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(Number(v))}%`);
const tiempo = (s) => {
    if (s === null || s === undefined) return '—';
    const t = Number(s);
    return t >= 60 ? `${Math.floor(t / 60)} min ${t % 60} s` : `${t} s`;
};
const estadoDe = (prom, resueltos) => {
    if (!resueltos) return 'Sin evaluar';
    const p = Math.round(prom);
    if (p >= 80) return 'Sobresaliente';
    if (p >= 50) return 'Promedio';
    return 'En riesgo';
};
const colorEstado = (estado) => (estado === 'Sobresaliente' ? COLOR.ok : estado === 'Promedio' ? COLOR.medio : estado === 'En riesgo' ? COLOR.riesgo : COLOR.suave);

// Promedio ponderado por número de casos resueltos (equivale al promedio de todas las evaluaciones)
const promedioPonderado = (filas, campo) => {
    let suma = 0, peso = 0;
    for (const f of filas) {
        const v = num(f[campo]);
        if (v !== null && f.casos_resueltos > 0) { suma += v * f.casos_resueltos; peso += f.casos_resueltos; }
    }
    return peso > 0 ? suma / peso : null;
};

// Porcentaje con un decimal solo cuando hace falta (44.5% pero 100%)
const pct1 = (v) => {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
    const r = Math.round(Number(v) * 10) / 10;
    return `${Number.isInteger(r) ? r : r.toFixed(1)}%`;
};

// Promedio general de un estudiante: promedio de los porcentajes de cada ejercicio (todos pesan igual;
// cada ejercicio se redondea a entero, tal como se muestra en su tabla)
const promedioDeEjercicios = (filas, campo) => {
    const valores = filas.filter(f => f.casos_resueltos > 0 && num(f[campo]) !== null).map(f => Math.round(num(f[campo])));
    return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
};

const obtenerEjerciciosDocente = async (id_docente) => {
    const [res] = await pool.query('CALL sp_listar_ejercicios_catedratico(?)', [id_docente]);
    return res[0];
};

const obtenerDatosInforme = async (id_docente, id_curso, ids_ejercicios) => {
    const idCurso = Number(id_curso);
    if (!Number.isInteger(idCurso) || idCurso <= 0) throw new ErrorInforme('Debes elegir un curso.');

    const ids = [...new Set((Array.isArray(ids_ejercicios) ? ids_ejercicios : []).map(Number))];
    if (ids.length === 0 || ids.length > MAX_EJERCICIOS || ids.some(i => !Number.isInteger(i) || i <= 0)) {
        throw new ErrorInforme('Elige al menos un ejercicio para el informe.');
    }

    const [cursos] = await pool.query('CALL sp_obtener_cursos_catedratico(?)', [id_docente]);
    const curso = cursos[0].find(c => c.id_curso === idCurso);
    if (!curso) throw new ErrorInforme('Ese curso no te pertenece.');

    const [res] = await pool.query('CALL sp_informe_calificaciones(?, ?, ?)', [id_docente, idCurso, ids.join(',')]);
    const filas = res[0].map(f => ({
        ...f,
        total_casos: Number(f.total_casos),
        casos_resueltos: Number(f.casos_resueltos),
        prom_diagnostico: num(f.prom_diagnostico),
        prom_localizacion: num(f.prom_localizacion),
        prom_calibracion: num(f.prom_calibracion),
        tiempo_promedio_seg: num(f.tiempo_promedio_seg)
    }));
    if (filas.length === 0) throw new ErrorInforme('No hay estudiantes inscritos o los ejercicios elegidos no existen en ese curso.');
    return { curso, filas };
};

// ===== Dibujo del PDF =====
const generarInformePdf = async ({ id_docente, nombre_docente, id_curso, ids_ejercicios }) => {
    const { curso, filas } = await obtenerDatosInforme(id_docente, id_curso, ids_ejercicios);

    // Agrupar por ejercicio y por estudiante
    const porEjercicio = new Map();
    const porEstudiante = new Map();
    for (const f of filas) {
        if (!porEjercicio.has(f.id_ejercicio)) porEjercicio.set(f.id_ejercicio, { nombre: f.ejercicio, numero: f.ejercicio_numero, filas: [] });
        porEjercicio.get(f.id_ejercicio).filas.push(f);
        if (!porEstudiante.has(f.id_usuario)) porEstudiante.set(f.id_usuario, { carnet: f.carnet, nombre: f.estudiante, filas: [] });
        porEstudiante.get(f.id_usuario).filas.push(f);
    }
    const ejercicios = [...porEjercicio.values()].sort((a, b) => a.numero - b.numero);
    const estudiantes = [...porEstudiante.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Resumen por estudiante: casos y promedio de sus ejercicios
    const consolidado = estudiantes.map(e => {
        const resueltos = e.filas.reduce((s, f) => s + f.casos_resueltos, 0);
        const total = e.filas.reduce((s, f) => s + f.total_casos, 0);
        const prom = promedioDeEjercicios(e.filas, 'prom_diagnostico');
        return { ...e, resueltos, total, prom, calib: promedioDeEjercicios(e.filas, 'prom_calibracion'), estado: estadoDe(prom, resueltos) };
    });

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `Informe de calificaciones - ${curso.nombre_curso}`, Author: 'RADIA-OS' } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    const terminado = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });

    const izq = doc.page.margins.left;
    const ancho = doc.page.width - izq - doc.page.margins.right;
    const limiteInferior = () => doc.page.height - doc.page.margins.bottom - 20;
    const asegurarEspacio = (alto) => { if (doc.y + alto > limiteInferior()) doc.addPage(); };

    // ---- Encabezado ----
    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLOR.titulo).text('Informe de calificaciones', izq, doc.y);
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.suave).text('RADIA-OS · Sistema educativo de radiografías', izq, doc.y + 2);
    doc.moveDown(0.8);
    doc.moveTo(izq, doc.y).lineTo(izq + ancho, doc.y).lineWidth(1.5).strokeColor(COLOR.acento).stroke();
    doc.moveDown(0.8);

    const datos = [
        ['Curso', curso.nombre_curso],
        ['Docente', nombre_docente || '—'],
        ['Ejercicios', ejercicios.map(e => e.nombre).join(', ')],
        ['Generado', new Date().toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' })]
    ];
    for (const [k, v] of datos) {
        const y = doc.y;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.texto).text(`${k}:`, izq, y, { width: 70 });
        doc.font('Helvetica').fontSize(10).fillColor(COLOR.texto).text(v, izq + 75, y, { width: ancho - 75 });
    }
    doc.moveDown(0.8);

    // ---- Resumen general ----
    const resueltosTotal = filas.reduce((s, f) => s + f.casos_resueltos, 0);
    const casosTotal = filas.reduce((s, f) => s + f.total_casos, 0);
    // Precisión del grupo: promedio del promedio de cada estudiante que ya resolvió algo
    const conDatos = consolidado.filter(c => c.prom !== null);
    const promGeneral = conDatos.length ? conDatos.reduce((s, c) => s + c.prom, 0) / conDatos.length : null;
    const tarjetas = [
        ['Estudiantes', String(estudiantes.length)],
        ['Ejercicios', String(ejercicios.length)],
        ['Casos resueltos', `${resueltosTotal} de ${casosTotal}`],
        ['Precisión diagnóstica grupal', pct1(promGeneral)]
    ];
    const anchoTarjeta = (ancho - 3 * 10) / 4;
    const yTarjetas = doc.y;
    tarjetas.forEach(([titulo, valor], i) => {
        const x = izq + i * (anchoTarjeta + 10);
        doc.roundedRect(x, yTarjetas, anchoTarjeta, 52, 6).lineWidth(0.8).strokeColor(COLOR.linea).stroke();
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave).text(titulo, x + 8, yTarjetas + 8, { width: anchoTarjeta - 16 });
        doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR.titulo).text(valor, x + 8, yTarjetas + 26, { width: anchoTarjeta - 16 });
    });
    doc.y = yTarjetas + 52 + 18;

    // ---- Tabla genérica con encabezado repetido en cada página ----
    const tabla = (columnas, registros) => {
        const altoFila = 20;
        const dibujarCabecera = () => {
            const y = doc.y;
            doc.rect(izq, y, ancho, altoFila).fill(COLOR.fondoCab);
            let x = izq;
            for (const c of columnas) {
                doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.titulo).text(c.titulo, x + 4, y + 6, { width: c.ancho - 8, align: c.align || 'left', lineBreak: false });
                x += c.ancho;
            }
            doc.y = y + altoFila;
        };
        dibujarCabecera();
        registros.forEach((r, i) => {
            if (doc.y + altoFila > limiteInferior()) { doc.addPage(); dibujarCabecera(); }
            const y = doc.y;
            if (i % 2 === 1) doc.rect(izq, y, ancho, altoFila).fill(COLOR.fondoAlt);
            let x = izq;
            for (const c of columnas) {
                const valor = c.valor(r);
                doc.font(c.negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(c.color ? c.color(r) : COLOR.texto)
                    .text(String(valor), x + 4, y + 6, { width: c.ancho - 8, align: c.align || 'left', lineBreak: false, ellipsis: true, height: 11 });
                x += c.ancho;
            }
            doc.y = y + altoFila;
        });
        doc.moveTo(izq, doc.y).lineTo(izq + ancho, doc.y).lineWidth(0.5).strokeColor(COLOR.linea).stroke();
        doc.y += 14;
    };

    // ---- Una sección por ejercicio ----
    for (const ej of ejercicios) {
        asegurarEspacio(110);
        const promEj = promedioPonderado(ej.filas, 'prom_diagnostico');
        const completaron = ej.filas.filter(f => f.total_casos > 0 && f.casos_resueltos >= f.total_casos).length;
        doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.acento).text(ej.nombre, izq, doc.y);
        doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave)
            .text(`${ej.filas[0].total_casos} casos · Precisión grupal: ${pct(promEj)} · ${completaron} de ${ej.filas.length} estudiantes lo completaron`, izq, doc.y + 1);
        doc.y += 8;

        tabla([
            { titulo: 'Carnet', ancho: 78, valor: r => r.carnet || '—' },
            { titulo: 'Estudiante', ancho: 145, negrita: true, valor: r => r.estudiante },
            { titulo: 'Resueltos', ancho: 55, align: 'center', valor: r => `${r.casos_resueltos}/${r.total_casos}` },
            { titulo: 'Diagnóstico', ancho: 62, align: 'center', valor: r => pct(r.prom_diagnostico) },
            { titulo: 'Localización', ancho: 62, align: 'center', valor: r => pct(r.prom_localizacion) },
            { titulo: 'Calibración', ancho: 58, align: 'center', valor: r => pct(r.prom_calibracion) },
            { titulo: 'Tiempo prom.', ancho: ancho - 78 - 145 - 55 - 62 - 62 - 58, align: 'center', valor: r => tiempo(r.tiempo_promedio_seg) }
        ], ej.filas);
    }

    // ---- Consolidado por estudiante (solo si hay más de un ejercicio) ----
    if (ejercicios.length > 1) {
        asegurarEspacio(110);
        doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.acento).text('Resumen consolidado por estudiante', izq, doc.y);
        doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave)
            .text(`Promedio de los porcentajes de cada uno de los ${ejercicios.length} ejercicios seleccionados (todos los ejercicios pesan igual).`, izq, doc.y + 1);
        doc.y += 8;

        tabla([
            { titulo: 'Carnet', ancho: 78, valor: r => r.carnet || '—' },
            { titulo: 'Estudiante', ancho: 165, negrita: true, valor: r => r.nombre },
            { titulo: 'Resueltos', ancho: 60, align: 'center', valor: r => `${r.resueltos}/${r.total}` },
            { titulo: 'Diagnóstico', ancho: 70, align: 'center', valor: r => pct1(r.prom) },
            { titulo: 'Calibración', ancho: 70, align: 'center', valor: r => pct1(r.calib) },
            { titulo: 'Estado', ancho: ancho - 78 - 165 - 60 - 70 - 70, align: 'center', negrita: true, color: r => colorEstado(r.estado), valor: r => r.estado }
        ], consolidado);
    }

    // ---- Nota metodológica ----
    asegurarEspacio(70);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.texto).text('Cómo leer este informe', izq, doc.y);
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave).text(
        'Diagnóstico: coincidencia entre las etiquetas marcadas por el estudiante y las reales del caso. ' +
        'Localización: solapamiento de su marca con el recuadro del radiólogo; solo existe en los casos que tienen recuadro de referencia (se muestra "—" cuando no aplica). ' +
        'Calibración: qué tan bien corresponde su nivel de confianza con su desempeño. ' +
        'Estado: Sobresaliente desde 80 %, Promedio desde 50 %, En riesgo por debajo de 50 %.',
        izq, doc.y + 2, { width: ancho });

    // ---- Pie de página con numeración ----
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
        doc.switchToPage(rango.start + i);
        const margenInferior = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // evita que el pie provoque una página nueva
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave)
            .text(`${curso.nombre_curso} · Informe de calificaciones`, izq, doc.page.height - 28, { width: ancho / 2, align: 'left', lineBreak: false })
            .text(`Página ${i + 1} de ${rango.count}`, izq + ancho / 2, doc.page.height - 28, { width: ancho / 2, align: 'right', lineBreak: false });
        doc.page.margins.bottom = margenInferior;
    }

    doc.end();
    const base = String(curso.nombre_curso).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    return { buffer: await terminado, nombreArchivo: `informe-calificaciones-${base}.pdf` };
};

module.exports = { ErrorInforme, obtenerEjerciciosDocente, generarInformePdf, COLOR, pct, pct1, tiempo, estadoDe, colorEstado };

const PDFDocument = require('pdfkit');
const pool = require('../config/database');
const { ErrorInforme, COLOR, pct, pct1, tiempo, estadoDe, colorEstado } = require('./informeService');

const num = (v) => (v === null || v === undefined ? null : Number(v));
const promedio = (valores) => {
    const v = valores.filter(x => x !== null && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const fechaCorta = (valor) => {
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const colorPorValor = (v) => { const p = Math.round(v); return p >= 80 ? COLOR.ok : p >= 50 ? COLOR.medio : COLOR.riesgo; };

// Tendencia: compara el promedio de la segunda mitad de los casos con el de la primera
const calcularTendencia = (valores) => {
    if (valores.length < 4) return { texto: 'Datos insuficientes (mín. 4 casos)', color: COLOR.suave };
    const mitad = Math.floor(valores.length / 2);
    const dif = promedio(valores.slice(valores.length - mitad)) - promedio(valores.slice(0, mitad));
    if (dif >= 10) return { texto: `Mejora: +${Math.round(dif)} puntos`, color: COLOR.ok };
    if (dif <= -10) return { texto: `Descenso: ${Math.round(dif)} puntos`, color: COLOR.riesgo };
    return { texto: `Estable (${dif >= 0 ? '+' : ''}${Math.round(dif)} puntos)`, color: COLOR.medio };
};

// ===== Gráficas vectoriales =====
const ejeY = (doc, px, py, pw, ph) => {
    doc.font('Helvetica').fontSize(7).lineWidth(0.5);
    for (const v of [0, 25, 50, 75, 100]) {
        const yy = py + ph - (v / 100) * ph;
        doc.save();
        if (v === 50 || v === 80) doc.dash(3, { space: 3 });
        doc.moveTo(px, yy).lineTo(px + pw, yy).strokeColor(v === 50 ? COLOR.medio : COLOR.linea).stroke();
        doc.restore();
        doc.fillColor(COLOR.suave).text(`${v}`, px - 26, yy - 3, { width: 22, align: 'right', lineBreak: false });
    }
    // línea de referencia del 80 % (sobresaliente)
    const y80 = py + ph - 0.8 * ph;
    doc.save().dash(3, { space: 3 }).lineWidth(0.5).moveTo(px, y80).lineTo(px + pw, y80).strokeColor(COLOR.ok).stroke().restore();
    doc.moveTo(px, py).lineTo(px, py + ph).lineWidth(0.8).strokeColor(COLOR.suave).stroke();
};

// Evolución: puntaje de cada caso (en el orden en que se resolvieron) y promedio acumulado
const graficoEvolucion = (doc, { x, y, ancho, alto, evaluaciones, valores, acumulado }) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.titulo).text('Evolución del diagnóstico por caso', x, y, { lineBreak: false });

    // Leyenda
    let lx = x + ancho - 250;
    const leyenda = [['Puntaje del caso', COLOR.acento], ['Promedio acumulado', COLOR.medio]];
    for (const [nombre, color] of leyenda) {
        doc.moveTo(lx, y + 5).lineTo(lx + 14, y + 5).lineWidth(2).strokeColor(color).stroke();
        doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.suave).text(nombre, lx + 18, y + 2, { lineBreak: false });
        lx += 18 + doc.widthOfString(nombre) + 14;
    }

    const px = x + 30, py = y + 20, pw = ancho - 30 - 6, ph = alto - 20 - 24;
    ejeY(doc, px, py, pw, ph);

    const n = valores.length;
    const xs = (i) => (n === 1 ? px + pw / 2 : px + 10 + i * ((pw - 20) / (n - 1)));
    const ys = (v) => py + ph - (v / 100) * ph;

    // Separadores entre ejercicios
    let ejercicioPrevio = null;
    evaluaciones.forEach((ev, i) => {
        const clave = ev.id_ejercicio || 0;
        if (i > 0 && clave !== ejercicioPrevio) {
            const xm = (xs(i - 1) + xs(i)) / 2;
            doc.save().dash(2, { space: 2 }).lineWidth(0.5).moveTo(xm, py).lineTo(xm, py + ph).strokeColor(COLOR.suave).stroke().restore();
        }
        if (i === 0 || clave !== ejercicioPrevio) {
            doc.font('Helvetica').fontSize(6.5).fillColor(COLOR.suave).text(ev.ejercicio || 'Casos individuales', xs(i) - 4, py + 2, { lineBreak: false });
        }
        ejercicioPrevio = clave;
    });

    const dibujarSerie = (serie, color, radio, grosor) => {
        doc.save().lineWidth(grosor).strokeColor(color);
        serie.forEach((v, i) => { i === 0 ? doc.moveTo(xs(i), ys(v)) : doc.lineTo(xs(i), ys(v)); });
        if (n > 1) doc.stroke();
        doc.restore();
        serie.forEach((v, i) => { doc.circle(xs(i), ys(v), radio).fillColor(color).fill(); });
    };
    dibujarSerie(acumulado, COLOR.medio, 2, 1.5);
    dibujarSerie(valores, COLOR.acento, 3.2, 2);

    // Etiquetas del eje X (número de caso en orden cronológico)
    const paso = Math.max(1, Math.ceil(n / 18));
    doc.font('Helvetica').fontSize(7).fillColor(COLOR.suave);
    for (let i = 0; i < n; i += paso) doc.text(String(i + 1), xs(i) - 8, py + ph + 4, { width: 16, align: 'center', lineBreak: false });
    doc.text('Orden en que resolvió los casos', px, py + ph + 13, { width: pw, align: 'center', lineBreak: false });
};

// Barras con un valor 0-100 por categoría
const graficoBarras = (doc, { x, y, ancho, alto, titulo, items }) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.titulo).text(titulo, x, y, { lineBreak: false });
    const px = x + 30, py = y + 20, pw = ancho - 30 - 6, ph = alto - 20 - 22;
    ejeY(doc, px, py, pw, ph);
    if (items.length === 0) {
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave).text('Sin datos', px, py + ph / 2, { width: pw, align: 'center' });
        return;
    }
    const franja = pw / items.length;
    const anchoBarra = Math.min(46, franja * 0.6);
    items.forEach((it, i) => {
        const bx = px + i * franja + (franja - anchoBarra) / 2;
        const alt = (Math.max(0, Math.min(100, it.valor)) / 100) * ph;
        doc.rect(bx, py + ph - alt, anchoBarra, alt).fillColor(colorPorValor(it.valor)).fill();
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.titulo).text(`${Math.round(it.valor)}%`, bx - 10, py + ph - alt - 10, { width: anchoBarra + 20, align: 'center', lineBreak: false });
        doc.font('Helvetica').fontSize(7).fillColor(COLOR.suave).text(it.etiqueta, px + i * franja, py + ph + 5, { width: franja, align: 'center', lineBreak: false, ellipsis: true, height: 11 });
    });
};

const obtenerDatos = async (id_docente, id_estudiante, ids_ejercicios) => {
    const idEst = Number(id_estudiante);
    if (!Number.isInteger(idEst) || idEst <= 0) throw new ErrorInforme('Estudiante no válido.');
    const ids = [...new Set((Array.isArray(ids_ejercicios) ? ids_ejercicios : []).map(Number))].filter(i => Number.isInteger(i) && i > 0);

    const [res] = await pool.query('CALL sp_informe_estudiante(?, ?, ?)', [id_docente, idEst, ids.join(',')]);
    const estudiante = res[0][0];
    if (!estudiante) throw new ErrorInforme('Ese estudiante no está inscrito en tus cursos.');

    const evaluaciones = res[1].map(e => ({
        ...e,
        eje1: num(e.eje1_diagnostico), eje2: num(e.eje2_localizacion), eje3: num(e.eje3_calibracion),
        confianza: num(e.nivel_confianza), tiempo: num(e.tiempo_analisis_segundos)
    })).filter(e => e.eje1 !== null);
    if (evaluaciones.length === 0) throw new ErrorInforme('Este estudiante aún no ha resuelto casos: todavía no hay una evolución que mostrar.');
    return { estudiante, evaluaciones };
};

const generarInformeEstudiantePdf = async ({ id_docente, nombre_docente, id_estudiante, ids_ejercicios }) => {
    const { estudiante, evaluaciones } = await obtenerDatos(id_docente, id_estudiante, ids_ejercicios);

    const valores = evaluaciones.map(e => e.eje1);
    const acumulado = valores.map((_, i) => promedio(valores.slice(0, i + 1)));
    // Promedio general = promedio de los porcentajes de cada ejercicio (todos pesan igual; cada uno redondeado como se muestra)
    const mediaDeEjercicios = (campo) => {
        const grupos = new Map();
        for (const e of evaluaciones) {
            if (e[campo] === null) continue;
            const k = e.id_ejercicio || 0;
            if (!grupos.has(k)) grupos.set(k, []);
            grupos.get(k).push(e[campo]);
        }
        return promedio([...grupos.values()].map(v => Math.round(promedio(v))));
    };
    const promDiag = mediaDeEjercicios('eje1');
    const promCalib = mediaDeEjercicios('eje3');
    const promTiempo = promedio(evaluaciones.map(e => e.tiempo));
    const tendencia = calcularTendencia(valores);
    const estado = estadoDe(promDiag, evaluaciones.length);

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `Informe individual - ${estudiante.nombre_completo}`, Author: 'RADIA-OS' } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    const terminado = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });

    const izq = doc.page.margins.left;
    const ancho = doc.page.width - izq - doc.page.margins.right;
    const limiteInferior = () => doc.page.height - doc.page.margins.bottom - 20;
    const asegurarEspacio = (alto) => { if (doc.y + alto > limiteInferior()) doc.addPage(); };

    // ---- Encabezado ----
    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLOR.titulo).text('Informe individual de desempeño', izq, doc.y);
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.suave).text('RADIA-OS · Sistema educativo de radiografías', izq, doc.y + 2);
    doc.moveDown(0.8);
    doc.moveTo(izq, doc.y).lineTo(izq + ancho, doc.y).lineWidth(1.5).strokeColor(COLOR.acento).stroke();
    doc.moveDown(0.8);

    const yNombre = doc.y;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLOR.titulo).text(estudiante.nombre_completo, izq, yNombre, { width: ancho - 110, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(colorEstado(estado)).text(estado.toUpperCase(), izq + ancho - 100, yNombre + 3, { width: 100, align: 'right', lineBreak: false });
    doc.y = yNombre + 20;
    const datos = [
        ['Carnet', estudiante.carnet || '—'],
        ['Correo', estudiante.correo_electronico || '—'],
        ['Curso(s)', estudiante.cursos || '—'],
        ['Docente', nombre_docente || '—'],
        ['Generado', new Date().toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' })]
    ];
    for (const [k, v] of datos) {
        const y = doc.y;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.texto).text(`${k}:`, izq, y, { width: 60 });
        doc.font('Helvetica').fontSize(9).fillColor(COLOR.texto).text(v, izq + 65, y, { width: ancho - 65 });
    }
    doc.moveDown(0.8);

    // ---- Tarjetas de resumen ----
    const tarjetas = [
        ['Casos resueltos', String(evaluaciones.length), COLOR.titulo],
        ['Diagnóstico promedio', pct1(promDiag), colorPorValor(promDiag)],
        ['Calibración promedio', pct1(promCalib), COLOR.titulo],
        ['Tendencia', tendencia.texto, tendencia.color]
    ];
    const anchoTarjeta = (ancho - 3 * 10) / 4;
    const yT = doc.y;
    tarjetas.forEach(([titulo, valor, color], i) => {
        const x = izq + i * (anchoTarjeta + 10);
        doc.roundedRect(x, yT, anchoTarjeta, 52, 6).lineWidth(0.8).strokeColor(COLOR.linea).stroke();
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave).text(titulo, x + 8, yT + 8, { width: anchoTarjeta - 16, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(i === 3 ? 9.5 : 15).fillColor(color).text(valor, x + 8, yT + (i === 3 ? 27 : 25), { width: anchoTarjeta - 16 });
    });
    doc.y = yT + 52 + 18;

    // ---- Gráfica de evolución ----
    asegurarEspacio(215);
    const altoEvolucion = 190;
    const yEvolucion = doc.y; // el cursor se mueve al escribir textos con coordenadas: se fija la posición a mano
    graficoEvolucion(doc, { x: izq, y: yEvolucion, ancho, alto: altoEvolucion, evaluaciones, valores, acumulado });
    doc.y = yEvolucion + altoEvolucion + 14;

    // ---- Barras: por ejercicio y por dificultad ----
    const agrupar = (clave, etiqueta) => {
        const mapa = new Map();
        for (const e of evaluaciones) {
            const k = clave(e);
            if (!mapa.has(k)) mapa.set(k, { etiqueta: etiqueta(e), orden: e.ejercicio_numero || 0, valores: [] });
            mapa.get(k).valores.push(e.eje1);
        }
        return [...mapa.values()];
    };
    const porEjercicio = agrupar(e => e.id_ejercicio || 0, e => e.ejercicio || 'Individuales')
        .sort((a, b) => a.orden - b.orden).map(g => ({ etiqueta: g.etiqueta, valor: promedio(g.valores) }));
    const ordenNivel = { 'Básico': 0, 'Intermedio': 1, 'Avanzado': 2 };
    const porNivel = agrupar(e => e.nivel_dificultad, e => e.nivel_dificultad)
        .sort((a, b) => (ordenNivel[a.etiqueta] ?? 9) - (ordenNivel[b.etiqueta] ?? 9)).map(g => ({ etiqueta: g.etiqueta, valor: promedio(g.valores) }));

    asegurarEspacio(160);
    const altoBarras = 145, gap = 16, anchoBarras = (ancho - gap) / 2, yBarras = doc.y;
    graficoBarras(doc, { x: izq, y: yBarras, ancho: anchoBarras, alto: altoBarras, titulo: 'Diagnóstico promedio por ejercicio', items: porEjercicio });
    graficoBarras(doc, { x: izq + anchoBarras + gap, y: yBarras, ancho: anchoBarras, alto: altoBarras, titulo: 'Diagnóstico promedio por dificultad', items: porNivel });
    doc.y = yBarras + altoBarras + 14;

    // ---- Detalle por caso ----
    asegurarEspacio(80);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.acento).text('Detalle de casos resueltos', izq, doc.y);
    doc.y += 6;

    const hayLocalizacion = evaluaciones.some(e => e.eje2 !== null);
    const columnas = [
        { titulo: '#', ancho: 22, align: 'center', valor: (r, i) => String(i + 1) },
        { titulo: 'Fecha', ancho: 60, valor: r => fechaCorta(r.fecha_evaluacion) },
        { titulo: 'Ejercicio', ancho: 62, valor: r => r.ejercicio || 'Individual' },
        { titulo: 'Caso', ancho: hayLocalizacion ? 100 : 150, valor: r => r.titulo_caso },
        { titulo: 'Nivel', ancho: 56, valor: r => r.nivel_dificultad },
        { titulo: 'Diagnóstico', ancho: 58, align: 'center', negrita: true, color: r => colorPorValor(r.eje1), valor: r => pct(r.eje1) },
        ...(hayLocalizacion ? [{ titulo: 'Localiz.', ancho: 48, align: 'center', valor: r => pct(r.eje2) }] : []),
        { titulo: 'Calibración', ancho: 56, align: 'center', valor: r => pct(r.eje3) },
        { titulo: 'Tiempo', ancho: 0, align: 'center', valor: r => tiempo(r.tiempo) }
    ];
    columnas[columnas.length - 1].ancho = ancho - columnas.slice(0, -1).reduce((s, c) => s + c.ancho, 0);

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
    evaluaciones.forEach((r, i) => {
        if (doc.y + altoFila > limiteInferior()) { doc.addPage(); dibujarCabecera(); }
        const y = doc.y;
        if (i % 2 === 1) doc.rect(izq, y, ancho, altoFila).fill(COLOR.fondoAlt);
        let x = izq;
        for (const c of columnas) {
            doc.font(c.negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(c.color ? c.color(r) : COLOR.texto)
                .text(String(c.valor(r, i)), x + 4, y + 6, { width: c.ancho - 8, align: c.align || 'left', lineBreak: false, ellipsis: true, height: 11 });
            x += c.ancho;
        }
        doc.y = y + altoFila;
    });
    doc.moveTo(izq, doc.y).lineTo(izq + ancho, doc.y).lineWidth(0.5).strokeColor(COLOR.linea).stroke();
    doc.y += 14;

    // ---- Nota ----
    asegurarEspacio(60);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.texto).text('Cómo leer este informe', izq, doc.y);
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave).text(
        'Diagnóstico: coincidencia entre las etiquetas marcadas por el estudiante y las reales del caso. ' +
        'Las líneas punteadas de las gráficas marcan el 50 % (promedio) y el 80 % (sobresaliente). ' +
        'La tendencia compara el promedio de la segunda mitad de los casos con el de la primera y requiere al menos 4 casos. ' +
        'Localización solo existe en casos con recuadro de referencia del radiólogo.',
        izq, doc.y + 2, { width: ancho });

    // ---- Pie con numeración ----
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
        doc.switchToPage(rango.start + i);
        const margenInferior = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave)
            .text(`${estudiante.nombre_completo} · Informe individual`, izq, doc.page.height - 28, { width: ancho / 2, align: 'left', lineBreak: false })
            .text(`Página ${i + 1} de ${rango.count}`, izq + ancho / 2, doc.page.height - 28, { width: ancho / 2, align: 'right', lineBreak: false });
        doc.page.margins.bottom = margenInferior;
    }

    doc.end();
    const base = String(estudiante.nombre_completo).trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return { buffer: await terminado, nombreArchivo: `informe-individual-${base || 'estudiante'}.pdf` };
};

module.exports = { generarInformeEstudiantePdf };

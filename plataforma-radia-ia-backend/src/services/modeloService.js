const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// Ficha del modelo de IA: estadísticas calculadas a partir de lo que YA está en la plataforma
// (uploads/banco_casos): probabilidades del modelo en las 8 clases + etiquetas reales de cada imagen.
// Solo se LEEN esos archivos; el modelo entrenado en Colab no se toca.
const DIR = path.join(__dirname, '..', '..', 'uploads', 'banco_casos');
const TTL_MS = 10 * 60 * 1000;
let cache = null;

const leerJson = (nombre) => JSON.parse(fs.readFileSync(path.join(DIR, nombre), 'utf8'));
const r4 = (n) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10000) / 10000);
const div = (a, b) => (b > 0 ? a / b : null);

// Curva ROC + AUC (Mann-Whitney) a partir de puntajes y etiquetas
const calcularRoc = (scores, labels) => {
    const idx = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
    const P = labels.filter(Boolean).length, N = labels.length - P;
    if (P === 0 || N === 0) return { auc: null, curva: [] };
    let tp = 0, fp = 0;
    const puntos = [{ fpr: 0, tpr: 0 }];
    for (let k = 0; k < idx.length; k++) {
        labels[idx[k]] ? tp++ : fp++;
        const ultimoDelGrupo = k === idx.length - 1 || scores[idx[k + 1]] !== scores[idx[k]];
        if (ultimoDelGrupo) puntos.push({ fpr: fp / N, tpr: tp / P });
    }
    let auc = 0;
    for (let i = 1; i < puntos.length; i++) auc += (puntos[i].fpr - puntos[i - 1].fpr) * (puntos[i].tpr + puntos[i - 1].tpr) / 2;
    // Se reduce a ~60 puntos para no enviar miles
    const paso = Math.max(1, Math.floor(puntos.length / 60));
    const curva = puntos.filter((_, i) => i % paso === 0 || i === puntos.length - 1).map(p => ({ fpr: r4(p.fpr), tpr: r4(p.tpr) }));
    return { auc, curva };
};

// Histograma de puntajes (10 cajas de 0.1), como % de cada grupo
const histograma = (scores, labels) => {
    const pos = new Array(10).fill(0), neg = new Array(10).fill(0);
    scores.forEach((s, i) => { const b = Math.min(9, Math.floor(s * 10)); labels[i] ? pos[b]++ : neg[b]++; });
    const P = pos.reduce((a, b) => a + b, 0), N = neg.reduce((a, b) => a + b, 0);
    return {
        cajas: Array.from({ length: 10 }, (_, i) => `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`),
        positivos: pos.map(v => r4(div(v * 100, P) ?? 0)),
        negativos: neg.map(v => r4(div(v * 100, N) ?? 0)),
        nPositivos: P, nNegativos: N
    };
};

// Calibración: cuando el modelo dice "X %", ¿qué proporción realmente lo tenía?
const calibracion = (scores, labels) => {
    const cajas = Array.from({ length: 10 }, () => ({ suma: 0, pos: 0, n: 0 }));
    scores.forEach((s, i) => { const c = cajas[Math.min(9, Math.floor(s * 10))]; c.suma += s; c.n++; if (labels[i]) c.pos++; });
    return cajas.filter(c => c.n >= 15).map(c => ({ prometido: r4(c.suma / c.n), observado: r4(c.pos / c.n), n: c.n }));
};

const construirFicha = async () => {
    const banco = leerJson('banco_casos.json');
    const { casos, clases, umbrales: umbralesMeta, niveles, nivel1 } = banco;
    const auc = leerJson('auc_v2.json');
    const localizacion = leerJson('localizacion.json');

    // Notas clínicas y "se abstiene siempre" guardadas en la BD por patología
    const [filas] = await pool.query(
        `SELECT cp.nombre_patologia AS nombre, m.nota_clinica, m.se_abstiene_siempre, m.localizacion_pct
         FROM metricas_modelo_patologia m JOIN catalogo_patologias cp ON cp.id_patologia = m.id_patologia`);
    const bd = Object.fromEntries(filas.map(f => [f.nombre, f]));
    const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const bdDe = (nombre) => bd[nombre] || Object.values(bd).find(f => norm(f.nombre) === norm(nombre)) || null;

    const total = casos.length;
    const clasesFicha = clases.map((nombre) => {
        const scores = casos.map(c => c.probabilidades[nombre]);
        const labels = casos.map(c => c.etiquetas_reales.includes(nombre));
        const { auc: aucPlat, curva } = calcularRoc(scores, labels);
        const u = umbralesMeta[nombre] || null;
        const b = bdDe(nombre);
        const positivos = labels.filter(Boolean).length;

        let matriz = null;
        if (u) {
            let tp = 0, fp = 0, fn = 0, tn = 0;
            scores.forEach((s, i) => { const pred = s >= u.umbral; labels[i] ? (pred ? tp++ : fn++) : (pred ? fp++ : tn++); });
            const opina = tp + fp;
            matriz = {
                tp, fp, fn, tn, opina,
                precision: r4(div(tp, opina)),
                sensibilidad: r4(div(tp, tp + fn)),
                especificidad: r4(div(tn, tn + fp)),
                porcentajeImagenesQueOpina: r4(opina / total),
                mejoraSobreAzar: r4(div(div(tp, opina), positivos / total))
            };
        }
        const loc = localizacion[nombre] || null;
        return {
            nombre,
            nivelClinico: niveles[nombre] ?? null,
            aucColab: r4(auc.auc[nombre]),
            aucPlataforma: r4(aucPlat),
            roc: curva,
            histograma: histograma(scores, labels),
            calibracion: calibracion(scores, labels),
            umbral: u ? r4(u.umbral) : null,
            colab: u ? { precision: r4(u.precision), cobertura: r4(u.cobertura), mejora: r4(u.mejora), tasaBase: r4(u.tasa_base) } : null,
            plataforma: { imagenes: total, positivos, prevalencia: r4(positivos / total), ...(matriz || {}) },
            sePuedePronunciar: !!u && !(b && b.se_abstiene_siempre),
            localizacionGradcam: loc ? { acierto: r4(loc.acierto), n: loc.n } : null,
            notaClinica: b ? b.nota_clinica : null
        };
    });

    // Lo que dijo la IA frente a lo que era (filas = opinión, columnas = realidad)
    const filasM = [...clases, 'Se abstiene'];
    const matrizOpinionReal = Object.fromEntries(filasM.map(f => [f, Object.fromEntries(clases.map(c => [c, 0]))]));
    let conOpinion = 0, opiniones = 0, correctas = 0;
    for (const c of casos) {
        const ops = (c.opinion_modelo || []).map(o => o.patologia);
        if (ops.length) conOpinion++;
        for (const real of c.etiquetas_reales) {
            if (!ops.length) matrizOpinionReal['Se abstiene'][real]++;
            for (const op of ops) matrizOpinionReal[op][real]++;
        }
        for (const op of ops) { opiniones++; if (c.etiquetas_reales.includes(op)) correctas++; }
    }
    const porOpinion = Object.fromEntries(clases.map(cl => {
        let n = 0, ok = 0;
        for (const c of casos) for (const o of (c.opinion_modelo || [])) if (o.patologia === cl) { n++; if (c.etiquetas_reales.includes(cl)) ok++; }
        return [cl, { opiniones: n, correctas: ok, incorrectas: n - ok }];
    }));

    return {
        meta: {
            version: banco.version,
            generado: banco.generado,
            resolucionInferencia: banco.resolucion_inferencia,
            tta: !!auc.tta,
            advertencia: banco.advertencia,
            imagenesPlataforma: total,
            aucPromedioColab: r4(auc.promedio)
        },
        clases: clasesFicha,
        global: {
            imagenes: total,
            conOpinion,
            seAbstiene: total - conOpinion,
            opiniones,
            correctas,
            incorrectas: opiniones - correctas,
            porOpinion,
            matrizOpinionReal,
            filasMatriz: filasM,
            columnasMatriz: clases,
            triage: {
                parece_normal: { umbral: r4(nivel1.parece_normal.umbral), precision: r4(nivel1.parece_normal.precision), cobertura: r4(nivel1.parece_normal.cobertura) },
                hay_hallazgo: { umbral: r4(nivel1.hay_hallazgo.umbral), precision: r4(nivel1.hay_hallazgo.precision), cobertura: r4(nivel1.hay_hallazgo.cobertura) }
            }
        }
    };
};

const obtenerFichaModelo = async () => {
    if (cache && Date.now() - cache.hora < TTL_MS) return cache.datos;
    const datos = await construirFicha();
    cache = { hora: Date.now(), datos };
    return datos;
};

module.exports = { obtenerFichaModelo };

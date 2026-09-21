const { LECCIONES } = require('./leccionesBase');

// Explicación base (sin IA) para "era R y el estudiante marcó M". Se arma con el contenido de las lecciones,
// así el módulo funciona aunque no exista ninguna explicación generada con IA.
// Formato: { resumen, como_distinguir: [..], pista, proxima_vez }
const construirExplicacionPlantilla = (real, marcada) => {
    const R = LECCIONES[real];
    const M = LECCIONES[marcada];
    if (!R || !M || real === marcada) return null;

    const par = R.se_confunde_con.find(x => x.clase === marcada);
    let resumen;
    let como_distinguir;

    if (real === 'Normal') {
        resumen = `La radiografía era normal, pero marcaste ${M.nombre}. Antes de dar por cierta una patología, confirma que ves con claridad su signo principal; si no aparece, lo más probable es que sea normal.`;
        como_distinguir = [
            `Para confirmar ${M.nombre} busca: ${M.que_buscar[0]}`,
            'Descarta artefactos (pliegues de piel, pezones, botones, electrodos) y problemas de calidad (rotación, inspiración, penetración).'
        ];
    } else if (marcada === 'Normal') {
        resumen = `La radiografía tenía ${R.nombre} y la marcaste como normal: se te escapó el hallazgo.`;
        como_distinguir = [
            `Busca primero: ${R.que_buscar[0]}`,
            R.que_buscar[1]
        ];
    } else {
        resumen = par ? par.clave : `${R.nombre} y ${M.nombre} pueden parecerse a primera vista, pero cada una tiene claves distintas.`;
        como_distinguir = [
            `Para reconocer ${R.nombre}: ${R.que_buscar[0]}`,
            `Para descartar ${M.nombre}: ${M.que_buscar[0]}`
        ];
    }

    return {
        resumen,
        como_distinguir,
        pista: R.dato_clave,
        proxima_vez: real === 'Normal'
            ? `Repasa la lección de ${M.nombre} y la de Normal antes de responder.`
            : `Antes de responder, revisa estos puntos de ${R.nombre}: ${R.que_buscar.slice(0, 2).join(' ')}`
    };
};

module.exports = { construirExplicacionPlantilla };

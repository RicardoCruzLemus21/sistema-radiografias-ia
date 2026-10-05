const pool = require('./database');

// Mapa "patología -> patologías que más se le parecen" (tabla distractores, vía sp_obtener_distractores).
// Se carga una vez al arrancar el servidor; después se lee en memoria para no consultar la base en cada ejercicio.
let mapa = {};

const cargarDistractores = async () => {
    const [res] = await pool.query('CALL sp_obtener_distractores()');
    const nuevo = {};
    for (const fila of res[0]) {
        (nuevo[fila.patologia] = nuevo[fila.patologia] || []).push(fila.distractor);
    }
    mapa = nuevo;
    return mapa;
};

const obtenerDistractores = () => mapa;

module.exports = { cargarDistractores, obtenerDistractores };

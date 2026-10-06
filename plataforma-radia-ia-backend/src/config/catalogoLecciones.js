const pool = require('./database');

// Catálogo de patologías y lecciones (tabla aprendizaje_lecciones). Se carga una vez al arrancar el
// servidor y después se lee en memoria; así el texto vive en la base y no en el código.
let lecciones = {};
let clases = [];

const cargarLecciones = async () => {
    const [res] = await pool.query('CALL sp_apr_lecciones_admin()');
    const nuevo = {};
    for (const fila of res[0]) {
        const contenido = typeof fila.contenido === 'string' ? JSON.parse(fila.contenido) : (fila.contenido || {});
        nuevo[fila.clase] = { ...contenido, nombre: contenido.nombre || fila.clase };
    }
    lecciones = nuevo;
    // "Normal" va primero (el sistema lo trata como caso base); el resto en orden alfabético
    clases = Object.keys(nuevo).sort((a, b) => (a === 'Normal' ? -1 : b === 'Normal' ? 1 : a.localeCompare(b)));
    return lecciones;
};

const obtenerLecciones = () => lecciones;
const obtenerClases = () => clases;

module.exports = { cargarLecciones, obtenerLecciones, obtenerClases };

const crypto = require('crypto');
const pool = require('../config/database');

// Sin 0/O/1/I/L para que el código se pueda dictar o copiar sin confusiones.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO_CODIGO = 8;

const generarCodigo = () => {
    let codigo = '';
    for (let i = 0; i < LARGO_CODIGO; i++) {
        codigo += ALFABETO[crypto.randomInt(0, ALFABETO.length)];
    }
    return codigo;
};

// Acepta lo que el usuario pueda pegar (minúsculas, espacios, guiones) y lo deja en el formato canónico.
const normalizarCodigo = (valor) => String(valor || '').toUpperCase().replace(/[\s-]/g, '');

const esCodigoValido = (valor) => new RegExp(`^[${ALFABETO}]{${LARGO_CODIGO}}$`).test(valor);

// Asigna un código nuevo al docente. Si choca con el UNIQUE de otro docente, reintenta con otro.
// (conexion es opcional: permite usarlo dentro de una transacción.)
const asignarCodigoNuevo = async (id_docente, conexion = pool) => {
    for (let intento = 0; intento < 10; intento++) {
        const codigo = generarCodigo();
        try {
            const [res] = await conexion.query('CALL sp_asignar_codigo_docente(?, ?)', [id_docente, codigo]);
            if (res[0][0].filas === 0) throw new Error('El usuario no es un docente.');
            return codigo;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') continue;
            throw error;
        }
    }
    throw new Error('No se pudo generar un código único. Intenta de nuevo.');
};

const obtenerCodigo = async (id_docente) => {
    const [res] = await pool.query('CALL sp_obtener_codigo_docente(?)', [id_docente]);
    return res[0].length ? res[0][0].codigo_docente : null;
};

module.exports = { generarCodigo, normalizarCodigo, esCodigoValido, asignarCodigoNuevo, obtenerCodigo, ALFABETO, LARGO_CODIGO };

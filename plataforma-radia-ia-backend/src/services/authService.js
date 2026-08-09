const pool = require('../config/database');
const dict = require('../config/dbDictionary');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Servicio para Registrar un nuevo usuario
const registrarUsuario = async (datosUsuario) => {
    const { id_rol, nombre_completo, correo_electronico, contrasena } = datosUsuario;
    try {
        const querySelect = `SELECT * FROM ${dict.TABLAS.USUARIOS} WHERE ${dict.COLUMNAS.CORREO} = ?`;
        const [existentes] = await pool.query(querySelect, [correo_electronico]);
        
        if (existentes.length > 0) {
            throw new Error('El correo electrónico ya está registrado.');
        }
        
        const salt = await bcrypt.genSalt(10);
        const contrasenaHash = await bcrypt.hash(contrasena, salt);
        
        const queryInsert = `
            INSERT INTO ${dict.TABLAS.USUARIOS} 
            (${dict.COLUMNAS.ID_ROL}, ${dict.COLUMNAS.NOMBRE_COMPLETO}, ${dict.COLUMNAS.CORREO}, ${dict.COLUMNAS.CONTRASENA}) 
            VALUES (?, ?, ?, ?)
        `;
        const [resultado] = await pool.query(queryInsert, [id_rol, nombre_completo, correo_electronico, contrasenaHash]);
        
        return { id_usuario: resultado.insertId, nombre_completo, correo_electronico };
    } catch (error) {
        throw error;
    }
};

// 2. Servicio para Iniciar Sesión (Login)
const loginUsuario = async (correo_electronico, contrasena, ip_address) => {
    try {
        const querySelect = `SELECT * FROM ${dict.TABLAS.USUARIOS} WHERE ${dict.COLUMNAS.CORREO} = ?`;
        const [usuarios] = await pool.query(querySelect, [correo_electronico]);
        
        if (usuarios.length === 0) {
            throw new Error('Credenciales inválidas.');
        }
        
        const usuario = usuarios[0];
        
        // Comparamos usando la llave dinámica del diccionario
        const esValida = await bcrypt.compare(contrasena, usuario[dict.COLUMNAS.CONTRASENA]);
        
        if (!esValida) {
            throw new Error('Credenciales inválidas.');
        }
        
        const token = jwt.sign(
            { 
                id_usuario: usuario[dict.COLUMNAS.ID_USUARIO], 
                id_rol: usuario[dict.COLUMNAS.ID_ROL] 
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        const queryAudit = `
            INSERT INTO ${dict.TABLAS.AUDITORIA} 
            (${dict.COLUMNAS.ID_USUARIO}, ${dict.COLUMNAS.DIRECCION_IP}) 
            VALUES (?, ?)
        `;
        // Hacemos el insert de la auditoría de forma asíncrona pero esperando su finalización por seguridad
        await pool.query(queryAudit, [usuario[dict.COLUMNAS.ID_USUARIO], ip_address]);
        
        return {
            token,
            usuario: {
                id_usuario: usuario[dict.COLUMNAS.ID_USUARIO],
                nombre: usuario[dict.COLUMNAS.NOMBRE_COMPLETO],
                rol: usuario[dict.COLUMNAS.ID_ROL]
            }
        };
    } catch (error) {
        throw error;
    }
};

// 3. Obtener todos los roles
const obtenerRoles = async () => {
    const queryRoles = `SELECT ${dict.COLUMNAS.ID_ROL}, ${dict.COLUMNAS.NOMBRE_ROL}, descripcion FROM ${dict.TABLAS.ROLES}`;
    const [roles] = await pool.query(queryRoles);
    return roles;
};

// 4. Obtener todos los usuarios (sin exponer contraseñas)
const obtenerUsuarios = async () => {
    const queryUsuarios = `
        SELECT u.${dict.COLUMNAS.ID_USUARIO}, u.${dict.COLUMNAS.NOMBRE_COMPLETO}, u.${dict.COLUMNAS.CORREO}, u.${dict.COLUMNAS.ESTADO}, r.${dict.COLUMNAS.NOMBRE_ROL} 
        FROM ${dict.TABLAS.USUARIOS} u
        INNER JOIN ${dict.TABLAS.ROLES} r ON u.${dict.COLUMNAS.ID_ROL} = r.${dict.COLUMNAS.ID_ROL}
    `;
    const [usuarios] = await pool.query(queryUsuarios);
    return usuarios;
};

// 5. Obtener los registros de auditoría
const obtenerAuditoria = async () => {
    const queryAuditoria = `
        SELECT a.id_acceso, u.${dict.COLUMNAS.NOMBRE_COMPLETO}, a.fecha_hora_login, a.${dict.COLUMNAS.DIRECCION_IP} 
        FROM ${dict.TABLAS.AUDITORIA} a
        INNER JOIN ${dict.TABLAS.USUARIOS} u ON a.${dict.COLUMNAS.ID_USUARIO} = u.${dict.COLUMNAS.ID_USUARIO}
        ORDER BY a.fecha_hora_login DESC
    `;
    const [auditoria] = await pool.query(queryAuditoria);
    return auditoria;
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    obtenerRoles,
    obtenerUsuarios,
    obtenerAuditoria
};
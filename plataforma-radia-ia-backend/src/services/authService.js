const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registrarUsuario = async (datosUsuario) => {
    const { id_rol, nombre_completo, correo_electronico, contrasena } = datosUsuario;

    // VALIDACIÓN ESTRICTA: Evita el error "Unknown column 'undefined'" rechazando peticiones incompletas
    if (!id_rol || !nombre_completo || !correo_electronico || !contrasena) {
        throw new Error('Faltan datos obligatorios (id_rol, nombre_completo, correo_electronico, contrasena).');
    }

    // 1. Validar que el correo no exista previamente
    const [existe] = await pool.query('SELECT id_usuario FROM Usuarios WHERE correo_electronico = ?', [correo_electronico]);
    if (existe.length > 0) {
        throw new Error('El correo electrónico ya se encuentra registrado.');
    }

    // 2. Generar el Hash con bcrypt
    const contrasena_hash = bcrypt.hashSync(contrasena, 10);

    // 3. Inserción segura usando texto plano para el nombre de las columnas (No usar dbDictionary aquí)
    const [resultado] = await pool.query(
        `INSERT INTO Usuarios (id_rol, nombre_completo, correo_electronico, contrasena_hash, estado)
         VALUES (?, ?, ?, ?, 'Activo')`,
        [id_rol, nombre_completo, correo_electronico, contrasena_hash]
    );

    return { id_usuario: resultado.insertId, nombre_completo, correo_electronico };
};

const loginUsuario = async (correo_electronico, contrasena_plana, ip_address) => {
    if (!correo_electronico || !contrasena_plana) {
        throw new Error('Correo y contraseña son requeridos.');
    }

    // 1. Buscar al usuario en la base de datos
    const [usuarios] = await pool.query(
        `SELECT u.id_usuario, u.id_rol, u.nombre_completo, u.correo_electronico, u.contrasena_hash, u.estado, r.nombre_rol 
         FROM Usuarios u 
         INNER JOIN Roles r ON u.id_rol = r.id_rol 
         WHERE u.correo_electronico = ?`,
        [correo_electronico]
    );

    if (usuarios.length === 0) {
        throw new Error('Credenciales inválidas.');
    }

    const usuario = usuarios[0];

    // 2. Validar que la cuenta esté activa
    if (usuario.estado !== 'Activo') {
        throw new Error('La cuenta de usuario se encuentra inactiva.');
    }

    // 3. Comparar la contraseña
    const esValida = bcrypt.compareSync(contrasena_plana, usuario.contrasena_hash);
    if (!esValida) {
        throw new Error('Credenciales inválidas.');
    }

    // 4. Generar el token JWT
    const payload = {
        id_usuario: usuario.id_usuario,
        id_rol: usuario.id_rol,
        nombre_rol: usuario.nombre_rol,
        correo_electronico: usuario.correo_electronico
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // 5. Registrar la actividad en la tabla Auditoria_Accesos
    const direccion_ip_segura = ip_address || 'Desconocida';
    await pool.query(
        `INSERT INTO Auditoria_Accesos (id_usuario, direccion_ip) VALUES (?, ?)`,
        [usuario.id_usuario, direccion_ip_segura]
    );

    return {
        token,
        usuario: {
            id_usuario: usuario.id_usuario,
            nombre_completo: usuario.nombre_completo,
            correo_electronico: usuario.correo_electronico,
            rol: usuario.nombre_rol
        }
    };
};

const obtenerRoles = async () => {
    const [roles] = await pool.query('SELECT id_rol, nombre_rol, descripcion FROM Roles');
    return roles;
};

const obtenerUsuarios = async () => {
    const [usuarios] = await pool.query(
        `SELECT u.id_usuario, u.nombre_completo, u.correo_electronico, r.nombre_rol, u.estado, u.fecha_registro 
         FROM Usuarios u 
         INNER JOIN Roles r ON u.id_rol = r.id_rol`
    );
    return usuarios;
};

const obtenerAuditoria = async () => {
    const [auditoria] = await pool.query(
        `SELECT a.id_acceso, u.nombre_completo, a.fecha_hora_login, a.direccion_ip 
         FROM Auditoria_Accesos a
         INNER JOIN Usuarios u ON a.id_usuario = u.id_usuario
         ORDER BY a.fecha_hora_login DESC LIMIT 50`
    );
    return auditoria;
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    obtenerRoles,
    obtenerUsuarios,
    obtenerAuditoria
};
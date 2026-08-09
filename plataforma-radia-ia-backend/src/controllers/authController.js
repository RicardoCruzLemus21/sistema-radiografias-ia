const authService = require('../services/authService');

const registrar = async (req, res) => {
    try {
        const nuevoUsuario = await authService.registrarUsuario(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Usuario registrado correctamente',
            data: nuevoUsuario
        });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

//Funcion de login

const login = async (req, res) => {
    try {
        const { correo_electronico, contrasena } = req.body;
        // Se captura la IP para la tabla de Auditoria_Accesos
        const ip_address = req.ip || req.connection.remoteAddress; 
        
        const acceso = await authService.loginUsuario(correo_electronico, contrasena, ip_address);
        
        res.status(200).json({
            status: 'success',
            message: 'Inicio de sesión exitoso',
            data: acceso
        });
    } catch (error) {
        res.status(401).json({ status: 'error', message: error.message });
    }
};


const listarRoles = async (req, res) => {
    try {
        const roles = await authService.obtenerRoles();
        res.status(200).json({ status: 'success', data: roles });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener roles' });
    }
};

const listarUsuarios = async (req, res) => {
    try {
        const usuarios = await authService.obtenerUsuarios();
        res.status(200).json({ status: 'success', data: usuarios });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener usuarios' });
    }
};

const listarAuditoria = async (req, res) => {
    try {
        const auditoria = await authService.obtenerAuditoria();
        res.status(200).json({ status: 'success', data: auditoria });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener auditoría' });
    }
};

// Exportar las nuevas funciones
module.exports = {
    registrar,
    login,
    listarRoles,
    listarUsuarios,
    listarAuditoria
};


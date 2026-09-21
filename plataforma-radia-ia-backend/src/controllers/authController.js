const authService = require('../services/authService');
const auditService = require('../services/auditService');
const academicService = require('../services/academicService');
const jwt = require('jsonwebtoken');

const registrar = async (req, res) => {
    try {
        const nuevoUsuario = await authService.registrarUsuario(req.body);

        // Intentar extraer el ID del administrador que está creando al usuario
        let id_admin = 1; // ID de sistema por defecto
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                id_admin = decoded.id_usuario;
            } catch (err) {}
        }

        // Registrar en auditoría
        await auditService.registrarAccion(id_admin, 'CREAR_USUARIO', `Se creó el usuario ID: ${nuevoUsuario.id_usuario} del sistema`);

        res.status(201).json({
            status: 'success',
            message: 'Usuario registrado correctamente',
            data: nuevoUsuario
        });
    } catch (error) {
        // Devuelve 400 Bad Request si faltan datos o el correo ya existe
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { correo_electronico, contrasena } = req.body;
        // Se captura la IP para la tabla de Auditoria_Accesos
        const ip_address = req.ip || req.connection.remoteAddress || '127.0.0.1'; 
        
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

const cambiarClaveInicial = async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario;
        const { nueva_contrasena } = req.body;
        await authService.cambiarClaveInicial(id_usuario, nueva_contrasena);
        res.status(200).json({ status: 'success', message: 'Contraseña cambiada exitosamente' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const registrarDocente = async (req, res) => {
    try {
        const nuevo = await authService.registrarDocente(req.body);
        await auditService.registrarAccion(nuevo.id_usuario, 'REGISTRO_DOCENTE', `Un docente se registró por sí mismo (usuario ID: ${nuevo.id_usuario})`);
        res.status(201).json({ status: 'success', message: 'Cuenta de docente creada correctamente', data: nuevo });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const consultarDocentePorCodigo = async (req, res) => {
    try {
        const docente = await authService.consultarDocentePorCodigo(req.params.codigo);
        res.status(200).json({ status: 'success', data: docente });
    } catch (error) {
        const noExiste = error.message.startsWith('No existe');
        res.status(noExiste ? 404 : 400).json({ status: 'error', message: error.message });
    }
};

const registrarEstudiante = async (req, res) => {
    try {
        const nuevo = await authService.registrarEstudiante(req.body);
        await auditService.registrarAccion(nuevo.id_usuario, 'REGISTRO_ESTUDIANTE_POR_CODIGO', `Un estudiante se registró con el código de ${nuevo.nombre_docente} (usuario ID: ${nuevo.id_usuario})`);
        res.status(201).json({ status: 'success', message: 'Cuenta de estudiante creada correctamente', data: nuevo });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

const listarCursosDisponibles = async (req, res) => {
    try {
        const cursos = await academicService.obtenerCatalogoCursos();
        res.status(200).json({ status: 'success', data: cursos });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al obtener los cursos' });
    }
};

module.exports = {
    registrar,
    registrarDocente,
    registrarEstudiante,
    consultarDocentePorCodigo,
    listarCursosDisponibles,
    login,
    listarRoles,
    listarUsuarios,
    listarAuditoria,
    cambiarClaveInicial
};
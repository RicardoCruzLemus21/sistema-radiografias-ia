const authService = require('../services/authService');
const auditService = require('../services/auditService');
const academicService = require('../services/academicService');

const registrar = async (req, res) => {
    try {
        // Un catedratico solo puede crear estudiantes (2); solo un admin (3) puede crear
        // cuentas de docente o de otro administrador. req.usuario ya viene verificado por
        // verificarToken, así que el rol del solicitante es de fiar.
        const ROL_ESTUDIANTE = 2, ROL_ADMIN = 3;
        const esAdmin = Number(req.usuario.id_rol) === ROL_ADMIN;
        if (!esAdmin && Number(req.body?.id_rol) !== ROL_ESTUDIANTE) {
            return res.status(403).json({ status: 'error', message: 'Solo un administrador puede crear cuentas de docente o administrador.' });
        }

        const nuevoUsuario = await authService.registrarUsuario(req.body);

        await auditService.registrarAccion(req.usuario.id_usuario, 'CREAR_USUARIO', `Se creó el usuario ID: ${nuevoUsuario.id_usuario} del sistema`);

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

        const acceso = await authService.loginUsuario(correo_electronico, contrasena);
        
        res.status(200).json({
            status: 'success',
            message: 'Inicio de sesión exitoso',
            data: acceso
        });
    } catch (error) {
        res.status(401).json({ status: 'error', message: error.message });
    }
};

const logout = async (req, res) => {
    try {
        await auditService.registrarAccion(req.usuario.id_usuario, 'CIERRE_SESION', `${req.usuario.correo_electronico || 'Usuario'} cerró sesión`);
        res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'No se pudo registrar el cierre de sesión' });
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
    logout,
    listarRoles,
    listarUsuarios,
    cambiarClaveInicial
};
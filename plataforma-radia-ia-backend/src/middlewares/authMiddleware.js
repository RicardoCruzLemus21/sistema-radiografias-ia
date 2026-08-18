const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // Leer el token de los encabezados (Headers)
    let token = req.header('Authorization');
    
    if (!token) {
        return res.status(403).json({ status: 'error', message: 'Acceso denegado. No se proporcionó un token de seguridad.' });
    }

    try {
        // Formato estándar Bearer Token
        if (token.startsWith('Bearer ')) {
            token = token.split(' ')[1];
        }

        // Verificar validez del token
        const decodificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // Inyectar los datos del usuario en la petición para que los siguientes módulos sepan quién es
        req.usuario = decodificado; 
        
        // Continuar hacia el controlador
        next(); 
    } catch (error) {
        res.status(401).json({ status: 'error', message: 'Token inválido o expirado.' });
    }
};

const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario || !req.usuario.nombre_rol) {
            return res.status(403).json({ status: 'error', message: 'Acceso denegado. No se encontró información de rol.' });
        }
        
        // Convertimos todo a minúsculas y eliminamos tildes para comparar correctamente
        const rolUsuario = req.usuario.nombre_rol.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const rolesPermitidosNormalizados = rolesPermitidos.map(r => r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

        if (!rolesPermitidosNormalizados.includes(rolUsuario)) {
            return res.status(403).json({ status: 'error', message: 'No tienes permisos para realizar esta acción.' });
        }
        
        next();
    };
};

module.exports = { verificarToken, verificarRol };
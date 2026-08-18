const userService = require('../services/userService');
const auditService = require('../services/auditService');

const listarUsuarios = async (req, res) => {
    try {
        const usuarios = await userService.listarUsuarios();
        res.status(200).json({ status: 'success', data: usuarios });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al listar usuarios.' });
    }
};

const editarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        await userService.editarUsuario(id, req.body);
        
        // Log auditoría
        const id_admin = req.usuario?.id_usuario || 1;
        await auditService.registrarAccion(id_admin, 'EDITAR_USUARIO', `Se actualizaron los datos del usuario ID: ${id}`);

        res.status(200).json({ status: 'success', message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Error al actualizar usuario.' });
    }
};

const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        await userService.eliminarUsuario(id);

        const id_admin = req.usuario?.id_usuario || 1;
        await auditService.registrarAccion(id_admin, 'ELIMINAR_USUARIO', `Se eliminó al usuario ID: ${id} del sistema`);

        res.status(200).json({ status: 'success', message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    listarUsuarios,
    editarUsuario,
    eliminarUsuario
};

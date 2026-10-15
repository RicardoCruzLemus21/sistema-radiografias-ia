const db = require('../config/database'); // Importamos la conexión a la base de datos

// Agrega "seleccionada: false" para que los checkboxes en Angular nazcan desmarcados
const listarCatalogos = async (req, res) => {
    try {
        const [rows] = await db.query('CALL sp_obtener_catalogo_patologias()');
        const data = rows[0].map(r => ({
            id: r.id_patologia,
            nombre: r.nombre_patologia,
            descripcion_breve: r.descripcion_breve,
            descripcion: r.descripcion,
            seleccionada: false
        }));

        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error("Error al obtener catálogos:", error);
        res.status(500).json({
            status: 'error',
            message: "Error interno del servidor al cargar los catálogos médicos."
        });
    }
};

const editarPatologia = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_patologia, descripcion } = req.body;

        await db.query('CALL sp_editar_patologia(?, ?, ?)', [id, nombre_patologia, descripcion]);

        res.status(200).json({ status: 'success', message: 'Patología actualizada correctamente' });
    } catch (error) {
        console.error("Error al editar patología:", error);
        res.status(500).json({ status: 'error', message: 'Error al actualizar la patología' });
    }
};

const eliminarPatologia = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('CALL sp_eliminar_patologia(?)', [id]);
        res.status(200).json({ status: 'success', message: 'Patología eliminada correctamente' });
    } catch (error) {
        console.error("Error al eliminar patología:", error);
        res.status(500).json({ status: 'error', message: 'No se puede eliminar la patología porque está en uso por evaluaciones existentes.' });
    }
};

module.exports = {
    listarCatalogos,
    editarPatologia,
    eliminarPatologia
};
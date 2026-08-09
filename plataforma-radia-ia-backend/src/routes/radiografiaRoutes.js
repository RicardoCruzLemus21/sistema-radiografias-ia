const express = require('express');
const router = express.Router();
const radiografiaController = require('../controllers/radiografiaController');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const { verificarToken } = require('../middlewares/authMiddleware');

// Proteger todas las rutas del módulo con el token JWT de catedrático
router.use(verificarToken);

// 1. Endpoint para registrar el paciente simulado
router.post('/paciente', radiografiaController.registrarPaciente);

// 2. Endpoint para crear el caso clínico asociado
router.post('/caso', radiografiaController.crearCaso);

// 3. Endpoint para subir la radiografía (espera el archivo en el campo 'imagen_rx')
router.post('/upload', uploadMiddleware.single('imagen_rx'), radiografiaController.uploadRadiografia);

module.exports = router;
const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
// const { verificarToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware'); // Importamos Multer

// Aseguramos todo el módulo temporalmente deshabilitado para pruebas
// router.use(verificarToken);

// === ESTE ES EL ENDPOINT QUE BUSCA POSTMAN Y ANGULAR ===
router.get('/casos-clinicos', clinicalController.obtenerWorklist);
router.get('/casos-admin', clinicalController.listarCasosCatedratico);
router.get('/caso/:id', clinicalController.obtenerCasoPorId);
// =========================================================

// Endpoints POST individuales
router.post('/paciente', clinicalController.registrarPaciente);
router.post('/caso', clinicalController.armarCaso);
router.post('/radiografia', upload.single('imagen'), clinicalController.subirImagenRad);

// Endpoint POST Maestro: Crear Paciente + Caso + Subir Rx en un solo paso
router.post('/crear-completo', upload.single('imagen_rx'), clinicalController.crearCasoCompleto);

module.exports = router;
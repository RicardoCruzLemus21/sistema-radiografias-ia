const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
// const { verificarToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware'); // Importamos Multer

// Aseguramos todo el módulo temporalmente deshabilitado para pruebas
// router.use(verificarToken);

// === ESTE ES EL ENDPOINT QUE BUSCA POSTMAN Y ANGULAR ===
router.get('/casos-clinicos', clinicalController.obtenerWorklist);
// =========================================================

// Endpoints POST
router.post('/paciente', clinicalController.registrarPaciente);
router.post('/caso', clinicalController.armarCaso);

// Presta atención a "upload.single('imagen')". 
// 'imagen' es la llave que deberás usar en Postman en la pestaña form-data.
router.post('/radiografia', upload.single('imagen'), clinicalController.subirImagenRad);

module.exports = router;
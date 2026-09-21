const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const modeloController = require('../controllers/modeloController');

// Solo lectura, para docentes y administradores
router.get('/ficha', verificarToken, verificarRol(['catedratico', 'admin']), modeloController.verFichaModelo);

module.exports = router;

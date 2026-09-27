const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.use(verificarToken, verificarRol(['admin']));

router.get('/resumen-global', adminController.resumenGlobal);

module.exports = router;

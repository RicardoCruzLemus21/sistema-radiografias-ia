const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, verificarRol(['admin']), userController.listarUsuarios);
router.put('/:id', verificarToken, verificarRol(['admin']), userController.editarUsuario);
router.delete('/:id', verificarToken, verificarRol(['admin']), userController.eliminarUsuario);

module.exports = router;

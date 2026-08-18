const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, verificarRol(['catedratico']), userController.listarUsuarios);
router.put('/:id', verificarToken, verificarRol(['catedratico']), userController.editarUsuario);
router.delete('/:id', verificarToken, verificarRol(['catedratico']), userController.eliminarUsuario);

module.exports = router;

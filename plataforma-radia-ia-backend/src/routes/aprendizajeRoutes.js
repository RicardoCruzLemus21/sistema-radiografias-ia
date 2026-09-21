const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const c = require('../controllers/aprendizajeController');

router.use(verificarToken);

// Estudiante: ruta de aprendizaje, práctica guiada, repaso espaciado y errores frecuentes
router.get('/resumen', verificarRol(['estudiante']), c.resumen);
router.get('/leccion/:clase', verificarRol(['estudiante']), c.leccion);
router.post('/leccion/:clase/paso', verificarRol(['estudiante']), c.marcarPaso);
router.get('/comparador', verificarRol(['estudiante']), c.comparador);
router.get('/sesion/:clase', verificarRol(['estudiante']), c.sesion);
router.post('/responder', verificarRol(['estudiante']), c.responder);
router.get('/repaso', verificarRol(['estudiante']), c.repaso);
router.get('/mis-errores', verificarRol(['estudiante']), c.misErrores);

// Docente y administrador: revisar y aprobar el contenido que ven los estudiantes
const revisores = verificarRol(['catedratico', 'admin']);
router.get('/admin/lecciones', revisores, c.listarLecciones);
router.put('/admin/lecciones/:clase', revisores, c.guardarLeccion);
router.get('/admin/explicaciones', revisores, c.listarExplicaciones);
router.put('/admin/explicaciones/:id', revisores, c.revisarExplicacion);
router.post('/admin/explicaciones/generar', revisores, c.generarExplicaciones);
router.post('/admin/explicaciones/:id/regenerar', revisores, c.regenerarExplicacion);

module.exports = router;

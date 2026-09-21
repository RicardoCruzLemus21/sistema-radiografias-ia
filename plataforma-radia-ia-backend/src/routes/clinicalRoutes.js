const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinicalController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware'); // Importamos Multer

// Aseguramos todo el módulo temporalmente deshabilitado para pruebas
router.use(verificarToken);

// === ESTE ES EL ENDPOINT QUE BUSCA POSTMAN Y ANGULAR ===
router.get('/casos-clinicos', clinicalController.obtenerWorklist);
router.get('/casos-admin', clinicalController.listarCasosCatedratico);
router.get('/caso/:id', clinicalController.obtenerCasoPorId);
router.get('/next-paciente', clinicalController.obtenerSiguienteCodigoPaciente);
router.get('/library/:patologia', clinicalController.obtenerInfoPatologiaIA);
// Flujo de asignación del banco: solo catedráticos (y solo sobre sus propios cursos, ver el controlador)
router.get('/banco-casos-ia/disponibilidad', verificarRol(['catedratico']), clinicalController.obtenerDisponibilidadBanco);
router.post('/banco-casos-ia/componer', verificarRol(['catedratico']), clinicalController.componerEjercicio);
router.get('/metricas-modelo', clinicalController.obtenerMetricasModelo);
router.get('/estadisticas-estudiante', clinicalController.obtenerEstadisticasEstudiante);

// Endpoints de Estudiante (Flujo Educativo Fase 1)
router.get('/caso/:id/estudiante', clinicalController.obtenerCasoEstudiante);
router.get('/caso/:id/retroalimentacion', verificarRol(['estudiante']), clinicalController.obtenerRetroalimentacion);
// Solo estudiantes responden casos, y siempre a su propio nombre (el id sale del token)
router.post('/respuestas', verificarRol(['estudiante']), clinicalController.registrarRespuesta);
// =========================================================

// Endpoints POST individuales
router.post('/paciente', clinicalController.registrarPaciente);
router.post('/caso', clinicalController.armarCaso);
router.post('/radiografia', upload.single('imagen'), clinicalController.subirImagenRad);

// Endpoint POST Maestro: Crear Paciente + Caso + Subir Rx en un solo paso
router.post('/crear-completo', upload.single('imagen_rx'), clinicalController.crearCasoCompleto);

// Endpoint POST: Asignar casos del Banco NIH a un curso
router.post('/evaluaciones', verificarRol(['catedratico']), clinicalController.asignarCasosBanco);

// Endpoints CRUD adicionales (Editar y Eliminar)
router.put('/caso/:id', clinicalController.editarCaso);
router.delete('/ejercicio/:id', verificarRol(['catedratico']), clinicalController.eliminarEjercicio);
router.delete('/caso/:id', clinicalController.eliminarCaso);

module.exports = router;
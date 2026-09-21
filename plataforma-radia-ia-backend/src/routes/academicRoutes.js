const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware'); // El candado de seguridad

// Protegemos TODAS las rutas académicas para exigir sesión iniciada
router.use(verificarToken); 

// Código de docente para el auto-registro de estudiantes (solo catedráticos)
router.get('/mi-codigo', verificarRol(['catedratico']), academicController.verMiCodigo);
router.post('/mi-codigo/regenerar', verificarRol(['catedratico']), academicController.regenerarMiCodigo);

// Endpoints de Escritura (POST)
router.post('/crear', academicController.crear);
router.post('/asignar', academicController.asignar);

// Endpoints de Lectura (GET) para cubrir las 3 tablas y Dashboards
// Informe PDF de calificaciones (solo catedráticos)
router.get('/ejercicios', verificarRol(['catedratico']), academicController.listarEjerciciosDocente);
router.get('/informe-calificaciones', verificarRol(['catedratico']), academicController.descargarInformeCalificaciones);
router.get('/estudiante/:id/informe', verificarRol(['catedratico']), academicController.descargarInformeEstudiante);

router.get('/mi-rendimiento', academicController.verMiRendimiento);
router.get('/resumen-general', academicController.verResumenGeneral);
router.get('/estudiante/:id/detalle', academicController.verDetalleEstudiante);
router.get('/mis-cursos', academicController.listarMisCursos);
router.get('/catalogo-cursos', academicController.listarCatalogoCursos);
router.get('/catedratico/:id_catedratico/cursos', academicController.listarCursosDeCatedratico);
router.get('/:id_curso/estudiantes', academicController.listarEstudiantes);
router.get('/:id_curso/dashboard', academicController.verDashboard);

// Endpoints de Edición y Eliminación de Estudiantes
router.put('/estudiante/:id', academicController.editarEstudiante);
router.delete('/estudiante/:id', academicController.eliminarEstudiante);

// Endpoints de Edición y Eliminación de Cursos
router.put('/curso/:id', academicController.editarCurso);
router.delete('/curso/:id', academicController.eliminarCurso);

module.exports = router;
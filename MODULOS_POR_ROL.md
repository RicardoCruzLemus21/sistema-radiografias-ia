# Mapa del Backend por Rol — Dónde Está Programado Cada Módulo

Guía de navegación para estudiar el código: para cada módulo funcional, el archivo de **rutas**, el de **controlador** (función exacta) y el de **servicio** (función exacta, que es donde vive la lógica real y las llamadas a procedimientos almacenados). Todas las rutas son relativas a `plataforma-radia-ia-backend/`.

## Las 4 capas de cualquier endpoint

```
src/routes/*.js        → define la URL, el método HTTP y QUÉ ROL puede entrar (verificarRol)
      ↓
src/middlewares/*.js   → valida el token (authMiddleware), limita intentos (rateLimiter), procesa archivos (uploadMiddleware)
      ↓
src/controllers/*.js   → recibe req/res, llama al servicio, responde con el JSON
      ↓
src/services/*.js      → la lógica real: arma los parámetros y hace `CALL sp_...` contra la base de datos
```

Para estudiar un módulo, el orden más útil suele ser: **ruta → controlador → servicio** (de afuera hacia adentro).

---

## 1. Rol ESTUDIANTE

### 1.1 Registro y autenticación

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/authRoutes.js` | `POST /registrar-estudiante`, `GET /docente-por-codigo/:codigo`, `GET /cursos-disponibles`, `POST /login` |
| Controlador | `src/controllers/authController.js` | `registrarEstudiante` (línea 120), `consultarDocentePorCodigo` (110), `listarCursosDisponibles` (130), `login` (35) |
| Servicio | `src/services/authService.js` | `registrarEstudiante`, `loginUsuario`, `buscarDocentePorCodigo` |
| Middleware | `src/middlewares/rateLimiter.js` | Limita a 10 intentos/min en registro, 20/min en consulta de código |

### 1.2 Worklist y resolución de casos clínicos

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/clinicalRoutes.js` | `GET /casos-clinicos`, `GET /caso/:id/estudiante`, `PUT /caso/:id/tiempo`, `GET /caso/:id/retroalimentacion`, `POST /respuestas` |
| Controlador | `src/controllers/clinicalController.js` | `obtenerWorklist` (48), `obtenerCasoEstudiante` (84), `guardarTiempoProgreso` (94), `obtenerRetroalimentacion` (105), `registrarRespuesta` (118) |
| Servicio | `src/services/clinicalService.js` | `obtenerCasoEstudianteSeguro`, `guardarTiempoProgreso`, `obtenerRetroalimentacionEstudiante`, `guardarRespuestaEstudiante` (la función más larga: califica los 3 ejes) |

> Aquí mismo vive el cronómetro persistente (`evaluaciones_en_progreso`) que agregamos esta sesión: `guardarTiempoProgreso` en `clinicalService.js` es el punto de entrada.

### 1.3 Retroalimentación de IA (módulo aparte, no interviene en la nota)

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/iaRoutes.js` | `POST /inferencia` |
| Controlador | `src/controllers/iaController.js` | `registrarInferenciaIA` (4) |
| Servicio | `src/services/iaService.js` | `procesarResultadoYConcordancia` (ejecuta el modelo TensorFlow.js, compara contra lo que marcó el estudiante) |

### 1.4 Aprendizaje dirigido (lecciones, práctica guiada, repaso espaciado, mis errores)

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/aprendizajeRoutes.js` | `GET /resumen`, `GET /leccion/:clase`, `POST /leccion/:clase/paso`, `POST /reiniciar/:clase`, `GET /comparador`, `GET /sesion/:clase`, `POST /responder`, `GET /repaso`, `GET /mis-errores` |
| Controlador | `src/controllers/aprendizajeController.js` | Es un wrapper delgado: cada ruta llama directo a la función del mismo nombre en el servicio (`resumen`, `leccion`, `marcarPaso`, `reiniciarClase`, `comparador`, `sesion`, `responder`, `repaso`, `misErrores`) |
| Servicio | `src/services/aprendizajeService.js` | Toda la lógica educativa: `obtenerResumen`, `obtenerLeccion`, `marcarPaso`, `reiniciarClase`, `obtenerComparador`, `obtenerSesionGuiada`, `responder` (práctica guiada **y** repaso, según `origen`), `obtenerRepaso`, `obtenerMisErrores`, `programarTarjeta` (algoritmo FSRS) |

### 1.5 Mi Rendimiento

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/academicRoutes.js` | `GET /mi-rendimiento` |
| Controlador | `src/controllers/academicController.js` | `verMiRendimiento` (192) |
| Servicio | `src/services/academicService.js` | `obtenerMiRendimiento` (junta `sp_obtener_detalle_estudiante_usuario` + `sp_obtener_detalle_estudiante_evaluaciones` + `sp_obtener_mi_rendimiento_estadisticas`) |

### 1.6 Notificaciones (campanita)

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/extraRoutes.js` | `GET /notificaciones`, `PUT /notificaciones/leidas`, `PUT /notificaciones/:id_notificacion/leida` |
| Controlador | `src/controllers/extraController.js` | `obtenerNotificaciones` (17), `marcarTodasLeidas` (46), `marcarNotificacionLeida` (29) |
| Servicio | `src/services/notificationService.js` | `obtenerNotificaciones`, `marcarLeida`, `marcarTodasLeidas` — y, del lado de quien dispara el aviso, las funciones `notificar*` que llaman otros servicios (ej. `clinicalService` llama a `notificarProgresoDelEstudiante` al responder un caso) |

---

## 2. Rol CATEDRÁTICO (docente)

### 2.1 Código de registro de estudiantes

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/academicRoutes.js` | `GET /mi-codigo`, `POST /mi-codigo/regenerar` |
| Controlador | `src/controllers/academicController.js` | `verMiCodigo` (8), `regenerarMiCodigo` (19) |
| Servicio | `src/services/codigoDocenteService.js` | `obtenerCodigo`, `asignarCodigoNuevo` |

### 2.2 Gestión de cursos y estudiantes

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/academicRoutes.js` | `POST /crear`, `POST /asignar`, `GET /mis-cursos`, `GET /buscar-estudiante-sin-asignar`, `GET /:id_curso/estudiantes`, `GET /:id_curso/dashboard`, `PUT /estudiante/:id`, `DELETE /estudiante/:id`, `PUT /curso/:id`, `GET /resumen-general`, `GET /estudiante/:id/detalle` |
| Controlador | `src/controllers/academicController.js` | `crear` (30), `asignar` (39), `listarMisCursos` (48), `buscarEstudianteSinAsignar` (88), `listarEstudiantes` (77), `verDashboard` (87), `editarEstudiante` (171), `eliminarEstudiante` (181), `editarCurso` (202), `verResumenGeneral` (98), `verDetalleEstudiante` (161) |
| Servicio | `src/services/academicService.js` | `crearCurso`, `asignarEstudiante` (acepta `omitir_correo` para reasignaciones), `obtenerCursosCatedratico`, `buscarEstudianteSinAsignar`, `obtenerEstudiantesPorCurso`, `obtenerEstadisticas`, `editarEstudiante`, `eliminarEstudiante`, `editarCurso`, `obtenerResumenGeneral`, `obtenerDetalleEstudiante` |
| Frontend | `gestion-estudiantes-catedratico.ts/html` | Botón "Agregar Estudiante Existente": `agregarEstudianteExistente()` — pide carnet/correo (`alertService.prompt`), busca con `buscarEstudianteSinAsignar`, confirma y llama `asignarEstudiante(cursoActual.id_curso, id_usuario, undefined, true)` |

> **Nota de seguridad (corregida 31/oct/2026):** `POST /asignar` no tenía `verificarRol` en la ruta — cualquier usuario autenticado, de cualquier rol, podía matricular a un estudiante en cualquier curso. Ahora exige `verificarRol(['catedratico', 'admin'])`.

> **Funcionalidad nueva (31/oct/2026):** el botón "Eliminar" de esta tabla (que ya desvinculaba al estudiante de tus cursos sin borrar su cuenta ni sus evaluaciones) ahora se llama **"Desasignar"** y usa `alertService.confirmDanger` (SweetAlert) en vez del modal HTML propio que tenía antes. El mismo cambio se hizo en el modal "Eliminar Cuenta" de `gestion-usuarios` (admin) — ambos eran los únicos dos flujos de eliminar del frontend que todavía no pasaban por SweetAlert.

### 2.3 Casos clínicos, banco NIH y ejercicios

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/clinicalRoutes.js` | `GET /casos-admin`, `PUT /caso/:id`, `DELETE /caso/:id`, `GET /banco-casos-ia/disponibilidad`, `POST /banco-casos-ia/componer`, `POST /evaluaciones`, `GET /ejercicios-progreso`, `PUT /ejercicios/:id/visibilidad`, `DELETE /ejercicios/:id`, `GET /ejercicios/:id/bitacora` |
| Controlador | `src/controllers/clinicalController.js` | `listarCasosCatedratico` (64), `editarCaso`, `eliminarCaso`, `obtenerDisponibilidadBanco`, `componerEjercicio`, `asignarCasosBanco`, `progresoEjercicios`, `visibilidadEjercicio`, `eliminarEjercicio`, `bitacoraEjercicio` |
| Servicio | `src/services/clinicalService.js` | `obtenerCasosDetallados`, `editarCaso`, `eliminarCaso`, `obtenerDisponibilidadBanco`, `componerEjercicio` (+ helper interno `seleccionarCasos`), `asignarCasosBanco` (transacción: crea ejercicio + clona casos + asigna historia), `obtenerProgresoEjercicios`, `cambiarVisibilidadEjercicio`, `eliminarEjercicio` (borra en cascada + notifica a los estudiantes del curso, nuevo 15/oct), `obtenerBitacoraEjercicio` |

> El flujo manual de crear paciente/caso/radiografía a mano (`POST /paciente`, `POST /caso`, `POST /radiografia`, más `GET /next-paciente`) y la tabla `pacientes_simulados` se eliminaron el 14/oct/2026 por no tener ningún uso real — ver `BASE_DE_DATOS.md`.

> **Nota de seguridad (corregida esta sesión):** `PUT /caso/:id` y `DELETE /caso/:id` ahora exigen `verificarRol(['catedratico', 'admin'])` en `clinicalRoutes.js` — antes cualquier estudiante autenticado podía llamarlos.

> **Funcionalidad nueva (15/oct/2026):** el docente puede eliminar un ejercicio completo desde `gestion-casos` (botón "Eliminar" en cada tarjeta, con confirmación). Al construirla se encontraron y corrigieron 2 bugs reales de la limpieza del 14/oct (`sp_clonar_caso_a_curso` y el trigger `trg_archivo_casos_clinicos` seguían referenciando la columna `id_paciente` ya eliminada) — ver `BASE_DE_DATOS.md`.

### 2.4 Revisión y publicación de lecciones generadas por IA

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/aprendizajeRoutes.js` | Todo bajo `/admin/lecciones*` y `/admin/explicaciones*` |
| Controlador | `src/controllers/aprendizajeController.js` | `listarLecciones`, `guardarLeccion`, `generarLecciones`, `completarLoteLeccion`, `listarLotesLeccion`, `listarVersionesLote`, `publicarLoteLeccion`, `eliminarLoteLeccion`, `listarExplicaciones`, `revisarExplicacion` |
| Servicio | `src/services/aprendizajeAdminService.js` | Mismas funciones por nombre; internamente llama a `src/services/geminiService.js` para generar contenido con IA |
| Servicio auxiliar | `src/services/geminiService.js` | Cliente genérico hacia la API de Gemini (sin SDK, usa `fetch`) |
| Caché en memoria | `src/config/catalogoLecciones.js` | `cargarLecciones()` — se ejecuta al arrancar el servidor y cada vez que se publica contenido nuevo |

### 2.5 Informes PDF

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/academicRoutes.js` | `GET /informe-calificaciones`, `GET /estudiante/:id/informe` |
| Controlador | `src/controllers/academicController.js` | `descargarInformeCalificaciones` (119), `descargarInformeEstudiante` (141) |
| Servicio | `src/services/informeService.js` (grupal), `src/services/informeEstudianteService.js` (individual) | `obtenerDatosInforme` / `obtenerDatos` — arman los datos; la generación del PDF en sí usa `pdfkit` |

### 2.6 Comentarios sobre respuestas de estudiantes

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/extraRoutes.js` | `POST /comentarios`, `GET /comentarios/evaluacion/:id_evaluacion` |
| Controlador | `src/controllers/extraController.js` | `agregarComentario` (57), `obtenerComentariosEvaluacion` (71) |
| Servicio | `src/services/commentService.js` | Guarda/lista comentarios; dispara `notificarComentarioDelDocente` de `notificationService.js` |

### 2.7 Ficha del modelo de IA

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/modeloRoutes.js` | `GET /ficha` |
| Controlador | `src/controllers/modeloController.js` | `verFichaModelo` (4) |
| Servicio | `src/services/modeloService.js` | Arma las estadísticas/gráficas del modelo entrenado |

---

## 3. Rol ADMIN

### 3.1 CRUD de usuarios

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/userRoutes.js` | `GET /`, `PUT /:id`, `DELETE /:id` |
| Controlador | `src/controllers/userController.js` | `listarUsuarios` (4), `editarUsuario` (13), `eliminarUsuario` (28) |
| Servicio | `src/services/userService.js` | `listarUsuarios`, `editarUsuario` (con o sin cambio de contraseña), `eliminarUsuario` |
| Frontend | `gestion-usuarios.ts/html` | Botón "Asignar" (solo visible en la tabla "Estudiantes Sin Asignar a Docente"): `asignarEstudianteACurso()` — trae el catálogo con `GET /api/academico/admin/cursos` (no es de este módulo, ver 2.2), deja elegir curso con `alertService.seleccionar` y llama `asignarEstudiante(...)` con `omitir_correo = true` |

### 3.2 Panel de administración (KPIs globales)

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/adminRoutes.js` | `GET /resumen-global` |
| Controlador | `src/controllers/adminController.js` | `resumenGlobal` (3) |
| Servicio | `src/services/adminService.js` | `obtenerResumenGlobal` |

### 3.3 Auditoría completa del sistema

| Capa | Archivo | Función / ruta |
|---|---|---|
| Rutas | `src/routes/auditRoutes.js` | `GET /logs` |
| Controlador | `src/controllers/auditController.js` | `obtenerLogs` (3) |
| Servicio | `src/services/auditService.js` | `obtenerLogs`, `registrarAccion` (la usan casi todos los demás controladores para dejar rastro), `purgarAntiguos` (job cada 24h, ver `src/jobs/purgaAuditoria.js`) |

### 3.4 Exclusivo de admin (dentro de rutas compartidas con catedrático)

| Ruta | Por qué es solo admin |
|---|---|
| `DELETE /api/academico/curso/:id` (`academicRoutes.js`) | Borra en cascada los casos/evaluaciones de los alumnos del curso — demasiado riesgoso para dejarlo en manos del docente |

El resto de "Revisión de lecciones IA" (2.4) y "Ficha del modelo" (2.7) también los puede usar `admin`, comparte permisos con `catedratico` en esas rutas.

---

## 4. Público (sin rol, cualquiera puede llamarlo)

| Módulo | Archivo de rutas | Endpoints |
|---|---|---|
| Registro y login | `src/routes/authRoutes.js` | `POST /registrar-docente`, `POST /registrar-estudiante`, `GET /docente-por-codigo/:codigo`, `GET /cursos-disponibles`, `POST /login`, `GET /roles` |
| Catálogo de patologías | `src/routes/diagnosticoRoutes.js` | `GET /catalogos` |

> **Nota de seguridad (corregida 16/oct/2026):** `POST /registrar` **ya no es público** — antes aceptaba el `id_rol` del cliente sin ninguna verificación (cualquiera podía crearse un admin). Ahora exige token: `verificarRol(['catedratico', 'admin'])` en la ruta, y dentro de `authController.registrar` un catedrático solo puede crear estudiantes, solo un admin puede crear cualquier rol. Lo usan `gestion-estudiantes-catedratico`, `dashboard-catedratico` (siempre como estudiante) y `gestion-usuarios` (admin, cualquier rol).

---

## 5. Infraestructura compartida (no es "de" ningún rol, la usan todos)

| Pieza | Archivo | Qué hace |
|---|---|---|
| Validación de sesión | `src/middlewares/authMiddleware.js` | `verificarToken` (lee y valida el JWT) y `verificarRol([...])` (compara el rol del token contra la lista permitida) |
| Freno a fuerza bruta | `src/middlewares/rateLimiter.js` | `crearLimitador({ ventanaMs, maximo })` — limitador en memoria, usado en registro público |
| Subida de archivos | `src/middlewares/uploadMiddleware.js` | Configuración de Multer (radiografías) |
| Conexión a MySQL | `src/config/database.js` | El pool de conexiones que usan todos los servicios |
| Nombres de tabla/columna | `src/config/dbDictionary.js` | Solo lo usan 5 archivos para armar SQL puntual fuera de los SPs |
| Catálogo de lecciones en caché | `src/config/catalogoLecciones.js` | Se carga una vez al arrancar el servidor |
| Distractores en caché | `src/config/distractores.js` / `src/config/distractoresConfig.js` | Igual, en memoria desde el arranque |
| Punto de entrada | `server.js` | Registra las 13 rutas, precarga el modelo de IA y las cachés, arranca el job de purga de auditoría |

---

## Resumen: 1 módulo = hasta 3 archivos

Para estudiar cualquier funcionalidad, siempre son (como máximo) 3 saltos:

```
src/routes/<módulo>Routes.js   → qué URL, qué método, qué rol
src/controllers/<módulo>Controller.js → qué función del servicio llama
src/services/<módulo>Service.js       → la lógica real y el CALL sp_...
```

Las únicas excepciones (llamadas directo desde el controlador, sin pasar por un servicio) son `sp_editar_patologia` y `sp_eliminar_patologia` en `diagnosticoController.js`, y `sp_obtener_worklist_estudiante` en `clinicalController.js`.

# Endpoints del Backend — RADIA-OS

Listado completo de todas las rutas del API REST, generado a partir del código real (`plataforma-radia-ia-backend/src/routes/*.js` y `server.js`). Cubre los **11 módulos** de rutas que existen hoy en el proyecto (de los 13 originales, `radiografiaRoutes.js` y `metricsRoutes.js` se eliminaron el 14/oct/2026 por no tener ningún uso — ver `BASE_DE_DATOS.md`).

> **Actualización (14/oct/2026):** además de los 2 módulos completos eliminados, se quitaron estos endpoints sin consumidor en el frontend: `POST /api/diagnostico/evaluar`, `GET /api/extra/auditoria/logs`, `GET /api/auth/auditoria`, y de `clinicalRoutes.js`: `POST /paciente`, `POST /caso`, `POST /radiografia`, `GET /next-paciente`.
>
> **Actualización (15/oct/2026):** se agregó `DELETE /api/clinical/ejercicios/:id` — nueva funcionalidad para que el docente elimine un ejercicio completo (con confirmación en el frontend). Ver `BASE_DE_DATOS.md` para los 2 bugs reales que se corrigieron en el camino (no afectan este listado, son procedimientos internos).
>
> **Actualización (31/oct/2026):** nueva funcionalidad de (re)asignar un estudiante sin curso, desde el admin o desde el catedrático. Se agregaron `GET /api/academico/admin/cursos` (admin) y `GET /api/academico/buscar-estudiante-sin-asignar` (catedrático). Además, `POST /api/academico/asignar` **ya no es "cualquier usuario con token"** — ahora exige `verificarRol(['catedratico', 'admin'])`; antes de este cambio, cualquier cuenta autenticada (incluido un estudiante) podía llamarlo sin que la ruta lo impidiera (solo quedaba protegido implícitamente por la lógica interna del SP).

## Cómo leer este documento

- **URL completa** = prefijo del módulo (tabla de abajo) + la ruta de cada endpoint. Ej.: módulo `/api/clinical` + ruta `/caso/:id` = `GET /api/clinical/caso/:id`.
- **Auth** indica qué exige el backend antes de ejecutar el endpoint:
  - `Público` → no requiere token, cualquiera puede llamarlo.
  - `Token` → requiere sesión iniciada (JWT válido), pero **cualquier rol** puede usarlo.
  - `estudiante` / `catedratico` / `admin` → requiere token **y** que el rol del usuario sea exactamente ese (o uno de la lista).
- Todas las rutas (salvo las marcadas como públicas) dependen del middleware `verificarToken` (lee y valida el JWT del header `Authorization`) y, cuando aplica, `verificarRol([...])` (en `src/middlewares/authMiddleware.js`).

## Módulos y sus prefijos

| Prefijo | Archivo de rutas | Para qué sirve |
|---|---|---|
| `/api/auth` | `authRoutes.js` | Registro, login, roles |
| `/api/academico` | `academicRoutes.js` | Cursos, rendimiento académico, gestión de estudiantes/cursos |
| `/api/clinical` | `clinicalRoutes.js` | Casos clínicos, worklist del estudiante, banco de casos IA |
| `/api/diagnostico` | `diagnosticoRoutes.js` | Catálogo de patologías |
| `/api/ia` | `iaRoutes.js` | Registrar una inferencia del modelo de IA |
| `/api/extra` | `extraRoutes.js` | Notificaciones, comentarios del docente |
| `/api/audit` | `auditRoutes.js` | Timeline de auditoría de acciones (solo admin) |
| `/api/modelo` | `modeloRoutes.js` | Ficha técnica del modelo de IA (estadísticas) |
| `/api/aprendizaje` | `aprendizajeRoutes.js` | Módulo de aprendizaje: lecciones, sesión guiada, repaso espaciado, errores |
| `/api/users` | `userRoutes.js` | CRUD de usuarios (solo admin) |
| `/api/admin` | `adminRoutes.js` | KPIs globales del panel de administrador |

---

## 1. `/api/auth` — Autenticación y Usuarios

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| POST | `/registrar` | catedratico, admin | Crea un usuario con un rol a elección — catedrático solo puede crear estudiantes, admin puede crear cualquier rol (corregido 16/oct/2026, ver nota abajo) |
| POST | `/registrar-docente` | Público (limitado a 10 intentos/min por IP) | Auto-registro de un docente nuevo |
| POST | `/registrar-estudiante` | Público (limitado a 10 intentos/min por IP) | Auto-registro de un estudiante usando el código de su docente |
| GET | `/docente-por-codigo/:codigo` | Público (limitado a 20 consultas/min por IP) | Verifica un código de docente y devuelve su nombre/cursos antes de registrarse |
| GET | `/cursos-disponibles` | Público | Lista los cursos de un docente (para elegir uno al registrarse) |
| POST | `/login` | Público | Inicia sesión y devuelve el token JWT |
| GET | `/roles` | Público | Lista los roles del sistema (estudiante, catedrático, admin) |
| GET | `/usuarios` | Token | Lista de usuarios |
| POST | `/cambiar-clave-inicial` | Token | Cambia la contraseña temporal del primer inicio de sesión |
| POST | `/logout` | Token | Registra el cierre de sesión en la auditoría |

> **Nota de seguridad (corregida 16/oct/2026):** `POST /registrar` era público y confiaba en el `id_rol` que mandaba el cliente — cualquiera, sin sesión, podía crearse una cuenta de administrador directamente por API. Ahora exige token y rol (catedrático o admin); un catedrático solo puede crear estudiantes (`id_rol=2`), y solo un admin puede crear docentes o administradores.

---

## 2. `/api/academico` — Gestión Académica

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/mi-codigo` | catedratico | Ver el código propio de registro de estudiantes |
| POST | `/mi-codigo/regenerar` | catedratico | Invalida el código actual y genera uno nuevo |
| POST | `/crear` | Token | Crea un curso |
| POST | `/asignar` | catedratico, admin | Asigna (o reasigna) un estudiante a un curso — rol exigido desde 31/oct/2026, ver nota abajo |
| GET | `/ejercicios` | catedratico | Lista los ejercicios creados por el docente |
| GET | `/informe-calificaciones` | catedratico | Descarga el PDF de calificaciones de un curso |
| GET | `/estudiante/:id/informe` | catedratico | Descarga el PDF de calificaciones de un estudiante específico |
| GET | `/mi-rendimiento` | Token | Panel "Mi Rendimiento" del estudiante (casos evaluados, historial) |
| GET | `/resumen-general` | Token | KPIs generales del docente (dashboard) |
| GET | `/estudiante/:id/detalle` | Token | Detalle de desempeño de un estudiante |
| GET | `/mis-cursos` | Token | Cursos del docente autenticado |
| GET | `/catalogo-cursos` | Token | Catálogo de nombres de curso disponibles |
| GET | `/admin/cursos` | admin | Catálogo de cursos con su catedrático y total de alumnos, para reasignar a un estudiante sin curso |
| GET | `/buscar-estudiante-sin-asignar` | catedratico | Busca un estudiante existente por carnet o correo (`?q=`), para volver a matricularlo sin crear cuenta nueva |
| GET | `/catedratico/:id_catedratico/cursos` | Token | Cursos de un docente específico (por id) |
| GET | `/:id_curso/estudiantes` | Token | Estudiantes inscritos en un curso |
| GET | `/:id_curso/dashboard` | Token | Dashboard con estadísticas de un curso |
| PUT | `/estudiante/:id` | Token | Edita los datos de un estudiante |
| DELETE | `/estudiante/:id` | Token | Elimina un estudiante |
| PUT | `/curso/:id` | Token | Edita un curso |
| DELETE | `/curso/:id` | admin | Elimina un curso (borra en cascada los casos/evaluaciones de sus alumnos — por eso solo admin) |

---

## 3. `/api/clinical` — Casos Clínicos

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/casos-clinicos` | Token | Worklist del estudiante (casos pendientes/resueltos) |
| GET | `/casos-admin` | Token | Lista completa de casos (panel del docente) |
| GET | `/ejercicios-progreso` | catedratico, admin | Estado de avance de los ejercicios del docente |
| PUT | `/ejercicios/:id/visibilidad` | catedratico, admin | Oculta o vuelve a mostrar un ejercicio a los estudiantes |
| DELETE | `/ejercicios/:id` | catedratico, admin | Elimina un ejercicio completo (todos sus casos, evaluaciones y datos asociados, en cascada) |
| GET | `/ejercicios/:id/bitacora` | catedratico, admin | Bitácora de qué estudiantes han avanzado en un ejercicio |
| GET | `/caso/:id` | Token | Detalle completo de un caso (uso administrativo) |
| GET | `/library/:patologia` | Token | Ficha ampliada de una patología, generada con IA (Gemini) |
| GET | `/banco-casos-ia/disponibilidad` | catedratico | Cuántos casos hay disponibles en el banco NIH por patología |
| POST | `/banco-casos-ia/componer` | catedratico | Arma automáticamente un ejercicio con casos del banco NIH |
| GET | `/metricas-modelo` | Token | Métricas reales del modelo de IA por patología (AUC, localización) |
| GET | `/estadisticas-estudiante` | Token | Estadísticas del estudiante (casos resueltos, precisión promedio) |
| GET | `/caso/:id/estudiante` | Token | Caso clínico filtrado y seguro para que el estudiante lo resuelva |
| PUT | `/caso/:id/tiempo` | estudiante | Guarda el tiempo acumulado de análisis (cronómetro persistente) |
| GET | `/caso/:id/retroalimentacion` | estudiante | Retroalimentación de un caso que el estudiante ya respondió |
| POST | `/respuestas` | estudiante | Registra la respuesta/diagnóstico del estudiante sobre un caso |
| POST | `/evaluaciones` | catedratico | Asigna casos del banco NIH a un curso (publicar ejercicio) |
| PUT | `/caso/:id` | catedratico, admin | Edita un caso clínico (título, motivo, nivel) |
| DELETE | `/caso/:id` | catedratico, admin | Elimina un caso clínico |

---

## 4. `/api/diagnostico` — Catálogo de Patologías

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/catalogos` | Público | Catálogo de patologías |
| PUT | `/patologia/:id` | catedratico, admin | Edita una patología del catálogo |
| DELETE | `/patologia/:id` | catedratico, admin | Elimina una patología del catálogo |

---

## 5. `/api/ia` — Motor de Inteligencia Artificial

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| POST | `/inferencia` | Token | Ejecuta el modelo de IA sobre una radiografía y registra el resultado |

---

## 6. `/api/extra` — Notificaciones y Comentarios

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/notificaciones` | Token | Lista las notificaciones del usuario autenticado |
| PUT | `/notificaciones/leidas` | Token | Marca todas las notificaciones como leídas |
| PUT | `/notificaciones/:id_notificacion/leida` | Token | Marca una notificación puntual como leída |
| POST | `/comentarios` | Token | El docente deja un comentario sobre la respuesta de un estudiante |
| GET | `/comentarios/evaluacion/:id_evaluacion` | Token | Lista los comentarios de una evaluación |

---

## 7. `/api/audit` — Auditoría (Timeline)

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/logs` | admin | Timeline completo de acciones realizadas en el sistema (incluye login/logout, con IP en el texto del evento) |

---

## 8. `/api/modelo` — Ficha del Modelo de IA

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/ficha` | catedratico, admin | Estadísticas y gráficas del modelo de IA (AUC, matriz de confusión, etc.) |

---

## 9. `/api/aprendizaje` — Módulo de Aprendizaje

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/resumen` | estudiante | Resumen del progreso del estudiante por patología |
| GET | `/leccion/:clase` | estudiante | Contenido de la lección activa de una patología |
| POST | `/leccion/:clase/paso` | estudiante | Marca la lección o el comparador como vistos (guarda progreso) |
| POST | `/reiniciar/:clase` | estudiante | Reinicia el progreso del estudiante en una patología |
| GET | `/comparador` | estudiante | Trae un caso de comparación (normal vs. patológico) |
| GET | `/sesion/:clase` | estudiante | Arma una sesión de práctica guiada para una patología |
| POST | `/responder` | estudiante | Registra la respuesta del estudiante en la sesión guiada o en el repaso |
| GET | `/repaso` | estudiante | Trae las tarjetas de repaso espaciado pendientes (algoritmo FSRS) |
| GET | `/mis-errores` | estudiante | Matriz de confusión personal (en qué patologías se equivoca más) |
| GET | `/admin/lecciones` | catedratico, admin | Lista las lecciones actualmente activas (una por patología) |
| PUT | `/admin/lecciones/:clase` | catedratico, admin | Edita manualmente el contenido de una lección |
| POST | `/admin/lecciones/generar` | catedratico, admin | Genera un lote nuevo de 8 lecciones con IA (Gemini) |
| GET | `/admin/lecciones/lotes` | catedratico, admin | Lista todas las "fichas" (lotes) de lecciones generadas |
| GET | `/admin/lecciones/lotes/:id/versiones` | catedratico, admin | Lista las versiones de lección dentro de un lote |
| POST | `/admin/lecciones/lotes/:id/publicar` | catedratico, admin | Publica un lote completo (lo activa para los estudiantes) |
| POST | `/admin/lecciones/lotes/:id/completar` | catedratico, admin | Completa con IA las patologías que le faltan a un lote incompleto |
| DELETE | `/admin/lecciones/lotes/:id` | catedratico, admin | Elimina una ficha/lote (si ninguna de sus versiones está activa) |
| GET | `/admin/explicaciones` | catedratico, admin | Lista explicaciones de error generadas, pendientes de revisión |
| PUT | `/admin/explicaciones/:id` | catedratico, admin | Aprueba o rechaza una explicación de error |

---

## 10. `/api/users` — Gestión de Usuarios (CRUD)

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/` | admin | Lista todos los usuarios del sistema |
| PUT | `/:id` | admin | Edita un usuario |
| DELETE | `/:id` | admin | Elimina un usuario |

---

## 11. `/api/admin` — Panel de Administrador

| Método | Ruta | Auth | Para qué sirve |
|---|---|---|---|
| GET | `/resumen-global` | admin | KPIs globales del sistema (totales de usuarios, cursos, casos, evaluaciones) |

---

## Resumen por tipo de operación (verbo HTTP)

| Verbo | Para qué se usa en este proyecto | Cuántos endpoints |
|---|---|---|
| **GET** | Consultar/leer datos: listados, detalles, dashboards, catálogos, contenido de lecciones, descargas de PDF | 44 |
| **POST** | Crear datos nuevos o ejecutar una acción puntual: registro, login, crear curso, responder un caso, generar contenido con IA, ejecutar inferencia | 20 |
| **PUT** | Actualizar un recurso existente: editar estudiante/curso/caso/patología/usuario/lección, marcar notificación leída, guardar tiempo de progreso, cambiar visibilidad | 11 |
| **DELETE** | Eliminar un recurso: estudiante, curso, caso, ejercicio completo, patología, usuario, lote de lecciones | 7 |

**Total: 82 endpoints.** *(No hay ningún endpoint `PATCH` en el proyecto; las actualizaciones parciales también usan `PUT`.)*

## Funcionalidades principales cubiertas por el API

- **Autenticación y cuentas:** registro (docente/estudiante/admin), login con JWT, auto-registro de estudiante por código de docente, cambio de contraseña inicial.
- **Gestión académica:** cursos, secciones, asignación de estudiantes, informes PDF de calificaciones, dashboards de rendimiento.
- **Casos clínicos:** edición de casos, composición automática de ejercicios desde el banco de imágenes NIH (3,265+ casos).
- **Resolución de casos (estudiante):** worklist, resolución de casos con cronómetro persistente, retroalimentación, notificaciones de progreso al docente.
- **Inteligencia artificial:** inferencia sobre radiografías, generación de contenido educativo (lecciones, fichas de patología) con Gemini.
- **Aprendizaje dirigido:** lecciones por patología, sesiones guiadas, repaso espaciado (FSRS), matriz de errores personal.
- **Supervisión docente/administrativa:** revisión y publicación de lecciones generadas por IA, comentarios sobre respuestas de estudiantes, métricas del modelo, auditoría de acciones (incluye login/logout con IP), CRUD de usuarios.
- **Notificaciones:** aviso de eventos (ejercicio publicado/eliminado, comentario nuevo, estudiante inscrito, progreso completado) con historial permanente en base de datos.

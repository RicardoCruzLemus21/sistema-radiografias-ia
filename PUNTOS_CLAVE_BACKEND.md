# Puntos clave del backend — guion para video (3 min)

Guía rápida con los archivos ya abiertos en VS Code, en el orden en que conviene explicarlos.

## 1. Arquitectura general (30 seg)

Backend en **Node.js + Express**, arquitectura de 3 capas:

```
Rutas (routes)  →  Controladores (controllers)  →  Servicios (services)  →  Stored Procedures (MySQL)
```

- **Punto de entrada:** [`server.js`](plataforma-radia-ia-backend/server.js) — levanta Express, monta todos los módulos de rutas (`/api/auth`, `/api/academico`, `/api/clinico`, `/api/ia`, etc.).
- **Regla de oro del proyecto:** ningún controlador ni servicio escribe SQL dinámico a mano. Toda la lógica de acceso a datos vive en **stored procedures** de MySQL; el código Node solo hace `pool.query('CALL sp_...')`. Esto facilita auditoría y evita inyección SQL.

## 2. Config — conexión a la base de datos (20 seg)

[`src/config/database.js`](plataforma-radia-ia-backend/src/config/database.js)

- Crea un **pool de conexiones** con `mysql2/promise`.
- Variables de entorno (`.env`): host, puerto, usuario, contraseña, nombre de esquema — así el mismo código corre en local (XAMPP/MariaDB) y en producción (Railway/MySQL 8) sin cambiar una línea.
- Detalle interesante para mencionar: se fuerza el `charset utf8mb4_unicode_ci` porque MySQL 8 negocia por defecto una collation distinta a la de MariaDB, y eso rompía las comparaciones dentro de los procedimientos.

## 3. Rutas → Controlador → Servicio (ejemplo real) (40 seg)

Flujo completo de una petición, usando el módulo clínico:

1. [`src/routes/clinicalRoutes.js`](plataforma-radia-ia-backend/src/routes/clinicalRoutes.js) — define el endpoint y qué middleware de rol lo protege (`verificarRol`).
2. [`src/controllers/clinicalController.js`](plataforma-radia-ia-backend/src/controllers/clinicalController.js) — recibe el request/response HTTP, valida parámetros básicos y llama al servicio.
3. [`src/services/clinicalService.js`](plataforma-radia-ia-backend/src/services/clinicalService.js) — contiene la lógica de negocio real.
4. [`src/middlewares/authMiddleware.js`](plataforma-radia-ia-backend/src/middlewares/authMiddleware.js) — valida el JWT y el rol del usuario (`catedratico`, `estudiante`, `admin`) antes de dejar pasar la petición.

## 4. Selección aleatoria de patologías (el punto fuerte a mostrar) (40 seg)

Función `componerEjercicio` en [`clinicalService.js:146`](plataforma-radia-ia-backend/src/services/clinicalService.js#L146) — se ejecuta cuando el docente crea un ejercicio.

Idea a explicar en el video:
- El docente elige **qué patologías objetivo** quiere evaluar y qué tan difícil debe ser el ejercicio.
- El servicio calcula una **mezcla de casos**: una parte son casos "diana" (las patologías elegidas), una parte son radiografías normales, y el resto son "distractores" (patologías parecidas que pueden confundirse con la diana — ver `obtenerDistractores()`).
- Para cada grupo, se cuenta cuántos casos hay disponibles en el banco (excluyendo los que el estudiante ya resolvió) y se calcula un **offset aleatorio** (`Math.random()`) dentro del rango disponible — así cada estudiante recibe una selección distinta aunque el docente configure el mismo ejercicio para todo el curso.
- Todo el filtrado (patología, nivel de dificultad, casos ya usados) se resuelve en los stored procedures `sp_contar_casos_banco_nih` y `sp_listar_casos_banco_nih`, no en el código Node.

## 5. Motor de Inteligencia Artificial (30 seg)

[`src/services/iaService.js:45`](plataforma-radia-ia-backend/src/services/iaService.js#L45)

- Se carga en memoria un modelo **ResNet50** entrenado para clasificar 8 categorías de hallazgos en radiografías de tórax (Atelectasia, Cardiomegalia, Derrame Pleural, Infiltración, Neumonía, Neumotórax, Nódulos, Normal).
- El modelo se entrenó en **Google Colab** y se exportó a formato **TensorFlow.js** (`model.json` + los archivos `.bin` de pesos, visibles en [`ml_models/model.json`](plataforma-radia-ia-backend/ml_models/model.json)).
- El backend lo carga una sola vez (`cargarModeloIA`, patrón singleton) con `tf.loadLayersModel`, y lo usa para comparar el diagnóstico del estudiante contra la predicción de la IA.

## 6. Cierre sugerido (20 seg)

"El backend sigue una arquitectura de 3 capas con Express, delega toda la lógica de datos a stored procedures de MySQL por seguridad y trazabilidad, y además integra un modelo de IA (ResNet50, entrenado en Google Colab) para apoyar el diagnóstico de los estudiantes."

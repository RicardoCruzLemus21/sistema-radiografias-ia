# Puntos clave del frontend — guion para video (3 min)

Guía con los archivos ya abiertos en VS Code, en el orden en que conviene explicarlos. Complementa a `PUNTOS_CLAVE_BACKEND.md`.

## 1. Arquitectura general (20 seg)

**Angular 21**, standalone components (sin NgModules), zoneless (`provideZonelessChangeDetection`).

[`app.config.ts`](plataforma-radia-ia-frontend/src/app/app.config.ts) — arranque de la aplicación: aquí se registran el router, el cliente HTTP y el interceptor global. Es el "config" equivalente del backend.

## 2. Rutas y protección por rol (30 seg)

[`app.routes.ts`](plataforma-radia-ia-frontend/src/app/app.routes.ts) — mapa de páginas de la app. Cada ruta protegida lleva dos *guards* encadenados:

- [`guards/auth.guard.ts`](plataforma-radia-ia-frontend/src/app/guards/auth.guard.ts) — ¿hay sesión (JWT) válida? Si no, redirige al login.
- [`guards/role.guard.ts`](plataforma-radia-ia-frontend/src/app/guards/role.guard.ts) — ¿el rol del usuario (admin / catedrático / estudiante) tiene permiso para esa ruta? Si no, redirige a su propio dashboard.

Esto evita que, por ejemplo, un estudiante pueda navegar manualmente a la URL de gestión de usuarios.

## 3. Interceptor HTTP global (20 seg)

[`interceptors/error.interceptor.ts`](plataforma-radia-ia-frontend/src/app/interceptors/error.interceptor.ts) — intercepta **todas** las peticiones HTTP salientes:

- Adjunta el token JWT a cada request.
- Si el backend responde 401 (token vencido/invalido), cierra la sesión y manda al login automáticamente, sin tener que repetir esa lógica en cada componente.

## 4. Servicios — la capa que habla con el backend (20 seg)

- [`services/auth.ts`](plataforma-radia-ia-frontend/src/app/services/auth.ts) — login, registro, guarda el JWT, decodifica el rol/id de usuario.
- [`services/clinical.ts`](plataforma-radia-ia-frontend/src/app/services/clinical.ts) — todas las llamadas relacionadas al flujo clínico: pedir un caso, enviar el diagnóstico de cada fase, pedir el Grad-CAM.

Mismo patrón en todos los módulos: el componente nunca llama `HttpClient` directo, siempre pasa por un servicio dedicado — así la URL base y el manejo de errores están en un solo lugar.

## 5. Caso a exponer en detalle: el visor de diagnóstico (flujo de 4 fases) (60-70 seg)

[`pages/visor-diagnostico/visor-diagnostico.ts`](plataforma-radia-ia-frontend/src/app/pages/visor-diagnostico/visor-diagnostico.ts) + su [`.html`](plataforma-radia-ia-frontend/src/app/pages/visor-diagnostico/visor-diagnostico.html)

Es la pantalla donde el estudiante resuelve un caso — el contraparte visual de `componerEjercicio` que se explicó en el backend. Tiene **4 fases** controladas por `faseActual`:

1. **Fase 1 — Diagnóstico ciego:** el estudiante ve la radiografía (sin ninguna pista), selecciona la(s) patología(s) que cree encontrar, dibuja un rectángulo sobre la región sospechosa, escribe una justificación clínica y mueve un slider de **nivel de confianza** (0-100). Al enviar (`enviarDiagnostico()`), se le pide confirmación porque **la respuesta se bloquea**: no se puede editar después.
2. **Fase 2:** se revela el diagnóstico real del caso (`aplicarVerdad`) para que el estudiante compare contra lo que respondió.
3. **Fase 3:** se muestra el **Grad-CAM** — un mapa de calor generado por el modelo de IA (ResNet50 explicado en el backend) que resalta en qué parte de la imagen se fijó la red neuronal para hacer su propia predicción. El estudiante compara su marca manual contra el mapa de calor de la IA.
4. **Fase 4:** retroalimentación final con los puntajes (`puntajesEstudiante`) — qué tan acertado fue el diagnóstico, la localización y la calibración de confianza (los ejes 1/2/3 que calcula `clinicalService.js` en el backend).

Vale la pena mostrar en vivo: seleccionar una patología, marcar la región con el mouse, mover el slider de confianza, y enviar — para que se vea el bloqueo de respuesta y el avance de fase.

## 6. Cierre sugerido (15 seg)

"El frontend está hecho en Angular con componentes standalone, protege sus rutas por sesión y por rol, centraliza las llamadas al backend en servicios, y su pieza más importante — el visor de diagnóstico — guía al estudiante por un flujo de 4 fases que conecta directamente con el modelo de IA y el sistema de puntuación del backend."

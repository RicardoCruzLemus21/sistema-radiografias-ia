import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { errorInterceptor } from './interceptors/error.interceptor';

// Punto de arranque de la app Angular (equivalente al server.js del backend).
// Aquí se registran, una sola vez para toda la aplicación:
//  - el router, con el mapa de rutas de app.routes.ts
//  - el cliente HTTP, con el interceptor global de errores enganchado
// provideZonelessChangeDetection(): esta versión de Angular ya no usa Zone.js
// para detectar cambios; la vista se actualiza de forma más explícita (p. ej.
// llamando a ChangeDetectorRef.detectChanges() en los componentes).
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor]))
  ]
};
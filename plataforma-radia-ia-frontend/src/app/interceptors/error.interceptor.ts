import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { AlertService } from '../services/alert.service';
import { SesionService } from '../services/sesion.service';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const alertService = inject(AlertService);
  const sesionService = inject(SesionService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Evitar que el interceptor salte en la pantalla de login cuando las credenciales son incorrectas (401 natural)
      if (req.url.includes('/api/auth/login')) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        // El servidor rechazó el token (vencido o inválido). Sin token guardado no había sesión que cerrar.
        if (authService.getToken()) sesionService.expirarSesion();
      } else if (error.status === 403) {
        // 403 = la sesión es válida pero el rol no tiene permiso: no se cierra la sesión.
        if (authService.getToken()) alertService.warning('Sin permisos', 'No tienes permisos para realizar esta acción.');
      } else if (error.status === 500) {
        // Error del servidor
        alertService.error('Error de Servidor', 'Ha ocurrido un error en el servidor. Por favor, intenta de nuevo más tarde.');
      } else if (error.status === 0) {
        // No hay conexión con el servidor
        alertService.error('Fallo de Conexión', 'No se puede conectar con el servidor. Verifica tu conexión a internet.');
      }
      return throwError(() => error);
    })
  );
};

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Evitar que el interceptor salte en la pantalla de login cuando las credenciales son incorrectas (401 natural)
      if (req.url.includes('/api/auth/login')) {
        return throwError(() => error);
      }

      if (error.status === 401 || error.status === 403) {
        // Sesión expirada o no autorizada
        authService.logout();
        alert('Tu sesión ha expirado o no tienes permisos para acceder a esta ruta.');
        router.navigate(['/login']);
      } else if (error.status === 500) {
        // Error del servidor
        alert('Ha ocurrido un error en el servidor. Por favor, intenta de nuevo más tarde.');
      } else if (error.status === 0) {
        // No hay conexión con el servidor
        alert('No se puede conectar con el servidor. Verifica tu conexión a internet.');
      }
      return throwError(() => error);
    })
  );
};

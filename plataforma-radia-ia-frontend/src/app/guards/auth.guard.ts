import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

// Guard de AUTENTICACIÓN (no de rol): solo comprueba que exista un token JWT
// guardado en la sesión del navegador. Se usa en la ruta padre "sistema" de
// app.routes.ts, así que se ejecuta antes de entrar a cualquier pantalla
// protegida. Si no hay token, nunca llega a cargar el componente: se corta
// aquí mismo y se redirige al login.
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getToken()) {
    return true;
  }

  // Redirigir al login si no hay token
  return router.createUrlTree(['/login']);
};

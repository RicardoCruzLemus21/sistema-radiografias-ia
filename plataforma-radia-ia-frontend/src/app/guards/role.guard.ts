import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRole = route.data['expectedRole'];

  if (expectedRole === 'admin' && authService.isAdmin()) {
    return true;
  }

  if (expectedRole === 'catedratico' && authService.isCatedratico()) {
    return true;
  }
  
  if (expectedRole === 'estudiante' && authService.isEstudiante()) {
    return true;
  }

  // Redirigir al dashboard correspondiente si no tiene permiso
  if (authService.isAdmin()) {
    return router.createUrlTree(['/sistema/dashboard-admin']);
  } else if (authService.isCatedratico()) {
    return router.createUrlTree(['/sistema/catedratico']);
  } else if (authService.isEstudiante()) {
    return router.createUrlTree(['/sistema/estudiante']);
  }

  return router.createUrlTree(['/login']);
};

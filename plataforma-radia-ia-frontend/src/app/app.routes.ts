import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { LayoutComponent } from './pages/layout/layout';
import { DashboardEstudiante } from './pages/dashboard-estudiante/dashboard-estudiante';
import { DashboardCatedratico } from './pages/dashboard-catedratico/dashboard-catedratico';
import { GestionCasosCatedratico } from './pages/gestion-casos/gestion-casos';
import { GestionEstudiantesCatedraticoComponent } from './pages/gestion-estudiantes-catedratico/gestion-estudiantes-catedratico';
import { VisorDiagnostico } from './pages/visor-diagnostico/visor-diagnostico';
import { RetroalimentacionIa } from './pages/retroalimentacion-ia/retroalimentacion-ia';
import { RendimientoEstudiante } from './pages/rendimiento-estudiante/rendimiento-estudiante';
import { BibliotecaPatologias } from './pages/biblioteca-patologias/biblioteca-patologias';
import { Notificaciones } from './pages/notificaciones/notificaciones';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'sistema', 
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'estudiante', component: DashboardEstudiante, canActivate: [roleGuard], data: { expectedRole: 'estudiante' } },
      { path: 'catedratico', component: DashboardCatedratico, canActivate: [roleGuard], data: { expectedRole: 'catedratico' } },
      { path: 'gestion-casos', component: GestionCasosCatedratico, canActivate: [roleGuard], data: { expectedRole: 'catedratico' } },
      { path: 'gestion-estudiantes', component: GestionEstudiantesCatedraticoComponent, canActivate: [roleGuard], data: { expectedRole: 'catedratico' } },
      { path: 'visor/:id', component: VisorDiagnostico, canActivate: [roleGuard], data: { expectedRole: 'estudiante' } }, 
      { path: 'resultado/:id', component: RetroalimentacionIa, canActivate: [roleGuard], data: { expectedRole: 'estudiante' } }, 
      { path: 'mi-rendimiento', component: RendimientoEstudiante, canActivate: [roleGuard], data: { expectedRole: 'estudiante' } },
      { path: 'biblioteca', component: BibliotecaPatologias, canActivate: [roleGuard], data: { expectedRole: 'estudiante' } },
      { path: 'notificaciones', component: Notificaciones },
      { path: '', redirectTo: 'estudiante', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
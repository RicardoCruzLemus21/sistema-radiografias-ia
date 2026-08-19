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
import { AuditoriaLogsComponent } from './pages/auditoria-logs/auditoria-logs';
import { GestionUsuariosComponent } from './pages/gestion-usuarios/gestion-usuarios';
import { RevisionEvaluacionesComponent } from './pages/revision-evaluaciones/revision-evaluaciones';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { DashboardAdminComponent } from './pages/dashboard-admin/dashboard-admin';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'sistema', 
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard-admin', component: DashboardAdminComponent, canActivate: [roleGuard], data: { expectedRole: 'admin' } },
      { path: 'estudiante', component: DashboardEstudiante, canActivate: [roleGuard], data: { expectedRole: 'estudiante' } },
      { path: 'catedratico', component: DashboardCatedratico, canActivate: [roleGuard], data: { expectedRole: 'catedratico' } },
      { path: 'gestion-casos', component: GestionCasosCatedratico, canActivate: [roleGuard], data: { expectedRole: 'catedratico' } },
      { path: 'gestion-estudiantes', component: GestionEstudiantesCatedraticoComponent, canActivate: [roleGuard], data: { expectedRole: 'catedratico' } },
      { path: 'gestion-admin-usuarios', component: GestionUsuariosComponent, canActivate: [roleGuard], data: { expectedRole: 'admin' } },
      { path: 'revision-evaluaciones', component: RevisionEvaluacionesComponent, canActivate: [roleGuard], data: { expectedRole: 'admin' } },
      { path: 'auditoria', component: AuditoriaLogsComponent, canActivate: [roleGuard], data: { expectedRole: 'admin' } },
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
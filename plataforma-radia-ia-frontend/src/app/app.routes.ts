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

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'sistema', 
    component: LayoutComponent,
    children: [
      { path: 'estudiante', component: DashboardEstudiante },
      { path: 'catedratico', component: DashboardCatedratico },
      { path: 'gestion-casos', component: GestionCasosCatedratico },
      { path: 'gestion-estudiantes', component: GestionEstudiantesCatedraticoComponent },
      { path: 'visor/:id', component: VisorDiagnostico }, 
      { path: 'resultado/:id', component: RetroalimentacionIa }, 
      { path: 'mi-rendimiento', component: RendimientoEstudiante },
      { path: 'biblioteca', component: BibliotecaPatologias },
      { path: 'notificaciones', component: Notificaciones },
      { path: '', redirectTo: 'estudiante', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
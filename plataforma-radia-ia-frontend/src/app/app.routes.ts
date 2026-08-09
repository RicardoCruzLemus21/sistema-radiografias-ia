import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { LayoutComponent } from './pages/layout/layout';
import { DashboardEstudiante } from './pages/dashboard-estudiante/dashboard-estudiante';
import { DashboardCatedratico } from './pages/dashboard-catedratico/dashboard-catedratico';
import { VisorDiagnostico } from './pages/visor-diagnostico/visor-diagnostico';
// 1. Importamos el nuevo componente
import { RetroalimentacionIa } from './pages/retroalimentacion-ia/retroalimentacion-ia';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'sistema', 
    component: LayoutComponent,
    children: [
      { path: 'estudiante', component: DashboardEstudiante },
      { path: 'catedratico', component: DashboardCatedratico },
      { path: 'visor/:id', component: VisorDiagnostico }, 
      // 2. Agregamos la ruta para ver el resultado de la IA
      { path: 'resultado/:id', component: RetroalimentacionIa }, 
      { path: '', redirectTo: 'estudiante', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
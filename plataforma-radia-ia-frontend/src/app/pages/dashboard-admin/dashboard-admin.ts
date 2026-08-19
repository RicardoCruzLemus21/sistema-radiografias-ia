import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container fade-in">
      <header class="dashboard-header">
        <div class="header-content">
          <h1>Panel de Administración</h1>
          <p>Visión global del sistema, roles y seguridad.</p>
        </div>
      </header>

      <div class="metrics-grid">
        <div class="metric-card glass-panel" routerLink="/sistema/gestion-admin-usuarios">
          <div class="metric-icon primary">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div class="metric-info">
            <h3>Control de Accesos</h3>
            <p>Gestionar usuarios y roles</p>
          </div>
        </div>

        <div class="metric-card glass-panel" routerLink="/sistema/revision-evaluaciones">
          <div class="metric-icon warning">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div class="metric-info">
            <h3>Auditoría Evaluaciones</h3>
            <p>Supervisar feedback global</p>
          </div>
        </div>

        <div class="metric-card glass-panel" routerLink="/sistema/auditoria">
          <div class="metric-icon success">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M2 12h4l2-9 5 18 3-9h6"></path></svg>
          </div>
          <div class="metric-info">
            <h3>Seguridad y Logs</h3>
            <p>Monitoreo del sistema</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 30px; display: flex; flex-direction: column; gap: 30px; }
    .header-content h1 { color: #fff; margin: 0 0 5px 0; font-size: 28px; }
    .header-content p { color: var(--text-muted); margin: 0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; }
    .metric-card { 
      padding: 25px; border-radius: 12px; display: flex; align-items: center; gap: 20px; 
      transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
    }
    .metric-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.3); border-color: var(--accent-cyan); }
    .metric-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
    .metric-icon.primary { background: linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,119,255,0.2)); color: var(--accent-cyan); }
    .metric-icon.warning { background: linear-gradient(135deg, rgba(255,171,0,0.2), rgba(255,100,0,0.2)); color: var(--warning-yellow); }
    .metric-icon.success { background: linear-gradient(135deg, rgba(0,230,118,0.2), rgba(0,180,100,0.2)); color: var(--success-green); }
    .metric-info h3 { margin: 0 0 5px 0; color: #fff; font-size: 18px; }
    .metric-info p { margin: 0; color: var(--text-muted); font-size: 14px; }
  `]
})
export class DashboardAdminComponent implements OnInit {
  constructor() {}
  ngOnInit(): void {}
}

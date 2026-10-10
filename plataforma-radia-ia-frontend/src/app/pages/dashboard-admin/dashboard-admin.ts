import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin';
import { AuditService } from '../../services/audit.service';

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

      <!-- Aviso: si los KPIs no cargaron, se dice explícitamente en vez de mostrar todo en 0 -->
      <div class="banner-advertencia" *ngIf="errorResumen">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span>{{ errorResumen }}</span>
        <button type="button" (click)="cargarResumen()">Reintentar</button>
      </div>

      <!-- KPIs globales del sistema -->
      <div class="seccion" *ngIf="!errorResumen">
      <h2 class="seccion-titulo">Resumen general</h2>
      <div class="metrics-grid kpi-grid">
        <div class="metric-card glass-panel">
          <div class="metric-icon primary">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div class="metric-info">
            <h3>{{ cargandoResumen ? '—' : resumen.total_usuarios }}</h3>
            <p>Usuarios registrados</p>
            <small *ngIf="!cargandoResumen">{{ resumen.total_docentes }} docentes · {{ resumen.total_estudiantes }} estudiantes</small>
          </div>
        </div>


        <div class="metric-card glass-panel">
          <div class="metric-icon warning">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <div class="metric-info">
            <h3>{{ cargandoResumen ? '—' : resumen.total_cursos }}</h3>
            <p>Cursos activos</p>
          </div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-icon success">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div class="metric-info">
            <h3>{{ cargandoResumen ? '—' : resumen.total_casos }}</h3>
            <p>Casos en el banco</p>
          </div>
        </div>

        <div class="metric-card glass-panel">
          <div class="metric-icon primary">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          </div>
          <div class="metric-info">
            <h3>{{ cargandoResumen ? '—' : resumen.total_evaluaciones }}</h3>
            <p>Evaluaciones realizadas</p>
          </div>
        </div>
      </div>
      </div>

      <div class="seccion">
      <h2 class="seccion-titulo">Accesos rápidos</h2>
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

      <!-- Actividad reciente del sistema -->
      <section class="actividad-section">
        <div class="actividad-cabecera">
          <h2>Actividad reciente</h2>
          <a routerLink="/sistema/auditoria" class="btn-ver-todo">
            Ver todo
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
        </div>

        <div class="glass-panel actividad-panel">
          <div class="cargando-actividad" *ngIf="cargandoActividad">Cargando actividad...</div>
          <div class="vacio-actividad" *ngIf="!cargandoActividad && actividad.length === 0">Todavía no hay actividad registrada.</div>

          <div class="actividad-item" *ngFor="let a of actividad">
            <div class="actividad-icono" [ngClass]="categoriaDe(a.accion)">
              <svg *ngIf="categoriaDe(a.accion) === 'danger'" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <svg *ngIf="categoriaDe(a.accion) === 'success'" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              <svg *ngIf="categoriaDe(a.accion) === 'primary'" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9"></polyline></svg>
              <svg *ngIf="categoriaDe(a.accion) === 'neutral'" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </div>
            <div class="actividad-texto">
              <p>{{ a.detalle }}</p>
              <span class="actividad-meta">{{ a.nombre_completo }} · {{ tiempoRelativo(a.fecha_accion) }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 30px; display: flex; flex-direction: column; gap: 30px; }
    .header-content h1 { color: var(--text-main); margin: 0 0 5px 0; font-size: 28px; }
    .header-content p { color: var(--text-muted); margin: 0; }

    /* Cada bloque (KPIs / accesos rápidos) lleva su propio título, con menos aire entre el
       título y sus tarjetas que el que separa un bloque completo del siguiente. */
    .seccion { display: flex; flex-direction: column; gap: 14px; }
    .seccion-titulo { margin: 0; color: var(--text-muted); font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }

    /* Los KPIs son exactamente 4: una fila fija se ve más ordenada que "auto-fit" (que a veces
       deja el último huérfano en su propia fila con espacio vacío al lado). */
    .metrics-grid.kpi-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
    @media (max-width: 1100px) { .metrics-grid.kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .metrics-grid.kpi-grid { grid-template-columns: 1fr; } }

    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; }
    .metric-card {
      padding: 25px; border-radius: 12px; display: flex; align-items: center; gap: 20px;
      transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
    }
    .kpi-grid .metric-card { cursor: default; }
    .kpi-grid .metric-card:hover { transform: none; box-shadow: none; border-color: var(--border-color); }
    .metric-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.3); border-color: var(--accent-cyan); }
    .metric-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
    .metric-icon.primary { background: linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,119,255,0.2)); color: var(--accent-cyan); }
    .metric-icon.warning { background: linear-gradient(135deg, rgba(255,171,0,0.2), rgba(255,100,0,0.2)); color: var(--warning-yellow); }
    .metric-icon.success { background: linear-gradient(135deg, rgba(0,230,118,0.2), rgba(0,180,100,0.2)); color: var(--success-green); }
    .metric-info { min-width: 0; }
    .metric-info h3 { margin: 0 0 5px 0; color: var(--text-main); font-size: 18px; }
    .metric-info p { margin: 0; color: var(--text-muted); font-size: 14px; }
    .metric-info small { display: block; margin-top: 4px; color: var(--text-muted); font-size: 11px; }

    /* Aviso de fallo al cargar datos */
    .banner-advertencia {
      display: flex; align-items: center; gap: 12px; padding: 14px 18px;
      background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px; color: var(--warning-yellow); font-size: 13px; font-weight: 600;
    }
    .banner-advertencia svg { flex-shrink: 0; }
    .banner-advertencia span { flex: 1; color: var(--text-main); font-weight: 500; }
    .banner-advertencia button {
      flex-shrink: 0; background: transparent; border: 1px solid var(--warning-yellow); color: var(--warning-yellow);
      padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
    }
    .banner-advertencia button:hover { background: rgba(245, 158, 11, 0.15); }

    /* Actividad reciente */
    .actividad-section { display: flex; flex-direction: column; gap: 14px; }
    .actividad-cabecera { display: flex; align-items: center; justify-content: space-between; }
    .actividad-cabecera h2 { margin: 0; color: var(--text-main); font-size: 16px; }
    .btn-ver-todo {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 999px;
      background: var(--input-bg); border: 1px solid var(--border-color);
      color: var(--accent-cyan); font-size: 12.5px; font-weight: 700;
      text-decoration: none; cursor: pointer; transition: all 0.2s ease;
    }
    .btn-ver-todo svg { transition: transform 0.2s ease; }
    .btn-ver-todo:hover { background: var(--table-row-hover); border-color: var(--accent-cyan); }
    .btn-ver-todo:hover svg { transform: translateX(2px); }
    .actividad-panel { padding: 8px 20px; }
    .cargando-actividad, .vacio-actividad { padding: 20px 0; color: var(--text-muted); font-size: 13px; text-align: center; }
    .actividad-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border-color); }
    .actividad-item:last-child { border-bottom: none; }
    .actividad-icono { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .actividad-icono.danger { background: rgba(239, 68, 68, 0.12); color: var(--error-red); }
    .actividad-icono.success { background: rgba(16, 185, 129, 0.12); color: var(--success-green); }
    .actividad-icono.primary { background: var(--input-bg); color: var(--accent-cyan); }
    .actividad-icono.neutral { background: var(--input-bg); color: var(--text-muted); }
    .actividad-texto { min-width: 0; }
    .actividad-texto p { margin: 0; color: var(--text-main); font-size: 13.5px; line-height: 1.4; }
    .actividad-meta { display: block; margin-top: 4px; color: var(--text-muted); font-size: 12px; }
  `]
})
export class DashboardAdminComponent implements OnInit {
  resumen: any = { total_usuarios: 0, total_docentes: 0, total_estudiantes: 0, total_cursos: 0, total_casos: 0, total_evaluaciones: 0 };
  cargandoResumen = true;
  errorResumen: string | null = null;

  actividad: any[] = [];
  cargandoActividad = true;

  constructor(
    private adminService: AdminService,
    private auditService: AuditService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarResumen();
    this.cargarActividad();
  }

  cargarResumen(): void {
    this.cargandoResumen = true;
    this.errorResumen = null;
    this.adminService.getResumenGlobal().subscribe({
      next: (resp: any) => {
        this.resumen = resp.data;
        this.cargandoResumen = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar el resumen global:', err);
        this.errorResumen = 'No se pudieron cargar los indicadores del sistema.';
        this.cargandoResumen = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarActividad(): void {
    this.cargandoActividad = true;
    this.auditService.getLogs().subscribe({
      next: (resp: any) => {
        this.actividad = (resp.data || []).slice(0, 6);
        this.cargandoActividad = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar la actividad reciente:', err);
        this.actividad = [];
        this.cargandoActividad = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Icono/color según el tipo de acción (por prefijo, para no depender de una lista cerrada)
  categoriaDe(accion: string): 'danger' | 'success' | 'primary' | 'neutral' {
    if (!accion) return 'neutral';
    if (accion.startsWith('ELIMINAR')) return 'danger';
    if (accion.startsWith('REGISTRO')) return 'success';
    if (accion.startsWith('EVALUACION')) return 'primary';
    return 'neutral';
  }

  tiempoRelativo(fechaIso: string): string {
    const ahora = Date.now();
    const fecha = new Date(fechaIso).getTime();
    const segundos = Math.floor((ahora - fecha) / 1000);
    if (segundos < 60) return 'hace un momento';
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias < 30) return `hace ${dias} día${dias === 1 ? '' : 's'}`;
    return new Date(fechaIso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

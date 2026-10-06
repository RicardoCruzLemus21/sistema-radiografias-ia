import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClinicalService } from '../../services/clinical'; 
import { AuthService } from '../../services/auth';
import { CampanaNotificaciones } from '../../components/campana-notificaciones/campana-notificaciones';

@Component({
  selector: 'app-dashboard-estudiante',
  standalone: true,
  imports: [CommonModule, FormsModule, CampanaNotificaciones],
  templateUrl: './dashboard-estudiante.html',
  styleUrl: './dashboard-estudiante.css'
})
export class DashboardEstudiante implements OnInit {
  
  estadisticas = {
    casosResueltos: 0,
    precisionPromedio: 0,
    casosPendientes: 0
  };

  worklist: any[] = [];

  // Si el backend falla, se avisa en vez de dejar el panel vacío sin explicación (indistinguible
  // de "de verdad no tienes nada pendiente").
  errorEstadisticas: string | null = null;
  errorWorklist: string | null = null;

  // La worklist se agrupa por ejercicio (carpeta desplegable con sus casos)
  gruposAbiertos = new Set<number>();

  // Filtro por estado del ejercicio: pendiente = aún le faltan casos; completado = ya resolviste todos
  filtroEjercicios: 'TODOS' | 'COMPLETADO' | 'PENDIENTE' | 'SIN_INICIAR' = 'TODOS';
  busquedaEjercicios: string = '';

  get todosLosGrupos(): { clave: number; nombre: string; casos: any[]; completados: number; pendientes: number; promedio: number | null }[] {
    const mapa = new Map<number, any>();
    for (const caso of this.worklist) {
      const clave = caso.id_ejercicio || 0; // 0 = casos sin ejercicio
      if (!mapa.has(clave)) mapa.set(clave, { clave, nombre: caso.ejercicio || 'Casos individuales', casos: [], completados: 0, pendientes: 0, promedio: null });
      const g = mapa.get(clave);
      g.casos.push(caso);
      if (caso.estado === 'Completado') g.completados++; else g.pendientes++;
    }
    // Resultado del ejercicio: promedio de los casos ya resueltos
    for (const g of mapa.values()) {
      const puntajes = g.casos.filter((c: any) => c.estado === 'Completado' && c.puntaje !== null && c.puntaje !== undefined).map((c: any) => Number(c.puntaje));
      g.promedio = puntajes.length ? Math.round(puntajes.reduce((a: number, b: number) => a + b, 0) / puntajes.length) : null;
    }
    return [...mapa.values()];
  }

  claseResultado(puntaje: number | string | null | undefined): string {
    const p = Number(puntaje);
    return p >= 80 ? 'res-alto' : p >= 50 ? 'res-medio' : 'res-bajo';
  }

  // Mismos estados que en el panel del docente:
  // completado = resolvió todos los casos; sin_iniciar = no ha resuelto ninguno; pendiente = en medio
  estadoGrupo(g: { completados: number; pendientes: number }): 'completado' | 'pendiente' | 'sin_iniciar' {
    if (g.completados === 0) return 'sin_iniciar';
    return g.pendientes === 0 ? 'completado' : 'pendiente';
  }

  get grupos() {
    const q = this.busquedaEjercicios.toLowerCase().trim();
    return this.todosLosGrupos.filter(g =>
      (this.filtroEjercicios === 'TODOS' || this.estadoGrupo(g) === this.filtroEjercicios.toLowerCase()) &&
      (!q || (g.nombre || '').toLowerCase().includes(q))
    );
  }

  contarEstado(estado: 'TODOS' | 'COMPLETADO' | 'PENDIENTE' | 'SIN_INICIAR'): number {
    if (estado === 'TODOS') return this.todosLosGrupos.length;
    return this.todosLosGrupos.filter(g => this.estadoGrupo(g) === estado.toLowerCase()).length;
  }

  get ejerciciosPendientes(): number {
    return this.contarEstado('PENDIENTE');
  }

  get ejerciciosCompletados(): number {
    return this.contarEstado('COMPLETADO');
  }

  get totalPendientes(): number {
    return this.worklist.filter(c => c.estado !== 'Completado').length;
  }

  alternarGrupo(clave: number): void {
    if (this.gruposAbiertos.has(clave)) this.gruposAbiertos.delete(clave);
    else this.gruposAbiertos.add(clave);
  }
  cargando: boolean = false;
  
  constructor(
    private router: Router, 
    private clinicalService: ClinicalService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarWorklistReal();
    this.cargarEstadisticasReales();
  }

  cargarEstadisticasReales() {
    this.errorEstadisticas = null;
    this.clinicalService.getEstadisticasEstudiante().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.estadisticas.casosResueltos = res.data.casos_resueltos || 0;
          this.estadisticas.precisionPromedio = res.data.precision_promedio || 0;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al cargar estadísticas del estudiante:', err);
        this.errorEstadisticas = 'No se pudieron cargar tus estadísticas. Los números de arriba pueden no ser correctos.';
        this.cdr.detectChanges();
      }
    });
  }

  cargarWorklistReal() {
    this.cargando = true;
    this.errorWorklist = null;
    this.clinicalService.getWorklistEstudiante().subscribe({
      next: (datosBackend: any[]) => {
        if (Array.isArray(datosBackend) && datosBackend.length > 0) {
          this.worklist = datosBackend;
          this.estadisticas.casosPendientes = this.totalPendientes;
        } else {
          this.cargarCasosSimulados();
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Backend de worklist no disponible:', err);
        this.cargarCasosSimulados();
        this.errorWorklist = 'No se pudo cargar tu worklist. Esto NO significa que estés al día: intenta recargar la página.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarCasosSimulados() {
    // FUNCIÓN ELIMINADA: SISTEMA DINÁMICO
    this.worklist = [];
    this.estadisticas.casosPendientes = 0;
  }

  evaluarCaso(idCaso: string | number) {
    this.router.navigate(['/sistema/visor', idCaso]);
  }

  // Un caso ya respondido no se vuelve a evaluar: el visor abre en modo revisión (respuesta, verdad, IA y resultado)
  verRetroalimentacion(idCaso: string | number) {
    this.router.navigate(['/sistema/visor', idCaso]);
  }
}
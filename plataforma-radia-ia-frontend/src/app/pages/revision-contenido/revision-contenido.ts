import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { AprendizajeService } from '../../services/aprendizaje';
import { AlertService } from '../../services/alert.service';
import { nombreClase, colorClase } from '../../utils/clases';

type FiltroEstado = 'pendiente' | 'aprobada' | 'rechazada' | 'todas';
type FiltroOrigen = 'todos' | 'ia' | 'plantilla';

// Pantalla del docente: revisar, editar y aprobar lo que ven los estudiantes en el módulo de aprendizaje
@Component({
  selector: 'app-revision-contenido',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revision-contenido.html',
  styleUrls: ['../aprender/aprender-compartido.css', './revision-contenido.css']
})
export class RevisionContenido implements OnInit, OnDestroy {
  pestana: 'explicaciones' | 'lecciones' = 'explicaciones';
  cargando = true;
  error = '';

  // Explicaciones
  todas: any[] = [];
  paresSinIa = 0;
  filtro: FiltroEstado = 'pendiente';
  filtroOrigen: FiltroOrigen = 'todos';
  editandoId: number | null = null;
  formulario = { resumen: '', pasos: '', pista: '', proxima_vez: '' };
  guardando = false;
  procesandoId: number | null = null;

  // Generación con IA
  generando = false;
  private detener = false;
  progreso = { generadas: 0, errores: 0 };
  avisoGeneracion = '';

  // Lecciones
  lecciones: any[] = [];
  leccionEditando: string | null = null;
  formLeccion: any = null;

  readonly nombreClase = nombreClase;
  readonly colorClase = colorClase;

  constructor(private aprendizajeService: AprendizajeService, private alertService: AlertService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.detener = true; // si se sale de la pantalla, se corta la generación
  }

  cargar(): Promise<void> {
    this.cargando = true;
    return new Promise((resolver) => {
      forkJoin({ e: this.aprendizajeService.listarExplicaciones(), l: this.aprendizajeService.listarLecciones() }).subscribe({
        next: ({ e, l }) => {
          this.todas = e.data.explicaciones;
          this.paresSinIa = e.data.pares_sin_ia;
          this.lecciones = l.data;
          this.cargando = false;
          this.cdr.detectChanges();
          resolver();
        },
        error: () => {
          this.cargando = false;
          this.error = 'No se pudo cargar el contenido. Intenta de nuevo en unos segundos.';
          this.cdr.detectChanges();
          resolver();
        }
      });
    });
  }

  // ===== Explicaciones =====
  contar(estado: FiltroEstado): number {
    return estado === 'todas' ? this.todas.length : this.todas.filter(e => e.estado === estado).length;
  }

  get visibles(): any[] {
    return this.todas.filter(e =>
      (this.filtro === 'todas' || e.estado === this.filtro) && (this.filtroOrigen === 'todos' || e.origen === this.filtroOrigen));
  }

  get pendientesIa(): number {
    return this.todas.filter(e => e.origen === 'ia' && e.estado === 'pendiente').length;
  }

  iniciarEdicion(e: any): void {
    this.editandoId = e.id_explicacion;
    this.formulario = {
      resumen: e.contenido.resumen || '',
      pasos: (e.contenido.como_distinguir || []).join('\n'),
      pista: e.contenido.pista || '',
      proxima_vez: e.contenido.proxima_vez || ''
    };
  }

  cancelarEdicion(): void {
    this.editandoId = null;
  }

  private actualizarLocal(id: number, cambios: any): void {
    this.todas = this.todas.map(e => (e.id_explicacion === id ? { ...e, ...cambios } : e));
  }

  guardarEdicion(e: any): void {
    const contenido = {
      resumen: this.formulario.resumen,
      como_distinguir: this.formulario.pasos.split('\n').map(p => p.trim()).filter(Boolean),
      pista: this.formulario.pista,
      proxima_vez: this.formulario.proxima_vez
    };
    this.guardando = true;
    this.aprendizajeService.revisarExplicacion(e.id_explicacion, contenido, 'aprobada').subscribe({
      next: (resp) => {
        this.guardando = false;
        this.actualizarLocal(e.id_explicacion, { contenido: resp.data.contenido, estado: 'aprobada' });
        this.editandoId = null;
        this.alertService.success('Explicación guardada', 'Se aprobó con tus cambios y los estudiantes ya la ven.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.guardando = false;
        this.alertService.warning('Revisa el texto', err.error?.message || 'No se pudo guardar.');
        this.cdr.detectChanges();
      }
    });
  }

  cambiarEstado(e: any, estado: 'aprobada' | 'rechazada' | 'pendiente'): void {
    this.procesandoId = e.id_explicacion;
    this.aprendizajeService.revisarExplicacion(e.id_explicacion, e.contenido, estado).subscribe({
      next: () => {
        this.procesandoId = null;
        this.actualizarLocal(e.id_explicacion, { estado });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.procesandoId = null;
        this.alertService.error('No se pudo actualizar', err.error?.message || 'Intenta de nuevo.');
        this.cdr.detectChanges();
      }
    });
  }

  regenerar(e: any): void {
    this.procesandoId = e.id_explicacion;
    this.aprendizajeService.regenerarExplicacion(e.id_explicacion).subscribe({
      next: (resp) => {
        this.procesandoId = null;
        this.actualizarLocal(e.id_explicacion, { contenido: resp.data.contenido, estado: 'pendiente' });
        this.alertService.success('Texto regenerado', 'Quedó pendiente de tu revisión.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.procesandoId = null;
        this.alertService.error('No se pudo regenerar', err.error?.message || 'Intenta de nuevo.');
        this.cdr.detectChanges();
      }
    });
  }

  // Genera lotes pequeños hasta completar los pares que faltan (el ritmo lo marca el límite de Gemini)
  async generarFaltantes(): Promise<void> {
    this.generando = true;
    this.detener = false;
    this.progreso = { generadas: 0, errores: 0 };
    this.avisoGeneracion = '';
    let sinProgreso = 0;
    try {
      while (!this.detener) {
        const resp: any = await firstValueFrom(this.aprendizajeService.generarExplicaciones(3));
        const d = resp.data;
        this.progreso.generadas += d.generadas;
        this.progreso.errores += d.errores.length;
        this.paresSinIa = d.restantes;
        this.cdr.detectChanges();
        if (d.cuota_agotada) { this.avisoGeneracion = d.mensaje; break; }
        if (d.restantes === 0) break;
        sinProgreso = d.generadas === 0 ? sinProgreso + 1 : 0;
        if (sinProgreso >= 2) { this.avisoGeneracion = 'Gemini no está respondiendo ahora. Inténtalo de nuevo en unos minutos.'; break; }
      }
    } catch (err: any) {
      this.avisoGeneracion = err?.error?.message || 'No se pudo generar. Inténtalo de nuevo.';
    }
    this.generando = false;
    await this.cargar();
    this.filtro = 'pendiente';
    this.filtroOrigen = 'ia';
    this.cdr.detectChanges();
  }

  detenerGeneracion(): void {
    this.detener = true;
  }

  // ===== Lecciones =====
  iniciarEdicionLeccion(l: any): void {
    this.leccionEditando = l.clase;
    const c = l.contenido;
    this.formLeccion = {
      resumen: c.resumen || '',
      que_buscar: (c.que_buscar || []).join('\n'),
      errores_tipicos: (c.errores_tipicos || []).join('\n'),
      dato_clave: c.dato_clave || '',
      confusiones: (c.se_confunde_con || []).map((x: any) => ({ clase: x.clase, clave: x.clave }))
    };
  }

  cancelarEdicionLeccion(): void {
    this.leccionEditando = null;
    this.formLeccion = null;
  }

  guardarLeccion(l: any, estado: 'aprobado' | 'borrador'): void {
    const f = this.formLeccion;
    const lineas = (t: string) => t.split('\n').map(x => x.trim()).filter(Boolean);
    const contenido = {
      resumen: f.resumen,
      que_buscar: lineas(f.que_buscar),
      errores_tipicos: lineas(f.errores_tipicos),
      dato_clave: f.dato_clave,
      se_confunde_con: f.confusiones
    };
    this.guardando = true;
    this.aprendizajeService.guardarLeccion(l.clase, contenido, estado).subscribe({
      next: (resp) => {
        this.guardando = false;
        this.lecciones = this.lecciones.map(x => (x.clase === l.clase ? { ...x, contenido: resp.data.contenido, estado } : x));
        this.cancelarEdicionLeccion();
        this.alertService.success('Lección guardada', estado === 'aprobado' ? 'Los estudiantes ya ven la versión actualizada.' : 'Quedó como borrador: los estudiantes no la ven hasta que la apruebes.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.guardando = false;
        this.alertService.warning('Revisa el texto', err.error?.message || 'No se pudo guardar.');
        this.cdr.detectChanges();
      }
    });
  }
}

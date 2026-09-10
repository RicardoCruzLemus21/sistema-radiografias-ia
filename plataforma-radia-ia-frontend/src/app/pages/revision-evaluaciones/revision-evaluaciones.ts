import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiagnosticoService } from '../../services/diagnostico';
import { AcademicService } from '../../services/academic';
import { AuthService } from '../../services/auth';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-revision-evaluaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revision-evaluaciones.html',
  styleUrl: './revision-evaluaciones.css'
})
export class RevisionEvaluacionesComponent implements OnInit {
  evaluaciones: any[] = [];
  cargando: boolean = false;
  
  modalFeedbackAbierto: boolean = false;
  evaluacionActual: any = null;
  nuevoFeedback: string = '';
  guardando: boolean = false;

  modalEliminarAbierto: boolean = false;
  evaluacionAEliminar: number | null = null;
  eliminando: boolean = false;

  // --- CALIFICACIÓN POR RÚBRICA ---
  modalRubricaAbierto: boolean = false;
  evaluacionRubricaActual: any = null;
  criteriosRubrica: any[] = [];
  cargandoRubrica: boolean = false;
  guardandoRubrica: boolean = false;

  constructor(
    private diagnosticoService: DiagnosticoService,
    private academicService: AcademicService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.cargarEvaluaciones();
  }

  cargarEvaluaciones(): void {
    this.cargando = true;
    
    // Check if the current user is an Admin
    const isAdmin = this.authService?.isAdmin ? this.authService.isAdmin() : false;

    if (isAdmin) {
      this.diagnosticoService.getTodasLasEvaluaciones().subscribe({
        next: (res) => {
          this.evaluaciones = res.data || [];
          this.cargando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error al obtener evaluaciones globales', err);
          this.cargando = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.academicService.getMisCursos().subscribe({
        next: (resp) => {
          const cursos = resp.data || [];
          const idCurso = cursos.length > 0 ? cursos[0].id_curso : 1;
          
          this.diagnosticoService.getEvaluacionesPorCurso(idCurso).subscribe({
            next: (res) => {
              this.evaluaciones = res.data || [];
              this.cargando = false;
              this.cdr.markForCheck();
            },
            error: (err) => {
              console.error('Error al obtener evaluaciones', err);
              this.cargando = false;
              this.cdr.markForCheck();
            }
          });
        },
        error: () => { this.cargando = false; this.cdr.markForCheck(); }
      });
    }
  }

  abrirModalFeedback(ev: any): void {
    this.evaluacionActual = ev;
    this.nuevoFeedback = ev.feedback_profesor || '';
    this.modalFeedbackAbierto = true;
  }

  cerrarModalFeedback(): void {
    this.modalFeedbackAbierto = false;
    this.evaluacionActual = null;
  }

  guardarFeedback(): void {
    if (!this.evaluacionActual || !this.nuevoFeedback) return;
    this.guardando = true;
    this.diagnosticoService.agregarFeedback(this.evaluacionActual.id, this.nuevoFeedback).subscribe({
      next: () => {
        this.guardando = false;
        this.cerrarModalFeedback();
        this.cargarEvaluaciones();
      },
      error: (err) => {
        console.error('Error', err);
        this.guardando = false;
      }
    });
  }

  abrirModalEliminar(id: number): void {
    this.evaluacionAEliminar = id;
    this.modalEliminarAbierto = true;
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto = false;
    this.evaluacionAEliminar = null;
  }

  confirmarEliminar(): void {
    if (this.evaluacionAEliminar === null) return;
    
    this.eliminando = true;
    this.diagnosticoService.invalidarEvaluacion(this.evaluacionAEliminar).subscribe({
      next: () => {
        this.eliminando = false;
        this.cerrarModalEliminar();
        this.cargarEvaluaciones();
      },
      error: (err) => {
        this.eliminando = false;
        this.cerrarModalEliminar();
        this.alertService.error("Error", err.error?.message || 'Error al invalidar');
        this.cdr.markForCheck();
      }
    });
  }

  // --- CALIFICACIÓN POR RÚBRICA ---
  abrirModalRubrica(ev: any): void {
    this.evaluacionRubricaActual = ev;
    this.criteriosRubrica = [];
    this.cargandoRubrica = true;
    this.modalRubricaAbierto = true;

    this.diagnosticoService.getCalificacionesRubrica(ev.id).subscribe({
      next: (res) => {
        // puntaje_obtenido llega null si el criterio aún no ha sido calificado
        this.criteriosRubrica = (res.data || []).map((c: any) => ({
          ...c,
          puntaje_obtenido: c.puntaje_obtenido !== null ? Number(c.puntaje_obtenido) : null
        }));
        this.cargandoRubrica = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar la rúbrica:', err);
        this.cargandoRubrica = false;
        this.alertService.error('Error', 'No se pudo cargar la rúbrica de calificación.');
        this.cdr.markForCheck();
      }
    });
  }

  cerrarModalRubrica(): void {
    this.modalRubricaAbierto = false;
    this.evaluacionRubricaActual = null;
    this.criteriosRubrica = [];
  }

  totalRubrica(): number {
    return this.criteriosRubrica.reduce((acc, c) => acc + (Number(c.puntaje_obtenido) || 0), 0);
  }

  totalMaximoRubrica(): number {
    return this.criteriosRubrica.reduce((acc, c) => acc + (Number(c.peso_porcentaje) || 0), 0);
  }

  guardarCalificacionesRubrica(): void {
    if (!this.evaluacionRubricaActual || this.criteriosRubrica.length === 0) return;

    this.guardandoRubrica = true;
    const payload = {
      id_evaluacion: this.evaluacionRubricaActual.id,
      calificaciones: this.criteriosRubrica.map(c => ({
        id_criterio: c.id_criterio,
        puntaje_obtenido: Number(c.puntaje_obtenido) || 0
      }))
    };

    this.diagnosticoService.guardarRubrica(payload).subscribe({
      next: () => {
        this.guardandoRubrica = false;
        this.alertService.success('Rúbrica guardada', 'Las calificaciones se guardaron correctamente.');
        this.cerrarModalRubrica();
      },
      error: (err) => {
        this.guardandoRubrica = false;
        this.alertService.error('Error', err.error?.message || 'No se pudo guardar la rúbrica.');
        this.cdr.markForCheck();
      }
    });
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiagnosticoService } from '../../services/diagnostico';
import { AcademicService } from '../../services/academic';
import { AuthService } from '../../services/auth';

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

  constructor(
    private diagnosticoService: DiagnosticoService,
    private academicService: AcademicService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
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
        alert(err.error?.message || 'Error al invalidar');
        this.cdr.markForCheck();
      }
    });
  }
}

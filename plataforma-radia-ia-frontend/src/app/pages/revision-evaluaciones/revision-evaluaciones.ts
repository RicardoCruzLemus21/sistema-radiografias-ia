import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiagnosticoService } from '../../services/diagnostico';
import { AcademicService } from '../../services/academic';

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

  constructor(
    private diagnosticoService: DiagnosticoService,
    private academicService: AcademicService
  ) {}

  ngOnInit(): void {
    this.cargarEvaluaciones();
  }

  cargarEvaluaciones(): void {
    this.cargando = true;
    this.academicService.getMisCursos().subscribe({
      next: (resp) => {
        const cursos = resp.data || [];
        const idCurso = cursos.length > 0 ? cursos[0].id_curso : 1;
        
        this.diagnosticoService.getEvaluacionesPorCurso(idCurso).subscribe({
          next: (res) => {
            this.evaluaciones = res.data || [];
            this.cargando = false;
          },
          error: (err) => {
            console.error('Error al obtener evaluaciones', err);
            this.cargando = false;
          }
        });
      },
      error: () => this.cargando = false
    });
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

  invalidar(id: number): void {
    if(confirm('¿Estás seguro que deseas invalidar esta evaluación? Se borrará el intento del estudiante.')) {
      this.diagnosticoService.invalidarEvaluacion(id).subscribe({
        next: () => this.cargarEvaluaciones(),
        error: (err) => alert(err.error?.message || 'Error al invalidar')
      });
    }
  }
}

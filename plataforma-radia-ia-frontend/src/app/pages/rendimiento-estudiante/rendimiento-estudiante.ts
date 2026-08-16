import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AcademicService } from '../../services/academic';

@Component({
  selector: 'app-rendimiento-estudiante',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rendimiento-estudiante.html',
  styleUrl: './rendimiento-estudiante.css'
})
export class RendimientoEstudiante implements OnInit {
  
  datosRendimiento: any = null;
  cargando: boolean = true;

  constructor(
    private academicService: AcademicService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarRendimiento();
  }

  cargarRendimiento() {
    this.cargando = true;
    this.academicService.getMiRendimiento().subscribe({
      next: (resp) => {
        this.datosRendimiento = resp.data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar el rendimiento:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  getEstadoTexto(precision: number, totalCasos: number = 1): string {
    if (totalCasos === 0) return 'Sin Evaluar';
    if (precision >= 80) return 'Sobresaliente';
    if (precision >= 60) return 'Promedio';
    return 'En Riesgo';
  }

  getEstadoColor(precision: number, totalCasos: number = 1): string {
    if (totalCasos === 0) return 'text-muted';
    if (precision >= 80) return 'text-success';
    if (precision >= 60) return 'text-warning';
    return 'text-danger';
  }

  getPrecisionColor(precision: number): string {
    if (precision >= 80) return 'bg-success';
    if (precision >= 60) return 'bg-warning';
    return 'bg-danger';
  }

  verDetalle(evaluacion: any) {
    // Redirige a la vista de retroalimentación de la IA usando el id de la evaluación
    this.router.navigate(['/sistema/resultado', evaluacion.id_caso], {
      queryParams: { eval: evaluacion.id_evaluacion }
    });
  }
}

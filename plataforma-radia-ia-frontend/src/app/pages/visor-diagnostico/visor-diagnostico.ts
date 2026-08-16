import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticoService } from '../../services/diagnostico';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-visor-diagnostico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visor-diagnostico.html',
  styleUrl: './visor-diagnostico.css'
})
export class VisorDiagnostico implements OnInit, OnDestroy {
  
  idCasoActual: string = '';
  patologias: any[] = [];
  justificacionClinica: string = '';
  
  // Variables para la imagen
  imagenUrl: string = 'https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=800&q=80';
  fullscreenAbierto: boolean = false;
  
  // Variables para calcular el tiempo dinámicamente
  horaInicioAnalisis: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private diagnosticoService: DiagnosticoService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.idCasoActual = this.route.snapshot.paramMap.get('id') || '1';
    this.horaInicioAnalisis = Date.now();
    this.cargarPatologias();
  }

  ngOnDestroy(): void {
    // Limpieza si es necesaria
  }

  cargarPatologias() {
    this.diagnosticoService.getCatalogos().subscribe({
      next: (respuesta: any) => { 
        this.patologias = respuesta.data;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar catálogo de patologías:', err);
      }
    });
  }

  volverAlDashboard() {
    this.router.navigate(['/sistema/estudiante']);
  }

  abrirFullscreen() {
    this.fullscreenAbierto = true;
  }

  cerrarFullscreen() {
    this.fullscreenAbierto = false;
  }

  enviarDiagnostico() {
    const patologiasSeleccionadas = this.patologias.filter(p => p.seleccionada).map(p => p.id);
    
    if (patologiasSeleccionadas.length === 0) {
      alert("Por favor, selecciona al menos una patología antes de enviar el diagnóstico.");
      return;
    }

    // Calcula el tiempo real transcurrido en segundos
    const tiempoTranscurrido = Math.floor((Date.now() - this.horaInicioAnalisis) / 1000);
    const idUsuarioDinamico = this.authService.getIdUsuario() || 2; // Fallback a 2 si falla

    const payload = {
      id_estudiante: idUsuarioDinamico,
      id_caso: this.idCasoActual,
      tiempo_analisis_segundos: tiempoTranscurrido > 0 ? tiempoTranscurrido : 1,
      justificacion_clinica: this.justificacionClinica,
      patologias: patologiasSeleccionadas,
      regiones: []
    };

    this.diagnosticoService.evaluarCaso(payload).subscribe({
      next: (res) => {
        const id_evaluacion = res.data?.id_evaluacion || 1;
        // Navegar al módulo de retroalimentación de la IA con Grad-CAM, pasando el id de evaluación y el ID de la patología seleccionada por el estudiante para poder evaluar si queremos un acierto
        this.router.navigate(['/sistema/resultado', this.idCasoActual], { 
          queryParams: { 
            eval: id_evaluacion,
            // Pasamos las patologías elegidas para simular dinámicamente el resultado
            pat: patologiasSeleccionadas.join(',') 
          } 
        });
      },
      error: (err) => {
        console.error("Error al enviar diagnóstico:", err);
        alert("Ocurrió un error al enviar el diagnóstico. Por favor intenta nuevamente.");
      }
    });
  }
}
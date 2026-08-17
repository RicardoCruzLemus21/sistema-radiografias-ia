import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticoService } from '../../services/diagnostico';
import { AuthService } from '../../services/auth';
import { ClinicalService } from '../../services/clinical';
import { environment } from '../../../environments/environment';

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
  
  // Variables para la imagen y herramientas
  imagenUrl: string = '';
  fullscreenAbierto: boolean = false;
  
  zoomLevel: number = 1;
  isInverted: boolean = false;
  brightness: number = 1;
  contrast: number = 1.2;

  // Variables de datos clínicos
  casoDetalle: any = null;

  // Variables para calcular el tiempo dinámicamente
  horaInicioAnalisis: number = 0;
  tiempoDisplay: string = '00:00:00';
  private timerInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private diagnosticoService: DiagnosticoService,
    private clinicalService: ClinicalService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.idCasoActual = this.route.snapshot.paramMap.get('id') || '1';
    this.horaInicioAnalisis = Date.now();
    this.iniciarTemporizador();
    this.cargarDatosCaso();
    this.cargarPatologias();
  }

  cargarDatosCaso() {
    this.clinicalService.getCasoPorId(this.idCasoActual).subscribe({
      next: (res) => {
        if (res.data) {
          this.casoDetalle = res.data;
          // Construimos la URL completa para la imagen
          if (this.casoDetalle.ruta_imagen && !this.casoDetalle.ruta_imagen.startsWith('http')) {
            this.imagenUrl = `${environment.apiUrl}${this.casoDetalle.ruta_imagen}`;
          } else {
            this.imagenUrl = this.casoDetalle.ruta_imagen || 'https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=800&q=80';
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al cargar datos del caso:', err);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  iniciarTemporizador() {
    this.timerInterval = setInterval(() => {
      const transcurrido = Math.floor((Date.now() - this.horaInicioAnalisis) / 1000);
      const horas = Math.floor(transcurrido / 3600).toString().padStart(2, '0');
      const minutos = Math.floor((transcurrido % 3600) / 60).toString().padStart(2, '0');
      const segundos = (transcurrido % 60).toString().padStart(2, '0');
      this.tiempoDisplay = `${horas}:${minutos}:${segundos}`;
    }, 1000);
  }

  // Herramientas del Visor
  toggleInvert() {
    this.isInverted = !this.isInverted;
  }

  ajustarContraste() {
    // Cicla entre valores básicos de brillo/contraste para simular windowing
    if (this.contrast === 1.2) {
      this.contrast = 1.5;
      this.brightness = 1.1;
    } else if (this.contrast === 1.5) {
      this.contrast = 2.0;
      this.brightness = 0.9;
    } else {
      this.contrast = 1.2;
      this.brightness = 1.0;
    }
  }

  hacerZoom() {
    this.zoomLevel = this.zoomLevel >= 2 ? 1 : this.zoomLevel + 0.5;
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
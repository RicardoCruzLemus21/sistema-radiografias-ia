import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticoService } from '../../services/diagnostico';
import { AuthService } from '../../services/auth';
import { ClinicalService } from '../../services/clinical';
import { AlertService } from '../../services/alert.service';
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
  
  // Nuevas variables para el Flujo de 4 Fases
  faseActual: number = 1;
  nivelConfianza: number = 50; // Slider de 0 a 100
  marcadorEstudiante: any = null;
  resultadoFase2: any = null;
  resultadoFase3: any = null;
  
  // Modos de interacción en la imagen
  isDrawing: boolean = false;
  startX: number = 0;
  startY: number = 0;
  
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
    private cdr: ChangeDetectorRef,
    private alertService: AlertService
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

  // --- LÓGICA DE DIBUJO DE RECTÁNGULO EN LA IMAGEN ---
  onImageMouseDown(event: MouseEvent) {
    if (this.faseActual !== 1) return; // Solo se puede dibujar en Fase 1
    this.isDrawing = true;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.startX = event.clientX - rect.left;
    this.startY = event.clientY - rect.top;
    
    // Iniciar rectángulo
    this.marcadorEstudiante = {
      x: this.startX,
      y: this.startY,
      width: 0,
      height: 0
    };
  }

  onImageMouseMove(event: MouseEvent) {
    if (!this.isDrawing || this.faseActual !== 1) return;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    this.marcadorEstudiante.width = currentX - this.startX;
    this.marcadorEstudiante.height = currentY - this.startY;
  }

  onImageMouseUp(event: MouseEvent) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    // Normalizar dimensiones negativas (si arrastra hacia arriba o izquierda)
    if (this.marcadorEstudiante.width < 0) {
      this.marcadorEstudiante.x += this.marcadorEstudiante.width;
      this.marcadorEstudiante.width = Math.abs(this.marcadorEstudiante.width);
    }
    if (this.marcadorEstudiante.height < 0) {
      this.marcadorEstudiante.y += this.marcadorEstudiante.height;
      this.marcadorEstudiante.height = Math.abs(this.marcadorEstudiante.height);
    }

    // Si fue un clic simple sin arrastrar (área muy pequeña), lo borramos o consideramos "clic"
    if (this.marcadorEstudiante.width < 5 && this.marcadorEstudiante.height < 5) {
      // Lo convertimos en un marcador de punto (clic simple)
      this.marcadorEstudiante.width = 20;
      this.marcadorEstudiante.height = 20;
      this.marcadorEstudiante.x -= 10;
      this.marcadorEstudiante.y -= 10;
      this.marcadorEstudiante.type = 'point';
    } else {
      this.marcadorEstudiante.type = 'rect';
    }
  }

  clearMarker() {
    this.marcadorEstudiante = null;
  }

  // --- TRANSICIONES DE FASE ---
  avanzarFase2() {
    this.faseActual = 2;
    this.cdr.detectChanges();
  }

  avanzarFase3() {
    this.faseActual = 3;
    this.cdr.detectChanges();
  }

  avanzarFase4() {
    this.faseActual = 4;
    this.cdr.detectChanges();
  }

  enviarDiagnostico() {
    const patologiasSeleccionadas = this.patologias.filter(p => p.seleccionada).map(p => p.id);
    
    if (patologiasSeleccionadas.length === 0) {
      this.alertService.warning("Selección Requerida", "Por favor, selecciona al menos una patología antes de enviar el diagnóstico.");
      return;
    }
    if (!this.marcadorEstudiante) {
      this.alertService.warning("Marca de Región Requerida", "Dibuja un rectángulo o haz clic sobre la región sospechosa en la radiografía.");
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
      regiones: [],
      nivel_confianza: this.nivelConfianza,
      marcador_estudiante: this.marcadorEstudiante
    };

    this.diagnosticoService.evaluarCaso(payload).subscribe({
      next: (res) => {
        // Almacenamos los mocks devueltos por el backend
        if(res.fase2_verdad) this.resultadoFase2 = res.fase2_verdad;
        if(res.fase3_ia) this.resultadoFase3 = res.fase3_ia;
        
        // Detener el temporizador ya que terminó el análisis a ciegas
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.alertService.toast("Evaluación registrada. Pasando a Fase 2.", "success");
        this.avanzarFase2(); // Flujo natural al terminar Fase 1
      },
      error: (err) => {
        console.error("Error al enviar diagnóstico:", err);
        this.alertService.error("Error", "Ocurrió un error al enviar el diagnóstico. Por favor intenta nuevamente.");
      }
    });
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticoService } from '../../services/diagnostico';
import { AuthService } from '../../services/auth';
import { ClinicalService } from '../../services/clinical';
import { AlertService } from '../../services/alert.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-retroalimentacion-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './retroalimentacion-ia.html',
  styleUrl: './retroalimentacion-ia.css'
})
export class RetroalimentacionIa implements OnInit {
  
  idCasoActual: string | null = '';
  idEvaluacion: string | null = '';
  patologiasEstudiante: string = '';
  cargandoIA: boolean = true;
  mostrarLikert: boolean = false;
  guardandoLikert: boolean = false;

  // Respuestas del Likert (1 a 5)
  encuesta = [
    { pregunta: 'La IA identificó correctamente las regiones anómalas.', dimension: 'Precisión', puntaje: 0 },
    { pregunta: 'El mapa de calor ayudó a enfocar mi diagnóstico.', dimension: 'Utilidad Visual', puntaje: 0 },
    { pregunta: 'La retroalimentación mejoró mi comprensión del caso.', dimension: 'Impacto Educativo', puntaje: 0 },
    { pregunta: 'Confío en el diagnóstico sugerido por el modelo.', dimension: 'Confianza', puntaje: 0 },
    { pregunta: 'La interfaz fue fácil e intuitiva de utilizar.', dimension: 'Usabilidad', puntaje: 0 }
  ];
  
  resultadoIA: any = null;
  patologiasCatalogo: any[] = [];
  imagenOriginal: string = 'https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=600&q=80';

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
    this.idCasoActual = this.route.snapshot.paramMap.get('id');
    
    // Cargar catálogos dinámicos e imagen del caso antes de simular
    this.diagnosticoService.getCatalogos().subscribe({
      next: (res) => {
        this.patologiasCatalogo = res.data;
        if (this.idCasoActual) {
          this.clinicalService.getCasoPorId(this.idCasoActual).subscribe(casoRes => {
            if (casoRes.data && casoRes.data.ruta_imagen) {
              this.imagenOriginal = casoRes.data.ruta_imagen.startsWith('http') ? casoRes.data.ruta_imagen : `${environment.apiUrl}${casoRes.data.ruta_imagen}`;
            }
            this.inicializarSimulacion();
          });
        } else {
          this.inicializarSimulacion();
        }
      },
      error: (err) => {
        console.error('Error cargando catálogos:', err);
        this.inicializarSimulacion();
      }
    });
  }

  inicializarSimulacion() {
    this.route.queryParams.subscribe(params => {
      this.idEvaluacion = params['eval'];
      this.patologiasEstudiante = params['pat'] || '1'; // Capturamos las seleccionadas
      this.simularProcesamientoIA();
    });
  }

  simularProcesamientoIA() {
    const payloadIA = {
      id_evaluacion: this.idEvaluacion,
      id_radiografia: this.idCasoActual
    };

    this.diagnosticoService.procesarInferencia(payloadIA).subscribe({
      next: (res) => {
        this.cargandoIA = false;
        
        const diagIA = res.data.diagnostico_ia;
        const metricas = res.data.metricas;

        this.resultadoIA = {
          patologia: diagIA.patologia,
          probabilidad: diagIA.probabilidad,
          mensaje: metricas.acierto_estudiante ? 'Se detectaron patrones compatibles en la región evaluada.' : 'Discrepancia detectada respecto a tu diagnóstico inicial.',
          metricas: metricas,
          ruta_mapa_calor: this.imagenOriginal
        };
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al generar IA:", err);
        this.cargandoIA = false;
        this.alertService.error("Error", "Ocurrió un error al procesar la radiografía con IA.");
      }
    });
  }

  seleccionarPuntaje(index: number, valor: number) {
    this.encuesta[index].puntaje = valor;
  }

  abrirLikert() {
    this.mostrarLikert = true;
  }

  descargarInforme() {
    // Utiliza la funcionalidad nativa de impresión del navegador para exportar a PDF
    window.print();
  }

  cerrarLikert() {
    this.mostrarLikert = false;
  }

  enviarLikert() {
    const respuestasPendientes = this.encuesta.filter(e => e.puntaje === 0);
    if (respuestasPendientes.length > 0) {
      this.alertService.warning("Respuestas Incompletas", "Por favor, responde a todas las preguntas antes de enviar.");
      return;
    }

    this.guardandoLikert = true;
    const idUsuarioDinamico = this.authService.getIdUsuario() || 2;
    
    const payload = {
      id_cuestionario: 1,
      id_estudiante: idUsuarioDinamico,
      respuestas: this.encuesta.map(e => ({
        dimension_evaluada: e.dimension,
        puntaje: e.puntaje
      }))
    };

    this.diagnosticoService.guardarLikert(payload).subscribe({
      next: () => {
        this.guardandoLikert = false;
        this.cerrarLikert();
        this.volverAlDashboard();
      },
      error: (err) => {
        console.error("Error guardando Likert", err);
        this.guardandoLikert = false;
        this.alertService.error("Error", "Ocurrió un error guardando tu evaluación.");
        this.volverAlDashboard();
      }
    });
  }

  volverAlDashboard() {
    this.router.navigate(['/sistema/estudiante']);
  }
}
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticoService } from '../../services/diagnostico';
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
  idRadiografiaActual: number | null = null;
  idEvaluacion: string | null = '';
  patologiasEstudiante: string = '';
  cargandoIA: boolean = true;

  resultadoIA: any = null;
  patologiasCatalogo: any[] = [];
  imagenOriginal: string = 'https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=600&q=80';

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private diagnosticoService: DiagnosticoService,
    private clinicalService: ClinicalService,
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
            // El motor de IA necesita el ID de la radiografía, no el ID del caso (son secuencias distintas).
            this.idRadiografiaActual = casoRes.data?.id_radiografia || null;
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
      id_radiografia: this.idRadiografiaActual
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

  descargarInforme() {
    // Utiliza la funcionalidad nativa de impresión del navegador para exportar a PDF
    window.print();
  }

  volverAlDashboard() {
    this.router.navigate(['/sistema/estudiante']);
  }
}
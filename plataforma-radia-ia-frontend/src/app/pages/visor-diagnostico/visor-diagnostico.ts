import { Component, OnInit, AfterViewInit, ChangeDetectorRef, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HerramientasImagen } from '../../components/herramientas-imagen/herramientas-imagen';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticoService } from '../../services/diagnostico';
import { AuthService } from '../../services/auth';
import { ClinicalService } from '../../services/clinical';
import { AlertService } from '../../services/alert.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-visor-diagnostico',
  standalone: true,
  imports: [CommonModule, FormsModule, HerramientasImagen],
  templateUrl: './visor-diagnostico.html',
  styleUrl: './visor-diagnostico.css'
})
export class VisorDiagnostico implements OnInit, AfterViewInit, OnDestroy {
  
  idCasoActual: string = '';
  patologias: any[] = [];
  justificacionClinica: string = '';
  
  // Nuevas variables para el Flujo de 4 Fases
  faseActual: number = 1;
  nivelConfianza: number = 50; // Slider de 0 a 100
  marcasEstudiante: { x: number; y: number; w: number; h: number }[] = [];
  resultadoFase2: any = null;
  resultadoFase3: any = null;
  puntajesEstudiante: any = null;

  // Grad-CAM: mapas de calor de la(s) patología(s) real(es) del caso (uno por etiqueta)
  gradcams: { patologia: string; url: string }[] = [];
  gradcamIndice: number = 0;
  mostrarGradcam: boolean = true;
  enviandoDiagnostico: boolean = false;
  
  imagenUrl: string = '';

  // Variables de datos clínicos
  casoDetalle: any = null;
  mostrarHistoria = false;

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
    private alertService: AlertService,
    private host: ElementRef<HTMLElement>
  ) {}

  // Las capas sobre la radiografía (mapa de calor, marcas) se calculan con la posición de la imagen. Si el panel
  // lateral se comprime o la ventana cambia de tamaño, la imagen se mueve: se vuelven a calcular al cambiar el área.
  private observadorTamano?: ResizeObserver;

  ngAfterViewInit(): void {
    const area = this.host.nativeElement.querySelector('.xray-viewer');
    if (area && typeof ResizeObserver !== 'undefined') {
      this.observadorTamano = new ResizeObserver(() => {
        this.cdr.detectChanges();
      });
      this.observadorTamano.observe(area);
    }
  }

  // Modo revisión: el caso ya fue respondido. Se muestra su retroalimentación y no se puede volver a evaluar.
  modoRevision: boolean = false;
  comprobandoRevision: boolean = true;
  marcadasRevision: string[] = [];
  private marcadorRelativoGuardado: any = null;

  ngOnInit(): void {
    this.idCasoActual = this.route.snapshot.paramMap.get('id') || '1';
    this.cargarDatosCaso();
    this.cargarPatologias();
    this.comprobarRevision();
  }

  // Antes de mostrar la lectura a ciegas se pregunta si el caso ya fue respondido
  private comprobarRevision(): void {
    this.clinicalService.getRetroalimentacionCaso(this.idCasoActual).subscribe({
      next: (res) => {
        this.comprobandoRevision = false;
        if (res.data) this.entrarEnModoRevision(res.data);
        this.cdr.detectChanges();
      },
      error: () => {
        // 404 = todavía no lo ha respondido: empieza la evaluación normal (el reloj arranca ahora)
        this.comprobandoRevision = false;
        this.horaInicioAnalisis = Date.now();
        this.iniciarTemporizador();
        this.cdr.detectChanges();
      }
    });
  }

  private entrarEnModoRevision(datos: any): void {
    this.modoRevision = true;
    this.aplicarVerdad(datos);
    this.marcadasRevision = (datos.patologias_marcadas || []).map((p: any) => p.nombre);
    this.justificacionClinica = datos.justificacion_clinica || '';
    this.nivelConfianza = datos.nivel_confianza ?? 50;
    this.marcadorRelativoGuardado = datos.marcador_estudiante || null;
    this.faseActual = 4;
    this.cdr.detectChanges();
    this.mostrarMarcaGuardada();
  }

  // La marca guardada llega en proporciones de la imagen; el componente trabaja en porcentajes
  private mostrarMarcaGuardada(): void {
    const rel = this.marcadorRelativoGuardado;
    this.marcasEstudiante = rel ? [{ x: rel.x * 100, y: rel.y * 100, w: rel.w * 100, h: rel.h * 100 }] : [];
    this.cdr.detectChanges();
  }

  alCargarImagen(): void {
    this.cdr.detectChanges();
  }

  @HostListener('window:resize')
  alCambiarTamano(): void {
    this.cdr.detectChanges();
  }

  // En revisión se puede repasar la verdad, la opinión de la IA y la discusión (la lectura a ciegas ya no se repite)
  irAFase(n: number): void {
    if (this.modoRevision && n >= 2) {
      this.faseActual = n;
      this.cdr.detectChanges();
    }
  }

  claseResultado(v: number | string | null | undefined): string {
    const p = Math.round(Number(v));
    return p >= 80 ? 'res-alto' : p >= 50 ? 'res-medio' : 'res-bajo';
  }

  get resumenMarcadas(): string[] {
    return this.modoRevision ? this.marcadasRevision : this.patologias.filter(p => p.seleccionada).map(p => p.nombre);
  }

  cargarDatosCaso() {
    this.clinicalService.getCasoSeguroEstudiante(this.idCasoActual).subscribe({
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
        this.alertService.error('Error', 'No se pudo cargar el caso. ' + (err.error?.message || ''));
      }
    });
  }

  ngOnDestroy(): void {
    this.observadorTamano?.disconnect();
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
      this.cdr.detectChanges(); // sin zone.js la vista no se actualiza sola
    }, 1000);
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

  // Recuadro real del radiólogo: llega en proporciones (0-1) de la imagen; se convierte a píxeles del
  // contenedor usando la posición real de la imagen dentro de él (offsetLeft/Width ignoran el zoom).
  estiloCajaReal(caja: any): Record<string, string> {
    const img = document.querySelector('.xray-image') as HTMLElement | null;
    if (!img || !caja) return { display: 'none' };
    return {
      left: (img.offsetLeft + caja.x * img.offsetWidth) + 'px',
      top: (img.offsetTop + caja.y * img.offsetHeight) + 'px',
      width: (caja.ancho * img.offsetWidth) + 'px',
      height: (caja.alto * img.offsetHeight) + 'px'
    };
  }

  get gradcamActual(): { patologia: string; url: string } | null {
    return this.gradcams[this.gradcamIndice] || null;
  }

  private urlGradcam(ruta: string): string {
    if (ruta.startsWith('http')) return ruta;
    const limpia = ruta.startsWith('/') ? ruta.substring(1) : ruta;
    return `${environment.apiUrl}/${limpia.startsWith('uploads/') ? limpia : 'uploads/banco_casos/' + limpia}`;
  }

  // Coloca una capa exactamente sobre la radiografía (mismo recuadro que la imagen dentro del componente de herramientas).
  estiloCapaSobreImagen(): Record<string, string> {
    const img = document.querySelector('.xray-image') as HTMLElement | null;
    if (!img) return { display: 'none' };
    return {
      left: img.offsetLeft + 'px',
      top: img.offsetTop + 'px',
      width: img.offsetWidth + 'px',
      height: img.offsetHeight + 'px'
    };
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

  async enviarDiagnostico(): Promise<void> {
    const patologiasSeleccionadas = this.patologias.filter(p => p.seleccionada).map(p => p.id);

    if (patologiasSeleccionadas.length === 0) {
      this.alertService.warning("Selección Requerida", "Por favor, selecciona al menos una patología antes de enviar el diagnóstico.");
      return;
    }
    // Si el estudiante solo marcó "Normal" no hay ninguna región que señalar
    const soloNormal = this.patologias.filter(p => p.seleccionada).every(p => String(p.nombre).trim().toLowerCase() === 'normal');
    if (this.marcasEstudiante.length === 0 && !soloNormal) {
      this.alertService.warning("Marca de Región Requerida", "Dibuja un rectángulo o haz clic sobre la región sospechosa en la radiografía (no hace falta si marcas solo 'Normal').");
      return;
    }

    const idUsuarioDinamico = this.authService.getIdUsuario();
    if (!idUsuarioDinamico) {
      this.alertService.error('Sesión no válida', 'No se pudo identificar tu usuario. Vuelve a iniciar sesión antes de enviar el diagnóstico.');
      return;
    }

    // Es un envío sin vuelta atrás: una vez bloqueada, la respuesta ya no se puede cambiar y la
    // Fase 2 revela el diagnóstico real. Se confirma antes de cerrar la puerta.
    const nombresElegidos = this.patologias.filter(p => p.seleccionada).map(p => p.nombre).join(', ');
    const confirmado = await this.alertService.confirm(
      'Bloquear tu respuesta',
      `Vas a enviar como diagnóstico: ${nombresElegidos}. Una vez bloqueada no podrás modificarla, y a continuación verás el diagnóstico real del caso. ¿Confirmas que es tu respuesta final?`,
      'Sí, bloquear y continuar'
    );
    if (!confirmado) return;

    const tiempoTranscurrido = Math.floor((Date.now() - this.horaInicioAnalisis) / 1000);

    const marca = this.marcasEstudiante[0];
    const marcadorRelativo = marca ? { x: marca.x / 100, y: marca.y / 100, w: marca.w / 100, h: marca.h / 100 } : null;

    const payload = {
      id_estudiante: idUsuarioDinamico,
      id_caso: this.idCasoActual,
      tiempo_analisis_segundos: tiempoTranscurrido > 0 ? tiempoTranscurrido : 1,
      justificacion_clinica: this.justificacionClinica,
      patologias: patologiasSeleccionadas,
      nivel_confianza: this.nivelConfianza,
      marcador_estudiante: marcadorRelativo
    };

    if (this.timerInterval) clearInterval(this.timerInterval);

    this.enviandoDiagnostico = true;

    this.clinicalService.enviarDiagnosticoFase1(payload).subscribe({
      next: (res) => {
        this.enviandoDiagnostico = false;
        if (res.data) {
          this.aplicarVerdad(res.data);
          this.alertService.success('Guardado', 'Respuesta bloqueada. Avanzando a la Fase 2.');
          this.avanzarFase2();
        }
      },
      error: (err) => {
        this.enviandoDiagnostico = false;
        this.alertService.error('Error', err.error?.message || 'No se pudo guardar la evaluación.');
        console.error(err);
      }
    });
  }

  // Convierte lo que devuelve el servidor (verdad NIH, opinión del modelo, Grad-CAM y puntajes) en el estado de las fases 2 a 4
  private aplicarVerdad(truthData: any): void {
    this.resultadoFase2 = {
      etiquetas_nih: truthData.etiquetas_nih,
      bbox: truthData.bbox
    };

    // El modelo puede dar 0 (abstención), 1 o más opiniones ordenadas por probabilidad.
    // Cada opinión ya trae su propia precision_esperada calculada (ver RESULTADOS_Y_DEFENSA_RADIA.md:
    // "no se dice que el paciente tiene X, se dice que el modelo lo señala y acierta ~Y% de las veces").
    const opinionesOrdenadas = [...(truthData.opinion_modelo || [])].sort((a: any, b: any) => b.probabilidad - a.probabilidad);
    const opiniones = opinionesOrdenadas.map((op: any) => ({
      patologia: op.patologia,
      probabilidadPct: Math.round(op.probabilidad * 100),
      precisionEsperadaPct: op.precision_esperada != null ? Math.round(op.precision_esperada * 100) : null,
    }));

    // Las rutas guardadas son relativas a uploads/banco_casos (p. ej. "gradcam/xxx.png")
    this.gradcams = Object.entries(truthData.gradcam || {})
      .filter(([, ruta]) => typeof ruta === 'string' && ruta.length > 0)
      .map(([patologia, ruta]) => ({ patologia, url: this.urlGradcam(ruta as string) }));
    this.gradcamIndice = 0;
    this.mostrarGradcam = true;

    this.resultadoFase3 = {
      abstiene: !!truthData.modelo_se_abstiene,
      opiniones
    };

    if (truthData.puntajes) {
      this.puntajesEstudiante = truthData.puntajes;
    }
  }
}
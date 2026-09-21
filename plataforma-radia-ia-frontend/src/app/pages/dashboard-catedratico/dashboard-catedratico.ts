import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic';
import { AuthService } from '../../services/auth';
import { ExtraService } from '../../services/extra';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-dashboard-catedratico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-catedratico.html',
  styleUrl: './dashboard-catedratico.css'
})
export class DashboardCatedratico implements OnInit {
  
  estadisticasGlobales = {
    totalAlumnos: 0,
    casosAsignados: 3,
    precisionGrupal: 0,
    casosCompletadosTotales: 0
  };

  alumnos: any[] = [];
  alumnosFiltrados: any[] = [];
  filtroTexto: string = '';
  filtroEstado: string = 'TODOS';
  cargando: boolean = false;

  // Estado para el Modal de Expediente del Estudiante
  modalAbierto: boolean = false;
  estudianteSeleccionado: any = null;
  cargandoDetalle: boolean = false;
  
  // Comentarios
  nuevoComentarioTexto: string = '';
  evaluacionComentarioActiva: any = null;
  guardandoComentario: boolean = false;

  // Estado para el Modal de Registrar Alumno
  modalCrearAlumnoAbierto: boolean = false;
  guardandoAlumno: boolean = false;
  mensajeRegistroExito: string = '';
  mensajeRegistroError: string = '';
  nuevoAlumno = {
    nombre_completo: '',
    correo_electronico: '',
    contrasena: ''
  };

  // Estado para el Modal de Métricas Likert
  modalLikertAbierto: boolean = false;
  cargandoLikert: boolean = false;
  metricasLikert: any[] = [];
  promedioGlobalLikert: number = 0;

  constructor(
    private academicService: AcademicService,
    private authService: AuthService,
    private extraService: ExtraService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosReales();
  }

  // === INFORME PDF DE CALIFICACIONES (por ejercicio o conjunto de ejercicios) ===
  modalInformeAbierto: boolean = false;
  cargandoEjerciciosInforme: boolean = false;
  generandoInforme: boolean = false;
  cursosInforme: { id_curso: number; nombre_curso: string }[] = [];
  private ejerciciosTodos: any[] = [];
  ejerciciosCurso: any[] = [];              // ejercicios del curso elegido (se recalcula al cambiar de curso)
  cursoInforme: number | null = null;
  ejerciciosInforme = new Set<number>();    // ids marcados

  abrirModalInforme(): void {
    this.modalInformeAbierto = true;
    this.cargandoEjerciciosInforme = true;
    this.academicService.getEjerciciosDocente().subscribe({
      next: (resp: any) => {
        this.ejerciciosTodos = (resp.data || resp || []) as any[];
        const vistos = new Map<number, string>();
        for (const e of this.ejerciciosTodos) if (!vistos.has(e.id_curso)) vistos.set(e.id_curso, e.nombre_curso);
        this.cursosInforme = [...vistos.entries()].map(([id_curso, nombre_curso]) => ({ id_curso, nombre_curso }));
        this.cursoInforme = this.cursosInforme[0]?.id_curso ?? null;
        this.alCambiarCursoInforme();
        this.cargandoEjerciciosInforme = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoEjerciciosInforme = false;
        this.alertService.error('No se pudieron cargar los ejercicios', 'Intenta de nuevo en unos segundos.');
        this.cdr.detectChanges();
      }
    });
  }

  cerrarModalInforme(): void {
    this.modalInformeAbierto = false;
  }

  alCambiarCursoInforme(): void {
    this.ejerciciosCurso = this.ejerciciosTodos.filter(e => e.id_curso === this.cursoInforme);
    this.ejerciciosInforme = new Set(this.ejerciciosCurso.map(e => e.id_ejercicio)); // por defecto, todos
  }

  alternarEjercicioInforme(id: number): void {
    if (this.ejerciciosInforme.has(id)) this.ejerciciosInforme.delete(id);
    else this.ejerciciosInforme.add(id);
  }

  get todosEjerciciosMarcados(): boolean {
    return this.ejerciciosCurso.length > 0 && this.ejerciciosInforme.size === this.ejerciciosCurso.length;
  }

  alternarTodosEjerciciosInforme(): void {
    this.ejerciciosInforme = this.todosEjerciciosMarcados ? new Set() : new Set(this.ejerciciosCurso.map(e => e.id_ejercicio));
  }

  // "ver": abre el PDF en una pestaña nueva (desde el visor del navegador se imprime o se guarda).
  // "descargar": lo guarda directamente.
  generarInforme(modo: 'ver' | 'descargar'): void {
    if (!this.cursoInforme || this.ejerciciosInforme.size === 0) {
      this.alertService.warning('Elige ejercicios', 'Marca al menos un ejercicio para generar el informe.');
      return;
    }
    this.generandoInforme = true;
    this.entregarPdf(
      this.academicService.getInformeCalificaciones(this.cursoInforme, [...this.ejerciciosInforme]),
      modo, 'informe-calificaciones.pdf', () => { this.generandoInforme = false; }
    );
  }

  // Informe individual del alumno abierto en el expediente (con gráficas de evolución)
  generandoInformeAlumno: boolean = false;

  generarInformeAlumno(modo: 'ver' | 'descargar'): void {
    const id = this.estudianteSeleccionado?.id_usuario;
    if (!id) return;
    this.generandoInformeAlumno = true;
    this.entregarPdf(
      this.academicService.getInformeEstudiante(id),
      modo, 'informe-individual.pdf', () => { this.generandoInformeAlumno = false; }
    );
  }

  // Abre el PDF en una pestaña nueva ("ver") o lo descarga. La pestaña se abre ya, dentro del clic,
  // para que el navegador no la bloquee como ventana emergente.
  private entregarPdf(fuente: Observable<Blob>, modo: 'ver' | 'descargar', nombreArchivo: string, alTerminar: () => void): void {
    const pestana = modo === 'ver' ? window.open('', '_blank') : null;
    fuente.subscribe({
      next: (pdf: Blob) => {
        alTerminar();
        const url = URL.createObjectURL(pdf);
        if (pestana) {
          pestana.location.href = url;
        } else {
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = nombreArchivo;
          enlace.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.cdr.detectChanges();
      },
      error: async (err: any) => {
        pestana?.close();
        alTerminar();
        let mensaje = 'No se pudo generar el informe.';
        try { mensaje = JSON.parse(await (err.error as Blob).text()).message || mensaje; } catch { /* respuesta sin JSON */ }
        this.alertService.error('Error al generar el informe', mensaje);
        this.cdr.detectChanges();
      }
    });
  }

  cargarDatosReales(): void {
    this.cargando = true;
    this.academicService.getResumenGeneral().subscribe({
      next: (respuesta: any) => {
        const datos = respuesta.data || respuesta;
        if (datos && datos.alumnos && datos.alumnos.length > 0) {
          this.estadisticasGlobales = datos.estadisticasGlobales;
          this.alumnos = datos.alumnos;
        } else {
          this.cargarDatosSimulados();
        }
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Backend académico no respondió datos, cargando datos de prueba controlados:', err);
        this.cargarDatosSimulados();
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarDatosSimulados(): void {
    // FUNCIÓN ELIMINADA: EL SISTEMA AHORA ES 100% DINÁMICO.
    // Si no hay datos en la DB, se mostrarán 0 alumnos en lugar de datos simulados.
    this.estadisticasGlobales = {
      totalAlumnos: 0,
      casosAsignados: 0,
      precisionGrupal: 0,
      casosCompletadosTotales: 0
    };
    this.alumnos = [];
  }

  aplicarFiltros(): void {
    let res = [...this.alumnos];

    if (this.filtroTexto.trim()) {
      const q = this.filtroTexto.toLowerCase().trim();
      res = res.filter(a => 
        a.nombre.toLowerCase().includes(q) || 
        a.id.toLowerCase().includes(q) || 
        (a.correo && a.correo.toLowerCase().includes(q))
      );
    }

    if (this.filtroEstado !== 'TODOS') {
      res = res.filter(a => a.estado.toUpperCase() === this.filtroEstado.toUpperCase());
    }

    this.alumnosFiltrados = res;
  }

  setFiltroEstado(estado: string): void {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  // Historial del alumno agrupado por ejercicio (carpetas desplegables con el promedio de cada uno).
  // Se arma una sola vez al cargar: si fuera un getter, ngFor recrearía las tarjetas en cada ciclo y
  // se perdería lo que el docente esté escribiendo en un comentario.
  carpetasEvaluaciones: { clave: number; nombre: string; evaluaciones: any[]; promedio: number }[] = [];
  carpetasAbiertas = new Set<number>();

  private armarCarpetas(evaluaciones: any[]): void {
    const mapa = new Map<number, any>();
    for (const ev of evaluaciones) {
      if (!mapa.has(ev.id_ejercicio)) mapa.set(ev.id_ejercicio, { clave: ev.id_ejercicio, nombre: ev.ejercicio, evaluaciones: [], promedio: 0 });
      mapa.get(ev.id_ejercicio).evaluaciones.push(ev);
    }
    this.carpetasEvaluaciones = [...mapa.values()].map(c => ({
      ...c,
      promedio: Math.round(c.evaluaciones.reduce((s: number, e: any) => s + e.precision_ia, 0) / c.evaluaciones.length)
    }));
  }

  alternarCarpeta(clave: number): void {
    if (this.carpetasAbiertas.has(clave)) this.carpetasAbiertas.delete(clave);
    else this.carpetasAbiertas.add(clave);
  }

  abrirDetalleEstudiante(alumno: any): void {
    this.carpetasEvaluaciones = [];
    this.carpetasAbiertas.clear();
    this.estudianteSeleccionado = alumno;
    this.modalAbierto = true;
    this.cargandoDetalle = true;

    // Intentamos cargar evaluaciones reales del backend
    if (alumno.id_usuario) {
      this.academicService.getDetalleEstudiante(alumno.id_usuario).subscribe({
        next: (resp: any) => {
          if (resp && resp.data && resp.data.evaluaciones && resp.data.evaluaciones.length > 0) {
            this.estudianteSeleccionado.evaluaciones = resp.data.evaluaciones.map((e: any) => ({
              id_evaluacion: e.id_evaluacion,
              caso: e.titulo_caso,
              dificultad: e.nivel_dificultad,
              id_ejercicio: e.id_ejercicio || 0,
              ejercicio: e.ejercicio || 'Casos individuales',
              precision_ia: Number(e.concordancia_ia) || 0, // 0 % es un resultado válido, no debe caer al promedio del alumno
              tiempo: `${e.tiempo_analisis_segundos || 45}s`,
              justificacion: e.justificacion_clinica || 'Sin justificación registrada',
              fecha: e.fecha_evaluacion ? e.fecha_evaluacion.split('T')[0] : '2026-08-15',
              hallazgos: e.hallazgos_seleccionados,
              comentarios: []
            }));
            
            this.armarCarpetas(this.estudianteSeleccionado.evaluaciones);

            // Cargar comentarios para cada evaluación
            this.estudianteSeleccionado.evaluaciones.forEach((ev: any) => {
               if(ev.id_evaluacion) {
                 this.extraService.getComentariosEvaluacion(ev.id_evaluacion).subscribe({
                    next: (res: any) => {
                      if(res.data) ev.comentarios = res.data;
                      this.cdr.detectChanges();
                    }
                 });
               }
            });
          }
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.cargandoDetalle = false;
    }
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.estudianteSeleccionado = null;
    this.evaluacionComentarioActiva = null;
  }
  
  // --- MÉTODOS PARA COMENTARIOS ---
  activarComentario(evaluacion: any) {
    this.evaluacionComentarioActiva = evaluacion;
    this.nuevoComentarioTexto = '';
  }

  enviarComentario() {
    if(!this.nuevoComentarioTexto.trim() || !this.evaluacionComentarioActiva) return;
    
    this.guardandoComentario = true;
    this.extraService.agregarComentario(this.evaluacionComentarioActiva.id_evaluacion, this.nuevoComentarioTexto).subscribe({
      next: (res) => {
        if(res.data) {
           this.evaluacionComentarioActiva.comentarios.push({
             comentario: this.nuevoComentarioTexto,
             catedratico: 'Tú', // Visualmente local
             fecha_comentario: new Date().toISOString()
           });
        }
        this.nuevoComentarioTexto = '';
        this.guardandoComentario = false;
        this.evaluacionComentarioActiva = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al guardar comentario:", err);
        this.guardandoComentario = false;
      }
    });
  }

  // --- MÉTODOS PARA REGISTRAR ALUMNO ---

  abrirModalRegistro(): void {
    this.mensajeRegistroExito = '';
    this.mensajeRegistroError = '';
    this.nuevoAlumno = {
      nombre_completo: '',
      correo_electronico: '',
      contrasena: ''
    };
    this.modalCrearAlumnoAbierto = true;
  }

  cerrarModalRegistro(): void {
    this.modalCrearAlumnoAbierto = false;
  }

  guardarNuevoAlumno(): void {
    if (!this.nuevoAlumno.nombre_completo || !this.nuevoAlumno.correo_electronico || !this.nuevoAlumno.contrasena) {
      this.mensajeRegistroError = 'Por favor, complete todos los campos obligatorios.';
      return;
    }

    this.guardandoAlumno = true;
    this.mensajeRegistroError = '';
    this.mensajeRegistroExito = '';

    const datosRegistro = {
      id_rol: 2, // 2 = Estudiante
      nombre_completo: this.nuevoAlumno.nombre_completo,
      correo_electronico: this.nuevoAlumno.correo_electronico,
      contrasena: this.nuevoAlumno.contrasena
    };

    // 1. Registrar al usuario en Auth
    this.authService.registrarEstudiante(datosRegistro).subscribe({
      next: (respAuth: any) => {
        const idNuevoUsuario = respAuth.data?.id_usuario;
        
        if (idNuevoUsuario) {
          // Obtener los cursos del catedrático para asignarlo a su primer curso
          this.academicService.getMisCursos().subscribe({
            next: (respCursos: any) => {
              const cursos = respCursos.data || [];
              const idCursoAsignar = cursos.length > 0 ? cursos[0].id_curso : 1; // Fallback al 1 si no tiene cursos

              // 2. Asignarlo al curso dinámicamente
              this.academicService.asignarEstudiante(idCursoAsignar, idNuevoUsuario).subscribe({
                next: () => {
                  this.guardandoAlumno = false;
                  this.mensajeRegistroExito = '¡Alumno registrado y asignado a tu sección exitosamente!';
                  
                  // Recargar la tabla para mostrar al nuevo alumno
                  this.cargarDatosReales();

                  setTimeout(() => {
                    this.cerrarModalRegistro();
                  }, 1500);
                },
                error: (err) => {
                  this.guardandoAlumno = false;
                  this.mensajeRegistroError = 'El alumno fue creado, pero ocurrió un error al asignarlo al curso.';
                  console.error('Error asignando al curso:', err);
                  this.cdr.detectChanges();
                }
              });
            },
            error: (err) => {
              this.guardandoAlumno = false;
              this.mensajeRegistroError = 'El alumno fue creado, pero no se pudo obtener tu sección para asignarlo.';
              console.error('Error obteniendo cursos:', err);
              this.cdr.detectChanges();
            }
          });
        }
      },
      error: (err) => {
        this.guardandoAlumno = false;
        this.mensajeRegistroError = err.error?.message || 'Error al intentar registrar al alumno. El correo podría estar en uso.';
        console.error('Error en registro:', err);
        this.cdr.detectChanges();
      }
    });
  }

  // --- MÉTODOS PARA MÉTRICAS LIKERT ---
  
  abrirModalLikert(): void {
    this.modalLikertAbierto = true;
    this.cargandoLikert = true;
    
    this.academicService.getResultadosLikert().subscribe({
      next: (resp: any) => {
        if (resp.data && resp.data.length > 0) {
          this.metricasLikert = resp.data;
          const sumaPromedios = this.metricasLikert.reduce((acc, curr) => acc + parseFloat(curr.promedio), 0);
          this.promedioGlobalLikert = (sumaPromedios / this.metricasLikert.length).toFixed(1) as unknown as number;
        } else {
          this.metricasLikert = [];
          this.promedioGlobalLikert = 0;
        }
        this.cargandoLikert = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar métricas Likert:', err);
        this.cargandoLikert = false;
        this.cdr.detectChanges();
      }
    });
  }

  cerrarModalLikert(): void {
    this.modalLikertAbierto = false;
  }
}
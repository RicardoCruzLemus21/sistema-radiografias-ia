import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic';
import { AuthService } from '../../services/auth';
import { ExtraService } from '../../services/extra';

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosReales();
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

  abrirDetalleEstudiante(alumno: any): void {
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
              precision_ia: e.concordancia_ia || alumno.precision,
              tiempo: `${e.tiempo_analisis_segundos || 45}s`,
              justificacion: e.justificacion_clinica || 'Sin justificación registrada',
              fecha: e.fecha_evaluacion ? e.fecha_evaluacion.split('T')[0] : '2026-08-15',
              hallazgos: e.hallazgos_seleccionados,
              comentarios: []
            }));
            
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
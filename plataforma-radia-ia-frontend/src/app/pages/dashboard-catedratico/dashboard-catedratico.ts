import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic';
import { AuthService } from '../../services/auth';

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

  constructor(
    private academicService: AcademicService,
    private authService: AuthService,
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
              caso: e.titulo_caso,
              dificultad: e.nivel_dificultad,
              precision_ia: e.concordancia_ia || alumno.precision,
              tiempo: `${e.tiempo_analisis_segundos || 45}s`,
              justificacion: e.justificacion_clinica || 'Sin justificación registrada',
              fecha: e.fecha_evaluacion ? e.fecha_evaluacion.split('T')[0] : '2026-08-15',
              hallazgos: e.hallazgos_seleccionados
            }));
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
          // 2. Asignarlo al curso 1 (Radiología Médica)
          this.academicService.asignarEstudiante(1, idNuevoUsuario).subscribe({
            next: () => {
              this.guardandoAlumno = false;
              this.mensajeRegistroExito = '¡Alumno registrado y asignado al curso exitosamente!';
              
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
}
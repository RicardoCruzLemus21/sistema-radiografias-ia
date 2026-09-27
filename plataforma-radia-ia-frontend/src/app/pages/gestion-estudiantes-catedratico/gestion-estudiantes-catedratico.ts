import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic';
import { AuthService } from '../../services/auth';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-gestion-estudiantes-catedratico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-estudiantes-catedratico.html',
  styleUrl: './gestion-estudiantes-catedratico.css'
})
export class GestionEstudiantesCatedraticoComponent implements OnInit {
  alumnos: any[] = [];
  alumnosFiltrados: any[] = [];
  filtroTexto: string = '';
  cargando: boolean = false;

  // Si el backend falla, se avisa: sin esto, la tabla vacía o "mi curso" en blanco se ve como
  // si el docente de verdad no tuviera estudiantes o curso asignado.
  errorCarga: string | null = null;
  errorCurso: string | null = null;

  // --- MI CURSO ---
  // Estándar de periodos académicos: cubre las 3 formas en que se organiza un ciclo (no se deja
  // como texto libre para que no queden cursos con "Semestre 1", "1er semestre", "Sem I", etc.)
  readonly TIPOS_CICLO = [
    'Primer Bimestre', 'Segundo Bimestre', 'Tercer Bimestre', 'Cuarto Bimestre',
    'Primer Trimestre', 'Segundo Trimestre', 'Tercer Trimestre',
    'Primer Semestre', 'Segundo Semestre'
  ];
  misCursos: any[] = [];
  cursoActual: any = null;
  modalEditarCursoAbierto: boolean = false;
  guardandoCurso: boolean = false;
  cursoEditando: any = { id_curso: null, nombre_curso: '', semestre: '', anio: null };

  // --- EDITAR/ELIMINAR ESTUDIANTE ---
  modalEditarAlumnoAbierto: boolean = false;
  guardandoEdicionAlumno: boolean = false;
  alumnoEditando: any = { id_usuario: null, nombre_completo: '', correo_electronico: '' };

  modalEliminarAlumnoAbierto: boolean = false;
  eliminandoAlumno: boolean = false;
  alumnoAEliminar: any = null;

  constructor(
    private academicService: AcademicService,
    private authService: AuthService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarMiCurso();
  }

  // --- MI CURSO ---
  cargarMiCurso(): void {
    this.errorCurso = null;
    this.academicService.getMisCursos().subscribe({
      next: (resp: any) => {
        this.misCursos = resp.data || [];
        this.cursoActual = this.misCursos.length > 0 ? this.misCursos[0] : null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error obteniendo el curso del catedrático:', err);
        this.errorCurso = 'No se pudo cargar tu curso. Puede que sí tengas uno asignado.';
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalEditarCurso(): void {
    if (!this.cursoActual) return;
    this.cursoEditando = {
      id_curso: this.cursoActual.id_curso,
      nombre_curso: this.cursoActual.nombre_curso,
      semestre: this.cursoActual.semestre,
      anio: this.cursoActual.anio
    };
    this.modalEditarCursoAbierto = true;
  }

  cerrarModalEditarCurso(): void {
    this.modalEditarCursoAbierto = false;
  }

  guardarEdicionCurso(): void {
    if (!this.cursoEditando.nombre_curso) return;
    this.guardandoCurso = true;
    this.academicService.editarCurso(this.cursoEditando.id_curso, this.cursoEditando).subscribe({
      next: () => {
        this.guardandoCurso = false;
        this.cerrarModalEditarCurso();
        this.alertService.success('Curso actualizado', 'Los datos del curso se guardaron correctamente.');
        this.cargarMiCurso();
      },
      error: (err) => {
        this.guardandoCurso = false;
        this.alertService.error('Error', err.error?.message || 'No se pudo actualizar el curso.');
      }
    });
  }

  // --- EDITAR/ELIMINAR ESTUDIANTE ---
  abrirModalEditarAlumno(alumno: any): void {
    this.alumnoEditando = {
      id_usuario: alumno.id_usuario,
      nombre_completo: alumno.nombre,
      correo_electronico: alumno.correo
    };
    this.modalEditarAlumnoAbierto = true;
  }

  cerrarModalEditarAlumno(): void {
    this.modalEditarAlumnoAbierto = false;
  }

  guardarEdicionAlumno(): void {
    if (!this.alumnoEditando.nombre_completo || !this.alumnoEditando.correo_electronico) return;
    this.guardandoEdicionAlumno = true;
    this.academicService.editarEstudiante(this.alumnoEditando.id_usuario, this.alumnoEditando).subscribe({
      next: () => {
        this.guardandoEdicionAlumno = false;
        this.cerrarModalEditarAlumno();
        this.alertService.success('Estudiante actualizado', 'Los datos se guardaron correctamente.');
        this.cargarDatos();
      },
      error: (err) => {
        this.guardandoEdicionAlumno = false;
        this.alertService.error('Error', err.error?.message || 'No se pudo actualizar al estudiante.');
      }
    });
  }

  abrirModalEliminarAlumno(alumno: any): void {
    this.alumnoAEliminar = alumno;
    this.modalEliminarAlumnoAbierto = true;
  }

  cerrarModalEliminarAlumno(): void {
    this.modalEliminarAlumnoAbierto = false;
    this.alumnoAEliminar = null;
  }

  confirmarEliminarAlumno(): void {
    if (!this.alumnoAEliminar) return;
    this.eliminandoAlumno = true;
    this.academicService.eliminarEstudiante(this.alumnoAEliminar.id_usuario).subscribe({
      next: () => {
        this.eliminandoAlumno = false;
        this.cerrarModalEliminarAlumno();
        this.alertService.success('Estudiante eliminado', 'El estudiante fue desvinculado de tu sección.');
        this.cargarDatos();
      },
      error: (err) => {
        this.eliminandoAlumno = false;
        this.cerrarModalEliminarAlumno();
        this.alertService.error('Error al eliminar', err.error?.message || 'No se pudo eliminar al estudiante.');
      }
    });
  }

  cargarDatos(): void {
    this.cargando = true;
    this.errorCarga = null;
    this.academicService.getResumenGeneral().subscribe({
      next: (respuesta: any) => {
        const datos = respuesta.data || respuesta;
        if (datos && datos.alumnos) {
          this.alumnos = datos.alumnos;
        }
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando estudiantes:', err);
        this.errorCarga = 'No se pudo cargar la lista de estudiantes.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
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
    this.alumnosFiltrados = res;
  }

  // --- REGISTRO ---
  modalCrearAlumnoAbierto: boolean = false;
  guardandoAlumno: boolean = false;
  mensajeRegistroExito: string = '';
  mensajeRegistroError: string = '';
  nuevoAlumno = {
    carnet: '',
    nombre_completo: '',
    correo_electronico: '',
    contrasena: ''
  };

  abrirModalRegistro(): void {
    this.mensajeRegistroExito = '';
    this.mensajeRegistroError = '';
    this.nuevoAlumno = { carnet: '', nombre_completo: '', correo_electronico: '', contrasena: '' };
    this.modalCrearAlumnoAbierto = true;
  }
  cerrarModalRegistro(): void { this.modalCrearAlumnoAbierto = false; }

  guardarNuevoAlumno(): void {
    if (!this.nuevoAlumno.carnet || !this.nuevoAlumno.nombre_completo || !this.nuevoAlumno.correo_electronico || !this.nuevoAlumno.contrasena) {
      this.mensajeRegistroError = 'Complete todos los campos.';
      return;
    }
    
    const regexCarnet = /^\d{4}-\d{2}-\d{4}$/;
    if (!regexCarnet.test(this.nuevoAlumno.carnet)) {
      this.mensajeRegistroError = 'El carnet debe tener el formato XXXX-XX-XXXX';
      return;
    }

    this.guardandoAlumno = true;
    this.mensajeRegistroError = '';
    this.mensajeRegistroExito = '';

    const datosRegistro = {
      carnet: this.nuevoAlumno.carnet,
      id_rol: 2,
      nombre_completo: this.nuevoAlumno.nombre_completo,
      correo_electronico: this.nuevoAlumno.correo_electronico,
      contrasena: this.nuevoAlumno.contrasena
    };

    this.authService.registrarEstudiante(datosRegistro).subscribe({
      next: (respAuth: any) => {
        const idNuevoUsuario = respAuth.data?.id_usuario;
        if (idNuevoUsuario) {
          this.academicService.getMisCursos().subscribe({
            next: (respCursos: any) => {
              const cursos = respCursos.data || [];
              const idCursoAsignar = cursos.length > 0 ? cursos[0].id_curso : 1;
              this.academicService.asignarEstudiante(idCursoAsignar, idNuevoUsuario, this.nuevoAlumno.contrasena).subscribe({
                next: () => {
                  this.guardandoAlumno = false;
                  this.mensajeRegistroExito = 'Alumno registrado exitosamente.';
                  this.cdr.detectChanges();
                  this.cargarDatos();
                  setTimeout(() => this.cerrarModalRegistro(), 1500);
                },
                error: (err) => {
                  this.guardandoAlumno = false;
                  this.mensajeRegistroError = 'Error al asignar sección.';
                  this.cdr.detectChanges();
                }
              });
            },
            error: () => {
              this.guardandoAlumno = false;
              this.mensajeRegistroError = 'Error obteniendo cursos.';
              this.cdr.detectChanges();
            }
          });
        }
      },
      error: (err) => {
        this.guardandoAlumno = false;
        this.mensajeRegistroError = err.error?.message || 'Error al registrar (correo duplicado).';
        this.cdr.detectChanges();
      }
    });
  }
}

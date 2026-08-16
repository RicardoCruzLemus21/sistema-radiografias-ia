import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../services/academic';
import { AuthService } from '../../services/auth';

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

  // Registrar Alumno
  modalCrearAlumnoAbierto: boolean = false;
  guardandoAlumno: boolean = false;
  mensajeRegistroExito: string = '';
  mensajeRegistroError: string = '';
  nuevoAlumno = {
    nombre_completo: '',
    correo_electronico: '',
    contrasena: ''
  };

  // Editar Alumno
  modalEditarAbierto: boolean = false;
  alumnoEditando: any = null;
  guardandoEdicion: boolean = false;

  // Eliminar Alumno
  modalEliminarAbierto: boolean = false;
  alumnoAEliminar: any = null;
  eliminando: boolean = false;

  constructor(
    private academicService: AcademicService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
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
  abrirModalRegistro(): void {
    this.mensajeRegistroExito = '';
    this.mensajeRegistroError = '';
    this.nuevoAlumno = { nombre_completo: '', correo_electronico: '', contrasena: '' };
    this.modalCrearAlumnoAbierto = true;
  }
  cerrarModalRegistro(): void { this.modalCrearAlumnoAbierto = false; }

  guardarNuevoAlumno(): void {
    if (!this.nuevoAlumno.nombre_completo || !this.nuevoAlumno.correo_electronico || !this.nuevoAlumno.contrasena) {
      this.mensajeRegistroError = 'Complete todos los campos.';
      return;
    }
    this.guardandoAlumno = true;
    this.mensajeRegistroError = '';
    this.mensajeRegistroExito = '';

    const datosRegistro = {
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
              this.academicService.asignarEstudiante(idCursoAsignar, idNuevoUsuario).subscribe({
                next: () => {
                  this.guardandoAlumno = false;
                  this.mensajeRegistroExito = 'Alumno registrado exitosamente.';
                  this.cargarDatos();
                  setTimeout(() => this.cerrarModalRegistro(), 1500);
                },
                error: (err) => {
                  this.guardandoAlumno = false;
                  this.mensajeRegistroError = 'Error al asignar sección.';
                }
              });
            },
            error: () => {
              this.guardandoAlumno = false;
              this.mensajeRegistroError = 'Error obteniendo cursos.';
            }
          });
        }
      },
      error: (err) => {
        this.guardandoAlumno = false;
        this.mensajeRegistroError = err.error?.message || 'Error al registrar (correo duplicado).';
      }
    });
  }

  // --- EDICIÓN ---
  abrirModalEditar(alumno: any): void {
    this.alumnoEditando = { ...alumno, nombre_completo: alumno.nombre, correo_electronico: alumno.correo };
    this.modalEditarAbierto = true;
  }
  cerrarModalEditar(): void { this.modalEditarAbierto = false; }

  guardarEdicion(): void {
    this.guardandoEdicion = true;
    const datos = {
      nombre_completo: this.alumnoEditando.nombre_completo,
      correo_electronico: this.alumnoEditando.correo_electronico
    };
    
    this.academicService.editarEstudiante(this.alumnoEditando.id_usuario, datos).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.cerrarModalEditar();
        this.cargarDatos();
      },
      error: (err) => {
        console.error('Error al editar:', err);
        this.guardandoEdicion = false;
      }
    });
  }

  // --- ELIMINAR ---
  abrirModalEliminar(alumno: any): void {
    this.alumnoAEliminar = alumno;
    this.modalEliminarAbierto = true;
  }
  cerrarModalEliminar(): void { this.modalEliminarAbierto = false; }

  confirmarEliminar(): void {
    this.eliminando = true;
    this.academicService.eliminarEstudiante(this.alumnoAEliminar.id_usuario).subscribe({
      next: () => {
        this.eliminando = false;
        this.cerrarModalEliminar();
        this.cargarDatos();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.eliminando = false;
      }
    });
  }
}

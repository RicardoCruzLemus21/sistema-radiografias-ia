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

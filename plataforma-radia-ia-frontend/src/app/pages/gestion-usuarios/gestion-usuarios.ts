import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth';
import { AcademicService } from '../../services/academic';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css'
})
export class GestionUsuariosComponent implements OnInit {
  usuarios: any[] = [];
  usuariosCargados: any[] = []; // Data original
  cargando: boolean = false;

  filtroBusqueda: string = '';

  // Agrupaciones
  adminUsuarios: any[] = [];
  catedraticosUsuarios: any[] = [];
  estudiantesPorCatedratico: { [key: string]: any[] } = {};
  infoCatedraticos: { [key: string]: any } = {};
  catedraticosList: string[] = [];
  estudiantesSinAsignar: any[] = [];
  resultadosBusquedaPlana: any[] = [];
  rolesList: any[] = [];

  // IDs dinámicos
  idRolAdmin: number = 0;
  idRolCatedratico: number = 0;
  idRolEstudiante: number = 0;

  modalEditarAbierto: boolean = false;
  usuarioEditando: any = { id: null, carnet: '', nombre_completo: '', email: '', password: '', id_rol: 2 };
  guardandoEdicion: boolean = false;

  modalEliminarAbierto: boolean = false;
  usuarioAEliminar: any = null;
  eliminandoUsuario: boolean = false;

  // Registro de nuevo usuario
  modalRegistroAbierto: boolean = false;
  guardandoRegistro: boolean = false;
  mensajeRegistroExito: string = '';
  mensajeRegistroError: string = '';
  nuevoUsuario = {
    carnet: '',
    nombre_completo: '',
    correo_electronico: '',
    contrasena: '',
    id_rol: 0, // Se asignará dinámicamente
    id_catedratico: '',
    id_curso: '',
    nombre_curso_asignar: ''
  };

  cursosDisponibles: any[] = [];
  catalogoCursos: any[] = [];

  constructor(
    private userService: UserService, 
    private authService: AuthService,
    private academicService: AcademicService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarRoles();
    this.cargarUsuarios();
    this.cargarCatalogoCursos();
  }

  cargarRoles(): void {
    this.authService.getRoles().subscribe({
      next: (res) => {
        this.rolesList = res.data || [];
        this.rolesList.forEach(r => {
          const nombreFormateado = r.nombre_rol.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (nombreFormateado.includes('admin')) this.idRolAdmin = r.id_rol;
          else if (nombreFormateado.includes('catedr') || nombreFormateado.includes('docen')) this.idRolCatedratico = r.id_rol;
          else if (nombreFormateado.includes('estud')) this.idRolEstudiante = r.id_rol;
        });
        // Default a estudiante
        if (this.idRolEstudiante !== 0) {
           this.nuevoUsuario.id_rol = this.idRolEstudiante;
           this.usuarioEditando.id_rol = this.idRolEstudiante;
        }

        // Prevenir race condition: Si los usuarios cargaron antes que los roles, re-filtrar
        if (this.usuariosCargados.length > 0) {
          this.aplicarFiltros();
        }
      },
      error: (err) => console.error('Error al cargar roles:', err)
    });
  }

  cargarCatalogoCursos(): void {
    this.academicService.getCatalogoCursos().subscribe({
      next: (res) => {
        this.catalogoCursos = res.data || [];
      },
      error: (err) => console.error('Error al cargar catálogo de cursos:', err)
    });
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.userService.getUsuarios().subscribe({
      next: (resp) => {
        this.usuariosCargados = resp.data || [];
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  aplicarFiltros(): void {
    const texto = this.filtroBusqueda.toLowerCase().trim();
    let filtrados = this.usuariosCargados;

    if (texto) {
      filtrados = this.usuariosCargados.filter(u => 
        (u.nombre && u.nombre.toLowerCase().includes(texto)) ||
        (u.email && u.email.toLowerCase().includes(texto)) ||
        (u.id && u.id.toString().includes(texto)) ||
        (u.nombre_curso && u.nombre_curso.toLowerCase().includes(texto))
      );
    }

    this.adminUsuarios = [];
    this.catedraticosUsuarios = [];
    this.estudiantesPorCatedratico = {};
    this.infoCatedraticos = {};
    this.catedraticosList = [];
    this.estudiantesSinAsignar = [];
    this.resultadosBusquedaPlana = filtrados;

    filtrados.forEach(u => {
      if (u.id_rol === this.idRolAdmin && this.idRolAdmin !== 0) {
        this.adminUsuarios.push(u);
      } else if (u.id_rol === this.idRolCatedratico && this.idRolCatedratico !== 0) {
        this.catedraticosUsuarios.push(u);
      } else if (u.id_rol === this.idRolEstudiante && this.idRolEstudiante !== 0) {
        if (!u.nombre_catedratico) {
          this.estudiantesSinAsignar.push(u);
        } else {
          if (!this.estudiantesPorCatedratico[u.nombre_catedratico]) {
            this.estudiantesPorCatedratico[u.nombre_catedratico] = [];
            this.infoCatedraticos[u.nombre_catedratico] = {
              carnet: u.carnet_catedratico,
              email: u.correo_catedratico,
              curso: u.nombre_curso
            };
            this.catedraticosList.push(u.nombre_catedratico);
          }
          this.estudiantesPorCatedratico[u.nombre_catedratico].push(u);
        }
      } else {
        // En caso de que exista un rol desconocido o no estén cargados aún
        this.estudiantesSinAsignar.push(u);
      }
    });
  }

  abrirModalEditar(usuario: any): void {
    this.usuarioEditando = {
      id: usuario.id,
      carnet: usuario.carnet || '',
      nombre_completo: usuario.nombre,
      email: usuario.email,
      password: '', // Campo vacío por defecto
      id_rol: usuario.id_rol
    };
    this.modalEditarAbierto = true;
  }

  cerrarModalEditar(): void {
    this.modalEditarAbierto = false;
  }

  guardarEdicion(): void {
    if (!this.usuarioEditando.nombre_completo || !this.usuarioEditando.email) return;
    this.guardandoEdicion = true;
    this.userService.editarUsuario(this.usuarioEditando.id, this.usuarioEditando).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.cerrarModalEditar();
        this.cargarUsuarios();
      },
      error: (err) => {
        console.error('Error editando usuario', err);
        this.guardandoEdicion = false;
      }
    });
  }

  abrirModalEliminar(usuario: any): void {
    this.usuarioAEliminar = usuario;
    this.modalEliminarAbierto = true;
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto = false;
    this.usuarioAEliminar = null;
  }

  confirmarEliminar(): void {
    this.eliminandoUsuario = true;
    this.userService.eliminarUsuario(this.usuarioAEliminar.id).subscribe({
      next: () => {
        this.eliminandoUsuario = false;
        this.cerrarModalEliminar();
        this.cargarUsuarios();
      },
      error: (err) => {
        this.eliminandoUsuario = false;
        alert(err.error?.message || 'Error al eliminar usuario. Puede que tenga evaluaciones o cursos asociados.');
      }
    });
  }

  // --- REGISTRO DE USUARIO ---
  abrirModalRegistro(): void {
    this.mensajeRegistroExito = '';
    this.mensajeRegistroError = '';
    this.nuevoUsuario = { carnet: '', nombre_completo: '', correo_electronico: '', contrasena: '', id_rol: this.idRolEstudiante, id_catedratico: '', id_curso: '', nombre_curso_asignar: '' };
    this.cursosDisponibles = [];
    this.modalRegistroAbierto = true;
  }

  onCatedraticoChange(): void {
    this.nuevoUsuario.id_curso = '';
    this.cursosDisponibles = [];
    if (this.nuevoUsuario.id_catedratico) {
      this.academicService.getCursosPorCatedratico(this.nuevoUsuario.id_catedratico).subscribe({
        next: (res) => {
          this.cursosDisponibles = res.data || [];
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error cargando cursos del catedrático:', err)
      });
    }
  }

  cerrarModalRegistro(): void {
    this.modalRegistroAbierto = false;
  }

  guardarNuevoUsuario(): void {
    if (!this.nuevoUsuario.carnet || !this.nuevoUsuario.nombre_completo || !this.nuevoUsuario.correo_electronico || !this.nuevoUsuario.contrasena) {
      this.mensajeRegistroError = 'Por favor, complete todos los campos requeridos.';
      return;
    }
    
    // Validar formato de carnet (XXXX-XX-XXXX)
    const regexCarnet = /^\d{4}-\d{2}-\d{4}$/;
    if (!regexCarnet.test(this.nuevoUsuario.carnet)) {
      this.mensajeRegistroError = 'El carnet debe tener el formato XXXX-XX-XXXX';
      return;
    }

    // Si es estudiante, validar que haya seleccionado catedrático y curso
    if (Number(this.nuevoUsuario.id_rol) === this.idRolEstudiante) {
      if (!this.nuevoUsuario.id_catedratico || !this.nuevoUsuario.id_curso) {
        this.mensajeRegistroError = 'Para registrar un Estudiante, debe seleccionar un Catedrático y un Curso.';
        return;
      }
    }

    // Si es catedrático, validar curso asignado
    if (Number(this.nuevoUsuario.id_rol) === this.idRolCatedratico) {
      if (!this.nuevoUsuario.nombre_curso_asignar) {
        this.mensajeRegistroError = 'Para registrar un Catedrático, debe seleccionar un Curso que impartirá.';
        return;
      }
    }

    this.guardandoRegistro = true;
    this.mensajeRegistroError = '';
    this.mensajeRegistroExito = '';

    const payload = {
      carnet: this.nuevoUsuario.carnet,
      id_rol: Number(this.nuevoUsuario.id_rol),
      nombre_completo: this.nuevoUsuario.nombre_completo,
      correo_electronico: this.nuevoUsuario.correo_electronico,
      contrasena: this.nuevoUsuario.contrasena,
      nombre_curso_asignar: this.nuevoUsuario.nombre_curso_asignar
    };

    // Usamos el authService para registrar cualquier tipo de usuario en el endpoint general
    this.authService.registrarEstudiante(payload).subscribe({
      next: (respAuth: any) => {
        const idNuevoUsuario = respAuth.data?.id_usuario;

        // Si es estudiante y se proporcionó un curso, asignarlo
        if (Number(this.nuevoUsuario.id_rol) === this.idRolEstudiante && this.nuevoUsuario.id_curso && idNuevoUsuario) {
          this.academicService.asignarEstudiante(Number(this.nuevoUsuario.id_curso), idNuevoUsuario, this.nuevoUsuario.contrasena).subscribe({
            next: () => {
              this.finalizarRegistroExitoso('Usuario creado y asignado al curso exitosamente.');
            },
            error: (err) => {
              this.guardandoRegistro = false;
              this.mensajeRegistroError = 'El usuario se creó, pero hubo un error al asignarle el curso.';
              this.cdr.detectChanges();
            }
          });
        } else {
          // No es estudiante o no se requirió curso
          this.finalizarRegistroExitoso('Usuario creado exitosamente.');
        }
      },
      error: (err) => {
        this.guardandoRegistro = false;
        this.mensajeRegistroError = err.error?.message || 'Error al registrar el usuario.';
        this.cdr.detectChanges();
      }
    });
  }

  private finalizarRegistroExitoso(mensaje: string): void {
    this.guardandoRegistro = false;
    this.mensajeRegistroExito = mensaje;
    this.cdr.detectChanges();
    this.cargarUsuarios();
    setTimeout(() => this.cerrarModalRegistro(), 1500);
  }
}

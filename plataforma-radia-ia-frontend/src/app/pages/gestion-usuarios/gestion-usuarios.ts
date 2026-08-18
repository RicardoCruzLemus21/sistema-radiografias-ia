import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css'
})
export class GestionUsuariosComponent implements OnInit {
  usuarios: any[] = [];
  cargando: boolean = false;

  modalEditarAbierto: boolean = false;
  usuarioEditando: any = { id: null, nombre_completo: '', email: '', password: '', id_rol: 2 };
  guardandoEdicion: boolean = false;

  modalEliminarAbierto: boolean = false;
  usuarioAEliminar: any = null;
  eliminandoUsuario: boolean = false;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.userService.getUsuarios().subscribe({
      next: (resp) => {
        this.usuarios = resp.data || [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.cargando = false;
      }
    });
  }

  abrirModalEditar(usuario: any): void {
    this.usuarioEditando = {
      id: usuario.id,
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
}

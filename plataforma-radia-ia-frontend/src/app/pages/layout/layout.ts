import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SystemRoles } from '../../auth/roles.enum';

// CORRECCIÓN: Apuntamos exactamente a 'auth' (auth.ts)
import { AuthService } from '../../services/auth'; 

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})

export class LayoutComponent implements OnInit {
  nombreUsuarioActual: string = ''; // Nueva variable
  rolUsuarioActual: string = '';
  rolesPermitidos = SystemRoles;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Obtenemos el rol
    this.rolUsuarioActual = this.authService.getRolUsuario();
    
    // 2. Leemos el objeto completo del usuario desde el localStorage
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      const usuarioObj = JSON.parse(usuarioStr);
      // Asignamos el nombre completo que viene de la base de datos
      this.nombreUsuarioActual = usuarioObj.nombre_completo; 
    }
  }

  cerrarSesion() {
    this.authService.logout(); 
    this.router.navigate(['/login']); 
  }
}
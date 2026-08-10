import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth'; 
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// 1. Importamos el enumerador de roles que creamos anteriormente
import { SystemRoles } from '../roles.enum'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  correo: string = '';
  contrasena: string = '';
  errorMensaje: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  iniciarSesion() {
    this.authService.login(this.correo, this.contrasena).subscribe({
      next: (res) => {
        console.log('Login exitoso, token guardado');
        
        const rolUsuario = this.authService.getRolUsuario() || '';
        
        // DEPURACIÓN: Esto nos dirá exactamente qué llega de la tabla Roles
        console.log('ROL RECIBIDO DESDE MYSQL:', rolUsuario); 

        // Normalizamos el string a minúsculas para evitar fallos por tildes o mayúsculas
        const rolNormalizado = rolUsuario.toLowerCase();

        // Validación más flexible
        if (rolNormalizado.includes('catedr') || rolNormalizado.includes('admin')) {
          this.router.navigate(['/sistema/catedratico']);
        } else {
          this.router.navigate(['/sistema/estudiante']);
        }
      },
      error: (err) => {
        this.errorMensaje = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        console.error('Error en autenticación:', err);
      }
    });
  }
}
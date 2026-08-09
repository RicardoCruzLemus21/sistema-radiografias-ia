import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth'; 
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
    // ==========================================
    // BYPASS TEMPORAL PARA MAQUETACIÓN DE UI
    // ==========================================
    // Nos saltamos la verificación del backend para poder ver el diseño del layout.
    this.router.navigate(['/sistema/estudiante']); 
    
    /* 
    // ESTA ES LA LÓGICA REAL (La descomentaremos cuando encendamos Node.js)
    this.authService.login(this.correo, this.contrasena).subscribe({
      next: (res) => {
        console.log('Login exitoso, token guardado');
        this.router.navigate(['/sistema/estudiante']); 
      },
      error: (err) => {
        this.errorMensaje = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        console.error(err);
      }
    });
    */
  }
}
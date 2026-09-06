import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
  correo: string = '';
  contrasena: string = '';
  errorMensaje: string = '';
  cargando: boolean = false;

  requiereCambioClave: boolean = false;
  nuevaContrasena: string = '';
  confirmarContrasena: string = '';

  temaActual: string = 'darkglass';

  constructor(
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedTheme = localStorage.getItem('radia_theme');
    if (savedTheme) {
      this.temaActual = savedTheme;
      document.documentElement.setAttribute('data-theme', this.temaActual);
    } else {
      document.documentElement.setAttribute('data-theme', 'darkglass');
    }
  }

  toggleTema() {
    this.temaActual = this.temaActual === 'darkglass' ? 'light' : 'darkglass';
    document.documentElement.setAttribute('data-theme', this.temaActual);
    localStorage.setItem('radia_theme', this.temaActual);
  }

  limpiarError() {
    this.errorMensaje = '';
  }

  iniciarSesion() {
    this.cargando = true;
    this.errorMensaje = '';

    if (!this.correo || !this.contrasena) {
      this.errorMensaje = 'Por favor, ingrese su correo electrónico y contraseña.';
      this.cargando = false;
      return;
    }

    this.authService.login(this.correo, this.contrasena).subscribe({
      next: (res) => {
        this.cargando = false;
        
        if (res.data && res.data.requiere_cambio_clave) {
          this.requiereCambioClave = true;
          this.cdr.detectChanges();
          return;
        }

        console.log('Login exitoso:', res);
        
        if (this.authService.isCatedratico()) {
          this.router.navigate(['/sistema/catedratico']);
        } else {
          this.router.navigate(['/sistema/estudiante']);
        }
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = err.error?.message || 'Credenciales inválidas. Verifica tu correo y contraseña.';
        console.error('Error en autenticación:', err);
        this.cdr.detectChanges(); // Forzar actualización de la vista
      }
    });
  }

  cambiarContrasena() {
    this.errorMensaje = '';
    if (this.nuevaContrasena !== this.confirmarContrasena) {
      this.errorMensaje = 'Las contraseñas no coinciden.';
      return;
    }
    if (this.nuevaContrasena.length < 6) {
      this.errorMensaje = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.cargando = true;
    this.authService.cambiarClaveInicial(this.nuevaContrasena).subscribe({
      next: () => {
        this.cargando = false;
        // Redirigir al dashboard correspondiente
        if (this.authService.isCatedratico()) {
          this.router.navigate(['/sistema/catedratico']);
        } else {
          this.router.navigate(['/sistema/estudiante']);
        }
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = err.error?.message || 'Error al cambiar la contraseña.';
        this.cdr.detectChanges();
      }
    });
  }
}
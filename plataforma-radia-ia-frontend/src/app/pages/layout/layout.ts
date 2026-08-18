import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth'; 
import { ExtraService } from '../../services/extra';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent implements OnInit {
  nombreUsuarioActual: string = 'Usuario';
  rolUsuarioActual: string = '';
  isCatedratico: boolean = false;
  isEstudiante: boolean = false;
  notificacionesNoLeidas: number = 0;
  temaActual: string = 'cyan';

  constructor(
    private authService: AuthService,
    private extraService: ExtraService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.cargarTema();
  }

  cargarDatosUsuario(): void {
    this.rolUsuarioActual = this.authService.getRolUsuario();
    this.nombreUsuarioActual = this.authService.getNombreUsuario();
    this.isCatedratico = this.authService.isCatedratico();
    this.isEstudiante = this.authService.isEstudiante();

    if (this.isEstudiante) {
      this.cargarNotificaciones();
    }
  }

  cargarNotificaciones(): void {
    this.extraService.getNotificaciones().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          const noLeidas = res.data.filter((n: any) => !n.leida);
          this.notificacionesNoLeidas = noLeidas.length;
        }
      },
      error: (err) => console.error("Error al cargar notificaciones globales:", err)
    });
  }

  cargarTema(): void {
    const temaGuardado = localStorage.getItem('tema-radia') || 'cyan';
    this.temaActual = temaGuardado;
    document.documentElement.setAttribute('data-theme', temaGuardado);
  }

  cambiarTema(tema: string): void {
    this.temaActual = tema;
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('tema-radia', tema);
  }

  cerrarSesion(): void {
    this.authService.logout(); 
    this.router.navigate(['/login']); 
  }
}
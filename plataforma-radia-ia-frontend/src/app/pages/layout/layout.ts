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

  constructor(
    private authService: AuthService,
    private extraService: ExtraService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
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

  cerrarSesion(): void {
    this.authService.logout(); 
    this.router.navigate(['/login']); 
  }
}
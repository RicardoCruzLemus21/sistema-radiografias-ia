import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth'; 

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

  constructor(
    private authService: AuthService,
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
  }

  cerrarSesion(): void {
    this.authService.logout(); 
    this.router.navigate(['/login']); 
  }
}
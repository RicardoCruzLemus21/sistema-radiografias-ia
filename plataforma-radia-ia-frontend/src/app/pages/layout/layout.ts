import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { SesionService } from '../../services/sesion.service';
import { CampanaNotificaciones } from '../../components/campana-notificaciones/campana-notificaciones';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule, CampanaNotificaciones],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent implements OnInit, OnDestroy {
  nombreUsuarioActual: string = 'Usuario';
  rolUsuarioActual: string = '';
  isAdmin: boolean = false;
  isCatedratico: boolean = false;
  isEstudiante: boolean = false;
  temaActual: string = 'darkglass';
  isSidebarCollapsed: boolean = false;

  // Al evaluar una radiografía el panel se comprime solo para dar más espacio a la imagen;
  // al salir del visor vuelve a como estaba (si el usuario lo había dejado desplegado).
  private colapsadoAutomaticamente = false;
  private subRuta?: Subscription;

  constructor(
    private authService: AuthService,
    private sesionService: SesionService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.cargarTema();
    this.ajustarPanelSegunRuta(this.router.url);
    this.subRuta = this.router.events.subscribe(evento => {
      if (evento instanceof NavigationEnd) {
        this.ajustarPanelSegunRuta(evento.urlAfterRedirects);
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.subRuta?.unsubscribe();
  }

  private ajustarPanelSegunRuta(url: string): void {
    const enVisor = url.includes('/visor/');
    if (enVisor && !this.isSidebarCollapsed) {
      this.isSidebarCollapsed = true;
      this.colapsadoAutomaticamente = true;
    } else if (!enVisor && this.colapsadoAutomaticamente) {
      this.isSidebarCollapsed = false;
      this.colapsadoAutomaticamente = false;
    }
  }

  cargarDatosUsuario(): void {
    this.rolUsuarioActual = this.authService.getRolUsuario();
    this.nombreUsuarioActual = this.authService.getNombreUsuario();
    this.isAdmin = this.authService.isAdmin();
    this.isCatedratico = this.authService.isCatedratico();
    this.isEstudiante = this.authService.isEstudiante();
  }

  cargarTema(): void {
    const temaGuardado = localStorage.getItem('radia_theme') || 'darkglass';
    this.temaActual = temaGuardado;
    document.documentElement.setAttribute('data-theme', temaGuardado);
  }

  cambiarTema(tema: string): void {
    this.temaActual = tema;
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('radia_theme', tema);
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.colapsadoAutomaticamente = false; // la decisión manual del usuario manda
  }

  // Siempre pide confirmación con un modal antes de cerrar la sesión
  async cerrarSesion(): Promise<void> {
    await this.sesionService.cerrarSesion();
  }
}
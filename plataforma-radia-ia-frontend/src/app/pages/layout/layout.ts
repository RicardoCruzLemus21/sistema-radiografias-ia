import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
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

  // Se muestra mientras el router resuelve la navegación (incluye la descarga del módulo si aún
  // no se había visitado esa sección): sin esto, al hacer clic en el menú la pantalla se queda
  // "congelada" un instante sin ninguna señal de que algo está pasando.
  navegando: boolean = false;

  // Al evaluar una radiografía el panel se comprime solo para dar más espacio a la imagen;
  // al salir del visor vuelve a como estaba (si el usuario lo había dejado desplegado).
  private colapsadoAutomaticamente = false;
  private subRuta?: Subscription;
  // Evita el parpadeo de una pantalla de carga que dura 20 ms (rutas ya descargadas): se exige un
  // mínimo visible, y este token descarta el "ocultar" de una navegación vieja si ya empezó otra.
  private navInicio = 0;
  private navToken = 0;
  private static readonly DURACION_MINIMA_MS = 250;
  // Salvaguarda: si por lo que sea (guard atascado, red muy lenta, etc.) nunca llega un evento
  // final del router, esto igual quita la pantalla de carga en vez de dejar al usuario atrapado.
  private static readonly TIEMPO_MAXIMO_MS = 8000;
  private temporizadorSeguridad: ReturnType<typeof setTimeout> | null = null;

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
      if (evento instanceof NavigationStart) {
        this.navToken++;
        const miToken = this.navToken;
        this.navInicio = Date.now();
        this.navegando = true;
        if (this.temporizadorSeguridad) clearTimeout(this.temporizadorSeguridad);
        this.temporizadorSeguridad = setTimeout(() => {
          if (miToken !== this.navToken || !this.navegando) return;
          console.warn('La navegación tardó más de lo normal; se oculta la pantalla de carga como salvaguarda.');
          this.navegando = false;
          this.cdr.detectChanges();
        }, LayoutComponent.TIEMPO_MAXIMO_MS);
        this.cdr.detectChanges();
      } else if (evento instanceof NavigationEnd) {
        this.ajustarPanelSegunRuta(evento.urlAfterRedirects);
        this.ocultarCargaConMinimo();
      } else if (evento instanceof NavigationCancel || evento instanceof NavigationError) {
        this.ocultarCargaConMinimo();
      }
    });
  }

  // Asegura que la pantalla de carga se vea al menos un instante perceptible, aunque la
  // navegación termine casi al mismo tiempo que empezó (rutas que ya estaban descargadas).
  private ocultarCargaConMinimo(): void {
    const token = this.navToken;
    const transcurrido = Date.now() - this.navInicio;
    const espera = Math.max(0, LayoutComponent.DURACION_MINIMA_MS - transcurrido);
    setTimeout(() => {
      if (token !== this.navToken) return; // ya empezó otra navegación más nueva
      if (this.temporizadorSeguridad) { clearTimeout(this.temporizadorSeguridad); this.temporizadorSeguridad = null; }
      this.navegando = false;
      this.cdr.detectChanges();
    }, espera);
  }

  ngOnDestroy(): void {
    this.subRuta?.unsubscribe();
    if (this.temporizadorSeguridad) clearTimeout(this.temporizadorSeguridad);
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
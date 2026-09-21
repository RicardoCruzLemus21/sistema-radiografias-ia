import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth';
import { AlertService } from './alert.service';

// Centraliza los dos únicos caminos por los que termina una sesión, y ambos muestran un modal:
//  - el usuario cierra sesión  -> modal de confirmación
//  - la sesión expira (8 h)    -> modal de aviso, sin importar si el usuario estaba quieto o navegando
@Injectable({
  providedIn: 'root'
})
export class SesionService {
  private static readonly INTERVALO_MS = 30_000;

  private vigilando = false;
  private expirando = false;

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router
  ) {}

  // Revisa la expiración cada 30 s y al volver a la pestaña o enfocar la ventana (un temporizador
  // largo no es fiable: el navegador lo pausa si el equipo se suspende). Se arranca una sola vez.
  iniciarVigilancia(): void {
    if (this.vigilando) return;
    this.vigilando = true;

    const revisar = () => {
      if (this.authService.tokenExpirado()) this.expirarSesion();
    };

    revisar(); // al abrir la app con un token que venció mientras estaba cerrada
    setInterval(revisar, SesionService.INTERVALO_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
    window.addEventListener('focus', revisar);
  }

  // Cierre de sesión pedido por el usuario. Devuelve true si confirmó y se cerró.
  async cerrarSesion(): Promise<boolean> {
    const confirmado = await this.alertService.confirm(
      'Cerrar sesión',
      '¿Seguro que deseas cerrar tu sesión?',
      'Sí, cerrar sesión'
    );
    if (!confirmado) return false;

    this.authService.logout();
    await this.router.navigate(['/login']);
    return true;
  }

  // Sesión vencida (por reloj o porque el servidor rechazó el token). Solo se muestra un modal
  // aunque varias peticiones fallen a la vez.
  async expirarSesion(): Promise<void> {
    if (this.expirando) return;
    this.expirando = true;
    try {
      this.authService.logout(); // primero se limpia: nada más puede usar el token vencido
      await this.router.navigate(['/login']);
      await this.alertService.sesionExpirada();
    } finally {
      this.expirando = false;
    }
  }
}

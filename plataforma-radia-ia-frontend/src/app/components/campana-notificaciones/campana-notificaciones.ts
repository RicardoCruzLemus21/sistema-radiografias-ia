import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExtraService } from '../../services/extra';
import { AlertService } from '../../services/alert.service';

// Campanita de notificaciones (estudiante y docente). Se actualiza sola: sin esto, un aviso nuevo solo aparecía al recargar la página.
@Component({
  selector: 'app-campana-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campana-notificaciones.html',
  styleUrl: './campana-notificaciones.css'
})
export class CampanaNotificaciones implements OnInit, OnDestroy {
  private static readonly INTERVALO_MS = 30000;

  notificaciones: any[] = [];
  abierto = false;
  noLeidas = 0;
  private temporizador?: ReturnType<typeof setInterval>;

  constructor(
    private extraService: ExtraService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.cargar();
    // Cada 30 s mientras la pestaña está visible
    this.temporizador = setInterval(() => { if (!document.hidden) this.cargar(); }, CampanaNotificaciones.INTERVALO_MS);
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  // Al volver a la pestaña o a la ventana se actualiza de inmediato
  @HostListener('window:focus')
  alVolverALaVentana(): void { this.cargar(); }

  @HostListener('document:visibilitychange')
  alCambiarVisibilidad(): void { if (!document.hidden) this.cargar(); }

  @HostListener('document:click', ['$event'])
  alHacerClicAfuera(evento: Event): void {
    if (this.abierto && !this.host.nativeElement.contains(evento.target as Node)) {
      this.abierto = false;
      this.cdr.detectChanges();
    }
  }

  alternar(): void {
    this.abierto = !this.abierto;
    if (this.abierto) this.cargar();
  }

  cargar(): void {
    this.extraService.getNotificaciones().subscribe({
      next: (res: any) => {
        this.notificaciones = Array.isArray(res?.data) ? res.data : [];
        this.noLeidas = this.notificaciones.filter(n => !n.leida).length;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar notificaciones:', err)
    });
  }

  get sinLeer(): any[] {
    return this.notificaciones.filter(n => !n.leida);
  }

  get leidas(): any[] {
    return this.notificaciones.filter(n => n.leida);
  }

  // Marcar como leída: la notificación se queda guardada en la base y en la lista
  marcarLeida(notif: any): void {
    if (notif.leida || notif._marcando) return;
    notif._marcando = true;
    this.extraService.marcarNotificacionLeida(notif.id_notificacion).subscribe({
      next: () => {
        notif.leida = true;
        notif._marcando = false;
        this.noLeidas = this.sinLeer.length;
        this.cdr.detectChanges();
      },
      error: () => {
        notif._marcando = false;
        this.alertService.error('No se pudo actualizar', 'Intenta de nuevo en un momento.');
        this.cdr.detectChanges();
      }
    });
  }

  marcarTodasLeidas(): void {
    this.extraService.marcarTodasLeidas().subscribe({
      next: () => {
        this.notificaciones.forEach(n => (n.leida = true));
        this.noLeidas = 0;
        this.cdr.detectChanges();
      },
      error: () => {
        this.alertService.error('No se pudieron marcar', 'Intenta de nuevo en un momento.');
        this.cdr.detectChanges();
      }
    });
  }
}

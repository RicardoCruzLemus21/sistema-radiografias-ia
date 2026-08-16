import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExtraService } from '../../services/extra';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.css'
})
export class Notificaciones implements OnInit {
  notificaciones: any[] = [];
  cargando: boolean = true;

  constructor(
    private extraService: ExtraService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones() {
    this.cargando = true;
    this.extraService.getNotificaciones().subscribe({
      next: (resp) => {
        this.notificaciones = resp.data || resp;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar notificaciones:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  marcarComoLeida(id_notificacion: number) {
    this.extraService.marcarNotificacionLeida(id_notificacion).subscribe({
      next: () => {
        const notif = this.notificaciones.find(n => n.id_notificacion === id_notificacion);
        if (notif) {
          notif.leida = 1;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al marcar como leída:', err);
      }
    });
  }
}

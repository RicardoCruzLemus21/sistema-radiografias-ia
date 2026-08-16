import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClinicalService } from '../../services/clinical'; 
import { AuthService } from '../../services/auth';
import { ExtraService } from '../../services/extra';

@Component({
  selector: 'app-dashboard-estudiante',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-estudiante.html',
  styleUrl: './dashboard-estudiante.css'
})
export class DashboardEstudiante implements OnInit {
  
  estadisticas = {
    casosResueltos: 2,
    precisionPromedio: 88,
    casosPendientes: 3
  };

  worklist: any[] = [];
  cargando: boolean = false;
  
  notificaciones: any[] = [];
  mostrarNotificaciones: boolean = false;
  noLeidasCount: number = 0;

  constructor(
    private router: Router, 
    private clinicalService: ClinicalService,
    private authService: AuthService,
    private extraService: ExtraService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarWorklistReal();
    this.cargarNotificaciones();
  }

  cargarWorklistReal() {
    this.cargando = true;
    this.clinicalService.getWorklistEstudiante().subscribe({
      next: (datosBackend: any[]) => {
        if (Array.isArray(datosBackend) && datosBackend.length > 0) {
          this.worklist = datosBackend;
          this.estadisticas.casosPendientes = this.worklist.length;
        } else {
          this.cargarCasosSimulados();
        }
        this.cargando = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.warn('Backend de worklist no disponible, cargando casos predeterminados:', err);
        this.cargarCasosSimulados();
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarCasosSimulados() {
    // FUNCIÓN ELIMINADA: SISTEMA DINÁMICO
    this.worklist = [];
    this.estadisticas.casosPendientes = 0;
  }

  cargarNotificaciones() {
    this.extraService.getNotificaciones().subscribe({
      next: (res: any) => {
        if(res && res.data) {
          this.notificaciones = res.data;
          this.noLeidasCount = this.notificaciones.filter(n => !n.leida).length;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error("Error al cargar notificaciones:", err)
    });
  }

  toggleNotificaciones() {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
  }

  marcarComoLeida(notif: any) {
    if(!notif.leida) {
      this.extraService.marcarNotificacionLeida(notif.id_notificacion).subscribe({
        next: () => {
          notif.leida = true;
          this.noLeidasCount--;
          this.cdr.detectChanges();
        }
      });
    }
  }

  evaluarCaso(idCaso: string | number) {
    this.router.navigate(['/sistema/visor', idCaso]);
  }
}
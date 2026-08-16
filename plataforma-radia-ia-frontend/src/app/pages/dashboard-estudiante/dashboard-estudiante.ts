import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClinicalService } from '../../services/clinical'; 
import { AuthService } from '../../services/auth';

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

  constructor(
    private router: Router, 
    private clinicalService: ClinicalService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarWorklistReal();
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

  evaluarCaso(idCaso: string | number) {
    this.router.navigate(['/sistema/visor', idCaso]);
  }
}
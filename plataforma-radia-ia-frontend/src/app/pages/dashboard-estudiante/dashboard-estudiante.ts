import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <-- 1. Importamos ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClinicalService } from '../../services/clinical'; 

@Component({
  selector: 'app-dashboard-estudiante',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-estudiante.html',
  styleUrl: './dashboard-estudiante.css'
})
export class DashboardEstudiante implements OnInit {
  
  estadisticas = {
    casosResueltos: 0,
    precisionPromedio: 0,
    casosPendientes: 0
  };

  worklist: any[] = [];

  constructor(
    private router: Router, 
    private clinicalService: ClinicalService,
    private cdr: ChangeDetectorRef // <-- 2. Lo inyectamos en el constructor
  ) {}

  ngOnInit(): void {
    this.cargarWorklistReal();
  }

  cargarWorklistReal() {
    this.clinicalService.getWorklistEstudiante().subscribe({
      next: (datosBackend) => {
        this.worklist = datosBackend;
        
        // <-- 3. ¡Obligamos a Angular a actualizar la pantalla instantáneamente!
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al conectar con la API de casos clínicos:', err);
      }
    });
  }

  evaluarCaso(idCaso: string) {
    this.router.navigate(['/sistema/visor', idCaso]);
  }
}
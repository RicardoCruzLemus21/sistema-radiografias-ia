import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicService } from '../../services/academic'; // <-- Importamos el servicio

@Component({
  selector: 'app-dashboard-catedratico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-catedratico.html',
  styleUrl: './dashboard-catedratico.css'
})
export class DashboardCatedratico implements OnInit {
  
  // Las variables inician vacías, esperando los datos reales
  estadisticasGlobales: any = { totalAlumnos: 0, casosAsignados: 0, precisionGrupal: 0 };
  alumnos: any[] = [];

  // Inyectamos el servicio en el constructor
  constructor(private academicService: AcademicService) {}

  // ngOnInit se ejecuta apenas carga la pantalla
  ngOnInit(): void {
    this.cargarDatosReales();
  }

  cargarDatosReales() {
    // 1. Pedimos los alumnos al backend
    this.academicService.getAlumnos().subscribe({
      next: (datosDesdeMySQL) => {
        // Llenamos la tabla con los datos reales
        this.alumnos = datosDesdeMySQL; 
      },
      error: (err) => {
        console.error('Error de conexión con el backend:', err);
      }
    });

    // 2. Pedimos las estadísticas
    this.academicService.getEstadisticasGlobales().subscribe({
      next: (estadisticas) => {
        this.estadisticasGlobales = estadisticas;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas:', err);
      }
    });
  }
}
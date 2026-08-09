import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-retroalimentacion-ia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './retroalimentacion-ia.html',
  styleUrl: './retroalimentacion-ia.css'
})
export class RetroalimentacionIa implements OnInit {
  
  idCasoActual: string | null = '';
  
  // Simulamos la respuesta matemática del modelo de Deep Learning
  resultadoIA = {
    patologia: 'Neumonía Lobar Aguda',
    probabilidad: 94.2, // Porcentaje de predicción
    mensaje: 'Se observa una opacidad homogénea bien definida con broncograma aéreo en el lóbulo inferior derecho.'
  };

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.idCasoActual = this.route.snapshot.paramMap.get('id');
  }

  volverAlDashboard() {
    this.router.navigate(['/sistema/estudiante']);
  }
}
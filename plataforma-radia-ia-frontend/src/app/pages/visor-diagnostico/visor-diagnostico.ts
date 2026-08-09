import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticoService } from '../../services/diagnostico';

@Component({
  selector: 'app-visor-diagnostico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visor-diagnostico.html',
  styleUrl: './visor-diagnostico.css'
})
export class VisorDiagnostico implements OnInit {
  
  idCasoActual: string = '';
  patologias: any[] = []; // Coincide con la variable que usa tu HTML (*ngFor="let patologia of patologias")
  justificacionClinica: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private diagnosticoService: DiagnosticoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Capturamos el ID del caso que viene en la URL
    this.idCasoActual = this.route.snapshot.paramMap.get('id') || '1';
    this.cargarPatologias();
  }

  cargarPatologias() {
    this.diagnosticoService.getCatalogos().subscribe({
      next: (respuesta: any) => { // Tipado explícito 'any' para evitar el error TS7006
        this.patologias = respuesta.data;
        this.cdr.detectChanges(); // Forzamos el redibujado instantáneo
      },
      error: (err: any) => {
        console.error('Error al cargar catálogo de patologías:', err);
      }
    });
  }

  volverAlDashboard() {
    this.router.navigate(['/sistema/estudiante']);
  }

  enviarDiagnostico() {
    console.log('Enviando diagnóstico...', {
      caso: this.idCasoActual,
      patologias: this.patologias.filter(p => p.seleccionada),
      justificacion: this.justificacionClinica
    });
    // Aquí conectaremos el guardado en el siguiente paso
  }
}
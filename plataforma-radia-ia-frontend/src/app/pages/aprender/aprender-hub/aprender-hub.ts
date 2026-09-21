import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AprendizajeService } from '../../../services/aprendizaje';
import { nombreClase, colorClase } from '../../../utils/clases';

@Component({
  selector: 'app-aprender-hub',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aprender-hub.html',
  styleUrls: ['../aprender-compartido.css', './aprender-hub.css']
})
export class AprenderHub implements OnInit {
  datos: any = null;
  cargando = true;
  error = '';

  readonly nombreClase = nombreClase;
  readonly colorClase = colorClase;

  constructor(private aprendizajeService: AprendizajeService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.aprendizajeService.resumen().subscribe({
      next: (resp) => {
        this.datos = resp.data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudo cargar tu ruta de aprendizaje. Intenta de nuevo en unos segundos.';
        this.cdr.detectChanges();
      }
    });
  }

  get resumenGeneral(): { dominadas: number; enCurso: number } {
    const c: any[] = this.datos?.clases || [];
    return { dominadas: c.filter(x => x.estado === 'dominada').length, enCurso: c.filter(x => x.estado === 'en_curso').length };
  }

  textoBoton(c: any): string {
    return c.estado === 'nueva' ? 'Empezar' : c.estado === 'dominada' ? 'Repasar' : 'Continuar';
  }

  abrir(clase: string): void {
    this.router.navigate(['/sistema/aprender', clase]);
  }

  irRepaso(): void {
    this.router.navigate(['/sistema/aprender/repaso']);
  }

  irErrores(): void {
    this.router.navigate(['/sistema/mis-errores']);
  }
}

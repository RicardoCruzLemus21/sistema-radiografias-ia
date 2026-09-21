import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AprendizajeService } from '../../../services/aprendizaje';
import { CLASES, nombreClase, colorClase } from '../../../utils/clases';

@Component({
  selector: 'app-mis-errores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-errores.html',
  styleUrls: ['../aprender-compartido.css', './mis-errores.css']
})
export class MisErrores implements OnInit {
  datos: any = null;
  cargando = true;
  error = '';

  readonly clases = CLASES;
  readonly nombreClase = nombreClase;
  readonly colorClase = colorClase;

  constructor(private aprendizajeService: AprendizajeService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.aprendizajeService.misErrores().subscribe({
      next: (resp) => {
        this.datos = resp.data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudieron cargar tus errores. Intenta de nuevo en unos segundos.';
        this.cdr.detectChanges();
      }
    });
  }

  // Cuánto pesa cada celda dentro de su fila (para el color de la matriz)
  intensidad(real: string, marcada: string): number {
    const fila = this.datos.matriz[real];
    const total = (Object.values(fila) as number[]).reduce((a, b) => a + b, 0);
    return total > 0 ? fila[marcada] / total : 0;
  }

  totalFila(real: string): number {
    return (Object.values(this.datos.matriz[real]) as number[]).reduce((a, b) => a + b, 0);
  }

  get mensajeConfianza(): string {
    const c = this.datos.calibracion;
    if (c.diferencia === null) return 'Cuando respondas ejercicios del curso con tu nivel de confianza, aquí verás si estás bien calibrado.';
    if (c.diferencia > 10) return `Tiendes a sobreestimar lo que sabes: dices estar ${c.confianza_media}% seguro, pero aciertas ${c.acierto_medio}%. Antes de responder, busca el signo concreto que confirma tu decisión.`;
    if (c.diferencia < -10) return `Sueles subestimarte: dices estar ${c.confianza_media}% seguro y aciertas ${c.acierto_medio}%. Confía más en lo que ves cuando encuentras el signo claro.`;
    return `Tu confianza (${c.confianza_media}%) es coherente con tus aciertos (${c.acierto_medio}%): estás bien calibrado.`;
  }

  irALeccion(clase: string): void {
    this.router.navigate(['/sistema/aprender', clase]);
  }

  comparar(real: string, marcada: string): void {
    this.router.navigate(['/sistema/aprender', real], { queryParams: { paso: 'comparador', contra: marcada } });
  }

  practicar(clase: string): void {
    this.router.navigate(['/sistema/aprender', clase], { queryParams: { paso: 'practica' } });
  }

  volver(): void {
    this.router.navigate(['/sistema/aprender']);
  }
}

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AprendizajeService } from '../../services/aprendizaje';
import { environment } from '../../../environments/environment';
import { CLASES, nombreClase, colorClase } from '../../utils/clases';

// Un caso para practicar: la radiografía, las opciones, la comprobación y la retroalimentación inmediata.
// Lo usan la práctica guiada de cada patología y el repaso espaciado.
@Component({
  selector: 'app-practica-caso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './practica-caso.html',
  styleUrls: ['../../pages/aprender/aprender-compartido.css', './practica-caso.css']
})
export class PracticaCaso implements OnChanges {
  @Input() caso!: { id_caso: number; imagen: string };
  @Input() origen: 'guiado' | 'repaso' = 'guiado';
  @Input() claseObjetivo = '';
  @Input() pistas: string[] = [];
  @Input() indice = 1;
  @Input() total = 1;
  @Output() terminado = new EventEmitter<any>();

  readonly clases = CLASES;
  readonly nombreClase = nombreClase;
  readonly colorClase = colorClase;

  seleccion = new Set<string>();
  mostrarPista = false;
  enviando = false;
  resultado: any = null;
  mostrarMapa = false;
  ampliada = false;
  error = '';
  private inicio = Date.now();

  constructor(private aprendizajeService: AprendizajeService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['caso']) this.reiniciar();
  }

  private reiniciar(): void {
    this.seleccion = new Set();
    this.mostrarPista = false;
    this.enviando = false;
    this.resultado = null;
    this.mostrarMapa = false;
    this.ampliada = false;
    this.error = '';
    this.inicio = Date.now();
  }

  urlImagen(ruta: string): string {
    return ruta?.startsWith('http') ? ruta : `${environment.apiUrl}${ruta}`;
  }

  urlRelativa(ruta: string): string {
    return ruta?.startsWith('http') ? ruta : `${environment.apiUrl}${ruta}`;
  }

  // "Normal" no se combina con nada: elegirlo quita lo demás, y elegir otra categoría quita "Normal"
  alternar(clase: string): void {
    if (this.resultado) return;
    if (this.seleccion.has(clase)) {
      this.seleccion.delete(clase);
    } else {
      if (clase === 'Normal') this.seleccion.clear();
      else this.seleccion.delete('Normal');
      this.seleccion.add(clase);
    }
  }

  verPista(): void {
    this.mostrarPista = true;
  }

  comprobar(): void {
    if (this.seleccion.size === 0 || this.enviando || this.resultado) return;
    this.enviando = true;
    this.error = '';
    this.aprendizajeService.responder({
      id_caso: this.caso.id_caso,
      marcadas: [...this.seleccion],
      origen: this.origen,
      clase_objetivo: this.origen === 'guiado' ? this.claseObjetivo : undefined,
      uso_pista: this.mostrarPista,
      tiempo: Math.round((Date.now() - this.inicio) / 1000)
    }).subscribe({
      next: (resp) => {
        this.enviando = false;
        this.resultado = resp.data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.enviando = false;
        this.error = err.error?.message || 'No se pudo comprobar la respuesta. Intenta de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  siguiente(): void {
    this.terminado.emit(this.resultado);
  }

  // Título de cada explicación según el tipo de fallo
  tituloExplicacion(e: any): string {
    if (e.marcada === 'Normal') return `Se te escapó ${e.nombre_real}`;
    if (e.real === 'Normal') return `Era normal y marcaste ${e.nombre_marcada}`;
    return `Era ${e.nombre_real} y marcaste ${e.nombre_marcada}`;
  }

  etiquetaResultado(): { texto: string; clase: string } {
    switch (this.resultado?.resultado) {
      case 'acierto': return { texto: 'Correcto', clase: 'ok' };
      case 'parcial': return { texto: 'Casi: acertaste una parte', clase: 'medio' };
      default: return { texto: 'No coincide', clase: 'mal' };
    }
  }
}

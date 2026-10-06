import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Marca { x: number; y: number; w: number; h: number; }

// Barra de herramientas para la radiografía: invertir, brillo, zoom, rotar, marcar una zona y ampliar.
// Envuelve la imagen y sus capas (mapa de calor, recuadro del radiólogo) para que el zoom, la rotación
// y la ampliación las muevan juntas. La imagen debe llevar la clase "imagen-base" para recibir el filtro.
// Las marcas se guardan en porcentajes de la imagen sin rotar, así siguen en su sitio al girar.
@Component({
  selector: 'app-herramientas-imagen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './herramientas-imagen.html',
  styleUrl: './herramientas-imagen.css'
})
export class HerramientasImagen {
  @Input() marcas: Marca[] = [];
  @Output() marcasChange = new EventEmitter<Marca[]>();
  @Input() soloLectura = false;
  @Input() unicaMarca = false;
  @Input() ampliable = true;

  ampliado = false;
  invertir = false;
  brillo = 100;          // 50 a 150
  zoom = 1;              // 0.5 a 3
  rotacion = 0;          // 0, 90, 180 o 270 grados (sentido horario)
  senalizando = false;
  tx = 0;                // desplazamiento en pantalla (px)
  ty = 0;
  trazo: Marca | null = null;
  private inicio: { x: number; y: number } | null = null;
  private arrastre: { x: number; y: number; tx: number; ty: number } | null = null;
  @ViewChild('lienzo') private lienzo?: ElementRef<HTMLElement>;

  @HostBinding('class.hi-ampliado')
  get esAmpliado(): boolean {
    return this.ampliado;
  }

  // Las variables CSS llegan a la imagen, que las usa en su filtro
  @HostBinding('style.--hi-filter')
  get filtro(): string {
    return `${this.invertir ? 'invert(1) ' : ''}brightness(${this.brillo / 100})`;
  }

  @HostListener('document:keydown.escape')
  alPulsarEscape(): void {
    if (this.ampliado) this.alternarAmpliado();
  }

  alternarAmpliado(): void {
    this.ampliado = !this.ampliado;
    this.senalizando = false;
    this.tx = 0;
    this.ty = 0;
  }

  cambiarZoom(delta: number): void {
    this.fijarZoom(this.zoom + delta);
  }

  restablecerZoom(): void {
    this.zoom = 1;
    this.tx = 0;
    this.ty = 0;
  }

  // Con el puntero como ancla, el punto de la imagen bajo el cursor se queda quieto al cambiar el zoom
  private fijarZoom(nuevo: number, qx?: number, qy?: number): void {
    const anterior = this.zoom;
    const siguiente = Math.min(3, Math.max(0.5, Math.round(nuevo * 100) / 100));
    if (siguiente === anterior) return;
    const caja = this.lienzo?.nativeElement.getBoundingClientRect();
    if (caja && qx !== undefined && qy !== undefined) {
      const f = 1 - siguiente / anterior;
      this.tx += (qx - (caja.left + caja.width / 2)) * f;
      this.ty += (qy - (caja.top + caja.height / 2)) * f;
    }
    this.zoom = siguiente;
  }

  alRueda(evento: WheelEvent): void {
    evento.preventDefault();
    if (evento.deltaY === 0) return;
    this.fijarZoom(evento.deltaY < 0 ? this.zoom * 1.1 : this.zoom / 1.1, evento.clientX, evento.clientY);
  }

  rotar(): void {
    this.rotacion = (this.rotacion + 90) % 360;
  }

  borrarMarcas(): void {
    this.marcas = [];
    this.marcasChange.emit(this.marcas);
  }

  // Coordenadas de la pantalla (ya rotada) -> coordenadas de la imagen sin rotar
  private puntoLocal(vx: number, vy: number): [number, number] {
    switch (this.rotacion) {
      case 90: return [vy, 100 - vx];
      case 180: return [100 - vx, 100 - vy];
      case 270: return [100 - vy, vx];
      default: return [vx, vy];
    }
  }

  private rectanguloLocal(v: Marca): Marca {
    const puntos = [this.puntoLocal(v.x, v.y), this.puntoLocal(v.x + v.w, v.y + v.h)];
    const xs = puntos.map(p => p[0]);
    const ys = puntos.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }

  private posicion(evento: PointerEvent, contenedor: HTMLElement): { x: number; y: number } {
    const r = contenedor.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((evento.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((evento.clientY - r.top) / r.height) * 100))
    };
  }

  iniciarTrazo(evento: PointerEvent): void {
    const contenedor = evento.currentTarget as HTMLElement;
    if (!this.senalizando || this.soloLectura) {
      this.arrastre = { x: evento.clientX, y: evento.clientY, tx: this.tx, ty: this.ty };
      contenedor.setPointerCapture(evento.pointerId);
      return;
    }
    this.inicio = this.posicion(evento, contenedor);
    this.trazo = this.rectanguloLocal({ x: this.inicio.x, y: this.inicio.y, w: 0, h: 0 });
    contenedor.setPointerCapture(evento.pointerId);
    evento.stopPropagation();
  }

  moverTrazo(evento: PointerEvent): void {
    if (this.arrastre) {
      this.tx = this.arrastre.tx + evento.clientX - this.arrastre.x;
      this.ty = this.arrastre.ty + evento.clientY - this.arrastre.y;
      return;
    }
    if (!this.inicio) return;
    const actual = this.posicion(evento, evento.currentTarget as HTMLElement);
    this.trazo = this.rectanguloLocal({
      x: Math.min(this.inicio.x, actual.x),
      y: Math.min(this.inicio.y, actual.y),
      w: Math.abs(actual.x - this.inicio.x),
      h: Math.abs(actual.y - this.inicio.y)
    });
  }

  terminarTrazo(): void {
    this.arrastre = null;
    if (this.trazo && this.trazo.w > 1 && this.trazo.h > 1) {
      this.marcas = this.unicaMarca ? [this.trazo] : [...this.marcas, this.trazo];
      this.marcasChange.emit(this.marcas);
    }
    this.trazo = null;
    this.inicio = null;
  }
}

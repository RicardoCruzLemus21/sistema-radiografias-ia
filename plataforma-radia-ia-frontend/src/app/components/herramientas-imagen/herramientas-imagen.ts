import { Component, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Marca { x: number; y: number; w: number; h: number; }

// Barra de herramientas para ver una radiografía ampliada: invertir colores, brillo, zoom, rotar y
// señalizar una zona (rectángulo). Envuelve la imagen y sus capas (mapa de calor, marcas) para que
// el zoom y la rotación las muevan juntas. La imagen debe llevar la clase "imagen-base" para recibir
// el filtro (brillo/inversión).
// Las marcas se guardan en coordenadas de la imagen sin rotar, así siguen en su sitio al girar.
@Component({
  selector: 'app-herramientas-imagen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './herramientas-imagen.html',
  styleUrl: './herramientas-imagen.css'
})
export class HerramientasImagen {
  invertir = false;
  brillo = 100;          // 50 a 150
  zoom = 1;              // 0.5 a 3
  rotacion = 0;          // 0, 90, 180 o 270 grados (sentido horario)
  senalizando = false;
  marcas: Marca[] = [];  // en coordenadas de la imagen sin rotar
  trazo: Marca | null = null;
  private inicio: { x: number; y: number } | null = null;

  // Las variables CSS llegan a la imagen, que las usa en su filtro
  @HostBinding('style.--hi-filter')
  get filtro(): string {
    return `${this.invertir ? 'invert(1) ' : ''}brightness(${this.brillo / 100})`;
  }

  cambiarZoom(delta: number): void {
    this.zoom = Math.min(3, Math.max(0.5, Math.round((this.zoom + delta) * 100) / 100));
  }

  restablecerZoom(): void {
    this.zoom = 1;
  }

  rotar(): void {
    this.rotacion = (this.rotacion + 90) % 360;
  }

  borrarMarcas(): void {
    this.marcas = [];
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
    if (!this.senalizando) return;
    const contenedor = evento.currentTarget as HTMLElement;
    this.inicio = this.posicion(evento, contenedor);
    this.trazo = this.rectanguloLocal({ x: this.inicio.x, y: this.inicio.y, w: 0, h: 0 });
    contenedor.setPointerCapture(evento.pointerId);
    evento.stopPropagation();
  }

  moverTrazo(evento: PointerEvent): void {
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
    if (this.trazo && this.trazo.w > 1 && this.trazo.h > 1) this.marcas.push(this.trazo);
    this.trazo = null;
    this.inicio = null;
  }
}

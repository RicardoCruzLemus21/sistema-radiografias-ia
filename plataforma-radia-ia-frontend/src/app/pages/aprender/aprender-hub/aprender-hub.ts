import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AprendizajeService } from '../../../services/aprendizaje';
import { AlertService } from '../../../services/alert.service';
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

  restableciendo: string | null = null;

  constructor(
    private aprendizajeService: AprendizajeService,
    private alertService: AlertService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

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

  async restablecer(c: any, evento: Event): Promise<void> {
    evento.stopPropagation();
    const confirmado = await this.alertService.confirmDanger(
      'Restablecer aprendizaje',
      `Vas a restablecer tu aprendizaje de ${this.nombreClase(c.clase)}. Se borrará que ya viste la lección y el comparador, y tu historial de casos practicados de esta patología: volverá a quedar como si nunca la hubieras estudiado. Esta acción no se puede deshacer. ¿Deseas continuar?`,
      'Sí, restablecer'
    );
    if (!confirmado) return;

    this.restableciendo = c.clase;
    this.aprendizajeService.reiniciarClase(c.clase).subscribe({
      next: () => {
        this.restableciendo = null;
        this.alertService.success('Aprendizaje restablecido', `${this.nombreClase(c.clase)} volvió a empezar desde cero. Cuando quieras, repásala de nuevo.`);
        this.ngOnInit();
      },
      error: (err) => {
        this.restableciendo = null;
        this.alertService.error('No se pudo restablecer', err.error?.message || 'Intenta de nuevo en un momento.');
        this.cdr.detectChanges();
      }
    });
  }

  irRepaso(): void {
    this.router.navigate(['/sistema/aprender/repaso']);
  }

  irErrores(): void {
    this.router.navigate(['/sistema/mis-errores']);
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicService } from '../../services/academic';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-codigo-docente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './codigo-docente.html',
  styleUrl: './codigo-docente.css'
})
export class CodigoDocenteComponent implements OnInit {
  // El código nunca se pinta en pantalla mientras esté oculto: en el DOM solo hay puntos.
  codigoDocente: string = '';
  mostrarCodigo: boolean = false;
  cargando: boolean = false;
  errorCarga: boolean = false;
  regenerando: boolean = false;
  copiado: boolean = false;

  constructor(
    private academicService: AcademicService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCodigo();
  }

  get codigoVisible(): string {
    if (!this.codigoDocente) return '';
    return this.mostrarCodigo ? this.codigoDocente : '•'.repeat(this.codigoDocente.length);
  }

  cargarCodigo(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.academicService.getMiCodigo().subscribe({
      next: (res: any) => {
        this.codigoDocente = res.data?.codigo_docente || '';
        this.cargando = false;
        this.errorCarga = !this.codigoDocente;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = true;
        this.cdr.detectChanges();
      }
    });
  }

  alternarVisibilidad(): void {
    this.mostrarCodigo = !this.mostrarCodigo;
  }

  async copiarCodigo(): Promise<void> {
    if (!this.codigoDocente) return;
    try {
      await navigator.clipboard.writeText(this.codigoDocente);
      this.copiado = true;
      this.cdr.detectChanges();
      setTimeout(() => { this.copiado = false; this.cdr.detectChanges(); }, 2000);
    } catch {
      // Sin permiso de portapapeles: se le muestra el código para que lo copie a mano
      this.mostrarCodigo = true;
      this.alertService.warning('No se pudo copiar', 'Selecciona el código en pantalla y cópialo manualmente.');
      this.cdr.detectChanges();
    }
  }

  async regenerarCodigo(): Promise<void> {
    if (this.regenerando || !this.codigoDocente) return;
    const confirmado = await this.alertService.confirm(
      'Regenerar código',
      'El código actual dejará de funcionar de inmediato. Los estudiantes ya inscritos no se ven afectados, pero tendrás que compartir el código nuevo con quienes aún no se registran.',
      'Regenerar'
    );
    if (!confirmado) return;

    this.regenerando = true;
    this.academicService.regenerarMiCodigo().subscribe({
      next: (res: any) => {
        this.codigoDocente = res.data?.codigo_docente || this.codigoDocente;
        this.regenerando = false;
        this.copiado = false;
        this.alertService.success('Código regenerado', 'Comparte el código nuevo con tus estudiantes.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.regenerando = false;
        this.alertService.error('Error', 'No se pudo regenerar el código. Intenta de nuevo.');
        this.cdr.detectChanges();
      }
    });
  }
}

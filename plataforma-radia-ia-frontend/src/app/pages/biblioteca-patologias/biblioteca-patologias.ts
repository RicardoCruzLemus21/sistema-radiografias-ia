import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagnosticoService } from '../../services/diagnostico';
import { ClinicalService } from '../../services/clinical';

@Component({
  selector: 'app-biblioteca-patologias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './biblioteca-patologias.html',
  styleUrl: './biblioteca-patologias.css'
})
export class BibliotecaPatologias implements OnInit {
  patologias: any[] = [];
  cargando: boolean = true;

  // Variables para el modal de IA Generativa
  modalAbierto: boolean = false;
  patologiaSeleccionada: any = null;
  cargandoIA: boolean = false;
  infoIA: any = null;
  varianteActual: number = 1;

  constructor(
    private diagnosticoService: DiagnosticoService,
    private clinicalService: ClinicalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarBiblioteca();
  }

  cargarBiblioteca() {
    this.cargando = true;
    this.diagnosticoService.getCatalogos().subscribe({
      next: (resp) => {
        this.patologias = resp.data || resp;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar biblioteca:', err);
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  abrirPatologia(patologia: any) {
    this.patologiaSeleccionada = patologia;
    this.modalAbierto = true;
    this.cargandoIA = true;
    this.infoIA = null;
    this.varianteActual = Math.floor(Math.random() * 5) + 1;
    this.cdr.markForCheck();

    this.clinicalService.obtenerInfoPatologiaIA(patologia.nombre).subscribe({
      next: (resp) => {
        this.infoIA = resp.data;
        this.cargandoIA = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error obteniendo info de IA:', err);
        this.cargandoIA = false;
        this.infoIA = {
          definicion: 'Error al conectar con la Inteligencia Artificial.',
          signos_radiologicos: [],
          diagnostico_diferencial: 'Por favor intenta nuevamente en unos momentos.'
        };
        this.cdr.markForCheck();
      }
    });
  }

  getImageForPatologia(nombre: string): string {
    if (!nombre) return `assets/patologias/normal_1.jpg`;
    
    const normalize = nombre.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
      .replace(/\s+/g, '_');
      
    return `assets/patologias/${normalize}_${this.varianteActual}.jpg`;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.patologiaSeleccionada = null;
    this.infoIA = null;
  }
}

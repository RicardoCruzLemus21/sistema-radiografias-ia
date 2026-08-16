import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagnosticoService } from '../../services/diagnostico';

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

  constructor(
    private diagnosticoService: DiagnosticoService,
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar biblioteca:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}

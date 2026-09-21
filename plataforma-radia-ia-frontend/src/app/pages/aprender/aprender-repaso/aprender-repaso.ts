import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AprendizajeService } from '../../../services/aprendizaje';
import { PracticaCaso } from '../../../components/practica-caso/practica-caso';

@Component({
  selector: 'app-aprender-repaso',
  standalone: true,
  imports: [CommonModule, PracticaCaso],
  templateUrl: './aprender-repaso.html',
  styleUrls: ['../aprender-compartido.css', './aprender-repaso.css']
})
export class AprenderRepaso implements OnInit {
  datos: any = null;
  cargando = true;
  error = '';
  fase: 'inicio' | 'practicando' | 'fin' = 'inicio';
  indice = 0;
  resultados: string[] = [];

  constructor(private aprendizajeService: AprendizajeService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.aprendizajeService.repaso().subscribe({
      next: (resp) => {
        this.datos = resp.data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudo cargar tu repaso. Intenta de nuevo en unos segundos.';
        this.cdr.detectChanges();
      }
    });
  }

  empezar(): void {
    this.indice = 0;
    this.resultados = [];
    this.fase = 'practicando';
  }

  alTerminarCaso(resultado: any): void {
    this.resultados.push(resultado.resultado);
    if (this.indice + 1 < this.datos.casos.length) {
      this.indice++;
    } else {
      this.fase = 'fin';
      this.cargar(); // para saber cuántos quedan y cuándo vuelve el siguiente
    }
    this.cdr.detectChanges();
  }

  get aciertos(): number {
    return this.resultados.filter(r => r === 'acierto').length;
  }

  volver(): void {
    this.router.navigate(['/sistema/aprender']);
  }
}

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { AprendizajeService } from '../../../services/aprendizaje';
import { PracticaCaso } from '../../../components/practica-caso/practica-caso';
import { environment } from '../../../../environments/environment';
import { CLASES, nombreClase, colorClase } from '../../../utils/clases';

type Pestana = 'leccion' | 'comparador' | 'practica';

@Component({
  selector: 'app-aprender-patologia',
  standalone: true,
  imports: [CommonModule, PracticaCaso],
  templateUrl: './aprender-patologia.html',
  styleUrls: ['../aprender-compartido.css', './aprender-patologia.css']
})
export class AprenderPatologia implements OnInit, OnDestroy {
  clase = '';
  pestana: Pestana = 'leccion';

  // Lección
  leccion: any = null;
  cargandoLeccion = true;
  errorLeccion = '';

  // Comparador
  contra = '';
  comparacion: any = null;
  cargandoComparador = false;
  errorComparador = '';
  mapaA = false;
  mapaB = false;
  ampliada: string | null = null;

  // Práctica guiada
  sesion: any = null;
  fase: 'inicio' | 'practicando' | 'fin' = 'inicio';
  indice = 0;
  resultados: string[] = [];
  cargandoSesion = false;
  errorSesion = '';

  readonly nombreClase = nombreClase;
  readonly colorClase = colorClase;
  private suscripcion?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private aprendizajeService: AprendizajeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.suscripcion = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
      const nueva = params.get('clase') || '';
      const cambioClase = nueva !== this.clase;
      this.clase = nueva;
      const paso = query.get('paso');
      this.pestana = paso === 'comparador' || paso === 'practica' ? paso : 'leccion';
      if (query.get('contra')) this.contra = query.get('contra')!;

      if (cambioClase) {
        this.reiniciarTodo();
        this.cargarLeccion();
      } else {
        this.alCambiarPestana();
      }
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  private reiniciarTodo(): void {
    this.leccion = null; this.cargandoLeccion = true; this.errorLeccion = '';
    this.comparacion = null; this.errorComparador = ''; this.mapaA = this.mapaB = false;
    this.sesion = null; this.fase = 'inicio'; this.indice = 0; this.resultados = []; this.errorSesion = '';
  }

  // ===== Lección =====
  private cargarLeccion(): void {
    this.aprendizajeService.leccion(this.clase).subscribe({
      next: (resp) => {
        this.leccion = resp.data;
        this.cargandoLeccion = false;
        if (!this.contra || !this.opcionesContra.includes(this.contra)) this.contra = this.opcionesContra[0];
        this.cdr.detectChanges();
        this.alCambiarPestana();
      },
      error: (err) => {
        this.cargandoLeccion = false;
        this.errorLeccion = err.error?.message || 'No se pudo cargar la lección.';
        this.cdr.detectChanges();
      }
    });
  }

  private alCambiarPestana(): void {
    if (this.pestana === 'leccion') {
      this.aprendizajeService.marcarPaso(this.clase, 'leccion').subscribe({ error: () => {} });
    } else if (this.pestana === 'comparador' && !this.comparacion && this.leccion) {
      this.cargarComparacion();
    }
    this.cdr.detectChanges();
  }

  irAPestana(pestana: Pestana, contra?: string): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { paso: pestana, contra: contra || null }, queryParamsHandling: 'merge' });
    if (contra && contra !== this.contra) { this.contra = contra; this.comparacion = null; }
  }

  // ===== Comparador =====
  // Con qué se puede comparar: las confusiones frecuentes de la lección más "Normal"; en Normal, todas las patologías
  get opcionesContra(): string[] {
    if (this.clase === 'Normal') return CLASES.filter(c => c !== 'Normal');
    const lista: string[] = (this.leccion?.se_confunde_con || []).map((x: any) => x.clase);
    return [...lista, 'Normal'].filter((c, i, a) => c !== this.clase && a.indexOf(c) === i);
  }

  elegirContra(c: string): void {
    this.contra = c;
    this.cargarComparacion();
  }

  cargarComparacion(): void {
    if (!this.contra) return;
    this.cargandoComparador = true;
    this.errorComparador = '';
    this.mapaA = this.mapaB = false;
    this.aprendizajeService.comparador(this.clase, this.contra).subscribe({
      next: (resp) => {
        this.comparacion = resp.data;
        this.cargandoComparador = false;
        this.cdr.detectChanges();
        this.aprendizajeService.marcarPaso(this.clase, 'comparador').subscribe({ error: () => {} });
      },
      error: (err) => {
        this.cargandoComparador = false;
        this.errorComparador = err.error?.message || 'No se pudo cargar la comparación.';
        this.cdr.detectChanges();
      }
    });
  }

  url(ruta: string): string {
    return ruta?.startsWith('http') ? ruta : `${environment.apiUrl}${ruta}`;
  }

  // ===== Práctica guiada =====
  empezarSesion(): void {
    this.cargandoSesion = true;
    this.errorSesion = '';
    this.aprendizajeService.sesion(this.clase).subscribe({
      next: (resp) => {
        this.sesion = resp.data;
        this.indice = 0;
        this.resultados = [];
        this.fase = 'practicando';
        this.cargandoSesion = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargandoSesion = false;
        this.errorSesion = err.error?.message || 'No se pudo iniciar la sesión.';
        this.cdr.detectChanges();
      }
    });
  }

  alTerminarCaso(resultado: any): void {
    this.resultados.push(resultado.resultado);
    if (this.indice + 1 < this.sesion.casos.length) this.indice++;
    else this.fase = 'fin';
    this.cdr.detectChanges();
  }

  get aciertos(): number {
    return this.resultados.filter(r => r === 'acierto').length;
  }

  volverALaRuta(): void {
    this.router.navigate(['/sistema/aprender']);
  }
}

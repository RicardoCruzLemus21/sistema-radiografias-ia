import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, Plugin, registerables } from 'chart.js';
import { ModeloService } from '../../services/modelo';

Chart.register(...registerables);

// Un color fijo por patología para que la misma patología se reconozca en todas las gráficas
const COLORES: Record<string, string> = {
  'Atelectasia': '#38bdf8',
  'Cardiomegalia': '#f472b6',
  'Derrame Pleural': '#34d399',
  'Infiltracion': '#fbbf24',
  'Neumonia': '#a78bfa',
  'Neumotorax': '#fb7185',
  'Nodulos': '#22d3ee',
  'Normal': '#94a3b8'
};

// Nombres para mostrar (con tilde); en los datos vienen sin tilde
const NOMBRES: Record<string, string> = {
  'Infiltracion': 'Infiltración',
  'Neumonia': 'Neumonía',
  'Neumotorax': 'Neumotórax',
  'Nodulos': 'Nódulos'
};

@Component({
  selector: 'app-ficha-modelo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ficha-modelo.html',
  styleUrl: './ficha-modelo.css'
})
export class FichaModeloComponent implements OnInit, OnDestroy {
  ficha: any = null;
  cargando = true;
  error = '';
  claseSeleccionada = '';

  private graficas = new Map<string, Chart>();
  private observadorTema?: MutationObserver;

  constructor(
    private modeloService: ModeloService,
    private cdr: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.modeloService.getFichaModelo().subscribe({
      next: (resp: any) => {
        this.ficha = resp.data || resp;
        const preferida = this.ficha.clases.find((c: any) => c.nombre === 'Cardiomegalia') || this.ficha.clases[0];
        this.claseSeleccionada = preferida.nombre;
        this.cargando = false;
        this.cdr.detectChanges();      // se crean los <canvas> antes de dibujar
        this.dibujarTodo();
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudo cargar la ficha del modelo. Intenta de nuevo en unos segundos.';
        this.cdr.detectChanges();
      }
    });

    // Si el usuario cambia entre modo claro y oscuro, las gráficas se redibujan con los colores del tema
    this.observadorTema = new MutationObserver(() => { if (this.ficha) this.dibujarTodo(); });
    this.observadorTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  ngOnDestroy(): void {
    this.observadorTema?.disconnect();
    this.graficas.forEach(g => g.destroy());
    this.graficas.clear();
  }

  // ===== Ayudas para la plantilla =====
  nombre(n: string): string { return NOMBRES[n] || n; }
  color(n: string): string { return COLORES[n] || '#94a3b8'; }
  pct(v: number | null | undefined, decimales = 0): string {
    return v === null || v === undefined ? '—' : `${(v * 100).toFixed(decimales)}%`;
  }
  num(v: number | null | undefined, decimales = 2): string {
    return v === null || v === undefined ? '—' : v.toFixed(decimales);
  }

  get clase(): any { return this.ficha?.clases.find((c: any) => c.nombre === this.claseSeleccionada); }

  get clasesQueOpinan(): any[] { return this.ficha.clases.filter((c: any) => c.sePuedePronunciar); }

  get diferenciaMaximaAuc(): number {
    return Math.max(...this.ficha.clases.map((c: any) => Math.abs(c.aucPlataforma - c.aucColab)));
  }

  get clasesSinOpinion(): string[] {
    return this.ficha.clases.filter((c: any) => !c.sePuedePronunciar).map((c: any) => this.nombre(c.nombre));
  }

  get mejorAuc(): any { return [...this.ficha.clases].sort((a: any, b: any) => b.aucPlataforma - a.aucPlataforma)[0]; }
  get peorAuc(): any { return [...this.ficha.clases].sort((a: any, b: any) => a.aucPlataforma - b.aucPlataforma)[0]; }

  calificarAuc(auc: number): string {
    if (auc >= 0.9) return 'excelente';
    if (auc >= 0.8) return 'muy buena';
    if (auc >= 0.7) return 'aceptable';
    if (auc >= 0.6) return 'débil';
    return 'muy débil';
  }

  // Intensidad del color de una celda de la matriz "lo que dijo la IA / lo que era" (0 a 1, por fila)
  intensidad(fila: string, columna: string): number {
    const m = this.ficha.global.matrizOpinionReal[fila];
    const total = Object.values(m as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    return total > 0 ? m[columna] / total : 0;
  }
  celda(fila: string, columna: string): number { return this.ficha.global.matrizOpinionReal[fila][columna]; }
  esAcierto(fila: string, columna: string): boolean { return fila === columna; }

  ir(id: string): void {
    this.host.nativeElement.querySelector('#' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Las confusiones más frecuentes (fuera de la diagonal) y las falsas alarmas sobre radiografías normales,
  // leídas directamente de la matriz para que el texto siempre coincida con los números
  get resumenConfusiones(): { cruces: string; falsasAlarmas: number } {
    const m = this.ficha.global.matrizOpinionReal;
    const cols: string[] = this.ficha.global.columnasMatriz;
    const celdas: { dijo: string; era: string; n: number }[] = [];
    for (const dijo of cols) for (const era of cols) if (dijo !== era && era !== 'Normal' && m[dijo][era] > 0) celdas.push({ dijo, era, n: m[dijo][era] });
    celdas.sort((a, b) => b.n - a.n);
    const cruces = celdas.slice(0, 3).map(c => `opinó ${this.nombre(c.dijo)} y era ${this.nombre(c.era)} (${c.n} veces)`).join('; ');
    const falsasAlarmas = cols.filter(c => c !== 'Normal').reduce((s, c) => s + m[c]['Normal'], 0);
    return { cruces, falsasAlarmas };
  }

  seleccionarClase(n: string): void {
    this.claseSeleccionada = n;
    this.cdr.detectChanges();
    this.dibujarDetalle();
  }

  // Explicación en lenguaje llano de la patología elegida, armada con sus números reales
  get explicacion(): { titulo: string; texto: string }[] {
    const c = this.clase;
    if (!c) return [];
    const nom = this.nombre(c.nombre);
    const p = c.plataforma;
    const partes: { titulo: string; texto: string }[] = [];

    partes.push({
      titulo: '¿Qué tan bien la distingue?',
      texto: `Su AUC es ${this.num(c.aucPlataforma)} (${this.calificarAuc(c.aucPlataforma)}). Colab reportó ${this.num(c.aucColab)}. ` +
        `Traducido: si le muestras una radiografía con ${nom} y otra sin ella, en ${Math.round(c.aucPlataforma * 100)} de cada 100 parejas el modelo asigna más probabilidad a la que sí la tiene.`
    });

    if (c.sePuedePronunciar) {
      partes.push({
        titulo: '¿Cuándo opina?',
        texto: `Solo opina "${nom}" cuando su probabilidad supera el ${Math.round(c.umbral * 100)}% (su umbral). ` +
          `Con las ${p.imagenes} imágenes de la plataforma opinó en ${this.pct(p.porcentajeImagenesQueOpina, 1)} de ellas (${p.opina} veces) y acertó ${this.pct(p.precision)} de esas veces. ` +
          `Elegir al azar acertaría solo ${this.pct(p.prevalencia)}, así que es ${this.num(p.mejoraSobreAzar, 1)} veces mejor que el azar.`
      });
      partes.push({
        titulo: '¿A cuántos detecta y a cuántos descarta?',
        texto: `De las ${p.positivos} radiografías que sí tienen ${nom}, la detectó en ${p.tp} (${this.pct(p.sensibilidad)}) y se le escaparon ${p.fn}. ` +
          `De las ${p.imagenes - p.positivos} que no la tienen, descartó bien ${p.tn} (${this.pct(p.especificidad)}) y dio falsa alarma en ${p.fp}.`
      });
    } else {
      partes.push({
        titulo: '¿Por qué nunca opina?',
        texto: `El modelo sí calcula una probabilidad para ${nom}, pero está configurado para abstenerse siempre con ella: no tiene un umbral de opinión definido. ` +
          `Por eso, en los casos de ${nom} verás que la IA se abstiene, incluso cuando la patología está presente. En la plataforma hay ${p.positivos} radiografías con ${nom}.`
      });
    }

    if (c.localizacionGradcam) {
      partes.push({
        titulo: '¿Sabe señalar dónde está?',
        texto: `Con el mapa de calor (Grad-CAM), la zona marcada cae dentro del recuadro del radiólogo en ${this.pct(c.localizacionGradcam.acierto)} de los ${c.localizacionGradcam.n} casos medidos.`
      });
    } else {
      partes.push({
        titulo: '¿Sabe señalar dónde está?',
        texto: `No se pudo medir: el dataset del NIH no trae recuadros de radiólogo para ${nom}, así que no hay con qué comparar su mapa de calor.`
      });
    }
    return partes;
  }

  // ===== Dibujo de gráficas =====
  private tema() {
    const cs = getComputedStyle(document.documentElement);
    const leer = (v: string, def: string) => cs.getPropertyValue(v).trim() || def;
    return {
      texto: leer('--text-main', '#e5e7eb'),
      suave: leer('--text-muted', '#94a3b8'),
      borde: leer('--border-color', 'rgba(255,255,255,0.1)'),
      acento: leer('--accent-cyan', '#38bdf8')
    };
  }

  private crear(id: string, config: ChartConfiguration): void {
    this.graficas.get(id)?.destroy();
    const lienzo = this.host.nativeElement.querySelector(`#${id}`) as HTMLCanvasElement | null;
    if (!lienzo) return;
    this.graficas.set(id, new Chart(lienzo, config));
  }

  private dibujarTodo(): void {
    this.dibujarGenerales();
    this.dibujarDetalle();
  }

  // Líneas verticales de referencia (p. ej. AUC 0.7 / 0.8 / 0.9) con su etiqueta
  private guias(valores: { valor: number; texto: string }[], color: string): Plugin {
    return {
      id: 'guias',
      afterDatasetsDraw: (chart) => {
        const { ctx, chartArea, scales } = chart;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
        for (const g of valores) {
          const x = scales['x'].getPixelForValue(g.valor);
          ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
          ctx.fillText(g.texto, x, chartArea.top - 6);
        }
        ctx.restore();
      }
    };
  }

  // Número al final de cada barra
  private valoresEnBarras(formato: (v: number) => string, color: string, horizontal = false): Plugin {
    return {
      id: 'valoresEnBarras',
      afterDatasetsDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        ctx.fillStyle = color; ctx.font = 'bold 11px sans-serif';
        chart.data.datasets.forEach((ds: any, i) => {
          if (chart.getDatasetMeta(i).hidden) return;
          chart.getDatasetMeta(i).data.forEach((barra: any, j) => {
            const v = ds.data[j];
            if (v === null || v === undefined) return;
            if (horizontal) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(formato(v), barra.x + 4, barra.y); }
            else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(formato(v), barra.x, barra.y - 3); }
          });
        });
        ctx.restore();
      }
    };
  }

  private dibujarGenerales(): void {
    const t = this.tema();
    const f = this.ficha;
    const ejes = (extra: any = {}) => ({
      ticks: { color: t.suave, font: { size: 11 } },
      grid: { color: t.borde },
      border: { color: t.borde },
      ...extra
    });
    const leyenda = { labels: { color: t.texto, boxWidth: 12, font: { size: 12 } } };
    const base = { responsive: true, maintainAspectRatio: false } as const;

    // 1) AUC por patología: Colab frente a las imágenes de la plataforma
    const porAuc = [...f.clases].sort((a: any, b: any) => b.aucPlataforma - a.aucPlataforma);
    this.crear('g-auc', {
      type: 'bar',
      data: {
        labels: porAuc.map((c: any) => this.nombre(c.nombre)),
        datasets: [
          { label: 'En Google Colab (conjunto de prueba original)', data: porAuc.map((c: any) => c.aucColab), backgroundColor: t.suave + '99', borderRadius: 4 },
          { label: 'Recalculado con las imágenes de la plataforma', data: porAuc.map((c: any) => c.aucPlataforma), backgroundColor: t.acento, borderRadius: 4 }
        ]
      },
      options: {
        ...base, indexAxis: 'y', layout: { padding: { top: 18, right: 34 } },
        plugins: { legend: { position: 'bottom', ...leyenda }, tooltip: { callbacks: { label: (x) => ` ${x.dataset.label}: AUC ${(x.parsed.x ?? 0).toFixed(2)}` } } },
        scales: { x: ejes({ min: 0.5, max: 1, title: { display: true, text: 'AUC (0,5 = adivinar al azar · 1,0 = perfecto)', color: t.suave } }), y: ejes({ grid: { display: false } }) }
      },
      plugins: [this.guias([{ valor: 0.7, texto: 'Aceptable' }, { valor: 0.8, texto: 'Muy buena' }, { valor: 0.9, texto: 'Excelente' }], t.suave), this.valoresEnBarras(v => v.toFixed(2), t.texto, true)]
    } as ChartConfiguration);

    // 2) Curvas ROC de todas las patologías
    const diagonal = { label: 'Azar (adivinar)', data: [{ x: 0, y: 0 }, { x: 1, y: 1 }], borderColor: t.suave, borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0, showLine: true };
    this.crear('g-roc', {
      type: 'scatter',
      data: {
        datasets: [
          ...f.clases.map((c: any) => ({
            label: `${this.nombre(c.nombre)} (AUC ${c.aucPlataforma.toFixed(2)})`,
            data: c.roc.map((p: any) => ({ x: p.fpr, y: p.tpr })),
            borderColor: this.color(c.nombre), backgroundColor: this.color(c.nombre), borderWidth: 2, pointRadius: 0, showLine: true, tension: 0
          })),
          diagonal
        ]
      },
      options: {
        ...base, aspectRatio: 1, plugins: { legend: leyenda, tooltip: { enabled: false } },
        scales: {
          x: ejes({ min: 0, max: 1, ticks: { color: t.suave, callback: (v: any) => `${Math.round(Number(v) * 100)}%` }, title: { display: true, text: 'Falsas alarmas: % de radiografías SIN la patología que el modelo marca por error', color: t.suave } }),
          y: ejes({ min: 0, max: 1, ticks: { color: t.suave, callback: (v: any) => `${Math.round(Number(v) * 100)}%` }, title: { display: true, text: 'Detección: % de radiografías CON la patología que sí detecta', color: t.suave } })
        }
      }
    } as ChartConfiguration);

    // 3) Precisión cuando opina frente al azar
    const conUmbral = f.clases.filter((c: any) => c.sePuedePronunciar);
    this.crear('g-precision', {
      type: 'bar',
      data: {
        labels: conUmbral.map((c: any) => this.nombre(c.nombre)),
        datasets: [
          { label: 'Si eligiera al azar (% de imágenes que sí la tienen)', data: conUmbral.map((c: any) => +(c.plataforma.prevalencia * 100).toFixed(1)), backgroundColor: t.suave + '99', borderRadius: 4 },
          { label: 'Cuando el modelo opina, acierta', data: conUmbral.map((c: any) => +(c.plataforma.precision * 100).toFixed(1)), backgroundColor: t.acento, borderRadius: 4 }
        ]
      },
      options: {
        ...base, layout: { padding: { top: 20 } },
        plugins: { legend: leyenda, tooltip: { callbacks: { afterBody: (items) => { const c = conUmbral[items[0].dataIndex]; return `Mejora: ${c.plataforma.mejoraSobreAzar.toFixed(1)} veces mejor que el azar`; } } } },
        scales: { x: ejes({ grid: { display: false } }), y: ejes({ min: 0, max: 100, ticks: { color: t.suave, callback: (v: any) => `${v}%` } }) }
      },
      plugins: [this.valoresEnBarras(v => `${Math.round(v)}%`, t.texto)]
    } as ChartConfiguration);

    // 4) Opiniones correctas / incorrectas por patología
    const nombres = f.clases.map((c: any) => c.nombre);
    this.crear('g-opiniones', {
      type: 'bar',
      data: {
        labels: nombres.map((n: string) => this.nombre(n)),
        datasets: [
          { label: 'Opinión correcta', data: nombres.map((n: string) => f.global.porOpinion[n].correctas), backgroundColor: '#34d399', borderRadius: 3 },
          { label: 'Opinión incorrecta', data: nombres.map((n: string) => f.global.porOpinion[n].incorrectas), backgroundColor: '#fb7185', borderRadius: 3 }
        ]
      },
      options: {
        ...base, plugins: { legend: leyenda },
        scales: { x: ejes({ stacked: true, grid: { display: false } }), y: ejes({ stacked: true, title: { display: true, text: 'Número de opiniones', color: t.suave } }) }
      }
    } as ChartConfiguration);

    // 5) Opina / se abstiene
    this.crear('g-abstencion', {
      type: 'doughnut',
      data: {
        labels: ['La IA opina', 'La IA se abstiene'],
        datasets: [{ data: [f.global.conOpinion, f.global.seAbstiene], backgroundColor: [t.acento, t.suave + '88'], borderColor: 'transparent' }]
      },
      options: { ...base, cutout: '62%', plugins: { legend: { position: 'bottom', ...leyenda } } }
    } as ChartConfiguration);

    // 6) Localización con Grad-CAM
    const conLoc = f.clases.filter((c: any) => c.localizacionGradcam);
    this.crear('g-localizacion', {
      type: 'bar',
      data: {
        labels: conLoc.map((c: any) => `${this.nombre(c.nombre)} (${c.localizacionGradcam.n} casos)`),
        datasets: [{ label: 'El mapa de calor cae dentro del recuadro del radiólogo', data: conLoc.map((c: any) => +(c.localizacionGradcam.acierto * 100).toFixed(1)), backgroundColor: conLoc.map((c: any) => this.color(c.nombre)), borderRadius: 4 }]
      },
      options: {
        ...base, indexAxis: 'y', layout: { padding: { right: 36 } }, plugins: { legend: { display: false } },
        scales: { x: ejes({ min: 0, max: 100, ticks: { color: t.suave, callback: (v: any) => `${v}%` } }), y: ejes({ grid: { display: false } }) }
      },
      plugins: [this.valoresEnBarras(v => `${Math.round(v)}%`, t.texto, true)]
    } as ChartConfiguration);

    // 7) Cuántas imágenes de cada patología hay en la plataforma
    this.crear('g-prevalencia', {
      type: 'bar',
      data: {
        labels: f.clases.map((c: any) => this.nombre(c.nombre)),
        datasets: [{ label: 'Imágenes', data: f.clases.map((c: any) => c.plataforma.positivos), backgroundColor: f.clases.map((c: any) => this.color(c.nombre)), borderRadius: 4 }]
      },
      options: {
        ...base, layout: { padding: { top: 20 } }, plugins: { legend: { display: false } },
        scales: { x: ejes({ grid: { display: false } }), y: ejes({ title: { display: true, text: 'Número de imágenes', color: t.suave } }) }
      },
      plugins: [this.valoresEnBarras(v => `${v}`, t.texto)]
    } as ChartConfiguration);

    // 8) Dos preguntas sencillas (triaje)
    const tri = f.global.triage;
    this.crear('g-triaje', {
      type: 'bar',
      data: {
        labels: ['"Parece normal"', '"Hay algún hallazgo"'],
        datasets: [
          { label: 'Cuando el modelo lo afirma, acierta', data: [tri.parece_normal.precision * 100, tri.hay_hallazgo.precision * 100], backgroundColor: t.acento, borderRadius: 4 },
          { label: 'Lo afirma en este % de las imágenes', data: [tri.parece_normal.cobertura * 100, tri.hay_hallazgo.cobertura * 100], backgroundColor: t.suave + '99', borderRadius: 4 }
        ]
      },
      options: {
        ...base, layout: { padding: { top: 20 } }, plugins: { legend: leyenda },
        scales: { x: ejes({ grid: { display: false } }), y: ejes({ min: 0, max: 100, ticks: { color: t.suave, callback: (v: any) => `${v}%` } }) }
      },
      plugins: [this.valoresEnBarras(v => `${Math.round(v)}%`, t.texto)]
    } as ChartConfiguration);
  }

  private dibujarDetalle(): void {
    const c = this.clase;
    if (!c) return;
    const t = this.tema();
    const nom = this.nombre(c.nombre);
    const color = this.color(c.nombre);
    const ejes = (extra: any = {}) => ({ ticks: { color: t.suave, font: { size: 11 } }, grid: { color: t.borde }, border: { color: t.borde }, ...extra });
    const base = { responsive: true, maintainAspectRatio: false } as const;
    const leyenda = { labels: { color: t.texto, boxWidth: 12, font: { size: 12 } } };

    // Línea del umbral sobre el histograma
    const lineaUmbral: Plugin = {
      id: 'lineaUmbral',
      afterDatasetsDraw: (chart) => {
        if (c.umbral === null) return;
        const x = chart.scales['x'];
        const ancho = x.getPixelForValue(1) - x.getPixelForValue(0);
        const px = x.getPixelForValue(0) - ancho / 2 + c.umbral * 10 * ancho;
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.setLineDash([5, 4]); ctx.strokeStyle = '#f59e0b'; ctx.fillStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
        ctx.beginPath(); ctx.moveTo(px, chartArea.top); ctx.lineTo(px, chartArea.bottom); ctx.stroke();
        ctx.fillText(` Umbral ${Math.round(c.umbral * 100)}%: desde aquí opina`, px, chartArea.top + 12);
        ctx.restore();
      }
    };

    this.crear('d-hist', {
      type: 'bar',
      data: {
        labels: c.histograma.cajas,
        datasets: [
          { label: `Radiografías SIN ${nom} (${c.histograma.nNegativos})`, data: c.histograma.negativos, backgroundColor: t.suave + '99', borderRadius: 3 },
          { label: `Radiografías CON ${nom} (${c.histograma.nPositivos})`, data: c.histograma.positivos, backgroundColor: color, borderRadius: 3 }
        ]
      },
      options: {
        ...base, plugins: { legend: leyenda, tooltip: { callbacks: { label: (x) => ` ${x.dataset.label}: ${(x.parsed.y ?? 0).toFixed(1)}% del grupo` } } },
        scales: {
          x: ejes({ grid: { display: false }, title: { display: true, text: `Probabilidad que el modelo asignó a ${nom}`, color: t.suave } }),
          y: ejes({ title: { display: true, text: '% de las radiografías de cada grupo', color: t.suave }, ticks: { color: t.suave, callback: (v: any) => `${v}%` } })
        }
      },
      plugins: [lineaUmbral]
    } as ChartConfiguration);

    this.crear('d-roc', {
      type: 'scatter',
      data: {
        datasets: [
          { label: `${nom} (AUC ${c.aucPlataforma.toFixed(2)})`, data: c.roc.map((p: any) => ({ x: p.fpr, y: p.tpr })), borderColor: color, backgroundColor: color + '33', borderWidth: 3, pointRadius: 0, showLine: true, fill: true },
          { label: 'Azar (adivinar)', data: [{ x: 0, y: 0 }, { x: 1, y: 1 }], borderColor: t.suave, borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0, showLine: true }
        ]
      },
      options: {
        ...base, aspectRatio: 1, plugins: { legend: leyenda, tooltip: { enabled: false } },
        scales: {
          x: ejes({ min: 0, max: 1, ticks: { color: t.suave, callback: (v: any) => `${Math.round(Number(v) * 100)}%` }, title: { display: true, text: 'Falsas alarmas', color: t.suave } }),
          y: ejes({ min: 0, max: 1, ticks: { color: t.suave, callback: (v: any) => `${Math.round(Number(v) * 100)}%` }, title: { display: true, text: 'Detección', color: t.suave } })
        }
      }
    } as ChartConfiguration);

    this.crear('d-calibracion', {
      type: 'scatter',
      data: {
        datasets: [
          { label: 'Lo que realmente ocurrió', data: c.calibracion.map((p: any) => ({ x: p.prometido * 100, y: p.observado * 100 })), borderColor: color, backgroundColor: color, borderWidth: 3, pointRadius: 5, showLine: true },
          { label: 'Ideal (el modelo dice X% y ocurre X%)', data: [{ x: 0, y: 0 }, { x: 100, y: 100 }], borderColor: t.suave, borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0, showLine: true }
        ]
      },
      options: {
        ...base, aspectRatio: 1,
        plugins: { legend: leyenda, tooltip: { callbacks: { label: (x) => ` Modelo dijo ~${Math.round(x.parsed.x ?? 0)}% → ocurrió en ${Math.round(x.parsed.y ?? 0)}%` } } },
        scales: {
          x: ejes({ min: 0, max: 100, ticks: { color: t.suave, callback: (v: any) => `${v}%` }, title: { display: true, text: 'Probabilidad que dijo el modelo', color: t.suave } }),
          y: ejes({ min: 0, max: 100, ticks: { color: t.suave, callback: (v: any) => `${v}%` }, title: { display: true, text: 'Qué % realmente la tenía', color: t.suave } })
        }
      }
    } as ChartConfiguration);
  }
}

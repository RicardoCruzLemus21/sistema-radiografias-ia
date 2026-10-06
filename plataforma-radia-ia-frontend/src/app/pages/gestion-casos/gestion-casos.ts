import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicalService } from '../../services/clinical';
import { AlertService } from '../../services/alert.service';
import { AcademicService } from '../../services/academic';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gestion-casos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-casos.html',
  styleUrl: './gestion-casos.css'
})
export class GestionCasosCatedratico implements OnInit {
  
  casos: any[] = [];
  casosFiltrados: any[] = [];

  // Los casos asignados se agrupan en carpetas (un ejercicio = un conjunto de casos publicados juntos)
  carpetas: any[] = [];
  casosSueltos: any[] = [];      // casos creados a mano, sin ejercicio
  ejercicioAbierto: any = null;  // carpeta que se está viendo por dentro
  eliminandoEjercicio: boolean = false;
  filtroTexto: string = '';
  // Filtro por estado de avance de los ejercicios: TODOS | COMPLETADO | PENDIENTE | SIN_INICIAR
  filtroEstado: string = 'TODOS';
  cargando: boolean = false;

  // Progreso por ejercicio (viene del backend) y bitácora del ejercicio abierto
  progresoPorEjercicio = new Map<number, any>();
  // Por defecto el panel muestra solo los ejercicios visibles; "verOcultos" muestra los ocultos
  verOcultos: boolean = false;
  bitacora: any[] = [];
  cargandoBitacora: boolean = false;

  // === ASIGNAR CASOS DEL BANCO NIH: un solo flujo ===
  // curso destino -> qué evaluar (patologías, nivel, cantidad) -> componer -> revisar -> publicar
  bancoModalAbierto: boolean = false;
  misCursos: any[] = [];
  cursoSeleccionado: number | null = null;

  // Patologías que el docente quiere evaluar. "Normal" no se elige: entra según el % de normales.
  patologiasObjetivo = [
    { nombre: 'Atelectasia', seleccionada: false },
    { nombre: 'Cardiomegalia', seleccionada: false },
    { nombre: 'Derrame Pleural', seleccionada: false },
    { nombre: 'Infiltracion', seleccionada: false },
    { nombre: 'Neumonia', seleccionada: false },
    { nombre: 'Neumotorax', seleccionada: false },
    { nombre: 'Nodulos', seleccionada: false }
  ];
  mostrarDropdownPatologias: boolean = false;

  readonly MAX_CASOS = 50;
  // El nivel de dificultad se dejó fijo en "todos los niveles": no tenía sentido dejar que el
  // docente lo restringiera cuando en la práctica siempre se quiere el universo completo de casos.
  criteriosComposicion = {
    nivel_dificultad: 'Avanzado',
    total_casos: 5,
    porcentaje_normales: 30 // % entero en pantalla; se divide entre 100 al enviar
  };
  mostrarAvanzadas: boolean = false;

  // Casos utilizables por patología para el nivel (y curso) elegidos. No todas existen en todos los niveles:
  // p. ej. en "Básico" solo hay casos normales.
  disponibilidad: Record<string, number> = {};
  cargandoDisponibilidad: boolean = false;
  private pedidoDisponibilidad = 0;

  // Resultado de componer: `ejercicio` es lo que se ve; `casosSeleccionados` los que se publican
  ejercicio: any[] = [];
  casosSeleccionados: any[] = [];
  resumenComposicion: any = null;
  componiendoEjercicio: boolean = false;
  guardandoEjercicio: boolean = false;

  get patologiasSeleccionadas(): string[] {
    return this.patologiasObjetivo.filter(p => p.seleccionada).map(p => p.nombre);
  }

  // Patologías elegidas que no tienen ningún caso para el nivel/curso actual
  get patologiasSinCasos(): string[] {
    return this.patologiasSeleccionadas.filter(p => this.disponibilidad[p] === 0);
  }

  // No se puede componer si TODAS las patologías elegidas están vacías en este nivel
  get sinCasosObjetivo(): boolean {
    return this.patologiasSeleccionadas.length > 0 && this.patologiasSinCasos.length === this.patologiasSeleccionadas.length;
  }

  // Misma fórmula que el servidor (componerEjercicio), solo para explicar la mezcla antes de componer
  get previsualizacion(): { normales: number; objetivo: number; distractores: number } {
    const total = this.limitar(Math.trunc(Number(this.criteriosComposicion.total_casos)) || 5, 1, this.MAX_CASOS);
    const p = this.limitar(Number(this.criteriosComposicion.porcentaje_normales) / 100, 0, 1);
    const normales = Math.round(total * p);
    const objetivo = Math.round(total * (1 - p) * 0.7);
    return { normales, objetivo, distractores: Math.max(0, total - normales - objetivo) };
  }

  // El docente quitó algún caso a mano: recomponer descartaría esos ajustes
  get hayCambiosManuales(): boolean {
    return this.ejercicio.length > 0 && this.casosSeleccionados.length !== this.ejercicio.length;
  }

  get puedeComponer(): boolean {
    return !!this.cursoSeleccionado && this.patologiasSeleccionadas.length > 0 && !this.sinCasosObjetivo && !this.componiendoEjercicio;
  }

  get nombreCursoSeleccionado(): string {
    return this.misCursos.find(c => c.id_curso === this.cursoSeleccionado)?.nombre_curso || 'el curso elegido';
  }

  private limitar(valor: number, minimo: number, maximo: number): number {
    return Math.min(Math.max(valor, minimo), maximo);
  }

  // Cierra el desplegable de patologías si el clic fue afuera de él. Se usa desde dos lugares:
  // - el backdrop del modal, que sí burbujea hasta "document" (clic realmente afuera de todo).
  // - la propia tarjeta del modal, que detiene la propagación para no cerrar el modal al hacer clic
  //   dentro de él; sin esto, un clic en cualquier otro campo del formulario nunca llegaba a cerrarlo.
  private cerrarDropdownSiClicAfuera(evento: Event): void {
    const destino = evento.target as HTMLElement | null;
    if (this.mostrarDropdownPatologias && !destino?.closest?.('.pat-select')) {
      this.mostrarDropdownPatologias = false;
      this.cdr.detectChanges(); // el clic llega fuera de Angular (document): sin esto no se repinta
    }
  }

  @HostListener('document:click', ['$event'])
  cerrarDropdownAlHacerClicAfuera(evento: Event): void {
    this.cerrarDropdownSiClicAfuera(evento);
  }

  alHacerClicDentroDelModal(evento: Event): void {
    this.cerrarDropdownSiClicAfuera(evento);
    evento.stopPropagation();
  }

  // Estado para el modal de Ver Detalle
  modalDetalleAbierto: boolean = false;
  casoSeleccionado: any = null;

  // Estado para Editar Caso
  modalEditarAbierto: boolean = false;
  guardandoEdicion: boolean = false;
  casoEditando: any = {
    id: null,
    id_paciente: null,
    edad: null,
    genero: '',
    antecedentes: '',
    titulo_caso: '',
    motivo_consulta: '',
    nivel_dificultad: ''
  };

  // Estado para Eliminar Caso (la confirmación usa SweetAlert, no un modal propio)
  eliminandoCaso: boolean = false;

  constructor(
    private clinicalService: ClinicalService,
    private academicService: AcademicService,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.cargarCasos();
    this.cargarMisCursos();
  }

  cargarMisCursos(): void {
    this.academicService.getMisCursos().subscribe({
      next: (resp: any) => {
        const data = resp.data || resp;
        this.misCursos = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error obteniendo los cursos del catedrático:', err);
        this.misCursos = [];
      }
    });
  }

  cargarCasos(): void {
    this.cargando = true;
    this.clinicalService.getCasosCatedratico().subscribe({
      next: (resp: any) => {
        const data = resp.data || resp;
        if (Array.isArray(data) && data.length > 0) {
          this.casos = data;
        } else {
          this.cargarCasosPorDefecto();
        }
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
        this.cargarProgreso();
      },
      error: () => {
        this.cargarCasosPorDefecto();
        this.aplicarFiltros();
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarCasosPorDefecto(): void {
    // FUNCIÓN ELIMINADA: SISTEMA 100% DINÁMICO
    this.casos = [];
  }

  // El backend guarda rutas relativas (ej. /uploads/radiografias/x.jpg) que solo
  // existen en el origen del backend (environment.apiUrl), no en el del frontend (ng serve).
  // Sin este prefijo, el navegador intenta cargar la imagen desde el propio Angular y falla.
  getImagenUrl(ruta: string | null | undefined): string {
    if (!ruta) return '';
    return ruta.startsWith('http') ? ruta : `${environment.apiUrl}${ruta}`;
  }

  // Maneja errores de carga de imagen: muestra un placeholder SVG de radiografía
  onImageError(event: any, caso: any): void {
    caso._imgLoaded = true; // Oculta el skeleton también cuando hay error
    caso._imgError = true;
    event.target.src = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='220' viewBox='0 0 280 220'%3E%3Crect width='280' height='220' fill='%231a1a2e'/%3E%3Crect x='40' y='30' width='200' height='160' rx='8' fill='%23252545' stroke='%2333335a' stroke-width='1'/%3E%3Ccircle cx='140' cy='100' r='35' fill='none' stroke='%23334155' stroke-width='2'/%3E%3Ccircle cx='140' cy='100' r='20' fill='none' stroke='%23334155' stroke-width='1.5'/%3E%3Cpath d='M100 100 L180 100 M140 60 L140 140' stroke='%23334155' stroke-width='1.5'/%3E%3Ctext x='140' y='175' text-anchor='middle' fill='%23475569' font-size='10' font-family='sans-serif'%3EImagen no disponible%3C/text%3E%3C/svg%3E`;
  }

  // trackBy para ngFor: evita re-renderizar tarjetas que no cambiaron
  trackByCaso(index: number, caso: any): number {
    return caso.id_caso;
  }


  aplicarFiltros(): void {
    const q = this.filtroTexto.toLowerCase().trim();

    // Los ejercicios se agrupan con todos los casos; luego se filtran por nombre y por estado de avance
    this.casosFiltrados = [...this.casos];
    this.agruparEnCarpetas();

    this.carpetas = this.carpetas.filter(f =>
      f.oculto === this.verOcultos &&
      (!q || (f.nombre || '').toLowerCase().includes(q)) &&
      (this.filtroEstado === 'TODOS' || f.estado_progreso === this.filtroEstado.toLowerCase())
    );

    // Los casos sueltos (sin ejercicio) se buscan por título o paciente
    this.casosSueltos = this.casosSueltos.filter(c =>
      !q || (c.titulo || '').toLowerCase().includes(q) || (c.paciente || '').toLowerCase().includes(q)
    );
  }

  // Cuántos ejercicios hay en cada estado (para los contadores de los filtros)
  contarEstado(estado: string): number {
    const base = this.todasLasCarpetas().filter(f => !f.oculto);
    return estado === 'TODOS' ? base.length : base.filter(f => f.estado_progreso === estado).length;
  }

  // Todos los ejercicios sin filtrar (para contar aunque el filtro actual esté activo)
  private todasLasCarpetas(): any[] {
    const porEjercicio = new Map<number, any>();
    for (const c of this.casos) {
      if (!c.id_ejercicio || porEjercicio.has(c.id_ejercicio)) continue;
      porEjercicio.set(c.id_ejercicio, { id_ejercicio: c.id_ejercicio });
    }
    return [...porEjercicio.values()].map(f => {
      const prog = this.progresoPorEjercicio.get(f.id_ejercicio);
      return { ...f, estado_progreso: prog?.estado_progreso || 'sin_iniciar', oculto: !!prog?.oculto };
    });
  }

  get cantidadOcultos(): number {
    return [...this.progresoPorEjercicio.values()].filter(p => p.oculto).length;
  }

  toggleVerOcultos(): void {
    this.verOcultos = !this.verOcultos;
    this.aplicarFiltros();
  }

  // Oculta o muestra un ejercicio sin borrarlo ni perder sus datos
  toggleVisibilidad(carpeta: any, evento: Event): void {
    evento.stopPropagation(); // que no abra el ejercicio al pulsar el botón
    const nuevoOculto = !carpeta.oculto;
    this.clinicalService.cambiarVisibilidadEjercicio(carpeta.id_ejercicio, nuevoOculto).subscribe({
      next: () => {
        const prog = this.progresoPorEjercicio.get(carpeta.id_ejercicio) || { id_ejercicio: carpeta.id_ejercicio };
        this.progresoPorEjercicio.set(carpeta.id_ejercicio, { ...prog, oculto: nuevoOculto });
        this.aplicarFiltros();
        this.alertService.toast(nuevoOculto ? 'Ejercicio ocultado' : 'Ejercicio visible de nuevo', 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.alertService.error('No se pudo cambiar', 'Intenta de nuevo en un momento.');
      }
    });
  }

  cargarProgreso(): void {
    this.clinicalService.getProgresoEjercicios().subscribe({
      next: (resp: any) => {
        this.progresoPorEjercicio = new Map((resp.data || []).map((e: any) => [e.id_ejercicio, e]));
        this.aplicarFiltros();
        this.cdr.detectChanges();
      },
      error: () => {
        // Sin progreso, los ejercicios se muestran sin estado (todos cuentan como sin iniciar)
        this.aplicarFiltros();
      }
    });
  }

  private agruparEnCarpetas(): void {
    const porEjercicio = new Map<number, any>();
    const sueltos: any[] = [];
    for (const c of this.casosFiltrados) {
      if (!c.id_ejercicio) { sueltos.push(c); continue; }
      let carpeta = porEjercicio.get(c.id_ejercicio);
      if (!carpeta) {
        const prog = this.progresoPorEjercicio.get(c.id_ejercicio);
        carpeta = {
          id_ejercicio: c.id_ejercicio, nombre: c.ejercicio_nombre, numero: c.ejercicio_numero,
          id_curso: c.id_curso, nombre_curso: c.nombre_curso, casos: [], intentos: 0,
          estado_progreso: prog?.estado_progreso || 'sin_iniciar',
          oculto: !!prog?.oculto,
          alumnos_completados: Number(prog?.estudiantes_completados) || 0,
          total_alumnos: Number(prog?.total_estudiantes) || 0
        };
        porEjercicio.set(c.id_ejercicio, carpeta);
      }
      carpeta.casos.push(c);
      carpeta.intentos += Number(c.total_evaluaciones) || 0;
    }
    // Primero el curso, y dentro de cada curso Ejercicio 1, 2, 3...
    this.carpetas = [...porEjercicio.values()].sort((a, b) => a.id_curso - b.id_curso || a.numero - b.numero);
    this.casosSueltos = sueltos;

    // Si la carpeta abierta ya no existe (se eliminó o el filtro la vació), se vuelve a la vista general
    if (this.ejercicioAbierto) {
      this.ejercicioAbierto = this.carpetas.find(f => f.id_ejercicio === this.ejercicioAbierto.id_ejercicio) || null;
    }
  }

  // Casos que se dibujan como tarjetas: los de la carpeta abierta o, en la vista general, solo los sueltos
  get casosVisibles(): any[] {
    return this.ejercicioAbierto ? this.ejercicioAbierto.casos : this.casosSueltos;
  }

  abrirCarpeta(carpeta: any): void {
    this.ejercicioAbierto = carpeta;
    this.cargarBitacora(carpeta.id_ejercicio);
  }

  cerrarCarpeta(): void {
    this.ejercicioAbierto = null;
    this.bitacora = [];
  }

  // Quién completó el ejercicio y cuánto lleva cada alumno inscrito
  cargarBitacora(idEjercicio: number): void {
    this.bitacora = [];
    this.cargandoBitacora = true;
    this.clinicalService.getBitacoraEjercicio(idEjercicio).subscribe({
      next: (resp: any) => {
        this.bitacora = resp.data || [];
        this.cargandoBitacora = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoBitacora = false;
        this.cdr.detectChanges();
      }
    });
  }

  etiquetaEstado(estado: string): string {
    return estado === 'completado' ? 'Completado' : estado === 'pendiente' ? 'Pendiente de completar' : 'Sin iniciar';
  }

  estadoAlumno(a: any): string {
    return a.completado ? 'completado' : Number(a.casos_resueltos) > 0 ? 'en_curso' : 'sin_iniciar';
  }

  async eliminarCarpeta(carpeta: any): Promise<void> {
    const confirmado = await this.alertService.confirmDanger(
      'Eliminar ejercicio',
      `Se eliminará "${carpeta.nombre}" con sus ${carpeta.casos.length} casos y los intentos de estudiantes. Esta acción no se puede deshacer.`,
      'Sí, eliminar'
    );
    if (!confirmado) return;

    this.eliminandoEjercicio = true;
    this.clinicalService.eliminarEjercicio(carpeta.id_ejercicio).subscribe({
      next: () => {
        this.eliminandoEjercicio = false;
        this.ejercicioAbierto = null;
        this.alertService.success('Ejercicio eliminado', `"${carpeta.nombre}" se eliminó correctamente.`);
        this.cargarCasos();
      },
      error: (err: any) => {
        this.eliminandoEjercicio = false;
        this.alertService.error('Error al eliminar', err.error?.message || 'No se pudo eliminar el ejercicio.');
      }
    });
  }

  setFiltroEstado(estado: string): void {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  // ==========================================
  // FLUJO DE ASIGNACIÓN DE EJERCICIOS (BANCO NIH)
  // ==========================================

  abrirBancoCasos(): void {
    if (this.misCursos.length === 0) {
      this.alertService.warning(
        'Sin cursos asignados',
        'No tienes ningún curso asignado todavía. Pide a un administrador que te asigne un curso antes de crear ejercicios.'
      );
      return;
    }

    if (!this.misCursos.some(c => c.id_curso === this.cursoSeleccionado)) {
      this.cursoSeleccionado = this.misCursos[0].id_curso;
    }

    this.reiniciarEjercicio();
    this.bancoModalAbierto = true;
    this.cargarDisponibilidad();
  }

  cerrarBancoCasos(): void {
    this.bancoModalAbierto = false;
    this.mostrarDropdownPatologias = false;
  }

  private reiniciarEjercicio(): void {
    this.patologiasObjetivo.forEach(p => p.seleccionada = false);
    this.criteriosComposicion = { nivel_dificultad: 'Avanzado', total_casos: 5, porcentaje_normales: 30 };
    this.mostrarAvanzadas = false;
    this.mostrarDropdownPatologias = false;
    this.ejercicio = [];
    this.casosSeleccionados = [];
    this.resumenComposicion = null;
    this.disponibilidad = {};
  }

  cargarDisponibilidad(): void {
    const pedido = ++this.pedidoDisponibilidad;
    this.cargandoDisponibilidad = true;
    this.clinicalService.getDisponibilidadBanco(this.criteriosComposicion.nivel_dificultad, this.cursoSeleccionado).subscribe({
      next: (resp: any) => {
        if (pedido !== this.pedidoDisponibilidad) return; // llegó tarde: el docente ya cambió el nivel o el curso
        this.disponibilidad = Object.fromEntries((resp.data || []).map((d: any) => [d.patologia, d.total]));
        this.cargandoDisponibilidad = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (pedido !== this.pedidoDisponibilidad) return;
        this.disponibilidad = {}; // sin conteos: se puede componer igual, solo no se avisa de patologías vacías
        this.cargandoDisponibilidad = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Al cambiar de curso cambian las radiografías ya asignadas: un ejercicio compuesto antes ya no vale
  alCambiarCurso(): void {
    this.ejercicio = [];
    this.casosSeleccionados = [];
    this.resumenComposicion = null;
    this.cargarDisponibilidad();
  }

  textoDisponibilidad(nombre: string): string {
    const total = this.disponibilidad[nombre];
    if (total === undefined) return '';
    if (total === 0) return 'sin casos en este nivel';
    return total === 1 ? '1 caso' : `${total} casos`;
  }

  quitarPatologia(nombre: string): void {
    const patologia = this.patologiasObjetivo.find(p => p.nombre === nombre);
    if (patologia) patologia.seleccionada = false;
  }

  seleccionarTodasLasPatologias(): void {
    // Solo las que tienen casos en este nivel (si aún no se sabe cuántos hay, todas)
    this.patologiasObjetivo.forEach(p => p.seleccionada = this.disponibilidad[p.nombre] !== 0);
  }

  limpiarPatologias(): void {
    this.patologiasObjetivo.forEach(p => p.seleccionada = false);
  }

  async componerEjercicio(): Promise<void> {
    if (!this.cursoSeleccionado) {
      this.alertService.warning('Elige un curso', 'Selecciona el curso al que asignarás el ejercicio.');
      return;
    }
    if (this.patologiasSeleccionadas.length === 0) {
      this.alertService.warning('Elige qué evaluar', 'Marca una o más patologías para componer el ejercicio.');
      return;
    }

    if (this.hayCambiosManuales) {
      const confirmado = await this.alertService.confirm(
        'Volver a componer',
        'Quitaste algunos casos del ejercicio actual. Componer de nuevo reemplaza toda la selección. ¿Continuar?',
        'Sí, componer de nuevo'
      );
      if (!confirmado) return;
    }

    // Se corrigen valores fuera de rango (el campo permite teclear cualquier número)
    const c = this.criteriosComposicion;
    c.total_casos = this.limitar(Math.trunc(Number(c.total_casos)) || 5, 1, this.MAX_CASOS);
    c.porcentaje_normales = this.limitar(Number.isFinite(Number(c.porcentaje_normales)) ? Math.round(Number(c.porcentaje_normales)) : 30, 0, 100);

    this.componiendoEjercicio = true;
    this.clinicalService.componerEjercicio({
      patologias_objetivo: this.patologiasSeleccionadas,
      nivel_dificultad: c.nivel_dificultad,
      total_casos: c.total_casos,
      porcentaje_normales: c.porcentaje_normales / 100,
      id_curso: this.cursoSeleccionado
    }).subscribe({
      next: (resp: any) => {
        this.componiendoEjercicio = false;
        const { casos, resumen } = resp.data;
        this.ejercicio = casos;
        this.casosSeleccionados = [...casos];
        this.resumenComposicion = resumen;
        this.cdr.detectChanges();

        if (resumen.obtenidos === 0) {
          this.alertService.warning('No se encontraron casos', 'Con esos criterios el banco no tiene casos disponibles. Prueba con otro nivel u otras patologías.');
        } else if (resumen.obtenidos < resumen.solicitados) {
          this.alertService.warning(
            'Composición parcial',
            `Se armaron ${resumen.obtenidos} de ${resumen.solicitados} casos: el banco no tiene más disponibles con esos criterios (o el curso ya tiene esas radiografías).`
          );
        }
      },
      error: (err: any) => {
        this.componiendoEjercicio = false;
        this.alertService.error('Error al componer', err.error?.message || 'No se pudo componer el ejercicio.');
      }
    });
  }

  etiquetaTipo(tipo: string): string {
    return tipo === 'diana' ? 'Objetivo' : tipo === 'normal' ? 'Normal' : 'Distractor';
  }

  esCasoSeleccionado(id_caso: number): boolean {
    return this.casosSeleccionados.some(c => c.id_caso === id_caso);
  }

  // Incluir o quitar un caso del ejercicio antes de publicar
  toggleSeleccionCaso(caso: any): void {
    const index = this.casosSeleccionados.findIndex(c => c.id_caso === caso.id_caso);
    if (index === -1) {
      this.casosSeleccionados.push(caso);
    } else {
      this.casosSeleccionados.splice(index, 1);
    }
  }

  publicarEjercicio(): void {
    if (this.casosSeleccionados.length === 0) {
      this.alertService.warning('Ejercicio vacío', 'Debes dejar al menos un caso en el ejercicio para publicarlo.');
      return;
    }
    if (!this.cursoSeleccionado) {
      this.alertService.warning('Curso no seleccionado', 'Debes elegir un curso destino para este ejercicio.');
      return;
    }

    this.guardandoEjercicio = true;
    const ids_casos = this.casosSeleccionados.map(c => c.id_caso);

    this.clinicalService.asignarCasosBanco(this.cursoSeleccionado, ids_casos).subscribe({
      next: (resp: any) => {
        this.guardandoEjercicio = false;
        const publicados = resp.data?.ids_casos?.length ?? ids_casos.length;
        const nombreEjercicio = resp.data?.nombre || 'El ejercicio';
        this.cerrarBancoCasos();
        this.alertService.success(
          '¡Ejercicio publicado!',
          `${nombreEjercicio} se creó con ${publicados} casos. Los estudiantes ya pueden resolverlo.`
        );
        this.cargarCasos(); // Recarga la lista de casos asignados en el dashboard principal
      },
      error: (err: any) => {
        this.guardandoEjercicio = false;
        console.error('Error asignando casos:', err);
        this.alertService.error('Error al publicar', err.error?.message || 'Ocurrió un error al asignar los casos al curso.');
      }
    });
  }

  // Visor ampliado de la radiografía (con zoom) dentro de la ficha del caso
  radiografiaAmpliada: boolean = false;
  zoomRx: number = 1;

  abrirRadiografiaAmpliada(): void {
    this.zoomRx = 1;
    this.radiografiaAmpliada = true;
  }

  cerrarRadiografiaAmpliada(): void {
    this.radiografiaAmpliada = false;
  }

  cambiarZoom(paso: number): void {
    this.zoomRx = this.limitar(this.zoomRx + paso, 1, 4);
  }

  zoomConRueda(evento: WheelEvent): void {
    evento.preventDefault();
    this.cambiarZoom(evento.deltaY < 0 ? 0.25 : -0.25);
  }

  @HostListener('document:keydown.escape')
  cerrarVisorConEscape(): void {
    if (this.radiografiaAmpliada) this.radiografiaAmpliada = false;
  }

  abrirDetalleCaso(caso: any): void {
    this.casoSeleccionado = caso;
    this.modalDetalleAbierto = true;
  }

  // Verdad de referencia del caso (para que el docente audite qué patologías tiene marcadas antes
  // de publicarlo). hallazgos_docente puede ser un array simple (caso creado a mano, aún sin IA) o
  // un objeto con etiquetas_reales (caso del banco NIH).
  obtenerEtiquetasVerdad(caso: any): string[] {
    if (!caso?.hallazgos_docente) return [];
    let info = caso.hallazgos_docente;
    if (typeof info === 'string') {
      try { info = JSON.parse(info); } catch { return []; }
    }
    if (Array.isArray(info)) return info;
    return info?.etiquetas_reales || [];
  }

  cerrarDetalleCaso(): void {
    this.modalDetalleAbierto = false;
    this.radiografiaAmpliada = false;
    this.casoSeleccionado = null;
  }

  // --- EDITAR CASO ---
  abrirModalEditar(caso: any): void {
    this.casoEditando = {
      id: caso.id,
      id_paciente: caso.id_paciente,
      edad: caso.edad,
      genero: caso.genero,
      antecedentes: caso.antecedentes,
      titulo_caso: caso.titulo,
      motivo_consulta: caso.motivo_consulta,
      nivel_dificultad: caso.nivel_dificultad
    };
    this.cerrarDetalleCaso();
    this.modalEditarAbierto = true;
  }

  cerrarModalEditar(): void {
    this.modalEditarAbierto = false;
  }

  guardarEdicionCaso(): void {
    this.guardandoEdicion = true;
    this.clinicalService.editarCaso(this.casoEditando.id, this.casoEditando).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.cerrarModalEditar();
        this.cargarCasos(); // Recargar la lista
      },
      error: (err) => {
        console.error('Error al editar caso:', err);
        this.guardandoEdicion = false;
      }
    });
  }

  // --- ELIMINAR CASO ---
  // Usa únicamente SweetAlert (confirmDanger) para la confirmación, en vez de un modal HTML
  // propio + SweetAlert para el resultado: así solo se ve un tipo de ventana en todo el flujo.
  async abrirModalEliminar(caso: any): Promise<void> {
    this.cerrarDetalleCaso();

    const confirmado = await this.alertService.confirmDanger(
      'Confirmar Eliminación',
      `¿Estás seguro de que deseas eliminar permanentemente el caso clínico "${caso.titulo}"? Esta acción no se puede deshacer y fallará si ya hay evaluaciones de estudiantes en este caso.`,
      'Sí, Eliminar'
    );

    if (!confirmado) return;

    this.eliminandoCaso = true;
    this.clinicalService.eliminarCaso(caso.id).subscribe({
      next: () => {
        this.eliminandoCaso = false;
        this.alertService.success('Caso eliminado', 'El caso clínico se eliminó correctamente.');
        this.cargarCasos(); // Recargar la lista
      },
      error: (err) => {
        console.error('Error al eliminar caso:', err);
        this.eliminandoCaso = false;
        this.alertService.error("Error al eliminar", err.error?.message || 'Error al eliminar el caso clínico. Verifica si tiene evaluaciones asociadas.');
      }
    });
  }
}

import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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
  filtroTexto: string = '';
  filtroEstado: string = 'TODOS'; // Cambiado de filtroDificultad
  cargando: boolean = false;

  patologias = [
    { nombre: 'Atelectasia', seleccionada: false },
    { nombre: 'Cardiomegalia', seleccionada: false },
    { nombre: 'Derrame Pleural', seleccionada: false },
    { nombre: 'Infiltracion', seleccionada: false },
    { nombre: 'Neumonia', seleccionada: false },
    { nombre: 'Neumotorax', seleccionada: false },
    { nombre: 'Nodulos', seleccionada: false },
    { nombre: 'Normal', seleccionada: false }
  ];

  // === ESTADO PARA EL BANCO DE CASOS (EL "CARRITO") ===
  bancoModalAbierto: boolean = false;
  bancoCasos: any[] = [];
  casosSeleccionados: any[] = []; // El carrito de compras
  filtroBancoPatologia: string = 'Normal';
  filtroBancoDificultad: string = 'Basico';
  cargandoBanco: boolean = false;
  guardandoEjercicio: boolean = false;
  cursoSeleccionado: number | null = null;
  misCursos: any[] = [];

  // === COMPOSICIÓN AUTOMÁTICA (híbrido: prellena el carrito, el docente lo sigue ajustando a mano) ===
  patologiasObjetivo = [
    { nombre: 'Atelectasia', seleccionada: false },
    { nombre: 'Cardiomegalia', seleccionada: false },
    { nombre: 'Derrame Pleural', seleccionada: false },
    { nombre: 'Infiltracion', seleccionada: false },
    { nombre: 'Neumonia', seleccionada: false },
    { nombre: 'Neumotorax', seleccionada: false },
    { nombre: 'Nodulos', seleccionada: false }
  ];
  criteriosComposicion = {
    nivel_dificultad: 'Avanzado', // incluye Básico+Intermedio+Avanzado por defecto
    total_casos: 10,
    porcentaje_normales: 30 // se muestra como % entero en el input, se divide entre 100 al enviar
  };
  componiendoEjercicio: boolean = false;
  mostrarDropdownPatologias: boolean = false;

  textoPatologiasObjetivo(): string {
    const seleccionadas = this.patologiasObjetivo.filter(p => p.seleccionada).map(p => p.nombre);
    if (seleccionadas.length === 0) return 'Selecciona patologías objetivo...';
    if (seleccionadas.length <= 2) return seleccionadas.join(', ');
    return `${seleccionadas.length} patologías seleccionadas`;
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
    private ngZone: NgZone,
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
    let res = [...this.casos];

    if (this.filtroTexto.trim()) {
      const q = this.filtroTexto.toLowerCase().trim();
      res = res.filter(c => 
        (c.titulo && c.titulo.toLowerCase().includes(q)) || 
        (c.paciente && c.paciente.toLowerCase().includes(q)) ||
        (c.motivo_consulta && c.motivo_consulta.toLowerCase().includes(q))
      );
    }

    if (this.filtroEstado !== 'TODOS') {
      res = res.filter(c => c.estado?.toUpperCase() === this.filtroEstado.toUpperCase());
    }

    this.casosFiltrados = res;
  }

  setFiltroEstado(estado: string): void {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  // ==========================================
  // FLUJO DE CREACIÓN DE EJERCICIOS (BANCO NIH)
  // ==========================================
  
  abrirBancoCasos(): void {
    if (this.misCursos.length === 0) {
      this.alertService.warning(
        'Sin cursos asignados',
        'No tienes ningún curso asignado todavía. Pide a un administrador que te asigne un curso antes de crear ejercicios.'
      );
      return;
    }
    
    // Seleccionar el primer curso por defecto si no hay uno seleccionado
    if (!this.cursoSeleccionado) {
      this.cursoSeleccionado = this.misCursos[0].id_curso;
    }
    
    this.casosSeleccionados = [];
    this.bancoModalAbierto = true;
    this.cargarBanco();
  }

  cerrarBancoCasos(): void {
    this.bancoModalAbierto = false;
  }

  cargarBanco(): void {
    this.cargandoBanco = true;
    this.cdr.detectChanges(); // forzar que el spinner aparezca de inmediato
    this.clinicalService.getBancoCasosIA(this.filtroBancoPatologia, this.filtroBancoDificultad).subscribe({
      next: (resp: any) => {
        // NgZone.run garantiza que Angular actualice la vista sin esperar un evento
        this.ngZone.run(() => {
          this.bancoCasos = resp.data || [];
          this.cargandoBanco = false;
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          console.error('Error cargando banco:', err);
          this.alertService.error('Error', 'No se pudo cargar el banco de casos. Verifica tu conexión.');
          this.cargandoBanco = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  cambiarFiltroBanco(): void {
    this.cargarBanco();
  }

  async componerAutomaticamente(): Promise<void> {
    const objetivos = this.patologiasObjetivo.filter(p => p.seleccionada).map(p => p.nombre);
    if (objetivos.length === 0) {
      this.alertService.warning('Selecciona al menos una patología', 'Marca una o más patologías objetivo para componer el ejercicio.');
      return;
    }

    if (this.casosSeleccionados.length > 0) {
      const confirmado = await this.alertService.confirm(
        'Reemplazar selección actual',
        `Ya tienes ${this.casosSeleccionados.length} caso(s) en tu bandeja. Componer automáticamente reemplazará esa selección. ¿Continuar?`,
        'Sí, reemplazar'
      );
      if (!confirmado) return;
    }

    this.componiendoEjercicio = true;
    this.clinicalService.componerEjercicio({
      patologias_objetivo: objetivos,
      nivel_dificultad: this.criteriosComposicion.nivel_dificultad,
      total_casos: this.criteriosComposicion.total_casos,
      porcentaje_normales: this.criteriosComposicion.porcentaje_normales / 100
    }).subscribe({
      next: (resp: any) => {
        this.componiendoEjercicio = false;
        const { casos, resumen } = resp.data;
        this.casosSeleccionados = casos;
        this.cdr.detectChanges();

        if (resumen.obtenidos < resumen.solicitados) {
          this.alertService.warning(
            'Composición parcial',
            `Se encontraron ${resumen.obtenidos} de ${resumen.solicitados} casos solicitados (${resumen.diana} diana, ${resumen.normales} normales, ${resumen.distractores} distractores). Puedes completar el resto a mano desde la grilla.`
          );
        } else {
          this.alertService.success(
            'Ejercicio compuesto',
            `${resumen.diana} diana, ${resumen.normales} normales y ${resumen.distractores} distractores agregados a tu bandeja. Puedes ajustar la selección antes de publicar.`
          );
        }
      },
      error: (err: any) => {
        this.componiendoEjercicio = false;
        this.alertService.error('Error al componer', err.error?.message || 'No se pudo componer el ejercicio automáticamente.');
      }
    });
  }

  esCasoSeleccionado(id_caso: number): boolean {
    return this.casosSeleccionados.some(c => c.id_caso === id_caso);
  }

  toggleSeleccionCaso(caso: any): void {
    const index = this.casosSeleccionados.findIndex(c => c.id_caso === caso.id_caso);
    if (index === -1) {
      // Agregar al carrito
      this.casosSeleccionados.push(caso);
    } else {
      // Remover del carrito
      this.casosSeleccionados.splice(index, 1);
    }
  }

  publicarEjercicio(): void {
    if (this.casosSeleccionados.length === 0) {
      this.alertService.warning('Carrito Vacío', 'Debes seleccionar al menos un caso clínico para publicar.');
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
        this.cerrarBancoCasos();
        this.alertService.success(
          '¡Ejercicio Publicado!',
          `Se han asignado ${resp.data?.copiados || this.casosSeleccionados.length} casos al curso exitosamente. Los estudiantes ya pueden resolverlos.`
        );
        this.cargarCasos(); // Recarga la lista de casos asignados en el dashboard principal
      },
      error: (err: any) => {
        this.guardandoEjercicio = false;
        console.error('Error asignando casos:', err);
        this.alertService.error('Error al Publicar', err.error?.message || 'Ocurrió un error al asignar los casos al curso.');
      }
    });
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

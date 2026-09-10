import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicalService } from '../../services/clinical';
import { AlertService } from '../../services/alert.service';
import { AcademicService } from '../../services/academic';

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
  filtroDificultad: string = 'TODAS';
  cargando: boolean = false;

  // Estado para el modal de Crear Caso
  modalCrearAbierto: boolean = false;
  guardandoCaso: boolean = false;
  mensajeExito: string = '';
  mensajeError: string = '';

  // Formulario nuevo caso
  nuevoCaso = {
    codigo_paciente: '',
    edad: null as number | null,
    genero: '',
    antecedentes_medicos: '',
    titulo_caso: '',
    nivel_dificultad: 'Intermedio',
    motivo_consulta: '',
    tipo_proyeccion: 'Tórax PA (Posteroanterior)',
    id_curso: null as number | null
  };

  // Cursos reales del catedrático (reemplaza el id_curso hardcodeado)
  misCursos: any[] = [];

  archivoSeleccionado: File | null = null;
  nombreArchivoSeleccionado: string = '';
  imagenPreviewUrl: string = 'https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=600&q=80';
  isDragging: boolean = false;

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

  // Estado para Eliminar Caso
  modalEliminarAbierto: boolean = false;
  eliminandoCaso: boolean = false;
  casoAEliminar: any = null;

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

    if (this.filtroDificultad !== 'TODAS') {
      res = res.filter(c => c.nivel_dificultad?.toUpperCase() === this.filtroDificultad.toUpperCase());
    }

    this.casosFiltrados = res;
  }

  setFiltroDificultad(dif: string): void {
    this.filtroDificultad = dif;
    this.aplicarFiltros();
  }

  abrirModalCrear(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
    this.nuevoCaso = {
      codigo_paciente: 'Cargando...',
      edad: null,
      genero: '',
      antecedentes_medicos: '',
      titulo_caso: '',
      nivel_dificultad: 'Intermedio',
      motivo_consulta: '',
      tipo_proyeccion: 'Tórax PA (Posteroanterior)',
      id_curso: this.misCursos.length > 0 ? this.misCursos[0].id_curso : null
    };

    if (this.misCursos.length === 0) {
      this.alertService.warning(
        'Sin cursos asignados',
        'No tienes ningún curso creado todavía. Crea un curso antes de registrar casos clínicos.'
      );
    }

    this.clinicalService.getNextPacienteCode().subscribe({
      next: (resp) => {
        if (resp.data) {
          this.nuevoCaso.codigo_paciente = resp.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error obteniendo siguiente código', err);
        this.nuevoCaso.codigo_paciente = `PAC-${Date.now()}`; // Fallback si el backend falla
        this.cdr.detectChanges();
      }
    });
    this.imagenPreviewUrl = 'https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=600&q=80';
    this.archivoSeleccionado = null;
    this.nombreArchivoSeleccionado = '';
    this.modalCrearAbierto = true;
  }

  cerrarModalCrear(): void {
    this.modalCrearAbierto = false;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      this.procesarArchivo(event.dataTransfer.files[0]);
    }
  }

  onArchivoSeleccionado(event: any): void {
    const file = event.target?.files?.[0];
    this.procesarArchivo(file);
  }

  procesarArchivo(file: File | undefined | null): void {
    if (file) {
      this.archivoSeleccionado = file;
      this.nombreArchivoSeleccionado = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenPreviewUrl = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    } else {
      this.nombreArchivoSeleccionado = '';
    }
  }

  guardarNuevoCaso(): void {
    if (!this.nuevoCaso.codigo_paciente || !this.nuevoCaso.edad || !this.nuevoCaso.genero || !this.nuevoCaso.titulo_caso || !this.nuevoCaso.motivo_consulta) {
      this.mensajeError = 'Por favor complete todos los campos obligatorios del paciente y del caso clínico.';
      return;
    }

    if (!this.nuevoCaso.id_curso) {
      this.mensajeError = 'No se pudo determinar tu curso. Verifica que tengas un curso asignado antes de registrar un caso.';
      return;
    }

    this.guardandoCaso = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const formData = new FormData();
    formData.append('codigo_paciente', this.nuevoCaso.codigo_paciente);
    formData.append('edad', this.nuevoCaso.edad?.toString() || '0');
    formData.append('genero', this.nuevoCaso.genero);
    formData.append('antecedentes_medicos', this.nuevoCaso.antecedentes_medicos || 'Sin antecedentes registrados');
    formData.append('titulo_caso', this.nuevoCaso.titulo_caso);
    formData.append('nivel_dificultad', this.nuevoCaso.nivel_dificultad);
    formData.append('motivo_consulta', this.nuevoCaso.motivo_consulta);
    formData.append('tipo_proyeccion', this.nuevoCaso.tipo_proyeccion);
    formData.append('id_curso', this.nuevoCaso.id_curso.toString());

    if (this.archivoSeleccionado) {
      formData.append('imagen_rx', this.archivoSeleccionado);
    }

    this.clinicalService.crearCasoCompleto(formData).subscribe({
      next: () => {
        this.guardandoCaso = false;

        // Cerramos el modal inmediatamente
        this.cerrarModalCrear();

        // Disparamos la alerta premium
        this.alertService.success(
          '¡Caso Registrado!',
          'El caso clínico y la radiografía se han guardado exitosamente en la base de datos.'
        );

        // Recargar los casos reales de la base de datos para mantener sincronización
        this.cargarCasos();
      },
      error: (err) => {
        this.guardandoCaso = false;
        console.error('Error al registrar el caso clínico:', err);

        // No se guarda nada en memoria: si el backend falla, el caso NO existe.
        // Mostrar el error real evita que el catedrático crea que se guardó cuando no fue así.
        this.mensajeError = err.error?.message || 'No se pudo guardar el caso clínico. Verifica los datos e inténtalo de nuevo.';
        this.alertService.error('Error al Registrar', this.mensajeError);
      }
    });
  }

  abrirDetalleCaso(caso: any): void {
    this.casoSeleccionado = caso;
    this.modalDetalleAbierto = true;
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
  abrirModalEliminar(caso: any): void {
    this.casoAEliminar = caso;
    this.cerrarDetalleCaso();
    this.modalEliminarAbierto = true;
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto = false;
    this.casoAEliminar = null;
  }

  confirmarEliminarCaso(): void {
    this.eliminandoCaso = true;
    this.clinicalService.eliminarCaso(this.casoAEliminar.id).subscribe({
      next: () => {
        this.eliminandoCaso = false;
        this.cerrarModalEliminar();
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

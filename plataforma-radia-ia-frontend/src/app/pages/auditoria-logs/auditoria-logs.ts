import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../services/audit.service';

@Component({
  selector: 'app-auditoria-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auditoria-logs.html',
  styleUrl: './auditoria-logs.css'
})
export class AuditoriaLogsComponent implements OnInit {
  logs: any[] = [];
  cargando: boolean = false;

  readonly TAMANO_PAGINA = 10;
  paginaActual: number = 1;

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.logs.length / this.TAMANO_PAGINA));
  }

  get logsPagina(): any[] {
    const inicio = (this.paginaActual - 1) * this.TAMANO_PAGINA;
    return this.logs.slice(inicio, inicio + this.TAMANO_PAGINA);
  }

  get finPagina(): number {
    return Math.min(this.paginaActual * this.TAMANO_PAGINA, this.logs.length);
  }

  irAPagina(pagina: number): void {
    this.paginaActual = Math.min(Math.max(1, pagina), this.totalPaginas);
  }

  constructor(private auditService: AuditService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarLogs();
  }

  cargarLogs(): void {
    this.cargando = true;
    this.auditService.getLogs().subscribe({
      next: (resp) => {
        this.logs = resp.data || [];
        this.paginaActual = 1;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar logs:', err);
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  getIconClass(accion: string): string {
    const act = accion.toUpperCase();
    if (act.includes('LOGIN') || act.includes('INICIO')) return 'log-login';
    if (act.includes('CREAR') || act.includes('AGREGAR')) return 'log-create';
    if (act.includes('ELIMINAR') || act.includes('BORRAR')) return 'log-delete';
    if (act.includes('EVALUA') || act.includes('COMPLETADA')) return 'log-eval';
    return 'log-default';
  }
}

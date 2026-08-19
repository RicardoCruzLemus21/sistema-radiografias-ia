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

  constructor(private auditService: AuditService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarLogs();
  }

  cargarLogs(): void {
    this.cargando = true;
    this.auditService.getLogs().subscribe({
      next: (resp) => {
        this.logs = resp.data || [];
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

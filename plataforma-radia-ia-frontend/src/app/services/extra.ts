import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ExtraService {
  private apiUrl = environment.apiUrl + '/api/extra';

  // Contador compartido de notificaciones no leídas: cualquier componente que llame a
  // getNotificaciones() o marcarNotificacionLeida() lo mantiene sincronizado automáticamente,
  // así el badge del sidebar (layout) y la pantalla de Notificaciones nunca quedan desfasados.
  private noLeidasSubject = new BehaviorSubject<number>(0);
  noLeidas$ = this.noLeidasSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // --- Auditoría ---
  getLogsAuditoria(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auditoria/logs`, { headers: this.getHeaders() });
  }

  // --- Notificaciones ---
  getNotificaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notificaciones`, { headers: this.getHeaders() }).pipe(
      tap((res: any) => {
        const data = res?.data || [];
        const noLeidas = Array.isArray(data) ? data.filter((n: any) => !n.leida).length : 0;
        this.noLeidasSubject.next(noLeidas);
      })
    );
  }

  marcarNotificacionLeida(id_notificacion: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/notificaciones/${id_notificacion}/leida`, {}, { headers: this.getHeaders() }).pipe(
      tap(() => {
        const actual = this.noLeidasSubject.value;
        if (actual > 0) this.noLeidasSubject.next(actual - 1);
      })
    );
  }

  // --- Comentarios ---
  agregarComentario(id_evaluacion: string | number, comentario: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/comentarios`, { id_evaluacion, comentario }, { headers: this.getHeaders() });
  }

  getComentariosEvaluacion(id_evaluacion: string | number): Observable<any> {
    return this.http.get(`${this.apiUrl}/comentarios/evaluacion/${id_evaluacion}`, { headers: this.getHeaders() });
  }
}

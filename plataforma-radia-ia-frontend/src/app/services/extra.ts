import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ExtraService {
  private apiUrl = environment.apiUrl + '/extra';

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
    return this.http.get(`${this.apiUrl}/notificaciones`, { headers: this.getHeaders() });
  }

  marcarNotificacionLeida(id_notificacion: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/notificaciones/${id_notificacion}/leida`, {}, { headers: this.getHeaders() });
  }

  // --- Comentarios ---
  agregarComentario(id_evaluacion: string | number, comentario: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/comentarios`, { id_evaluacion, comentario }, { headers: this.getHeaders() });
  }

  getComentariosEvaluacion(id_evaluacion: string | number): Observable<any> {
    return this.http.get(`${this.apiUrl}/comentarios/evaluacion/${id_evaluacion}`, { headers: this.getHeaders() });
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DiagnosticoService {
  private apiUrl = `${environment.apiUrl}/api/diagnostico`;
  private iaUrl = `${environment.apiUrl}/api/ia`;
  private metricsUrl = `${environment.apiUrl}/api/metricas`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getCatalogos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogos`);
  }

  evaluarCaso(datos: any): Observable<any> {
    // Evaluar caso no requiere token en el backend temporalmente
    return this.http.post<any>(`${this.apiUrl}/evaluar`, datos);
  }

  // Generar Inferencia IA
  procesarInferencia(datos: any): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<any>(`${this.iaUrl}/inferencia`, datos, { headers });
  }

  guardarEvaluacion(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/evaluar`, data, { headers: this.authService.getAuthHeaders() });
  }

  getEvaluacionesPorCurso(id_curso: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/evaluaciones/curso/${id_curso}`, { headers: this.authService.getAuthHeaders() });
  }

  getTodasLasEvaluaciones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/evaluaciones/todas`, { headers: this.authService.getAuthHeaders() });
  }

  agregarFeedback(id_evaluacion: number, feedback: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/evaluacion/${id_evaluacion}`, { feedback }, { headers: this.authService.getAuthHeaders() });
  }

  invalidarEvaluacion(id_evaluacion: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/evaluacion/${id_evaluacion}`, { headers: this.authService.getAuthHeaders() });
  }

  // Guardar Encuesta Likert
  guardarLikert(datos: any): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<any>(`${this.metricsUrl}/likert`, datos, { headers });
  }

  // Obtener el catálogo de criterios de la rúbrica
  getCatalogosMetricas(): Observable<any> {
    return this.http.get<any>(`${this.metricsUrl}/catalogos`, { headers: this.authService.getAuthHeaders() });
  }

  // Obtener las calificaciones de rúbrica ya guardadas para una evaluación (o los criterios vacíos si aún no se calificó)
  getCalificacionesRubrica(id_evaluacion: number): Observable<any> {
    return this.http.get<any>(`${this.metricsUrl}/rubrica/evaluacion/${id_evaluacion}`, { headers: this.authService.getAuthHeaders() });
  }

  // Guardar las calificaciones de la rúbrica de una evaluación
  guardarRubrica(datos: any): Observable<any> {
    return this.http.post<any>(`${this.metricsUrl}/rubrica`, datos, { headers: this.authService.getAuthHeaders() });
  }
}
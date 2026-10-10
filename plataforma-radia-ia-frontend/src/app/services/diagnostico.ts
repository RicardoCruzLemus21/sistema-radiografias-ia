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

  // Obtener el catálogo de criterios de la rúbrica
  getCatalogosMetricas(): Observable<any> {
    return this.http.get<any>(`${this.metricsUrl}/catalogos`, { headers: this.authService.getAuthHeaders() });
  }
}
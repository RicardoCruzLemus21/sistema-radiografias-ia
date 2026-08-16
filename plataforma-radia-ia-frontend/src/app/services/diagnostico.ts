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
  private metricsUrl = `${environment.apiUrl}/api/metrics`;

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

  // Guardar Encuesta Likert
  guardarLikert(datos: any): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<any>(`${this.metricsUrl}/likert`, datos, { headers });
  }
}
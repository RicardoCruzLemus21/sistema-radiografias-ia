import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ClinicalService {
  private apiUrl = `${environment.apiUrl}/api/clinical`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Obtiene la lista de casos para la Worklist del estudiante
  getWorklistEstudiante(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/casos-clinicos`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene la lista completa de casos y pacientes para el panel de gestión del Catedrático
  getCasosCatedratico(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/casos-admin`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene el detalle de un caso clínico específico
  getCasoPorId(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/caso/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Crear caso completo con paciente y radiografía (multipart/form-data)
  crearCasoCompleto(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crear-completo`, formData, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getNextPacienteCode(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/next-paciente`, {
      headers: this.authService.getAuthHeaders()
    });
  }
}
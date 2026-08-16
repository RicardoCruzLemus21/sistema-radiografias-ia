import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AcademicService {
  private apiUrl = `${environment.apiUrl}/api/academico`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Obtiene los cursos del catedrático
  getMisCursos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mis-cursos`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Asigna un estudiante a un curso
  asignarEstudiante(id_curso: number, id_estudiante: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/asignar`, { id_curso, id_estudiante }, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene el resumen general de la cátedra con métricas globales y lista de estudiantes
  getResumenGeneral(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen-general`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene el expediente detallado de un estudiante
  getDetalleEstudiante(idEstudiante: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estudiante/${idEstudiante}/detalle`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Métodos retrocompatibles
  getAlumnos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/resumen-general`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getEstadisticasGlobales(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen-general`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene los resultados promediados de Likert desde el módulo de métricas
  getResultadosLikert(): Observable<any> {
    const metricsUrl = `${environment.apiUrl}/api/metricas`;
    return this.http.get<any>(`${metricsUrl}/likert/resultados`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Edita los datos básicos de un estudiante
  editarEstudiante(id_estudiante: string, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/estudiante/${id_estudiante}`, datos, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Elimina un estudiante de las secciones del catedrático
  eliminarEstudiante(id_estudiante: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/estudiante/${id_estudiante}`, {
      headers: this.authService.getAuthHeaders()
    });
  }
}
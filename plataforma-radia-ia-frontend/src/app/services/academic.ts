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

  // Código único que el docente comparte con sus estudiantes para que se registren solos
  getMiCodigo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mi-codigo`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Invalida el código anterior y genera uno nuevo
  regenerarMiCodigo(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/mi-codigo/regenerar`, {}, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene los cursos del catedrático
  // Ejercicios de todos los cursos del docente (para elegirlos en el informe PDF)
  getEjerciciosDocente(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ejercicios`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Informe PDF de calificaciones de un curso, por ejercicio o conjunto de ejercicios
  getInformeCalificaciones(idCurso: number, idsEjercicios: number[]): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/informe-calificaciones`, {
      headers: this.authService.getAuthHeaders(),
      params: { id_curso: String(idCurso), ejercicios: idsEjercicios.join(',') },
      responseType: 'blob'
    });
  }

  // Informe PDF individual de un estudiante (evolución de su diagnóstico)
  getInformeEstudiante(idEstudiante: number | string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/estudiante/${idEstudiante}/informe`, {
      headers: this.authService.getAuthHeaders(),
      responseType: 'blob'
    });
  }

  getMisCursos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mis-cursos`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene los cursos de un catedrático específico (usado por Admin)
  getCursosPorCatedratico(idCatedratico: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catedratico/${idCatedratico}/cursos`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene el catálogo maestro de cursos disponibles
  getCatalogoCursos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogo-cursos`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Asigna un estudiante a un curso
  asignarEstudiante(id_curso: number, id_estudiante: number, contrasena_temporal?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/asignar`, { id_curso, id_estudiante, contrasena_temporal }, {
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

  // Obtiene el rendimiento personal del estudiante
  getMiRendimiento(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mi-rendimiento`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Edita los datos básicos de un curso (nombre, semestre, año)
  editarCurso(id_curso: number | string, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/curso/${id_curso}`, datos, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Elimina un curso (y en cascada sus casos, evaluaciones y matrículas asociadas)
  eliminarCurso(id_curso: number | string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/curso/${id_curso}`, {
      headers: this.authService.getAuthHeaders()
    });
  }
}
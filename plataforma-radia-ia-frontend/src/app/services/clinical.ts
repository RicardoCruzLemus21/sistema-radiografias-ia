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

  // Obtiene el detalle de un caso clínico específico (NO SEGURO - uso de admin)
  getCasoPorId(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/caso/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Retroalimentación de un caso que el estudiante ya respondió (404 si todavía no lo ha respondido)
  getRetroalimentacionCaso(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/caso/${id}/retroalimentacion`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Obtiene el caso clínico sin las etiquetas de respuesta ni el mapa gradcam (Fase 1 Estudiante)
  getCasoSeguroEstudiante(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/caso/${id}/estudiante`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Envía el diagnóstico (Fase 1) y recibe los datos protegidos (Fase 2, 3 y 4)
  enviarDiagnosticoFase1(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/respuestas`, payload, {
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

  editarCaso(id: number | string, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/caso/${id}`, datos, {
      headers: this.authService.getAuthHeaders()
    });
  }

  eliminarCaso(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/caso/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Generar Info de Patología usando Gemini (IA Generativa)
  obtenerInfoPatologiaIA(patologia: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/library/${encodeURIComponent(patologia)}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  eliminarEjercicio(id_ejercicio: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/ejercicio/${id_ejercicio}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Asignar casos seleccionados del banco a un curso
  asignarCasosBanco(id_curso: number, ids_casos: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/evaluaciones`, { id_curso, ids_casos }, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Componer automáticamente un ejercicio (diana + normales + distractores) según criterios
  componerEjercicio(criterios: {
    patologias_objetivo: string[];
    nivel_dificultad: string;
    total_casos: number;
    porcentaje_normales: number;
    id_curso?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/banco-casos-ia/componer`, criterios, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Cuántos casos utilizables hay por patología para un nivel máximo (y, con curso, sin contar lo ya asignado)
  getDisponibilidadBanco(nivel_dificultad: string, id_curso?: number | null): Observable<any> {
    const params: any = { nivel_dificultad };
    if (id_curso) params.id_curso = id_curso;
    return this.http.get<any>(`${this.apiUrl}/banco-casos-ia/disponibilidad`, {
      headers: this.authService.getAuthHeaders(),
      params
    });
  }

  // Métricas reales del modelo por patología (AUC, localización, abstención) para dar contexto al docente
  getMetricasModelo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/metricas-modelo`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Estadísticas reales del estudiante (casos resueltos, precisión promedio) para su dashboard
  getEstadisticasEstudiante(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas-estudiante`, {
      headers: this.authService.getAuthHeaders()
    });
  }
}
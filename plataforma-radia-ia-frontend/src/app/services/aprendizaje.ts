import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

// Módulo de aprendizaje: ruta por patología, práctica guiada, repaso espaciado y errores frecuentes
@Injectable({
  providedIn: 'root'
})
export class AprendizajeService {
  private api = `${environment.apiUrl}/api/aprendizaje`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private opciones() {
    return { headers: this.authService.getAuthHeaders() };
  }

  // Estudiante
  resumen(): Observable<any> {
    return this.http.get<any>(`${this.api}/resumen`, this.opciones());
  }

  leccion(clase: string): Observable<any> {
    return this.http.get<any>(`${this.api}/leccion/${encodeURIComponent(clase)}`, this.opciones());
  }

  marcarPaso(clase: string, paso: 'leccion' | 'comparador'): Observable<any> {
    return this.http.post<any>(`${this.api}/leccion/${encodeURIComponent(clase)}/paso`, { paso }, this.opciones());
  }

  // Reinicia el aprendizaje de una sola patología (lección, comparador, casos guiados y repaso de esa categoría)
  reiniciarClase(clase: string): Observable<any> {
    return this.http.post<any>(`${this.api}/reiniciar/${encodeURIComponent(clase)}`, {}, this.opciones());
  }

  comparador(clase: string, contra: string): Observable<any> {
    return this.http.get<any>(`${this.api}/comparador`, { ...this.opciones(), params: { clase, contra } });
  }

  sesion(clase: string): Observable<any> {
    return this.http.get<any>(`${this.api}/sesion/${encodeURIComponent(clase)}`, this.opciones());
  }

  responder(cuerpo: { id_caso: number; marcadas: string[]; origen: 'guiado' | 'repaso'; clase_objetivo?: string; uso_pista?: boolean; tiempo?: number }): Observable<any> {
    return this.http.post<any>(`${this.api}/responder`, cuerpo, this.opciones());
  }

  repaso(): Observable<any> {
    return this.http.get<any>(`${this.api}/repaso`, this.opciones());
  }

  misErrores(): Observable<any> {
    return this.http.get<any>(`${this.api}/mis-errores`, this.opciones());
  }

  // Docente / administrador: revisión del contenido que ven los estudiantes
  listarLecciones(): Observable<any> {
    return this.http.get<any>(`${this.api}/admin/lecciones`, this.opciones());
  }

  guardarLeccion(clase: string, contenido: any, estado: 'borrador' | 'aprobado'): Observable<any> {
    return this.http.put<any>(`${this.api}/admin/lecciones/${encodeURIComponent(clase)}`, { contenido, estado }, this.opciones());
  }

  // Genera 8 lecciones candidatas con IA (una por patología); no se publican hasta que el docente elija cuál usar
  generarLecciones(): Observable<any> {
    return this.http.post<any>(`${this.api}/admin/lecciones/generar`, {}, this.opciones());
  }

  listarVersionesLeccion(clase: string): Observable<any> {
    return this.http.get<any>(`${this.api}/admin/lecciones/${encodeURIComponent(clase)}/versiones`, this.opciones());
  }

  publicarVersionLeccion(idVersion: number): Observable<any> {
    return this.http.post<any>(`${this.api}/admin/lecciones/versiones/${idVersion}/publicar`, {}, this.opciones());
  }

  listarExplicaciones(): Observable<any> {
    return this.http.get<any>(`${this.api}/admin/explicaciones`, this.opciones());
  }

  revisarExplicacion(id: number, contenido: any, estado: 'pendiente' | 'aprobada' | 'rechazada'): Observable<any> {
    return this.http.put<any>(`${this.api}/admin/explicaciones/${id}`, { contenido, estado }, this.opciones());
  }
}

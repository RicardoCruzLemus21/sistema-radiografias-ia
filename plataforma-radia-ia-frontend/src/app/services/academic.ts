import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AcademicService {
  // Esta es la URL base de tu backend local
  private apiUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) {}

  // Método para obtener la lista de alumnos desde MySQL
  // Asegúrate de que la ruta '/alumnos' coincida con la que creaste en tu academicRoutes.js
  getAlumnos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alumnos`);
  }

  // Método para obtener las estadísticas globales
  getEstadisticasGlobales(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas-globales`);
  }
}
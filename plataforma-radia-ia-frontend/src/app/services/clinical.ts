import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClinicalService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Obtiene la lista de casos pendientes para la Worklist del estudiante
  getWorklistEstudiante(): Observable<any[]> {
    // Fíjate cómo agregamos "/clinical/" justo antes de "casos-clinicos"
    return this.http.get<any[]>(`${this.apiUrl}/clinical/casos-clinicos`);
  }
}
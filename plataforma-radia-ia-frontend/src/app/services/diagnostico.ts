import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiagnosticoService {
  // Apuntamos a la ruta de Node.js que expone el catálogo
  private apiUrl = 'http://localhost:3000/api/diagnostico';

  constructor(private http: HttpClient) {}

  // Función para pedir el catálogo de patologías (Tabla 9) a MySQL
  getCatalogos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogos`);
  }
}
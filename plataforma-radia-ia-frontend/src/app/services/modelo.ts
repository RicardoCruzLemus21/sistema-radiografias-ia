import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ModeloService {
  private apiUrl = `${environment.apiUrl}/api/modelo`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Estadísticas del modelo de IA para la "Ficha del modelo"
  getFichaModelo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ficha`, { headers: this.authService.getAuthHeaders() });
  }
}

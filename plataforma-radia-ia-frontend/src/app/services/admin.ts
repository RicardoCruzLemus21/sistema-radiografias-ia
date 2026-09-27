import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/api/admin`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // KPIs globales para el Panel de Administración (usuarios, cursos, casos, evaluaciones)
  getResumenGlobal(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen-global`, {
      headers: this.authService.getAuthHeaders()
    });
  }
}

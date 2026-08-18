import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getUsuarios(): Observable<any> {
    return this.http.get<any>(this.apiUrl, {
      headers: this.authService.getAuthHeaders()
    });
  }

  editarUsuario(id: number | string, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, datos, {
      headers: this.authService.getAuthHeaders()
    });
  }

  eliminarUsuario(id: number | string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }
}

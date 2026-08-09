import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  login(correo_electronico: string, contrasena: string) {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { correo_electronico, contrasena })
      .pipe(
        tap(respuesta => {
          if (respuesta.token) {
            localStorage.setItem('token', respuesta.token);
            localStorage.setItem('usuario', JSON.stringify(respuesta.usuario));
          }
        })
      );
  }
}
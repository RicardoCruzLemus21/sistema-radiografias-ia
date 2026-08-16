import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  login(correo_electronico: string, contrasena: string) {
    return this.http.post<any>(`${this.apiUrl}/api/auth/login`, { correo_electronico, contrasena })
      .pipe(
        tap(respuesta => {
          if (respuesta.data && respuesta.data.token) {
            localStorage.setItem('token', respuesta.data.token);
            localStorage.setItem('usuario', JSON.stringify(respuesta.data.usuario));
          }
        })
      );
  }

  registrarEstudiante(datos: any) {
    return this.http.post<any>(`${this.apiUrl}/api/auth/registrar`, datos);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getRolUsuario(): string {
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const u = JSON.parse(usuarioStr);
        if (u.rol) return this.limpiarTexto(u.rol);
      } catch (e) {}
    }

    const token = this.getToken();
    if (!token) return '';

    try {
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = atob(payloadBase64); 
      const payloadJson = JSON.parse(payloadDecoded);
      return this.limpiarTexto(payloadJson.nombre_rol || '');
    } catch (error) {
      console.error('Error al decodificar el token de seguridad:', error);
      return '';
    }
  }

  getNombreUsuario(): string {
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const u = JSON.parse(usuarioStr);
        if (u.nombre_completo) return u.nombre_completo;
      } catch (e) {}
    }
    return 'Usuario';
  }

  isCatedratico(): boolean {
    const rol = this.getRolUsuario().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return rol.includes('catedr') || rol.includes('admin') || rol.includes('docente');
  }

  isEstudiante(): boolean {
    const rol = this.getRolUsuario().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return rol.includes('estud') || (!this.isCatedratico() && rol.length > 0);
  }

  limpiarTexto(texto: string): string {
    if (!texto) return '';
    return texto
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã/g, 'Á');
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }
}
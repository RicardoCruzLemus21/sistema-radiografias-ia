import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Tu configuración actual, libre de código quemado
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Tu método original intacto
  // Tu método login corregido
  login(correo_electronico: string, contrasena: string) {
    return this.http.post<any>(`${this.apiUrl}/api/auth/login`, { correo_electronico, contrasena })
      .pipe(
        tap(respuesta => {
          // CORRECCIÓN: Accedemos a respuesta.data porque así lo envía el backend en Node.js
          if (respuesta.data && respuesta.data.token) {
            localStorage.setItem('token', respuesta.data.token);
            // Guardamos el objeto usuario que viene dentro de 'data'
            localStorage.setItem('usuario', JSON.stringify(respuesta.data.usuario));
          }
        })
      );
  }

  // --- NUEVOS MÉTODOS PARA EL LAYOUT (MENÚ DINÁMICO) ---

  // 1. Obtener el token almacenado
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // 2. Extraer y decodificar el payload del JWT
  getRolUsuario(): string {
    const token = this.getToken();
    
    if (!token) {
      return '';
    }

    try {
      // El JWT estándar tiene 3 partes. El payload (datos) es la segunda parte (índice 1).
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = atob(payloadBase64); 
      const payloadJson = JSON.parse(payloadDecoded);

      // Retornamos la variable 'nombre_rol' que viene desde tu authController.js del backend
      return payloadJson.nombre_rol || '';
      
    } catch (error) {
      console.error('Error al decodificar el token de seguridad:', error);
      return '';
    }
  }

  // 3. Limpiar credenciales al cerrar sesión
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario'); // Limpiamos ambas variables que guardas en el login
  }
}
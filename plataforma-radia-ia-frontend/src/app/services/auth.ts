import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { leerExpiracionMs } from './jwt.util';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  // La sesión se guarda en sessionStorage: es propia de cada pestaña. Con localStorage (compartido) iniciar sesión
  // con otro usuario en una pestaña cambiaba la identidad de todas las demás (mezclaba roles y datos).
  constructor(private http: HttpClient) {
    // Restos de la versión anterior, que guardaba la sesión en un almacenamiento compartido
    for (const clave of ['token', 'usuario', 'token_temporal', 'usuario_temporal']) localStorage.removeItem(clave);
  }

  login(correo_electronico: string, contrasena: string) {
    return this.http.post<any>(`${this.apiUrl}/api/auth/login`, { correo_electronico, contrasena })
      .pipe(
        tap(respuesta => {
          if (respuesta.data && respuesta.data.token && !respuesta.data.requiere_cambio_clave) {
            sessionStorage.setItem('token', respuesta.data.token);
            sessionStorage.setItem('usuario', JSON.stringify(respuesta.data.usuario));
          } else if (respuesta.data && respuesta.data.token && respuesta.data.requiere_cambio_clave) {
            // Guardamos temporalmente el token para poder hacer la peticion de cambio
            sessionStorage.setItem('token_temporal', respuesta.data.token);
            sessionStorage.setItem('usuario_temporal', JSON.stringify(respuesta.data.usuario));
          }
        })
      );
  }

  cambiarClaveInicial(nueva_contrasena: string) {
    // Usamos el token temporal para autorizar el cambio
    const token = sessionStorage.getItem('token_temporal');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<any>(`${this.apiUrl}/api/auth/cambiar-clave-inicial`, { nueva_contrasena }, { headers })
      .pipe(
        tap(() => {
          // Si es exitoso, promovemos el token temporal a definitivo
          sessionStorage.setItem('token', token!);
          sessionStorage.setItem('usuario', sessionStorage.getItem('usuario_temporal')!);
          sessionStorage.removeItem('token_temporal');
          sessionStorage.removeItem('usuario_temporal');
        })
      );
  }

  registrarEstudiante(datos: any) {
    return this.http.post<any>(`${this.apiUrl}/api/auth/registrar`, datos, {
      headers: this.getAuthHeaders()
    });
  }

  registrarDocente(datos: any) {
    return this.http.post<any>(`${this.apiUrl}/api/auth/registrar-docente`, datos);
  }

  // Auto-registro público del estudiante con el código de su docente
  registrarEstudiantePorCodigo(datos: any) {
    return this.http.post<any>(`${this.apiUrl}/api/auth/registrar-estudiante`, datos);
  }

  // Devuelve el nombre del docente y sus cursos para confirmar que el código es el correcto
  getDocentePorCodigo(codigo: string) {
    return this.http.get<any>(`${this.apiUrl}/api/auth/docente-por-codigo/${encodeURIComponent(codigo)}`);
  }

  getCursosDisponibles() {
    return this.http.get<any>(`${this.apiUrl}/api/auth/cursos-disponibles`);
  }

  getRoles() {
    return this.http.get<any>(`${this.apiUrl}/api/auth/roles`);
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getRolUsuario(): string {
    const usuarioStr = sessionStorage.getItem('usuario');
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
    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const u = JSON.parse(usuarioStr);
        if (u.nombre_completo) return u.nombre_completo;
      } catch (e) {}
    }
    return 'Usuario';
  }

  getIdUsuario(): number {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const u = JSON.parse(usuarioStr);
        if (u.id_usuario) return u.id_usuario;
      } catch (e) {}
    }
    return 0; // O un ID por defecto si es necesario
  }

  isAdmin(): boolean {
    const rol = this.getRolUsuario().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return rol.includes('admin');
  }

  isCatedratico(): boolean {
    const rol = this.getRolUsuario().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (rol.includes('catedr') || rol.includes('docente')) && !this.isAdmin();
  }

  isEstudiante(): boolean {
    const rol = this.getRolUsuario().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return rol.includes('estud') || (!this.isCatedratico() && !this.isAdmin() && rol.length > 0);
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

  // true si hay un token guardado y su hora de expiración ya pasó
  tokenExpirado(): boolean {
    const expiracion = leerExpiracionMs(this.getToken());
    return expiracion !== null && Date.now() >= expiracion;
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('token_temporal');
    sessionStorage.removeItem('usuario_temporal');
  }
}
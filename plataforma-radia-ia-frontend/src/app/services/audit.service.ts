import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = `${environment.apiUrl}/api/audit`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getLogs(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/logs`, {
      headers: this.authService.getAuthHeaders()
    });
  }
}

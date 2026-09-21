import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  
  private getBackground(): string {
    const theme = localStorage.getItem('radia_theme') || document.documentElement.getAttribute('data-theme') || 'darkglass';
    return theme === 'light' ? '#ffffff' : '#18181b';
  }

  private getColor(): string {
    const theme = localStorage.getItem('radia_theme') || document.documentElement.getAttribute('data-theme') || 'darkglass';
    return theme === 'light' ? '#0f172a' : '#f4f4f5';
  }

  success(title: string, text: string = '') {
    return Swal.fire({
      title,
      text,
      icon: 'success',
      background: this.getBackground(),
      color: this.getColor(),
      confirmButtonColor: '#10b981'
    });
  }

  error(title: string, text: string = '') {
    return Swal.fire({
      title,
      text,
      icon: 'error',
      background: this.getBackground(),
      color: this.getColor(),
      confirmButtonColor: '#ef4444'
    });
  }

  warning(title: string, text: string = '') {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      background: this.getBackground(),
      color: this.getColor(),
      confirmButtonColor: '#f59e0b'
    });
  }

  info(title: string, text: string = '') {
    return Swal.fire({
      title,
      text,
      icon: 'info',
      background: this.getBackground(),
      color: this.getColor(),
      confirmButtonColor: '#0ea5e9'
    });
  }

  confirm(title: string, text: string = '', confirmText: string = 'Aceptar'): Promise<boolean> {
    return Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      background: this.getBackground(),
      color: this.getColor(),
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#ef4444',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar'
    }).then(result => result.isConfirmed);
  }

  confirmDanger(title: string, text: string = '', confirmText: string = 'Eliminar'): Promise<boolean> {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      background: this.getBackground(),
      color: this.getColor(),
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#a1a1aa',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar'
    }).then(result => result.isConfirmed);
  }

  // Ventana de carga (spinner) que no se puede cerrar con clic afuera ni con Esc.
  mostrarCarga(title: string, text: string = ''): void {
    Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: this.getBackground(),
      color: this.getColor(),
      didOpen: () => Swal.showLoading()
    });
  }

  // Cambia el texto de la ventana de carga sin cerrarla, y mantiene el spinner
  actualizarCarga(title: string, text: string = ''): void {
    if (!Swal.isVisible() || !Swal.isLoading()) return;
    Swal.update({ title, text });
    Swal.showLoading();
  }

  // Cierra la ventana de carga SOLO si sigue siendo la que está abierta: si mientras tanto salió otro
  // modal (p. ej. el de "Fallo de Conexión" del interceptor), no se toca.
  cerrarCarga(): void {
    if (Swal.isVisible() && Swal.isLoading()) Swal.close();
  }

  // Aviso de sesión vencida: bloqueante (no se cierra con clic afuera ni con Esc) para que el
  // usuario lo lea antes de que lo lleven al login.
  sesionExpirada(): Promise<void> {
    return Swal.fire({
      title: 'Sesión expirada',
      text: 'Tu sesión duró el máximo de 8 horas y se cerró por seguridad. Inicia sesión de nuevo para continuar.',
      icon: 'warning',
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: this.getBackground(),
      color: this.getColor(),
      confirmButtonColor: '#0ea5e9',
      confirmButtonText: 'Iniciar sesión'
    }).then(() => undefined);
  }

  toast(title: string, icon: SweetAlertIcon = 'success') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: this.getBackground(),
      color: this.getColor(),
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    return Toast.fire({
      icon,
      title
    });
  }
}

import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AlertService } from '../../services/alert.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  validarCorreo, validarContrasenaLogin, validarContrasenaNueva, validarConfirmacion,
  validarCarnet, formatearCarnet, validarNombre, validarCursoSeleccion, validarCursoNuevo, MAX_CONTRASENA, MAX_CORREO,
  validarCodigoDocente, normalizarCodigoDocente, LARGO_CODIGO
} from './validaciones';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  correo: string = '';
  contrasena: string = '';
  errorMensaje: string = '';
  cargando: boolean = false;

  requiereCambioClave: boolean = false;
  nuevaContrasena: string = '';
  confirmarContrasena: string = '';

  temaActual: string = 'darkglass';

  // Registro de docente nuevo (sin cuenta)
  modoRegistro: boolean = false;
  mensajeExito: string = '';
  cursosDisponibles: string[] = [];
  readonly valorCursoNuevo = '__nuevo__';
  readonly maxContrasena = MAX_CONTRASENA;
  registro = { carnet: '', nombre_completo: '', correo_electronico: '', contrasena: '', confirmar: '', curso_seleccion: '', nombre_curso_asignar: '' };
  readonly maxCorreo = MAX_CORREO;
  readonly largoCodigo = LARGO_CODIGO;

  // Registro de estudiante con el código de su docente
  rolRegistro: 'docente' | 'estudiante' = 'docente';
  estudiante = { codigo_docente: '', id_curso: '', carnet: '', nombre_completo: '', correo_electronico: '', contrasena: '', confirmar: '' };
  docenteVerificado: { nombre_docente: string; cursos: { id_curso: number; nombre_curso: string; semestre: string; anio: number }[] } | null = null;
  verificandoCodigo: boolean = false;
  errorCodigoServidor: string = '';

  // Un campo muestra su error cuando el usuario ya salió de él o intentó enviar el formulario
  private tocado: Record<string, boolean> = {};
  private intentoLogin = false;
  private intentoRegistro = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    const savedTheme = localStorage.getItem('radia_theme');
    if (savedTheme) {
      this.temaActual = savedTheme;
      document.documentElement.setAttribute('data-theme', this.temaActual);
    } else {
      document.documentElement.setAttribute('data-theme', 'darkglass');
    }
  }

  toggleTema() {
    this.temaActual = this.temaActual === 'darkglass' ? 'light' : 'darkglass';
    document.documentElement.setAttribute('data-theme', this.temaActual);
    localStorage.setItem('radia_theme', this.temaActual);
  }

  limpiarError() {
    this.errorMensaje = '';
  }

  tocar(campo: string) {
    this.tocado[campo] = true;
  }

  // ---------- Validación: login ----------
  errorLogin(campo: 'correo' | 'contrasena'): string {
    return campo === 'correo' ? validarCorreo(this.correo) : validarContrasenaLogin(this.contrasena);
  }

  mostrarErrorLogin(campo: 'correo' | 'contrasena'): boolean {
    return (this.tocado['login_' + campo] || this.intentoLogin) && !!this.errorLogin(campo);
  }

  // ---------- Validación: registro ----------
  errorReg(campo: string): string {
    const r = this.registro;
    switch (campo) {
      case 'carnet': return validarCarnet(r.carnet);
      case 'nombre': return validarNombre(r.nombre_completo);
      case 'correo': return validarCorreo(r.correo_electronico);
      case 'curso': return validarCursoSeleccion(r.curso_seleccion);
      case 'cursoNuevo': return r.curso_seleccion === this.valorCursoNuevo ? validarCursoNuevo(r.nombre_curso_asignar) : '';
      case 'contrasena': return validarContrasenaNueva(r.contrasena);
      case 'confirmar': return validarConfirmacion(r.contrasena, r.confirmar);
      default: return '';
    }
  }

  mostrarErrorReg(campo: string): boolean {
    return (this.tocado['reg_' + campo] || this.intentoRegistro) && !!this.errorReg(campo);
  }

  private registroValido(): boolean {
    return ['carnet', 'nombre', 'correo', 'curso', 'cursoNuevo', 'contrasena', 'confirmar'].every(c => !this.errorReg(c));
  }

  onCarnetInput(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const formateado = formatearCarnet(input.value);
    input.value = formateado; // corrige lo que se ve aunque el modelo no cambie (p. ej. al teclear una letra)
    this.registro.carnet = formateado;
    this.limpiarError();
  }

  // ---------- Registro de estudiante con código de docente ----------
  seleccionarRol(rol: 'docente' | 'estudiante') {
    if (this.cargando || this.rolRegistro === rol) return;
    this.rolRegistro = rol;
    this.errorMensaje = '';
    this.intentoRegistro = false;
    this.limpiarTocados('reg_');
    this.limpiarTocados('est_');
  }

  errorEst(campo: string): string {
    const e = this.estudiante;
    switch (campo) {
      case 'codigo':
        return validarCodigoDocente(e.codigo_docente) || this.errorCodigoServidor;
      case 'curso':
        if (this.docenteVerificado && this.docenteVerificado.cursos.length === 0) return 'Este docente todavía no tiene cursos disponibles.';
        return this.docenteVerificado && this.docenteVerificado.cursos.length > 1 && !e.id_curso ? 'Selecciona el curso en el que te inscribes.' : '';
      case 'carnet': return validarCarnet(e.carnet);
      case 'nombre': return validarNombre(e.nombre_completo);
      case 'correo': return validarCorreo(e.correo_electronico);
      case 'contrasena': return validarContrasenaNueva(e.contrasena);
      case 'confirmar': return validarConfirmacion(e.contrasena, e.confirmar);
      default: return '';
    }
  }

  mostrarErrorEst(campo: string): boolean {
    return (this.tocado['est_' + campo] || this.intentoRegistro) && !!this.errorEst(campo);
  }

  private estudianteValido(): boolean {
    const campos = ['codigo', 'curso', 'carnet', 'nombre', 'correo', 'contrasena', 'confirmar'];
    return campos.every(c => !this.errorEst(c)) && !!this.docenteVerificado;
  }

  onCodigoInput(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const normalizado = normalizarCodigoDocente(input.value);
    input.value = normalizado;
    this.estudiante.codigo_docente = normalizado;
    this.limpiarError();
    // Cualquier cambio invalida la verificación anterior (y descarta la respuesta de una consulta en curso)
    this.docenteVerificado = null;
    this.estudiante.id_curso = '';
    this.errorCodigoServidor = '';
    this.verificacionId++;
    this.verificandoCodigo = false;
    if (normalizado.length === LARGO_CODIGO) this.verificarCodigo();
  }

  private verificacionId = 0;

  verificarCodigo() {
    const codigo = this.estudiante.codigo_docente;
    if (validarCodigoDocente(codigo)) return;

    const id = ++this.verificacionId;
    this.verificandoCodigo = true;
    this.authService.getDocentePorCodigo(codigo).subscribe({
      next: (res) => {
        if (id !== this.verificacionId) return; // el usuario ya cambió el código: respuesta obsoleta
        this.verificandoCodigo = false;
        this.docenteVerificado = res.data;
        if (res.data.cursos.length === 1) this.estudiante.id_curso = String(res.data.cursos[0].id_curso);
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (id !== this.verificacionId) return;
        this.verificandoCodigo = false;
        this.docenteVerificado = null;
        this.errorCodigoServidor = err.status === 0
          ? 'No se pudo conectar con el servidor. Intenta de nuevo.'
          : (err.error?.message || 'No se pudo verificar el código.');
        this.tocar('est_codigo');
        this.cdr.detectChanges();
      }
    });
  }

  onCarnetEstudianteInput(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const formateado = formatearCarnet(input.value);
    input.value = formateado;
    this.estudiante.carnet = formateado;
    this.limpiarError();
  }

  registrarEstudiante() {
    if (this.cargando) return;
    this.errorMensaje = '';
    this.intentoRegistro = true;

    if (!this.estudianteValido()) {
      this.errorMensaje = this.docenteVerificado || !this.estudiante.codigo_docente
        ? 'Revisa los campos marcados en rojo.'
        : 'Verifica primero el código de tu docente.';
      return;
    }

    const e = this.estudiante;
    const correo = e.correo_electronico.trim();
    const docente = this.docenteVerificado!;
    const curso = docente.cursos.find(c => String(c.id_curso) === e.id_curso) || docente.cursos[0];

    this.cargando = true;
    this.authService.registrarEstudiantePorCodigo({
      codigo_docente: e.codigo_docente,
      id_curso: Number(e.id_curso) || undefined,
      carnet: e.carnet.trim(),
      nombre_completo: e.nombre_completo.trim().replace(/\s+/g, ' '),
      correo_electronico: correo,
      contrasena: e.contrasena
    }).subscribe({
      next: () => {
        this.cargando = false;
        this.correo = correo;
        this.contrasena = '';
        this.modoRegistro = false;
        this.intentoLogin = false;
        this.limpiarTocados('login_');
        this.mensajeExito = `Cuenta creada. Quedaste inscrito en ${curso.nombre_curso} con ${docente.nombre_docente}. Ya puedes iniciar sesión.`;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = err.status === 0
          ? 'No se pudo conectar con el servidor. Intenta de nuevo.'
          : (err.error?.message || 'No se pudo crear la cuenta. Intenta de nuevo.');
        this.cdr.detectChanges();
      }
    });
  }

  abrirRegistro() {
    this.modoRegistro = true;
    this.errorMensaje = '';
    this.mensajeExito = '';
    this.intentoRegistro = false;
    this.limpiarTocados('reg_');
    this.limpiarTocados('est_');
    this.registro = { carnet: '', nombre_completo: '', correo_electronico: '', contrasena: '', confirmar: '', curso_seleccion: '', nombre_curso_asignar: '' };
    this.estudiante = { codigo_docente: '', id_curso: '', carnet: '', nombre_completo: '', correo_electronico: '', contrasena: '', confirmar: '' };
    this.docenteVerificado = null;
    this.errorCodigoServidor = '';
    this.rolRegistro = 'docente';
    this.authService.getCursosDisponibles().subscribe({
      next: (res) => {
        this.cursosDisponibles = (res.data || []).map((c: any) => c.nombre_curso);
        this.cdr.detectChanges();
      },
      error: () => { this.cursosDisponibles = []; }
    });
  }

  volverAlLogin() {
    this.modoRegistro = false;
    this.errorMensaje = '';
    this.intentoLogin = false;
    this.limpiarTocados('login_');
  }

  private limpiarTocados(prefijo: string) {
    Object.keys(this.tocado).filter(k => k.startsWith(prefijo)).forEach(k => delete this.tocado[k]);
  }

  registrarDocente() {
    if (this.cargando) return;
    this.errorMensaje = '';
    this.intentoRegistro = true;

    if (!this.registroValido()) {
      this.errorMensaje = 'Revisa los campos marcados en rojo.';
      return;
    }

    const r = this.registro;
    const curso = (r.curso_seleccion === this.valorCursoNuevo ? r.nombre_curso_asignar : r.curso_seleccion).trim().replace(/\s+/g, ' ');
    const correo = r.correo_electronico.trim();

    this.cargando = true;
    this.authService.registrarDocente({
      carnet: r.carnet.trim(),
      nombre_completo: r.nombre_completo.trim().replace(/\s+/g, ' '),
      correo_electronico: correo,
      contrasena: r.contrasena,
      nombre_curso_asignar: curso
    }).subscribe({
      next: () => {
        this.cargando = false;
        this.correo = correo;
        this.contrasena = '';
        this.modoRegistro = false;
        this.intentoLogin = false;
        this.limpiarTocados('login_');
        this.mensajeExito = 'Cuenta creada correctamente. Ya puedes iniciar sesión.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = err.error?.message || 'No se pudo crear la cuenta. Intenta de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  // Panel de inicio según el rol (el administrador antes pasaba por el del estudiante y el guard lo redirigía)
  private rutaInicio(): string {
    if (this.authService.isAdmin()) return '/sistema/dashboard-admin';
    if (this.authService.isCatedratico()) return '/sistema/catedratico';
    return '/sistema/estudiante';
  }

  iniciarSesion() {
    if (this.cargando) return;
    this.errorMensaje = '';
    this.mensajeExito = '';
    this.intentoLogin = true;

    if (this.errorLogin('correo') || this.errorLogin('contrasena')) {
      return; // los mensajes por campo ya se muestran
    }

    this.cargando = true;
    this.alertService.mostrarCarga('Iniciando sesión', 'Verificando tus credenciales...');
    this.authService.login(this.correo.trim(), this.contrasena).subscribe({
      next: async (res) => {
        // "cargando" sigue en true hasta llegar al panel: así no se puede reenviar durante la bienvenida

        if (res.data && res.data.requiere_cambio_clave) {
          this.cargando = false;
          this.alertService.cerrarCarga();
          this.requiereCambioClave = true;
          this.cdr.detectChanges();
          return;
        }

        // La ventana de carga se mantiene hasta llegar al panel. El nombre va en "text" (texto plano):
        // el "title" de SweetAlert se interpreta como HTML.
        const nombre = String(res.data?.usuario?.nombre_completo || '').trim().split(' ')[0];
        this.alertService.actualizarCarga('¡Bienvenido!', nombre ? `${nombre}, estamos cargando tu panel...` : 'Estamos cargando tu panel...');
        await new Promise(resolver => setTimeout(resolver, 600)); // que se alcance a leer y no parpadee
        try {
          await this.router.navigate([this.rutaInicio()]);
        } finally {
          this.cargando = false;
          this.alertService.cerrarCarga();
        }
      },
      error: (err) => {
        this.cargando = false;
        this.alertService.cerrarCarga();
        this.errorMensaje = err.status === 0
          ? 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.'
          : (err.error?.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
        console.error('Error en autenticación:', err);
        this.cdr.detectChanges(); // Forzar actualización de la vista
      }
    });
  }

  cambiarContrasena() {
    if (this.cargando) return;
    this.errorMensaje = '';

    const errorClave = validarContrasenaNueva(this.nuevaContrasena) || validarConfirmacion(this.nuevaContrasena, this.confirmarContrasena);
    if (errorClave) {
      this.errorMensaje = errorClave;
      return;
    }

    this.cargando = true;
    this.authService.cambiarClaveInicial(this.nuevaContrasena).subscribe({
      next: () => {
        this.cargando = false;
        // Redirigir al dashboard correspondiente
        if (this.authService.isCatedratico()) {
          this.router.navigate(['/sistema/catedratico']);
        } else {
          this.router.navigate(['/sistema/estudiante']);
        }
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = err.error?.message || 'Error al cambiar la contraseña.';
        this.cdr.detectChanges();
      }
    });
  }
}

// Cada validador devuelve '' si el valor es válido, o el mensaje de error a mostrar.
// El backend aplica las mismas reglas (authService.registrarDocente): se validan en ambos
// lados porque el frontend solo mejora la experiencia, no es una barrera de seguridad.

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGEX_CARNET = /^\d{4}-\d{2}-\d{4}$/;
const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const REGEX_NOMBRE = new RegExp(`^[${LETRAS}][${LETRAS} .,'\\-]*$`);
const REGEX_CURSO = new RegExp(`^[${LETRAS}0-9][${LETRAS}0-9 .,\\-/()&]*$`);

export const MAX_CONTRASENA = 72; // bcrypt ignora todo lo que pase de 72 bytes
export const MAX_CORREO = 100;    // tamaño real de la columna Usuarios.correo_electronico

// Código de docente: 8 caracteres sin 0/O/1/I/L (mismo alfabeto que genera el servidor)
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const LARGO_CODIGO = 8;

// Acepta lo que se pegue (minúsculas, espacios, guiones) y deja solo caracteres válidos, en mayúsculas
export function normalizarCodigoDocente(valor: string): string {
  return (valor || '').toUpperCase().split('').filter(c => ALFABETO_CODIGO.includes(c)).join('').slice(0, LARGO_CODIGO);
}

export function validarCodigoDocente(valor: string): string {
  const v = (valor || '').trim();
  if (!v) return 'El código de docente es obligatorio.';
  if (normalizarCodigoDocente(v).length !== LARGO_CODIGO) return `El código tiene ${LARGO_CODIGO} caracteres (letras y números). Pídeselo a tu docente.`;
  return '';
}

export function validarCorreo(valor: string): string {
  const v = (valor || '').trim();
  if (!v) return 'El correo electrónico es obligatorio.';
  if (v.length > MAX_CORREO) return `El correo no puede superar los ${MAX_CORREO} caracteres.`;
  if (!REGEX_CORREO.test(v)) return 'Ingresa un correo válido, por ejemplo usuario@example.edu.gt.';
  return '';
}

export function validarContrasenaLogin(valor: string): string {
  if (!valor) return 'La contraseña es obligatoria.';
  return '';
}

export function validarContrasenaNueva(valor: string): string {
  if (!valor) return 'La contraseña es obligatoria.';
  if (valor.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (valor.length > MAX_CONTRASENA) return `La contraseña no puede superar los ${MAX_CONTRASENA} caracteres.`;
  if (valor !== valor.trim()) return 'La contraseña no puede empezar ni terminar con espacios.';
  return '';
}

export function validarConfirmacion(contrasena: string, confirmacion: string): string {
  if (!confirmacion) return 'Confirma tu contraseña.';
  if (contrasena !== confirmacion) return 'Las contraseñas no coinciden.';
  return '';
}

export function validarCarnet(valor: string): string {
  const v = (valor || '').trim();
  if (!v) return 'El carnet es obligatorio.';
  if (!REGEX_CARNET.test(v)) return 'El carnet debe tener el formato XXXX-XX-XXXX (10 dígitos).';
  return '';
}

// Deja solo dígitos (máx. 10) e inserta los guiones mientras se escribe: 1111-22-3333
export function formatearCarnet(valor: string): string {
  const d = (valor || '').replace(/\D/g, '').slice(0, 10);
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 10)].filter(p => p.length > 0).join('-');
}

export function validarNombre(valor: string): string {
  const v = (valor || '').trim().replace(/\s+/g, ' ');
  if (!v) return 'El nombre completo es obligatorio.';
  if (v.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (v.length > 150) return 'El nombre no puede superar los 150 caracteres.';
  if (!REGEX_NOMBRE.test(v)) return 'El nombre solo puede contener letras, espacios, punto, coma, apóstrofe y guion.';
  return '';
}

export function validarCursoSeleccion(seleccion: string): string {
  if (!seleccion) return 'Selecciona un curso o crea uno nuevo.';
  return '';
}

export function validarCursoNuevo(valor: string): string {
  const v = (valor || '').trim().replace(/\s+/g, ' ');
  if (!v) return 'Escribe el nombre del curso nuevo.';
  if (v.length < 3) return 'El nombre del curso debe tener al menos 3 caracteres.';
  if (v.length > 150) return 'El nombre del curso no puede superar los 150 caracteres.';
  if (!REGEX_CURSO.test(v)) return 'El nombre del curso contiene caracteres no permitidos.';
  return '';
}

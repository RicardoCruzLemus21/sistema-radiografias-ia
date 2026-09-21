// Lee el momento de expiración (claim "exp", en segundos) de un JWT, sin verificar la firma:
// solo sirve para saber cuándo avisar al usuario; la validez real la decide siempre el servidor.
// Devuelve milisegundos desde epoch, o null si el token no es un JWT legible o no trae "exp".
export function leerExpiracionMs(token: string | null): number | null {
  if (!token) return null;
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(relleno));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

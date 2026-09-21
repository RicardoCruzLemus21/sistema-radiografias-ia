// Limitador de peticiones por IP, en memoria (sin dependencias). Sirve como freno a la fuerza
// bruta en los endpoints públicos; se reinicia al reiniciar el servidor, y con varias instancias
// del backend cada una llevaría su propia cuenta.
const crearLimitador = ({ ventanaMs, maximo, mensaje }) => {
    const intentos = new Map(); // ip -> { cuenta, expira }

    return (req, res, next) => {
        const ahora = Date.now();
        const ip = req.ip || req.connection?.remoteAddress || 'desconocida';

        if (intentos.size > 5000) {
            for (const [clave, dato] of intentos) {
                if (dato.expira <= ahora) intentos.delete(clave);
            }
        }

        let dato = intentos.get(ip);
        if (!dato || dato.expira <= ahora) {
            dato = { cuenta: 0, expira: ahora + ventanaMs };
            intentos.set(ip, dato);
        }

        dato.cuenta++;
        if (dato.cuenta > maximo) {
            res.set('Retry-After', String(Math.ceil((dato.expira - ahora) / 1000)));
            return res.status(429).json({ status: 'error', message: mensaje || 'Demasiados intentos. Espera un momento e intenta de nuevo.' });
        }
        next();
    };
};

module.exports = { crearLimitador };

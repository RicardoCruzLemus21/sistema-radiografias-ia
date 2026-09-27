// Tarea programada: mantiene los logs de auditoría con un máximo de 30 días de historial.
// Se corre una vez al iniciar el servidor (por si estuvo apagado varios días) y luego cada 24 h.
// Es un setInterval simple a propósito: no depende de que el motor de MySQL tenga el
// "event scheduler" habilitado (a menudo viene apagado por defecto y no siempre se puede
// tocar la configuración del servidor de base de datos en el hosting).
const auditService = require('../services/auditService');

const VEINTICUATRO_HORAS_MS = 24 * 60 * 60 * 1000;

const ejecutarPurga = async () => {
    try {
        const { acciones_eliminadas, accesos_eliminados } = await auditService.purgarAntiguos();
        if (acciones_eliminadas > 0 || accesos_eliminados > 0) {
            console.log(`🧹 Limpieza de auditoría: ${acciones_eliminadas} acciones y ${accesos_eliminados} accesos de más de 30 días eliminados.`);
        }
    } catch (error) {
        console.error('Error al purgar auditoría antigua:', error.message);
    }
};

const iniciarLimpiezaProgramada = () => {
    ejecutarPurga(); // primera pasada al levantar el servidor
    setInterval(ejecutarPurga, VEINTICUATRO_HORAS_MS);
};

module.exports = { iniciarLimpiezaProgramada };

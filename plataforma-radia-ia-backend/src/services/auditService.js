const pool = require('../config/database');

const registrarAccion = async (id_usuario, accion, detalle) => {
    try {
        const [resultado] = await pool.query('CALL sp_registrar_auditoria_actividad(?, ?, ?)', [id_usuario, accion, detalle]);
        return { id_auditoria: resultado[0][0].id_auditoria };
    } catch (error) {
        console.error('Error registrando auditoría:', error);
        // No lanzamos error para no bloquear el flujo principal si falla el log
    }
};

const obtenerLogs = async (limite = 50) => {
    const [logs] = await pool.query('CALL sp_obtener_logs_actividad(?)', [limite]);
    return logs[0];
};

// Retención de 30 días: borra acciones más antiguas que eso. Se llama sola desde
// src/jobs/purgaAuditoria.js (al iniciar el servidor y luego una vez al día).
const purgarAntiguos = async () => {
    const [resultado] = await pool.query('CALL sp_purgar_auditoria_antigua()');
    return { acciones_eliminadas: resultado[0][0].acciones_eliminadas };
};

module.exports = {
    registrarAccion,
    obtenerLogs,
    purgarAntiguos
};

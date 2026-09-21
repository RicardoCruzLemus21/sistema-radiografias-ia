const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const crearNotificacion = async (id_usuario_destino, titulo, mensaje) => {
    try {
        const query = `
            INSERT INTO ${dict.TABLAS.NOTIFICACIONES} 
            (${dict.COLUMNAS.ID_USUARIO_DESTINO}, ${dict.COLUMNAS.TITULO}, ${dict.COLUMNAS.MENSAJE}) 
            VALUES (?, ?, ?)
        `;
        const [resultado] = await pool.query(query, [id_usuario_destino, titulo, mensaje]);
        return { id_notificacion: resultado.insertId };
    } catch (error) {
        console.error('Error creando notificación:', error);
    }
};

const enviarNotificacionMasiva = async (ids_usuarios, titulo, mensaje) => {
    if (!ids_usuarios || ids_usuarios.length === 0) return;
    try {
        const valores = ids_usuarios.map(id => [id, titulo, mensaje]);
        const query = `
            INSERT INTO ${dict.TABLAS.NOTIFICACIONES} 
            (${dict.COLUMNAS.ID_USUARIO_DESTINO}, ${dict.COLUMNAS.TITULO}, ${dict.COLUMNAS.MENSAJE}) 
            VALUES ?
        `;
        await pool.query(query, [valores]);
    } catch (error) {
        console.error('Error enviando notificación masiva:', error);
    }
};

const obtenerNotificaciones = async (id_usuario) => {
    const query = `
        SELECT * FROM ${dict.TABLAS.NOTIFICACIONES} 
        WHERE ${dict.COLUMNAS.ID_USUARIO_DESTINO} = ? 
        ORDER BY ${dict.COLUMNAS.FECHA_CREACION} DESC
    `;
    const [notificaciones] = await pool.query(query, [id_usuario]);
    return notificaciones;
};

// Marca como leída y elimina (el check de la campana). Devuelve false si no existe o no es del usuario.
const eliminarNotificacion = async (id_notificacion, id_usuario) => {
    const [res] = await pool.query('CALL sp_eliminar_notificacion(?, ?)', [id_notificacion, id_usuario]);
    return res[0][0].filas > 0;
};

// --- Eventos ---
const seguro = async (nombre, fn) => {
    try { await fn(); } catch (error) { console.error(`Error notificando (${nombre}):`, error.message); }
};

// El docente publicó un ejercicio: avisa a todos los estudiantes del curso
const notificarEjercicioPublicado = (id_curso, nombreEjercicio, totalCasos) => seguro('ejercicio publicado', async () => {
    const [curso] = await pool.query('CALL sp_datos_curso_notificacion(?)', [id_curso]);
    const [est] = await pool.query('CALL sp_ids_estudiantes_curso(?)', [id_curso]);
    const ids = est[0].map(e => e.id_estudiante);
    if (ids.length === 0) return;
    const nombreCurso = curso[0][0]?.nombre_curso || 'tu curso';
    await enviarNotificacionMasiva(ids, 'Nuevo ejercicio asignado',
        `Tu docente publicó "${nombreEjercicio}" con ${totalCasos} ${totalCasos === 1 ? 'caso' : 'casos'} en ${nombreCurso}. Ingresa a tu worklist para resolverlo.`);
});

// Un estudiante respondió un caso: si con eso termina el ejercicio, avisa a su docente (un aviso por ejercicio, no uno por caso).
// Los casos sueltos, sin ejercicio, se avisan de uno en uno.
const notificarProgresoDelEstudiante = (id_estudiante, id_caso) => seguro('progreso del estudiante', async () => {
    const [res] = await pool.query('CALL sp_progreso_ejercicio_estudiante(?, ?)', [id_estudiante, id_caso]);
    const p = res[0][0];
    if (!p || Number(p.resueltos) < Number(p.total_casos)) return;
    const promedio = p.promedio === null || p.promedio === undefined ? '' : ` con un promedio de ${Math.round(Number(p.promedio))}%`;
    const que = p.id_ejercicio ? `el ejercicio "${p.ejercicio}"` : 'un caso';
    await crearNotificacion(p.id_catedratico, p.id_ejercicio ? 'Ejercicio completado' : 'Nueva evaluación',
        `${String(p.nombre_estudiante).trim()} completó ${que} de ${p.nombre_curso}${promedio}.`);
});

// El docente comentó la respuesta de un estudiante: se lo avisa al dueño de la evaluación
const notificarComentarioDelDocente = (id_evaluacion) => seguro('comentario del docente', async () => {
    const [res] = await pool.query('CALL sp_dueno_evaluacion(?)', [id_evaluacion]);
    const d = res[0][0];
    if (!d) return;
    const donde = d.ejercicio ? `tu respuesta del ejercicio "${d.ejercicio}"` : 'una de tus respuestas';
    await crearNotificacion(d.id_estudiante, 'Nuevo comentario de tu docente', `Tu docente dejó un comentario en ${donde}. Revísalo en Mi Rendimiento.`);
});

// Un estudiante se registró con el código del docente
const notificarNuevoEstudiante = (id_curso, nombreEstudiante) => seguro('nuevo estudiante', async () => {
    const [curso] = await pool.query('CALL sp_datos_curso_notificacion(?)', [id_curso]);
    const c = curso[0][0];
    if (!c) return;
    await crearNotificacion(c.id_catedratico, 'Nuevo estudiante inscrito', `${String(nombreEstudiante).trim()} se registró con tu código y quedó inscrito en ${c.nombre_curso}.`);
});

// Un estudiante fue matriculado en un curso
const notificarMatricula = (id_estudiante, id_curso) => seguro('matrícula', async () => {
    const [curso] = await pool.query('CALL sp_datos_curso_notificacion(?)', [id_curso]);
    const c = curso[0][0];
    if (!c) return;
    await crearNotificacion(id_estudiante, 'Te inscribieron en un curso', `Fuiste inscrito en ${c.nombre_curso}. Cuando tu docente publique ejercicios los verás en tu worklist.`);
});

module.exports = {
    notificarEjercicioPublicado,
    notificarProgresoDelEstudiante,
    notificarComentarioDelDocente,
    notificarNuevoEstudiante,
    notificarMatricula,
    crearNotificacion,
    enviarNotificacionMasiva,
    obtenerNotificaciones,
    eliminarNotificacion
};

const pool = require('../config/database');
const dict = require('../config/dbDictionary');

// 1. Servicio para que un Catedrático cree un curso
const crearCurso = async (datosCurso) => {
    const { nombre_curso, semestre, anio, id_catedratico } = datosCurso;

    try {
        const [resultado] = await pool.query('CALL sp_crear_curso(?, ?, ?, ?)', [id_catedratico, nombre_curso, semestre, anio]);

        return { 
            id_curso: resultado[0][0].id_curso, 
            nombre_curso, 
            semestre,
            anio,
            mensaje: "Curso creado exitosamente en la plataforma"
        };
    } catch (error) {
        throw error;
    }
};

// 2. Servicio para asignar un estudiante a un curso
const asignarEstudiante = async (datosAsignacion) => {
    const { id_curso, id_estudiante } = datosAsignacion;

    try {
        const [existentes] = await pool.query('CALL sp_verificar_estudiante_curso(?, ?)', [id_curso, id_estudiante]);
        
        if (existentes[0].length > 0) {
            throw new Error('El estudiante ya se encuentra matriculado en este curso.');
        }

        const [resultado] = await pool.query('CALL sp_asignar_estudiante_curso(?, ?)', [id_curso, id_estudiante]);

        // === NOTIFICACIÓN POR CORREO DINÁMICO ===
        try {
            // Extraer info necesaria para el correo
            const [infoQuery] = await pool.query('CALL sp_obtener_info_correo_asignacion(?, ?)', [id_curso, id_estudiante]);

            if (infoQuery[0].length > 0) {
                const info = infoQuery[0][0];
                const emailService = require('./emailService');
                // No esperamos con await para que no retrase la respuesta HTTP al cliente
                emailService.enviarCorreoBienvenida(
                    info.correo, 
                    info.nombre_alumno, 
                    info.nombre_catedratico, 
                    info.nombre_curso,
                    datosAsignacion.contrasena_temporal || 'Contacta a tu catedrático',
                    `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`
                );
            }
        } catch (mailError) {
            console.error('Error al intentar disparar el correo:', mailError);
        }

        return { 
            id_asignacion: resultado[0][0].id_asignacion,
            id_curso, 
            id_estudiante 
        };
    } catch (error) {
        throw error;
    }
};

// 3. Obtener los cursos creados por un catedrático específico
const obtenerCursosCatedratico = async (id_catedratico) => {
    const [cursos] = await pool.query('CALL sp_obtener_cursos_catedratico(?)', [id_catedratico]);
    return cursos[0];
};

// 3.5 Obtener catálogo maestro de cursos disponibles
const obtenerCatalogoCursos = async () => {
    const [catalogo] = await pool.query('CALL sp_obtener_catalogo_cursos()');
    return catalogo[0];
};

// 4. Obtener la lista de estudiantes matriculados en un curso
const obtenerEstudiantesPorCurso = async (id_curso) => {
    const [estudiantes] = await pool.query('CALL sp_obtener_estudiantes_por_curso(?)', [id_curso]);
    return estudiantes[0];
};

// 5. Leer el rendimiento general (Triangulación Asignaciones -> Estadisticas_Dashboard -> Usuarios)
const obtenerEstadisticas = async (id_curso) => {
    const [estadisticas] = await pool.query('CALL sp_obtener_estadisticas_curso(?)', [id_curso]);
    return estadisticas[0];
};

// 6. Obtener resumen general completo para el Dashboard del Catedrático
const obtenerResumenGeneral = async (id_catedratico) => {
    try {
        // Total de casos asignados en los cursos de este catedrático
        const [casosRows] = await pool.query('CALL sp_obtener_total_casos_catedratico(?)', [id_catedratico]);
        const totalCasosGlobal = casosRows[0][0]?.totalCasos || 0;

        // Estudiantes registrados y matriculados en cursos de este catedrático
        const [estudiantesRows] = await pool.query('CALL sp_obtener_estudiantes_resumen_catedratico(?)', [id_catedratico]);

        // Formatear estudiantes con estado y datos limpios
        const alumnosFormateados = estudiantesRows[0].map(est => {
            const prec = parseFloat(est.precision_promedio) || 0;
            
            let estado = 'Sin Evaluar';
            if (est.casosResueltos > 0) {
                if (prec >= 80) estado = 'Sobresaliente';
                else if (prec >= 50) estado = 'Promedio';
                else estado = 'En Riesgo';
            }

            return {
                id: est.carnet || `EST-${String(est.id).padStart(4, '0')}`,
                id_usuario: est.id,
                nombre: est.nombre,
                correo: est.correo,
                casosResueltos: est.casosResueltos || 0,
                casosAsignados: totalCasosGlobal,
                precision: Math.round(prec),
                estado: estado
            };
        });

        // Calcular estadísticas globales
        const totalAlumnos = alumnosFormateados.length;
        const totalPrecisionSum = alumnosFormateados.reduce((acc, curr) => acc + curr.precision, 0);
        const precisionGrupal = totalAlumnos > 0 ? Math.round(totalPrecisionSum / totalAlumnos) : 0;
        const casosCompletadosTotales = alumnosFormateados.reduce((acc, curr) => acc + curr.casosResueltos, 0);

        return {
            estadisticasGlobales: {
                totalAlumnos,
                casosAsignados: totalCasosGlobal,
                precisionGrupal,
                casosCompletadosTotales
            },
            alumnos: alumnosFormateados
        };
    } catch (error) {
        console.error('Error al generar resumen general académico:', error);
        throw error;
    }
};

// 7. Obtener expediente detallado de un estudiante
const obtenerDetalleEstudiante = async (id_estudiante) => {
    try {
        const [usuario] = await pool.query('CALL sp_obtener_detalle_estudiante_usuario(?)', [id_estudiante]);

        if (usuario[0].length === 0) {
            throw new Error('Estudiante no encontrado');
        }

        const [evaluaciones] = await pool.query('CALL sp_obtener_detalle_estudiante_evaluaciones(?)', [id_estudiante]);

        return {
            estudiante: usuario[0][0],
            evaluaciones: evaluaciones[0]
        };
    } catch (error) {
        console.error('Error al obtener detalle del estudiante:', error);
        throw error;
    }
};

// 8. Editar datos básicos de un estudiante
const editarEstudiante = async (id_estudiante, datos) => {
    try {
        const { nombre_completo, correo_electronico } = datos;
        await pool.query('CALL sp_editar_estudiante_basico(?, ?, ?)', [id_estudiante, nombre_completo, correo_electronico]);
        return { id_estudiante, nombre_completo, correo_electronico };
    } catch (error) {
        console.error('Error al editar estudiante:', error);
        throw error;
    }
};

// 9. Eliminar (desasignar) estudiante de los cursos del catedrático
const eliminarEstudiante = async (id_estudiante, id_catedratico) => {
    try {
        const [resultado] = await pool.query('CALL sp_eliminar_estudiante_curso(?, ?)', [id_estudiante, id_catedratico]);
        if (resultado[0][0].affectedRows === 0) {
            throw new Error('No se pudo eliminar al estudiante o no pertenece a tus secciones.');
        }
        return true;
    } catch (error) {
        console.error('Error al eliminar estudiante:', error);
        throw error;
    }
};

// 10. Obtener el rendimiento propio del estudiante
const obtenerMiRendimiento = async (id_estudiante) => {
    try {
        const [usuario] = await pool.query('CALL sp_obtener_detalle_estudiante_usuario(?)', [id_estudiante]);

        if (usuario[0].length === 0) {
            throw new Error('Estudiante no encontrado');
        }

        const [evaluaciones] = await pool.query('CALL sp_obtener_detalle_estudiante_evaluaciones(?)', [id_estudiante]);

        const [estadisticas] = await pool.query('CALL sp_obtener_mi_rendimiento_estadisticas(?)', [id_estudiante]);

        return {
            estudiante: usuario[0][0],
            estadisticas: {
                total_casos: estadisticas[0][0].total_casos || 0,
                precision_promedio: estadisticas[0][0].precision_promedio || 0
            },
            historial: evaluaciones[0]
        };
    } catch (error) {
        console.error('Error al obtener mi rendimiento:', error);
        throw error;
    }
};

// 11. Editar Curso
const editarCurso = async (id_curso, datos) => {
    try {
        const { nombre_curso, semestre, anio } = datos;
        await pool.query('CALL sp_editar_curso(?, ?, ?, ?)', [id_curso, nombre_curso, semestre, anio]);
        return { id_curso, nombre_curso, semestre, anio };
    } catch (error) {
        console.error('Error al editar curso:', error);
        throw error;
    }
};

// 12. Eliminar Curso
const eliminarCurso = async (id_curso, id_catedratico) => {
    try {
        const [resultado] = await pool.query('CALL sp_eliminar_curso(?, ?)', [id_curso, id_catedratico]);
        if (resultado[0][0].affectedRows === 0) {
            throw new Error('No se pudo eliminar el curso o no tienes permisos.');
        }
        return true;
    } catch (error) {
        console.error('Error al eliminar curso:', error);
        throw new Error('No se puede eliminar el curso porque ya tiene estudiantes o casos asociados.');
    }
};

module.exports = {
    crearCurso,
    asignarEstudiante,
    obtenerCursosCatedratico,
    obtenerCatalogoCursos,
    obtenerEstudiantesPorCurso,
    obtenerEstadisticas,
    obtenerResumenGeneral,
    obtenerDetalleEstudiante,
    editarEstudiante,
    eliminarEstudiante,
    obtenerMiRendimiento,
    editarCurso,
    eliminarCurso
};
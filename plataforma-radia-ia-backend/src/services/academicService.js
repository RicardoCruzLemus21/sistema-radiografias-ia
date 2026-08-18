const pool = require('../config/database');
const dict = require('../config/dbDictionary');

// 1. Servicio para que un Catedrático cree un curso
const crearCurso = async (datosCurso) => {
    const { nombre_curso, semestre, anio, id_catedratico } = datosCurso;

    try {
        const query = `
            INSERT INTO ${dict.TABLAS.CURSOS} 
            (${dict.COLUMNAS.ID_CATEDRATICO}, ${dict.COLUMNAS.NOMBRE_CURSO}, ${dict.COLUMNAS.SEMESTRE}, ${dict.COLUMNAS.ANIO}) 
            VALUES (?, ?, ?, ?)
        `;
        const [resultado] = await pool.query(query, [id_catedratico, nombre_curso, semestre, anio]);

        return { 
            id_curso: resultado.insertId, 
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
        const queryExiste = `
            SELECT * FROM ${dict.TABLAS.ASIGNACIONES} 
            WHERE ${dict.COLUMNAS.ID_CURSO} = ? AND ${dict.COLUMNAS.ID_ESTUDIANTE} = ?
        `;
        const [existentes] = await pool.query(queryExiste, [id_curso, id_estudiante]);
        
        if (existentes.length > 0) {
            throw new Error('El estudiante ya se encuentra matriculado en este curso.');
        }

        const query = `
            INSERT INTO ${dict.TABLAS.ASIGNACIONES} 
            (${dict.COLUMNAS.ID_CURSO}, ${dict.COLUMNAS.ID_ESTUDIANTE}) 
            VALUES (?, ?)
        `;
        const [resultado] = await pool.query(query, [id_curso, id_estudiante]);

        // === NOTIFICACIÓN POR CORREO DINÁMICO ===
        try {
            // Extraer info necesaria para el correo
            const [infoQuery] = await pool.query(`
                SELECT 
                    u.nombre_completo AS nombre_alumno,
                    u.correo_electronico AS correo,
                    c.nombre_curso,
                    cat.nombre_completo AS nombre_catedratico
                FROM ${dict.TABLAS.USUARIOS} u
                JOIN ${dict.TABLAS.CURSOS} c ON c.id_curso = ?
                JOIN ${dict.TABLAS.USUARIOS} cat ON c.id_catedratico = cat.id_usuario
                WHERE u.id_usuario = ?
            `, [id_curso, id_estudiante]);

            if (infoQuery.length > 0) {
                const info = infoQuery[0];
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
            id_asignacion: resultado.insertId, 
            id_curso, 
            id_estudiante 
        };
    } catch (error) {
        throw error;
    }
};

// 3. Obtener los cursos creados por un catedrático específico
const obtenerCursosCatedratico = async (id_catedratico) => {
    const query = `
        SELECT ${dict.COLUMNAS.ID_CURSO}, ${dict.COLUMNAS.NOMBRE_CURSO}, ${dict.COLUMNAS.SEMESTRE}, ${dict.COLUMNAS.ANIO} 
        FROM ${dict.TABLAS.CURSOS} 
        WHERE ${dict.COLUMNAS.ID_CATEDRATICO} = ?
    `;
    const [cursos] = await pool.query(query, [id_catedratico]);
    return cursos;
};

// 4. Obtener la lista de estudiantes matriculados en un curso
const obtenerEstudiantesPorCurso = async (id_curso) => {
    const query = `
        SELECT u.${dict.COLUMNAS.ID_USUARIO}, u.${dict.COLUMNAS.NOMBRE_COMPLETO}, u.${dict.COLUMNAS.CORREO} 
        FROM ${dict.TABLAS.ASIGNACIONES} ae
        INNER JOIN ${dict.TABLAS.USUARIOS} u ON ae.${dict.COLUMNAS.ID_ESTUDIANTE} = u.${dict.COLUMNAS.ID_USUARIO}
        WHERE ae.${dict.COLUMNAS.ID_CURSO} = ?
    `;
    const [estudiantes] = await pool.query(query, [id_curso]);
    return estudiantes;
};

// 5. Leer el rendimiento general (Triangulación Asignaciones -> Estadisticas_Dashboard -> Usuarios)
const obtenerEstadisticas = async (id_curso) => {
    const query = `
        SELECT 
            u.${dict.COLUMNAS.NOMBRE_COMPLETO}, 
            e.${dict.COLUMNAS.TOTAL_CASOS}, 
            e.${dict.COLUMNAS.PROMEDIO_PRECISION}, 
            e.${dict.COLUMNAS.ULTIMA_ACTUALIZACION}
        FROM ${dict.TABLAS.ASIGNACIONES} a
        INNER JOIN ${dict.TABLAS.ESTADISTICAS} e ON a.${dict.COLUMNAS.ID_ESTUDIANTE} = e.${dict.COLUMNAS.ID_ESTUDIANTE}
        INNER JOIN ${dict.TABLAS.USUARIOS} u ON a.${dict.COLUMNAS.ID_ESTUDIANTE} = u.${dict.COLUMNAS.ID_USUARIO}
        WHERE a.${dict.COLUMNAS.ID_CURSO} = ?
    `;
    const [estadisticas] = await pool.query(query, [id_curso]);
    return estadisticas;
};

// 6. Obtener resumen general completo para el Dashboard del Catedrático
const obtenerResumenGeneral = async (id_catedratico) => {
    try {
        // Total de casos asignados en los cursos de este catedrático
        const [casosRows] = await pool.query(`
            SELECT COUNT(*) AS totalCasos 
            FROM ${dict.TABLAS.CASOS} c
            INNER JOIN ${dict.TABLAS.CURSOS} cs ON c.${dict.COLUMNAS.ID_CURSO} = cs.${dict.COLUMNAS.ID_CURSO}
            WHERE cs.${dict.COLUMNAS.ID_CATEDRATICO} = ?
        `, [id_catedratico]);
        const totalCasosGlobal = casosRows[0]?.totalCasos || 0;

        // Estudiantes registrados y matriculados en cursos de este catedrático
        const [estudiantesRows] = await pool.query(`
            SELECT 
                u.${dict.COLUMNAS.ID_USUARIO} AS id,
                u.${dict.COLUMNAS.NOMBRE_COMPLETO} AS nombre,
                u.${dict.COLUMNAS.CORREO} AS correo,
                (
                    SELECT COUNT(DISTINCT ee.${dict.COLUMNAS.ID_CASO}) 
                    FROM ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ee 
                    INNER JOIN ${dict.TABLAS.CASOS} c2 ON ee.${dict.COLUMNAS.ID_CASO} = c2.${dict.COLUMNAS.ID_CASO}
                    INNER JOIN ${dict.TABLAS.CURSOS} cs2 ON c2.${dict.COLUMNAS.ID_CURSO} = cs2.${dict.COLUMNAS.ID_CURSO}
                    WHERE ee.${dict.COLUMNAS.ID_ESTUDIANTE} = u.${dict.COLUMNAS.ID_USUARIO}
                    AND cs2.${dict.COLUMNAS.ID_CATEDRATICO} = ?
                ) AS casosResueltos,
                (
                    SELECT ROUND(AVG(cd.porcentaje_concordancia), 2)
                    FROM ${dict.TABLAS.CONCORDANCIA} cd
                    INNER JOIN ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ee ON cd.id_evaluacion = ee.id_evaluacion
                    INNER JOIN ${dict.TABLAS.CASOS} c2 ON ee.${dict.COLUMNAS.ID_CASO} = c2.${dict.COLUMNAS.ID_CASO}
                    INNER JOIN ${dict.TABLAS.CURSOS} cs2 ON c2.${dict.COLUMNAS.ID_CURSO} = cs2.${dict.COLUMNAS.ID_CURSO}
                    WHERE ee.id_estudiante = u.${dict.COLUMNAS.ID_USUARIO}
                    AND cs2.${dict.COLUMNAS.ID_CATEDRATICO} = ?
                ) AS precision_promedio
            FROM ${dict.TABLAS.USUARIOS} u
            INNER JOIN ${dict.TABLAS.ROLES} r ON u.id_rol = r.id_rol
            INNER JOIN ${dict.TABLAS.ASIGNACIONES} ae ON u.${dict.COLUMNAS.ID_USUARIO} = ae.${dict.COLUMNAS.ID_ESTUDIANTE}
            INNER JOIN ${dict.TABLAS.CURSOS} cs ON ae.${dict.COLUMNAS.ID_CURSO} = cs.${dict.COLUMNAS.ID_CURSO}
            WHERE LOWER(r.nombre_rol) LIKE '%estud%'
            AND cs.${dict.COLUMNAS.ID_CATEDRATICO} = ?
            GROUP BY u.${dict.COLUMNAS.ID_USUARIO}
        `, [id_catedratico, id_catedratico, id_catedratico]);

        // Formatear estudiantes con estado y datos limpios
        const alumnosFormateados = estudiantesRows.map(est => {
            const prec = parseFloat(est.precision_promedio) || 0;
            
            let estado = 'Sin Evaluar';
            if (est.casosResueltos > 0) {
                if (prec >= 80) estado = 'Sobresaliente';
                else if (prec >= 50) estado = 'Promedio';
                else estado = 'En Riesgo';
            }

            return {
                id: `EST-${String(est.id).padStart(4, '0')}`,
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
        const [usuario] = await pool.query(
            `SELECT id_usuario, nombre_completo, correo_electronico, fecha_registro FROM ${dict.TABLAS.USUARIOS} WHERE id_usuario = ?`,
            [id_estudiante]
        );

        if (usuario.length === 0) {
            throw new Error('Estudiante no encontrado');
        }

        const [evaluaciones] = await pool.query(`
            SELECT 
                ee.id_evaluacion,
                c.id_caso,
                c.titulo_caso,
                c.nivel_dificultad,
                ee.tiempo_analisis_segundos,
                ee.justificacion_clinica,
                ee.fecha_evaluacion,
                COALESCE(cd.porcentaje_concordancia, 0) AS concordancia_ia,
                COALESCE(cd.nivel_precision, 'Pendiente') AS nivel_precision,
                (
                    SELECT GROUP_CONCAT(cp.nombre_patologia SEPARATOR ', ')
                    FROM ${dict.TABLAS.DETALLE_HALLAZGOS} dh
                    INNER JOIN ${dict.TABLAS.CATALOGO_PATOLOGIAS} cp ON dh.id_patologia = cp.id_patologia
                    WHERE dh.id_evaluacion = ee.id_evaluacion
                ) AS hallazgos_seleccionados
            FROM ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ee
            INNER JOIN ${dict.TABLAS.CASOS} c ON ee.id_caso = c.id_caso
            LEFT JOIN ${dict.TABLAS.CONCORDANCIA} cd ON ee.id_evaluacion = cd.id_evaluacion
            WHERE ee.id_estudiante = ?
            ORDER BY ee.fecha_evaluacion DESC
        `, [id_estudiante]);

        return {
            estudiante: usuario[0],
            evaluaciones
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
        const query = `
            UPDATE ${dict.TABLAS.USUARIOS} 
            SET ${dict.COLUMNAS.NOMBRE_COMPLETO} = ?, ${dict.COLUMNAS.CORREO} = ?
            WHERE ${dict.COLUMNAS.ID_USUARIO} = ?
        `;
        await pool.query(query, [nombre_completo, correo_electronico, id_estudiante]);
        return { id_estudiante, nombre_completo, correo_electronico };
    } catch (error) {
        console.error('Error al editar estudiante:', error);
        throw error;
    }
};

// 9. Eliminar (desasignar) estudiante de los cursos del catedrático
const eliminarEstudiante = async (id_estudiante, id_catedratico) => {
    try {
        const query = `
            DELETE ae FROM ${dict.TABLAS.ASIGNACIONES} ae
            INNER JOIN ${dict.TABLAS.CURSOS} cs ON ae.${dict.COLUMNAS.ID_CURSO} = cs.${dict.COLUMNAS.ID_CURSO}
            WHERE ae.${dict.COLUMNAS.ID_ESTUDIANTE} = ? AND cs.${dict.COLUMNAS.ID_CATEDRATICO} = ?
        `;
        const [resultado] = await pool.query(query, [id_estudiante, id_catedratico]);
        if (resultado.affectedRows === 0) {
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
        const [usuario] = await pool.query(
            `SELECT id_usuario, nombre_completo, correo_electronico FROM ${dict.TABLAS.USUARIOS} WHERE id_usuario = ?`,
            [id_estudiante]
        );

        if (usuario.length === 0) {
            throw new Error('Estudiante no encontrado');
        }

        const [evaluaciones] = await pool.query(`
            SELECT 
                ee.id_evaluacion,
                c.id_caso,
                c.titulo_caso,
                c.nivel_dificultad,
                ee.fecha_evaluacion,
                COALESCE(cd.porcentaje_concordancia, 0) AS concordancia_ia,
                COALESCE(cd.nivel_precision, 'Pendiente') AS nivel_precision
            FROM ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ee
            INNER JOIN ${dict.TABLAS.CASOS} c ON ee.id_caso = c.id_caso
            LEFT JOIN ${dict.TABLAS.CONCORDANCIA} cd ON ee.id_evaluacion = cd.id_evaluacion
            WHERE ee.id_estudiante = ?
            ORDER BY ee.fecha_evaluacion DESC
        `, [id_estudiante]);

        const [estadisticas] = await pool.query(`
            SELECT 
                COUNT(DISTINCT ee.id_caso) AS total_casos,
                ROUND(AVG(cd.porcentaje_concordancia), 2) AS precision_promedio
            FROM ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ee
            LEFT JOIN ${dict.TABLAS.CONCORDANCIA} cd ON ee.id_evaluacion = cd.id_evaluacion
            WHERE ee.id_estudiante = ?
        `, [id_estudiante]);

        return {
            estudiante: usuario[0],
            estadisticas: {
                total_casos: estadisticas[0].total_casos || 0,
                precision_promedio: estadisticas[0].precision_promedio || 0
            },
            historial: evaluaciones
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
        const query = `
            UPDATE ${dict.TABLAS.CURSOS} 
            SET ${dict.COLUMNAS.NOMBRE_CURSO} = ?, ${dict.COLUMNAS.SEMESTRE} = ?, ${dict.COLUMNAS.ANIO} = ?
            WHERE ${dict.COLUMNAS.ID_CURSO} = ?
        `;
        await pool.query(query, [nombre_curso, semestre, anio, id_curso]);
        return { id_curso, nombre_curso, semestre, anio };
    } catch (error) {
        console.error('Error al editar curso:', error);
        throw error;
    }
};

// 12. Eliminar Curso
const eliminarCurso = async (id_curso, id_catedratico) => {
    try {
        const query = `
            DELETE FROM ${dict.TABLAS.CURSOS} 
            WHERE ${dict.COLUMNAS.ID_CURSO} = ? AND ${dict.COLUMNAS.ID_CATEDRATICO} = ?
        `;
        const [resultado] = await pool.query(query, [id_curso, id_catedratico]);
        if (resultado.affectedRows === 0) {
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
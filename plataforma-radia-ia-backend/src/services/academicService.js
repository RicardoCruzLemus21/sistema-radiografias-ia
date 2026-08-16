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
const obtenerResumenGeneral = async () => {
    try {
        // Total de casos asignados en el sistema
        const [casosRows] = await pool.query(`SELECT COUNT(*) AS totalCasos FROM ${dict.TABLAS.CASOS}`);
        const totalCasosGlobal = casosRows[0]?.totalCasos || 0;

        // Estudiantes registrados con rol Estudiante (id_rol = 2 o nombre_rol = 'Estudiante')
        const [estudiantesRows] = await pool.query(`
            SELECT 
                u.${dict.COLUMNAS.ID_USUARIO} AS id,
                u.${dict.COLUMNAS.NOMBRE_COMPLETO} AS nombre,
                u.${dict.COLUMNAS.CORREO} AS correo,
                COALESCE(ed.${dict.COLUMNAS.TOTAL_CASOS}, (
                    SELECT COUNT(DISTINCT ee.${dict.COLUMNAS.ID_CASO}) 
                    FROM ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ee 
                    WHERE ee.${dict.COLUMNAS.ID_ESTUDIANTE} = u.${dict.COLUMNAS.ID_USUARIO}
                ), 0) AS casosResueltos,
                COALESCE(ed.${dict.COLUMNAS.PROMEDIO_PRECISION}, (
                    SELECT ROUND(AVG(cd.porcentaje_concordancia), 2)
                    FROM ${dict.TABLAS.CONCORDANCIA} cd
                    INNER JOIN ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ee ON cd.id_evaluacion = ee.id_evaluacion
                    WHERE ee.id_estudiante = u.${dict.COLUMNAS.ID_USUARIO}
                ), 0.00) AS precision_promedio
            FROM ${dict.TABLAS.USUARIOS} u
            INNER JOIN ${dict.TABLAS.ROLES} r ON u.id_rol = r.id_rol
            LEFT JOIN ${dict.TABLAS.ESTADISTICAS} ed ON u.${dict.COLUMNAS.ID_USUARIO} = ed.${dict.COLUMNAS.ID_ESTUDIANTE}
            WHERE LOWER(r.nombre_rol) LIKE '%estud%'
        `);

        // Formatear estudiantes con estado y datos limpios
        const alumnosFormateados = estudiantesRows.map(est => {
            const prec = parseFloat(est.precision_promedio) || 0;
            let estado = 'En Riesgo';
            if (prec >= 80) estado = 'Sobresaliente';
            else if (prec >= 60 || (est.casosResueltos > 0 && prec >= 50)) estado = 'Promedio';

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

module.exports = {
    crearCurso,
    asignarEstudiante,
    obtenerCursosCatedratico,
    obtenerEstudiantesPorCurso,
    obtenerEstadisticas,
    obtenerResumenGeneral,
    obtenerDetalleEstudiante
};
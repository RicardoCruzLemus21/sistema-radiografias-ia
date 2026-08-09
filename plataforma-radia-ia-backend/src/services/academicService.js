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

module.exports = {
    crearCurso,
    asignarEstudiante,
    obtenerCursosCatedratico,
    obtenerEstudiantesPorCurso,
    obtenerEstadisticas
};
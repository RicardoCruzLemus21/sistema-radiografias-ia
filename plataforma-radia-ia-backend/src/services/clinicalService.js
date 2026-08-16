const pool = require('../config/database');
const dict = require('../config/dbDictionary');

// 1. Crear el paciente simulado
const crearPaciente = async (datosPaciente) => {
    const { codigo_paciente, edad, genero, antecedentes_medicos } = datosPaciente;
    const query = `
        INSERT INTO ${dict.TABLAS.PACIENTES} 
        (${dict.COLUMNAS.CODIGO_PACIENTE}, ${dict.COLUMNAS.EDAD}, ${dict.COLUMNAS.GENERO}, ${dict.COLUMNAS.ANTECEDENTES}) 
        VALUES (?, ?, ?, ?)
    `;
    const [resultado] = await pool.query(query, [codigo_paciente, edad, genero, antecedentes_medicos]);
    return { id_paciente: resultado.insertId, codigo_paciente };
};

// 2. Crear el caso clínico asociándolo al curso y al paciente
const crearCaso = async (datosCaso) => {
    const { id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad } = datosCaso;
    const query = `
        INSERT INTO ${dict.TABLAS.CASOS} 
        (${dict.COLUMNAS.ID_CURSO}, ${dict.COLUMNAS.ID_PACIENTE}, ${dict.COLUMNAS.TITULO_CASO}, ${dict.COLUMNAS.MOTIVO_CONSULTA}, ${dict.COLUMNAS.NIVEL_DIFICULTAD}) 
        VALUES (?, ?, ?, ?, ?)
    `;
    const [resultado] = await pool.query(query, [id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad]);
    return { id_caso: resultado.insertId, titulo_caso };
};

// 3. Guardar el registro de la radiografía en la BD
const guardarRadiografia = async (id_caso, tipo_proyeccion, ruta_imagen) => {
    const query = `
        INSERT INTO ${dict.TABLAS.RADIOGRAFIAS} 
        (${dict.COLUMNAS.ID_CASO}, ${dict.COLUMNAS.TIPO_PROYECCION}, ${dict.COLUMNAS.RUTA_IMAGEN}) 
        VALUES (?, ?, ?)
    `;
    const [resultado] = await pool.query(query, [id_caso, tipo_proyeccion, ruta_imagen]);
    return { id_radiografia: resultado.insertId, id_caso, tipo_proyeccion, ruta_imagen };
};

// 4. Crear Caso Completo (Paciente + Caso + Radiografía) en una sola transacción
const crearCasoCompleto = async (datos) => {
    const {
        codigo_paciente,
        edad,
        genero,
        antecedentes_medicos,
        id_curso,
        id_catedratico,
        titulo_caso,
        motivo_consulta,
        nivel_dificultad,
        tipo_proyeccion,
        ruta_imagen
    } = datos;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // A. Insertar Paciente Simulado
        const queryPaciente = `
            INSERT INTO ${dict.TABLAS.PACIENTES} 
            (${dict.COLUMNAS.CODIGO_PACIENTE}, ${dict.COLUMNAS.EDAD}, ${dict.COLUMNAS.GENERO}, ${dict.COLUMNAS.ANTECEDENTES}) 
            VALUES (?, ?, ?, ?)
        `;
        const [resPaciente] = await connection.query(queryPaciente, [
            codigo_paciente,
            parseInt(edad, 10) || 30,
            genero || 'Otro',
            antecedentes_medicos || 'Sin antecedentes relevantes reportados'
        ]);
        const id_paciente = resPaciente.insertId;

        // B. Determinar Curso (si no viene, asociar al primer curso disponible del catedratico actual o crear uno por defecto)
        let cursoIdFinal = id_curso ? parseInt(id_curso, 10) : null;
        if (!cursoIdFinal) {
            const [cursos] = await connection.query(`SELECT id_curso FROM ${dict.TABLAS.CURSOS} WHERE id_catedratico = ? LIMIT 1`, [id_catedratico || 1]);
            if (cursos.length > 0) {
                cursoIdFinal = cursos[0].id_curso;
            } else {
                // Crear curso base por defecto si no existe ninguno
                const [nuevoCurso] = await connection.query(
                    `INSERT INTO ${dict.TABLAS.CURSOS} (id_catedratico, nombre_curso, semestre, anio) 
                     VALUES (?, 'Radiología Clínica I', 'Primer Semestre', 2026)`, [id_catedratico || 1]
                );
                cursoIdFinal = nuevoCurso.insertId;
            }
        }

        // C. Insertar Caso Clínico
        const queryCaso = `
            INSERT INTO ${dict.TABLAS.CASOS} 
            (${dict.COLUMNAS.ID_CURSO}, ${dict.COLUMNAS.ID_PACIENTE}, ${dict.COLUMNAS.TITULO_CASO}, ${dict.COLUMNAS.MOTIVO_CONSULTA}, ${dict.COLUMNAS.NIVEL_DIFICULTAD}) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const [resCaso] = await connection.query(queryCaso, [
            cursoIdFinal,
            id_paciente,
            titulo_caso,
            motivo_consulta,
            nivel_dificultad || 'Intermedio'
        ]);
        const id_caso = resCaso.insertId;

        // D. Insertar Radiografía
        const queryRx = `
            INSERT INTO ${dict.TABLAS.RADIOGRAFIAS} 
            (${dict.COLUMNAS.ID_CASO}, ${dict.COLUMNAS.TIPO_PROYECCION}, ${dict.COLUMNAS.RUTA_IMAGEN}) 
            VALUES (?, ?, ?)
        `;
        const [resRx] = await connection.query(queryRx, [
            id_caso,
            tipo_proyeccion || 'Tórax PA',
            ruta_imagen || '/uploads/radiografias/rx-default.jpg'
        ]);

        await connection.commit();
        connection.release();

        return {
            id_caso,
            id_paciente,
            id_curso: cursoIdFinal,
            id_radiografia: resRx.insertId,
            codigo_paciente,
            titulo_caso,
            tipo_proyeccion,
            ruta_imagen,
            mensaje: "Caso clínico y radiografía registrados exitosamente en la plataforma."
        };
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

// 5. Obtener todos los casos con información completa para gestión del catedrático
const obtenerCasosDetallados = async (id_catedratico) => {
    const query = `
        SELECT 
            c.${dict.COLUMNAS.ID_CASO} AS id,
            c.${dict.COLUMNAS.TITULO_CASO} AS titulo,
            c.${dict.COLUMNAS.MOTIVO_CONSULTA} AS motivo_consulta,
            c.${dict.COLUMNAS.NIVEL_DIFICULTAD} AS nivel_dificultad,
            p.${dict.COLUMNAS.ID_PACIENTE} AS id_paciente,
            p.${dict.COLUMNAS.CODIGO_PACIENTE} AS paciente,
            p.${dict.COLUMNAS.EDAD} AS edad,
            p.${dict.COLUMNAS.GENERO} AS genero,
            p.${dict.COLUMNAS.ANTECEDENTES} AS antecedentes,
            r.${dict.COLUMNAS.ID_RADIOGRAFIA} AS id_radiografia,
            r.${dict.COLUMNAS.TIPO_PROYECCION} AS proyeccion,
            r.${dict.COLUMNAS.RUTA_IMAGEN} AS ruta_imagen,
            DATE_FORMAT(r.fecha_subida, '%Y-%m-%d') AS fecha_creacion,
            (SELECT COUNT(*) FROM ${dict.TABLAS.EVALUACIONES_ESTUDIANTES} ee WHERE ee.id_caso = c.id_caso) AS total_evaluaciones
        FROM ${dict.TABLAS.CASOS} c
        INNER JOIN ${dict.TABLAS.PACIENTES} p ON c.${dict.COLUMNAS.ID_PACIENTE} = p.${dict.COLUMNAS.ID_PACIENTE}
        LEFT JOIN ${dict.TABLAS.RADIOGRAFIAS} r ON c.${dict.COLUMNAS.ID_CASO} = r.${dict.COLUMNAS.ID_CASO}
        INNER JOIN ${dict.TABLAS.CURSOS} cs ON c.${dict.COLUMNAS.ID_CURSO} = cs.${dict.COLUMNAS.ID_CURSO}
        WHERE cs.${dict.COLUMNAS.ID_CATEDRATICO} = ?
        ORDER BY c.${dict.COLUMNAS.ID_CASO} DESC
    `;
    const [casos] = await pool.query(query, [id_catedratico]);
    return casos;
};

// 6. Obtener caso por ID
const obtenerDetalleCaso = async (id_caso) => {
    const query = `
        SELECT 
            c.${dict.COLUMNAS.ID_CASO} AS id,
            c.${dict.COLUMNAS.TITULO_CASO} AS titulo,
            c.${dict.COLUMNAS.MOTIVO_CONSULTA} AS motivo_consulta,
            c.${dict.COLUMNAS.NIVEL_DIFICULTAD} AS nivel_dificultad,
            p.${dict.COLUMNAS.ID_PACIENTE} AS id_paciente,
            p.${dict.COLUMNAS.CODIGO_PACIENTE} AS paciente,
            p.${dict.COLUMNAS.EDAD} AS edad,
            p.${dict.COLUMNAS.GENERO} AS genero,
            p.${dict.COLUMNAS.ANTECEDENTES} AS antecedentes,
            r.${dict.COLUMNAS.ID_RADIOGRAFIA} AS id_radiografia,
            r.${dict.COLUMNAS.TIPO_PROYECCION} AS proyeccion,
            r.${dict.COLUMNAS.RUTA_IMAGEN} AS ruta_imagen
        FROM ${dict.TABLAS.CASOS} c
        INNER JOIN ${dict.TABLAS.PACIENTES} p ON c.${dict.COLUMNAS.ID_PACIENTE} = p.${dict.COLUMNAS.ID_PACIENTE}
        LEFT JOIN ${dict.TABLAS.RADIOGRAFIAS} r ON c.${dict.COLUMNAS.ID_CASO} = r.${dict.COLUMNAS.ID_CASO}
        WHERE c.${dict.COLUMNAS.ID_CASO} = ?
    `;
    const [casos] = await pool.query(query, [id_caso]);
    if (casos.length === 0) throw new Error('Caso clínico no encontrado');
    return casos[0];
};

module.exports = {
    crearPaciente,
    crearCaso,
    guardarRadiografia,
    crearCasoCompleto,
    obtenerCasosDetallados,
    obtenerDetalleCaso
};
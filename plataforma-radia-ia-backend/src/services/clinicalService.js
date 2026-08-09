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

module.exports = {
    crearPaciente,
    crearCaso,
    guardarRadiografia
};
const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const registrarPaciente = async (bodyData) => {
    const { codigo_paciente, edad, genero, antecedentes_medicos } = bodyData;
    const connection = await pool.getConnection();
    try {
        const query = `
            INSERT INTO ${dict.TABLAS.PACIENTES} 
            (${dict.COLUMNAS.CODIGO_PACIENTE}, ${dict.COLUMNAS.EDAD}, ${dict.COLUMNAS.GENERO}, ${dict.COLUMNAS.ANTECEDENTES}) 
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [codigo_paciente, edad, genero, antecedentes_medicos]);
        connection.release();
        return { id_paciente: result.insertId, ...bodyData };
    } catch (error) {
        connection.release();
        throw error;
    }
};

const crearCaso = async (bodyData) => {
    const { id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad } = bodyData;
    const connection = await pool.getConnection();
    try {
        const query = `
            INSERT INTO ${dict.TABLAS.CASOS} 
            (${dict.COLUMNAS.ID_CURSO}, ${dict.COLUMNAS.ID_PACIENTE}, ${dict.COLUMNAS.TITULO_CASO}, ${dict.COLUMNAS.MOTIVO_CONSULTA}, ${dict.COLUMNAS.NIVEL_DIFICULTAD}) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad]);
        connection.release();
        return { id_caso: result.insertId, ...bodyData };
    } catch (error) {
        connection.release();
        throw error;
    }
};

const procesarSubidaRadiografia = async (fileData, bodyData) => {
    if (!fileData) {
        throw new Error("El sistema no detectó ninguna matriz de imagen adjunta.");
    }
    const { id_caso, tipo_proyeccion } = bodyData;
    const ruta_imagen = `/uploads/radiografias/${fileData.filename}`;
    
    const connection = await pool.getConnection();
    try {
        const query = `
            INSERT INTO ${dict.TABLAS.RADIOGRAFIAS} 
            (${dict.COLUMNAS.ID_CASO}, ${dict.COLUMNAS.TIPO_PROYECCION}, ${dict.COLUMNAS.RUTA_IMAGEN}) 
            VALUES (?, ?, ?)
        `;
        const [result] = await connection.query(query, [id_caso, tipo_proyeccion || 'Tórax PA', ruta_imagen]);
        connection.release();
        return {
            id_radiografia: result.insertId,
            ruta_imagen,
            tamano_bytes: fileData.size,
            formato: fileData.mimetype,
            fecha_procesamiento: new Date()
        };
    } catch (error) {
        connection.release();
        throw error;
    }
};

// Exportamos las 3 funciones para que el controlador las pueda usar
module.exports = {
    registrarPaciente,
    crearCaso,
    procesarSubidaRadiografia
};
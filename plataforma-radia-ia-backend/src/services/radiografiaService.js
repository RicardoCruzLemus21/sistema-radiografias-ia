const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const registrarPaciente = async (bodyData) => {
    const { codigo_paciente, edad, genero, antecedentes_medicos } = bodyData;
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.query('CALL sp_crear_paciente_simulado(?, ?, ?, ?)', [codigo_paciente, edad, genero, antecedentes_medicos]);
        connection.release();
        return { id_paciente: result[0][0].id_paciente, ...bodyData };
    } catch (error) {
        connection.release();
        throw error;
    }
};

const crearCaso = async (bodyData) => {
    const { id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad } = bodyData;
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.query('CALL sp_crear_caso_clinico(?, ?, ?, ?, ?)', [id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad]);
        connection.release();
        return { id_caso: result[0][0].id_caso, ...bodyData };
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
        const [result] = await connection.query('CALL sp_guardar_radiografia(?, ?, ?)', [id_caso, tipo_proyeccion || 'Tórax PA', ruta_imagen]);
        connection.release();
        return {
            id_radiografia: result[0][0].id_radiografia,
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
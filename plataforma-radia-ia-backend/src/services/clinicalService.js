const pool = require('../config/database');
const dict = require('../config/dbDictionary');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Crear el paciente simulado
const crearPaciente = async (datosPaciente) => {
    const { codigo_paciente, edad, genero, antecedentes_medicos } = datosPaciente;
    const [resultado] = await pool.query('CALL sp_crear_paciente_simulado(?, ?, ?, ?)', [codigo_paciente, edad, genero, antecedentes_medicos]);
    return { id_paciente: resultado[0][0].id_paciente, codigo_paciente };
};

// 2. Crear el caso clínico asociándolo al curso y al paciente
const crearCaso = async (datosCaso) => {
    const { id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad } = datosCaso;
    const [resultado] = await pool.query('CALL sp_crear_caso_clinico(?, ?, ?, ?, ?)', [id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad]);
    return { id_caso: resultado[0][0].id_caso, titulo_caso };
};

// 3. Guardar el registro de la radiografía en la BD
const guardarRadiografia = async (id_caso, tipo_proyeccion, ruta_imagen) => {
    const [resultado] = await pool.query('CALL sp_guardar_radiografia(?, ?, ?)', [id_caso, tipo_proyeccion, ruta_imagen]);
    return { id_radiografia: resultado[0][0].id_radiografia, id_caso, tipo_proyeccion, ruta_imagen };
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

    try {
        const [resultado] = await pool.query('CALL sp_crear_caso_completo(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            codigo_paciente, edad, genero, antecedentes_medicos,
            id_curso, id_catedratico, titulo_caso, motivo_consulta, nivel_dificultad,
            tipo_proyeccion, ruta_imagen
        ]);

        const ids = resultado[0][0];

        return {
            id_caso: ids.id_caso,
            id_paciente: ids.id_paciente,
            id_curso: ids.id_curso,
            id_radiografia: ids.id_radiografia,
            codigo_paciente,
            titulo_caso,
            tipo_proyeccion,
            ruta_imagen,
            mensaje: "Caso clínico y radiografía registrados exitosamente en la plataforma."
        };
    } catch (error) {
        throw error;
    }
};

// 5. Obtener todos los casos con información completa para gestión del catedrático
const obtenerCasosDetallados = async (id_catedratico) => {
    const [casos] = await pool.query('CALL sp_obtener_casos_detallados(?)', [id_catedratico]);
    return casos[0];
};

// 6. Obtener caso por ID
const obtenerDetalleCaso = async (id_caso) => {
    const [casos] = await pool.query('CALL sp_obtener_detalle_caso(?)', [id_caso]);
    if (casos[0].length === 0) throw new Error('Caso clínico no encontrado');
    return casos[0][0];
};

// 7. Obtener el siguiente código secuencial para Paciente
const obtenerSiguienteCodigoPaciente = async () => {
    // Buscar todos los códigos actuales que sigan el formato PAC-%
    const query = `
    const [rowsArray] = await pool.query('CALL sp_obtener_codigos_pacientes()');
    const rows = rowsArray[0];

    let maxNum = 0;
    for (const row of rows) {
        const numPart = row.codigo_paciente.replace('PAC-', '');
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    }

    const nextNum = maxNum + 1;
    return 'PAC-' + nextNum.toString().padStart(3, '0');
};

// 8. Editar Caso y Paciente
const editarCaso = async (id_caso, datos) => {
    try {
        const { titulo_caso, motivo_consulta, nivel_dificultad, id_paciente, edad, genero, antecedentes_medicos } = datos;
        await pool.query('CALL sp_editar_caso_paciente(?, ?, ?, ?, ?, ?, ?, ?)', [
            id_caso, titulo_caso, motivo_consulta, nivel_dificultad,
            id_paciente, edad, genero, antecedentes_medicos
        ]);
        return true;
    } catch (error) {
        throw error;
    }
};

// 9. Eliminar Caso
const eliminarCaso = async (id_caso) => {
    try {
        await pool.query('CALL sp_eliminar_caso(?)', [id_caso]);
        return true;
    } catch (error) {
        throw new Error('No se puede eliminar el caso porque ya tiene evaluaciones asociadas.');
    }
};

// 10. Generar Info de Patología con Gemini (HTTP directo para máxima compatibilidad)
const generarInfoPatologia = async (patologia) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("API Key de Gemini no configurada");

        // .trim() elimina cualquier \r, \n o espacios invisibles del .env
        const apiKey = process.env.GEMINI_API_KEY.trim();
        console.log(`[Gemini] Usando clave tipo: ${apiKey.substring(0, 6)}... (${apiKey.length} chars)`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;

        const prompt = `Actúa como un médico radiólogo experto y profesor universitario. Explica la patología radiológica: ${patologia}.
Devuelve tu respuesta estrictamente en formato JSON válido, en idioma español, con la siguiente estructura exacta:
{
  "definicion": "Descripción médica clara y profesional de la patología.",
  "fisiopatologia": "Breve explicación de cómo y por qué ocurre esta patología a nivel fisiológico o anatómico.",
  "signos_radiologicos": ["Signo radiológico 1", "Signo radiológico 2", "Signo radiológico 3 (Añade al menos 3 signos clave visibles en Rayos X)"],
  "presentacion_clinica": "Breve lista de los síntomas más comunes con los que se presenta el paciente.",
  "epidemiologia": "Información sobre qué tipo de pacientes suelen padecerla o factores de riesgo principales.",
  "diagnostico_diferencial": "Otras patologías que se ven similares en Rayos X y cómo distinguirlas de esta.",
  "dato_clave": "Una frase corta, mnemónico o perla clínica memorable para que un estudiante no olvide esta patología."
}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey   // Header oficial de Google para API Keys (standard y auth)
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini API HTTP Error:', response.status, errorBody);
            throw new Error(`Gemini API respondió con ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        return JSON.parse(responseText);
    } catch (error) {
        console.error('Error generando info con Gemini:', error);
        throw new Error('No se pudo generar la información de la patología con IA.');
    }
};

module.exports = {
    crearPaciente,
    crearCaso,
    guardarRadiografia,
    crearCasoCompleto,
    obtenerCasosDetallados,
    obtenerDetalleCaso,
    obtenerSiguienteCodigoPaciente,
    editarCaso,
    eliminarCaso,
    generarInfoPatologia
};
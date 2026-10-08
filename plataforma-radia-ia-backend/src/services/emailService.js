const nodemailer = require('nodemailer');
const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const obtenerConfigSmtp = async () => {
    const [rows] = await pool.query(`SELECT * FROM ${dict.TABLAS.CONFIG_CORREOS} WHERE activo = TRUE LIMIT 1`);
    return rows[0] || null;
};

const obtenerPlantilla = async (codigoEvento) => {
    const [rows] = await pool.query(`SELECT * FROM ${dict.TABLAS.PLANTILLAS_CORREOS} WHERE codigo_evento = ?`, [codigoEvento]);
    return rows[0] || null;
};

// Envío genérico: toma la configuración SMTP activa y la plantilla del evento (ambas en BD),
// reemplaza las variables {{clave}} del cuerpo y envía. Nunca lanza: un correo que falla no debe
// tumbar el registro ni ninguna otra operación que lo dispare.
const enviarCorreoEvento = async (codigoEvento, destinatario, variables) => {
    try {
        const smtpConfig = await obtenerConfigSmtp();
        if (!smtpConfig) {
            console.warn(`⚠️ No se pudo enviar el correo (${codigoEvento}): No hay configuración SMTP activa en la base de datos.`);
            return;
        }

        const plantilla = await obtenerPlantilla(codigoEvento);
        if (!plantilla) {
            console.warn(`⚠️ No se pudo enviar el correo: No existe la plantilla ${codigoEvento}.`);
            return;
        }

        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.puerto,
            secure: smtpConfig.seguridad === 'ssl' || smtpConfig.puerto === 465,
            auth: {
                user: smtpConfig.usuario_correo,
                pass: smtpConfig.contrasena_app
            }
        });

        let htmlFinal = plantilla.cuerpo_html;
        for (const [clave, valor] of Object.entries(variables)) {
            htmlFinal = htmlFinal.replace(new RegExp(`\\{\\{${clave}\\}\\}`, 'g'), valor);
        }

        const info = await transporter.sendMail({
            from: `"${smtpConfig.proveedor} Radia OS" <${smtpConfig.usuario_correo}>`,
            to: destinatario,
            subject: plantilla.asunto,
            html: htmlFinal
        });

        console.log(`✅ Correo (${codigoEvento}) enviado con éxito a:`, destinatario, 'MessageId:', info.messageId);
    } catch (error) {
        console.error(`❌ Error enviando correo (${codigoEvento}):`, error);
    }
};

// Alumno creado por el docente (con contraseña temporal que debe cambiar al entrar)
const enviarCorreoBienvenida = (email, nombreAlumno, nombreCatedratico, nombreCurso, contrasena, urlAcceso) =>
    enviarCorreoEvento('NUEVO_ALUMNO', email, {
        nombre_alumno: nombreAlumno, nombre_catedratico: nombreCatedratico, nombre_curso: nombreCurso,
        correo: email, contrasena, url_acceso: urlAcceso
    });

// Estudiante que se registró solo con el código de su docente (eligió su propia contraseña)
const enviarCorreoRegistroEstudiante = (email, nombreAlumno, nombreCatedratico, nombreCurso, urlAcceso) =>
    enviarCorreoEvento('REGISTRO_ESTUDIANTE', email, {
        nombre_alumno: nombreAlumno, nombre_catedratico: nombreCatedratico, nombre_curso: nombreCurso,
        correo: email, url_acceso: urlAcceso
    });

// Docente que se registró por sí mismo (incluye su código para compartir con sus estudiantes)
const enviarCorreoRegistroDocente = (email, nombreDocente, nombreCurso, codigoDocente, urlAcceso) =>
    enviarCorreoEvento('REGISTRO_DOCENTE', email, {
        nombre_docente: nombreDocente, nombre_curso: nombreCurso,
        correo: email, codigo_docente: codigoDocente, url_acceso: urlAcceso
    });

module.exports = {
    enviarCorreoBienvenida,
    enviarCorreoRegistroEstudiante,
    enviarCorreoRegistroDocente
};

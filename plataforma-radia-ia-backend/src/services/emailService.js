const nodemailer = require('nodemailer');
const pool = require('../config/database');
const dict = require('../config/dbDictionary');

const enviarCorreoBienvenida = async (email, nombreAlumno, nombreCatedratico, nombreCurso, contrasena, urlAcceso) => {
    try {
        // 1. Obtener la configuración de SMTP activa de la base de datos
        const [configRows] = await pool.query(
            `SELECT * FROM ${dict.TABLAS.CONFIG_CORREOS} WHERE activo = TRUE LIMIT 1`
        );

        if (configRows.length === 0) {
            console.warn('⚠️ No se pudo enviar el correo: No hay configuración SMTP activa en la base de datos.');
            return;
        }

        const smtpConfig = configRows[0];

        // 2. Obtener la plantilla del evento
        const [plantillas] = await pool.query(
            `SELECT * FROM ${dict.TABLAS.PLANTILLAS_CORREOS} WHERE codigo_evento = 'NUEVO_ALUMNO'`
        );

        if (plantillas.length === 0) {
            console.warn('⚠️ No se pudo enviar el correo: No existe la plantilla NUEVO_ALUMNO.');
            return;
        }

        const plantilla = plantillas[0];

        // 3. Crear el Transport de Nodemailer de forma dinámica
        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.puerto,
            secure: smtpConfig.seguridad === 'ssl' || smtpConfig.puerto === 465, // true para port 465, false para otros
            auth: {
                user: smtpConfig.usuario_correo,
                pass: smtpConfig.contrasena_app
            }
        });

        // 4. Reemplazar las variables dinámicas en el HTML
        let htmlFinal = plantilla.cuerpo_html;
        htmlFinal = htmlFinal.replace(/\{\{nombre_alumno\}\}/g, nombreAlumno);
        htmlFinal = htmlFinal.replace(/\{\{nombre_catedratico\}\}/g, nombreCatedratico);
        htmlFinal = htmlFinal.replace(/\{\{nombre_curso\}\}/g, nombreCurso);
        htmlFinal = htmlFinal.replace(/\{\{correo\}\}/g, email);
        htmlFinal = htmlFinal.replace(/\{\{contrasena\}\}/g, contrasena);
        htmlFinal = htmlFinal.replace(/\{\{url_acceso\}\}/g, urlAcceso);

        // 5. Enviar el correo
        const info = await transporter.sendMail({
            from: `"${smtpConfig.proveedor} Radia OS" <${smtpConfig.usuario_correo}>`,
            to: email,
            subject: plantilla.asunto,
            html: htmlFinal
        });

        console.log('✅ Correo dinámico enviado con éxito a:', email, 'MessageId:', info.messageId);

    } catch (error) {
        console.error('❌ Error enviando correo dinámico:', error);
    }
};

module.exports = {
    enviarCorreoBienvenida
};

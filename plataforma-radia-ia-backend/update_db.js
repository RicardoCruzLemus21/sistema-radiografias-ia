const pool = require('./src/config/database');

async function run() {
    try {
        await pool.query('ALTER TABLE Usuarios ADD COLUMN debe_cambiar_contrasena BOOLEAN DEFAULT FALSE;');
        console.log('Columna agregada.');
    } catch(e) {
        console.log('La columna ya existe o error:', e.message);
    }
    
    try {
        const html = `<div style="font-family: Arial; padding: 20px; background-color: #0b0e14; color: #ffffff;">
            <h2 style="color: #00e5ff;">Hola, {{nombre_alumno}}!</h2>
            <p>Has sido registrado exitosamente en la plataforma <b>Radia OS</b> por tu catedrático <b>{{nombre_catedratico}}</b>.</p>
            <p>Has sido asignado al curso: <b>{{nombre_curso}}</b>.</p>
            <p>Inicia sesión con tu correo: <b>{{correo}}</b> y la contraseña temporal: <b>{{contrasena}}</b></p>
            <br/>
            <a href="{{url_acceso}}" style="background-color:#00e5ff; color:#000; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:5px;">Acceder a Radia OS</a>
            <hr style="border: 1px solid #1f2937; margin-top:20px;" />
            <p style="font-size: 12px; color: #9ca3af;">Este es un mensaje automático, por favor no respondas.</p>
        </div>`;
        const vars = '{{nombre_alumno}}, {{nombre_catedratico}}, {{nombre_curso}}, {{correo}}, {{contrasena}}, {{url_acceso}}';
        
        await pool.query('UPDATE Plantillas_Correos SET cuerpo_html = ?, variables_soportadas = ? WHERE codigo_evento = ?', [html, vars, 'NUEVO_ALUMNO']);
        console.log('Plantilla actualizada.');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

run();

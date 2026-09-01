const pool = require('../src/config/database');

const sps = [
    {
        name: 'sp_verificar_correo_existe',
        query: `
            CREATE PROCEDURE sp_verificar_correo_existe(IN p_correo VARCHAR(255))
            BEGIN
                SELECT id_usuario FROM Usuarios WHERE correo_electronico = p_correo;
            END
        `
    },
    {
        name: 'sp_registrar_usuario',
        query: `
            CREATE PROCEDURE sp_registrar_usuario(
                IN p_id_rol INT,
                IN p_nombre_completo VARCHAR(150),
                IN p_correo_electronico VARCHAR(255),
                IN p_contrasena_hash VARCHAR(255),
                IN p_carnet VARCHAR(50)
            )
            BEGIN
                INSERT INTO Usuarios (id_rol, nombre_completo, correo_electronico, contrasena_hash, carnet, estado, debe_cambiar_contrasena)
                VALUES (p_id_rol, p_nombre_completo, p_correo_electronico, p_contrasena_hash, p_carnet, 'Activo', TRUE);
                
                SELECT LAST_INSERT_ID() AS id_usuario;
            END
        `
    },
    {
        name: 'sp_asignar_curso_inicial',
        query: `
            CREATE PROCEDURE sp_asignar_curso_inicial(
                IN p_id_catedratico INT,
                IN p_nombre_curso VARCHAR(150),
                IN p_anio INT
            )
            BEGIN
                INSERT INTO Cursos_Secciones (id_catedratico, nombre_curso, semestre, anio) 
                VALUES (p_id_catedratico, p_nombre_curso, 1, p_anio);
            END
        `
    },
    {
        name: 'sp_obtener_usuario_por_correo',
        query: `
            CREATE PROCEDURE sp_obtener_usuario_por_correo(IN p_correo VARCHAR(255))
            BEGIN
                SELECT u.id_usuario, u.id_rol, u.nombre_completo, u.correo_electronico, u.contrasena_hash, u.estado, u.debe_cambiar_contrasena, r.nombre_rol 
                FROM Usuarios u 
                INNER JOIN Roles r ON u.id_rol = r.id_rol 
                WHERE u.correo_electronico = p_correo;
            END
        `
    },
    {
        name: 'sp_registrar_auditoria_acceso',
        query: `
            CREATE PROCEDURE sp_registrar_auditoria_acceso(
                IN p_id_usuario INT,
                IN p_ip VARCHAR(50)
            )
            BEGIN
                INSERT INTO Auditoria_Accesos (id_usuario, direccion_ip) VALUES (p_id_usuario, p_ip);
            END
        `
    },
    {
        name: 'sp_cambiar_clave_inicial',
        query: `
            CREATE PROCEDURE sp_cambiar_clave_inicial(
                IN p_hash VARCHAR(255),
                IN p_id_usuario INT
            )
            BEGIN
                UPDATE Usuarios SET contrasena_hash = p_hash, debe_cambiar_contrasena = FALSE WHERE id_usuario = p_id_usuario;
            END
        `
    },
    {
        name: 'sp_obtener_roles',
        query: `
            CREATE PROCEDURE sp_obtener_roles()
            BEGIN
                SELECT id_rol, nombre_rol, descripcion FROM Roles;
            END
        `
    },
    {
        name: 'sp_obtener_lista_usuarios',
        query: `
            CREATE PROCEDURE sp_obtener_lista_usuarios()
            BEGIN
                SELECT u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico, r.nombre_rol, u.estado, u.fecha_registro 
                FROM Usuarios u 
                INNER JOIN Roles r ON u.id_rol = r.id_rol;
            END
        `
    },
    {
        name: 'sp_obtener_auditoria_accesos',
        query: `
            CREATE PROCEDURE sp_obtener_auditoria_accesos()
            BEGIN
                SELECT a.id_acceso, u.nombre_completo, a.fecha_hora_login, a.direccion_ip 
                FROM Auditoria_Accesos a
                INNER JOIN Usuarios u ON a.id_usuario = u.id_usuario
                ORDER BY a.fecha_hora_login DESC LIMIT 50;
            END
        `
    },
    {
        name: 'sp_registrar_auditoria_actividad',
        query: `
            CREATE PROCEDURE sp_registrar_auditoria_actividad(
                IN p_id_usuario INT,
                IN p_accion VARCHAR(50),
                IN p_detalle TEXT
            )
            BEGIN
                INSERT INTO Auditoria_Acciones (id_usuario, accion, detalle) 
                VALUES (p_id_usuario, p_accion, p_detalle);
                
                SELECT LAST_INSERT_ID() AS id_auditoria;
            END
        `
    },
    {
        name: 'sp_obtener_logs_actividad',
        query: `
            CREATE PROCEDURE sp_obtener_logs_actividad(IN p_limite INT)
            BEGIN
                SET @s = CONCAT('SELECT a.*, u.nombre_completo FROM Auditoria_Acciones a INNER JOIN Usuarios u ON a.id_usuario = u.id_usuario ORDER BY a.fecha_accion DESC LIMIT ', p_limite);
                PREPARE stmt FROM @s;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            END
        `
    }
];

async function migrarSps() {
    try {
        console.log('Iniciando migración de Stored Procedures del Módulo 1...');
        
        for (const sp of sps) {
            console.log('Creando ' + sp.name + '...');
            await pool.query('DROP PROCEDURE IF EXISTS ' + sp.name);
            await pool.query(sp.query);
            console.log('✅ ' + sp.name + ' creado correctamente.');
        }
        
        console.log('\n🎉 Migración del Módulo 1 completada con éxito.');
    } catch (error) {
        console.error('❌ Error al crear SPs:', error);
    } finally {
        process.exit();
    }
}

migrarSps();

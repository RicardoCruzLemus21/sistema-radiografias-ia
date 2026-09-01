const pool = require('../src/config/database');

const sps = [
    // === USER SERVICE SPS ===
    {
        name: 'sp_listar_usuarios_completos',
        query: `
            CREATE PROCEDURE sp_listar_usuarios_completos()
            BEGIN
                SELECT u.id_usuario AS id, u.carnet, u.nombre_completo AS nombre, u.correo_electronico AS email, 
                       u.id_rol, r.nombre_rol AS rol, c.nombre_curso, cat.nombre_completo AS nombre_catedratico,
                       cat.carnet AS carnet_catedratico, cat.correo_electronico AS correo_catedratico
                FROM Usuarios u
                INNER JOIN Roles r ON u.id_rol = r.id_rol
                LEFT JOIN Asignaciones_Estudiantes ae ON u.id_usuario = ae.id_estudiante
                LEFT JOIN Cursos_Secciones c ON ae.id_curso = c.id_curso
                LEFT JOIN Usuarios cat ON c.id_catedratico = cat.id_usuario;
            END
        `
    },
    {
        name: 'sp_editar_usuario_con_password',
        query: `
            CREATE PROCEDURE sp_editar_usuario_con_password(IN p_id INT, IN p_carnet VARCHAR(50), IN p_nombre VARCHAR(150), IN p_correo VARCHAR(255), IN p_hash VARCHAR(255), IN p_id_rol INT)
            BEGIN
                UPDATE Usuarios SET carnet = p_carnet, nombre_completo = p_nombre, correo_electronico = p_correo, contrasena_hash = p_hash, id_rol = p_id_rol WHERE id_usuario = p_id;
            END
        `
    },
    {
        name: 'sp_editar_usuario_sin_password',
        query: `
            CREATE PROCEDURE sp_editar_usuario_sin_password(IN p_id INT, IN p_carnet VARCHAR(50), IN p_nombre VARCHAR(150), IN p_correo VARCHAR(255), IN p_id_rol INT)
            BEGIN
                UPDATE Usuarios SET carnet = p_carnet, nombre_completo = p_nombre, correo_electronico = p_correo, id_rol = p_id_rol WHERE id_usuario = p_id;
            END
        `
    },
    {
        name: 'sp_eliminar_usuario',
        query: `
            CREATE PROCEDURE sp_eliminar_usuario(IN p_id INT)
            BEGIN
                DELETE FROM Usuarios WHERE id_usuario = p_id;
            END
        `
    },
    // === ACADEMIC SERVICE SPS ===
    {
        name: 'sp_crear_curso',
        query: `
            CREATE PROCEDURE sp_crear_curso(IN p_id_catedratico INT, IN p_nombre VARCHAR(150), IN p_semestre INT, IN p_anio INT)
            BEGIN
                INSERT INTO Cursos_Secciones (id_catedratico, nombre_curso, semestre, anio) VALUES (p_id_catedratico, p_nombre, p_semestre, p_anio);
                SELECT LAST_INSERT_ID() AS id_curso;
            END
        `
    },
    {
        name: 'sp_verificar_estudiante_curso',
        query: `
            CREATE PROCEDURE sp_verificar_estudiante_curso(IN p_id_curso INT, IN p_id_estudiante INT)
            BEGIN
                SELECT id_asignacion FROM Asignaciones_Estudiantes WHERE id_curso = p_id_curso AND id_estudiante = p_id_estudiante;
            END
        `
    },
    {
        name: 'sp_asignar_estudiante_curso',
        query: `
            CREATE PROCEDURE sp_asignar_estudiante_curso(IN p_id_curso INT, IN p_id_estudiante INT)
            BEGIN
                INSERT INTO Asignaciones_Estudiantes (id_curso, id_estudiante) VALUES (p_id_curso, p_id_estudiante);
                SELECT LAST_INSERT_ID() AS id_asignacion;
            END
        `
    },
    {
        name: 'sp_obtener_info_correo_asignacion',
        query: `
            CREATE PROCEDURE sp_obtener_info_correo_asignacion(IN p_id_curso INT, IN p_id_estudiante INT)
            BEGIN
                SELECT u.nombre_completo AS nombre_alumno, u.correo_electronico AS correo, c.nombre_curso, cat.nombre_completo AS nombre_catedratico
                FROM Usuarios u
                JOIN Cursos_Secciones c ON c.id_curso = p_id_curso
                JOIN Usuarios cat ON c.id_catedratico = cat.id_usuario
                WHERE u.id_usuario = p_id_estudiante;
            END
        `
    },
    {
        name: 'sp_obtener_cursos_catedratico',
        query: `
            CREATE PROCEDURE sp_obtener_cursos_catedratico(IN p_id_catedratico INT)
            BEGIN
                SELECT id_curso, nombre_curso, semestre, anio FROM Cursos_Secciones WHERE id_catedratico = p_id_catedratico;
            END
        `
    },
    {
        name: 'sp_obtener_catalogo_cursos',
        query: `
            CREATE PROCEDURE sp_obtener_catalogo_cursos()
            BEGIN
                SELECT * FROM Catalogo_Cursos_Globales;
            END
        `
    },
    {
        name: 'sp_obtener_estudiantes_por_curso',
        query: `
            CREATE PROCEDURE sp_obtener_estudiantes_por_curso(IN p_id_curso INT)
            BEGIN
                SELECT u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico 
                FROM Asignaciones_Estudiantes ae
                INNER JOIN Usuarios u ON ae.id_estudiante = u.id_usuario
                WHERE ae.id_curso = p_id_curso;
            END
        `
    },
    {
        name: 'sp_obtener_estadisticas_curso',
        query: `
            CREATE PROCEDURE sp_obtener_estadisticas_curso(IN p_id_curso INT)
            BEGIN
                SELECT u.nombre_completo, e.total_casos_resueltos AS total_casos, e.precision_promedio, e.ultima_actualizacion
                FROM Asignaciones_Estudiantes a
                INNER JOIN Estadisticas_Dashboard e ON a.id_estudiante = e.id_estudiante
                INNER JOIN Usuarios u ON a.id_estudiante = u.id_usuario
                WHERE a.id_curso = p_id_curso;
            END
        `
    },
    {
        name: 'sp_obtener_total_casos_catedratico',
        query: `
            CREATE PROCEDURE sp_obtener_total_casos_catedratico(IN p_id_catedratico INT)
            BEGIN
                SELECT COUNT(*) AS totalCasos 
                FROM Casos_Clinicos c
                INNER JOIN Cursos_Secciones cs ON c.id_curso = cs.id_curso
                WHERE cs.id_catedratico = p_id_catedratico;
            END
        `
    },
    {
        name: 'sp_obtener_estudiantes_resumen_catedratico',
        query: `
            CREATE PROCEDURE sp_obtener_estudiantes_resumen_catedratico(IN p_id_catedratico INT)
            BEGIN
                SELECT u.id_usuario AS id, u.carnet, u.nombre_completo AS nombre, u.correo_electronico AS correo,
                (
                    SELECT COUNT(DISTINCT ee.id_caso) 
                    FROM Evaluaciones_Estudiantes ee 
                    INNER JOIN Casos_Clinicos c2 ON ee.id_caso = c2.id_caso
                    INNER JOIN Cursos_Secciones cs2 ON c2.id_curso = cs2.id_curso
                    WHERE ee.id_estudiante = u.id_usuario AND cs2.id_catedratico = p_id_catedratico
                ) AS casosResueltos,
                (
                    SELECT ROUND(AVG(cd.porcentaje_concordancia), 2)
                    FROM Concordancia_NLP cd
                    INNER JOIN Evaluaciones_Estudiantes ee ON cd.id_evaluacion = ee.id_evaluacion
                    INNER JOIN Casos_Clinicos c2 ON ee.id_caso = c2.id_caso
                    INNER JOIN Cursos_Secciones cs2 ON c2.id_curso = cs2.id_curso
                    WHERE ee.id_estudiante = u.id_usuario AND cs2.id_catedratico = p_id_catedratico
                ) AS precision_promedio
                FROM Usuarios u
                INNER JOIN Roles r ON u.id_rol = r.id_rol
                INNER JOIN Asignaciones_Estudiantes ae ON u.id_usuario = ae.id_estudiante
                INNER JOIN Cursos_Secciones cs ON ae.id_curso = cs.id_curso
                WHERE LOWER(r.nombre_rol) LIKE '%estud%' AND cs.id_catedratico = p_id_catedratico
                GROUP BY u.id_usuario;
            END
        `
    },
    {
        name: 'sp_obtener_detalle_estudiante_usuario',
        query: `
            CREATE PROCEDURE sp_obtener_detalle_estudiante_usuario(IN p_id INT)
            BEGIN
                SELECT id_usuario, nombre_completo, correo_electronico, fecha_registro FROM Usuarios WHERE id_usuario = p_id;
            END
        `
    },
    {
        name: 'sp_obtener_detalle_estudiante_evaluaciones',
        query: `
            CREATE PROCEDURE sp_obtener_detalle_estudiante_evaluaciones(IN p_id INT)
            BEGIN
                SELECT ee.id_evaluacion, c.id_caso, c.titulo_caso, c.nivel_dificultad, ee.tiempo_analisis_segundos, ee.justificacion_clinica, ee.fecha_evaluacion,
                COALESCE(cd.porcentaje_concordancia, 0) AS concordancia_ia, COALESCE(cd.nivel_precision, 'Pendiente') AS nivel_precision,
                (
                    SELECT GROUP_CONCAT(cp.nombre_patologia SEPARATOR ', ')
                    FROM Detalle_Hallazgos dh
                    INNER JOIN Catalogo_Patologias cp ON dh.id_patologia = cp.id_patologia
                    WHERE dh.id_evaluacion = ee.id_evaluacion
                ) AS hallazgos_seleccionados
                FROM Evaluaciones_Estudiantes ee
                INNER JOIN Casos_Clinicos c ON ee.id_caso = c.id_caso
                LEFT JOIN Concordancia_NLP cd ON ee.id_evaluacion = cd.id_evaluacion
                WHERE ee.id_estudiante = p_id
                ORDER BY ee.fecha_evaluacion DESC;
            END
        `
    },
    {
        name: 'sp_editar_estudiante_basico',
        query: `
            CREATE PROCEDURE sp_editar_estudiante_basico(IN p_id INT, IN p_nombre VARCHAR(150), IN p_correo VARCHAR(255))
            BEGIN
                UPDATE Usuarios SET nombre_completo = p_nombre, correo_electronico = p_correo WHERE id_usuario = p_id;
            END
        `
    },
    {
        name: 'sp_eliminar_estudiante_curso',
        query: `
            CREATE PROCEDURE sp_eliminar_estudiante_curso(IN p_id_estudiante INT, IN p_id_catedratico INT)
            BEGIN
                DELETE ae FROM Asignaciones_Estudiantes ae
                INNER JOIN Cursos_Secciones cs ON ae.id_curso = cs.id_curso
                WHERE ae.id_estudiante = p_id_estudiante AND cs.id_catedratico = p_id_catedratico;
                
                SELECT ROW_COUNT() AS affectedRows;
            END
        `
    },
    {
        name: 'sp_obtener_mi_rendimiento_estadisticas',
        query: `
            CREATE PROCEDURE sp_obtener_mi_rendimiento_estadisticas(IN p_id INT)
            BEGIN
                SELECT COUNT(DISTINCT ee.id_caso) AS total_casos, ROUND(AVG(cd.porcentaje_concordancia), 2) AS precision_promedio
                FROM Evaluaciones_Estudiantes ee
                LEFT JOIN Concordancia_NLP cd ON ee.id_evaluacion = cd.id_evaluacion
                WHERE ee.id_estudiante = p_id;
            END
        `
    },
    {
        name: 'sp_editar_curso',
        query: `
            CREATE PROCEDURE sp_editar_curso(IN p_id INT, IN p_nombre VARCHAR(150), IN p_semestre INT, IN p_anio INT)
            BEGIN
                UPDATE Cursos_Secciones SET nombre_curso = p_nombre, semestre = p_semestre, anio = p_anio WHERE id_curso = p_id;
            END
        `
    },
    {
        name: 'sp_eliminar_curso',
        query: `
            CREATE PROCEDURE sp_eliminar_curso(IN p_id INT, IN p_id_catedratico INT)
            BEGIN
                DELETE FROM Cursos_Secciones WHERE id_curso = p_id AND id_catedratico = p_id_catedratico;
                SELECT ROW_COUNT() AS affectedRows;
            END
        `
    }
];

async function migrarSps() {
    try {
        console.log('Iniciando migración de SPs del Módulo 2...');
        for (const sp of sps) {
            console.log('Creando ' + sp.name + '...');
            await pool.query('DROP PROCEDURE IF EXISTS ' + sp.name);
            await pool.query(sp.query);
            console.log('✅ ' + sp.name + ' creado.');
        }
        console.log('\\n🎉 Migración completada.');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}
migrarSps();

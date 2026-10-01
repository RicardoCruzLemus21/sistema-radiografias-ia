-- Migracion: corrige nombres de tablas en mayusculas dentro de procedimientos
-- almacenados (ej. FROM Usuarios -> FROM usuarios). Necesario porque MySQL en Linux
-- (Railway) es sensible a mayusculas en nombres de tabla; MariaDB/Windows (XAMPP) no lo es,
-- por eso el bug nunca aparecio en local. Generado automaticamente, no editar a mano.
DELIMITER ;;
DROP PROCEDURE IF EXISTS `sp_agregar_feedback_evaluacion`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_agregar_feedback_evaluacion`(IN p_id INT, IN p_feedback TEXT)
BEGIN
                UPDATE evaluaciones_estudiantes SET feedback_profesor = p_feedback WHERE id_evaluacion = p_id;
            END ;;
DROP PROCEDURE IF EXISTS `sp_asignar_codigo_docente`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_asignar_codigo_docente`(IN p_id_usuario INT, IN p_codigo VARCHAR(10))
BEGIN
        UPDATE usuarios SET codigo_docente = p_codigo WHERE id_usuario = p_id_usuario AND id_rol = 1;
        SELECT ROW_COUNT() AS filas;
    END ;;
DROP PROCEDURE IF EXISTS `sp_asignar_curso_inicial`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_asignar_curso_inicial`(
                IN p_id_catedratico INT,
                IN p_nombre_curso VARCHAR(150),
                IN p_anio INT
            )
BEGIN
                INSERT INTO cursos_secciones (id_catedratico, nombre_curso, semestre, anio) 
                VALUES (p_id_catedratico, p_nombre_curso, 1, p_anio);
            END ;;
DROP PROCEDURE IF EXISTS `sp_asignar_estudiante_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_asignar_estudiante_curso`(IN p_id_curso INT, IN p_id_estudiante INT)
BEGIN
                INSERT INTO asignaciones_estudiantes (id_curso, id_estudiante) VALUES (p_id_curso, p_id_estudiante);
                SELECT LAST_INSERT_ID() AS id_asignacion;
            END ;;
DROP PROCEDURE IF EXISTS `sp_cambiar_clave_inicial`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cambiar_clave_inicial`(
                IN p_hash VARCHAR(255),
                IN p_id_usuario INT
            )
BEGIN
                UPDATE usuarios SET contrasena_hash = p_hash, debe_cambiar_contrasena = FALSE WHERE id_usuario = p_id_usuario;
            END ;;
DROP PROCEDURE IF EXISTS `sp_clonar_caso_a_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_clonar_caso_a_curso`(IN p_id_curso INT, IN p_id_caso_origen INT, IN p_id_ejercicio INT)
BEGIN
        DECLARE v_titulo VARCHAR(255);
        DECLARE v_motivo TEXT;
        DECLARE v_nivel VARCHAR(20);
        DECLARE v_hallazgos LONGTEXT;
        DECLARE v_ruta_imagen VARCHAR(255);
        DECLARE v_tipo_proyeccion VARCHAR(100);
        DECLARE v_nuevo_id_caso INT DEFAULT NULL;
        IF EXISTS (
            SELECT 1 FROM casos_clinicos c JOIN radiografias r ON r.id_caso = c.id_caso
            WHERE c.id_caso = p_id_caso_origen AND c.origen = 'nih' AND c.id_curso IS NULL AND c.estado = 'disponible'
              AND NOT EXISTS (
                SELECT 1 FROM casos_clinicos cx JOIN radiografias rx ON rx.id_caso = cx.id_caso
                WHERE cx.id_curso = p_id_curso AND rx.ruta_imagen = r.ruta_imagen)
        ) THEN
            SELECT titulo_caso, motivo_consulta, nivel_dificultad, hallazgos_docente
              INTO v_titulo, v_motivo, v_nivel, v_hallazgos
            FROM casos_clinicos WHERE id_caso = p_id_caso_origen;
            INSERT INTO casos_clinicos (id_curso, id_ejercicio, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad, origen, estado, hallazgos_docente)
            VALUES (p_id_curso, p_id_ejercicio, NULL, v_titulo, v_motivo, v_nivel, 'nih', 'disponible', v_hallazgos);
            SET v_nuevo_id_caso = LAST_INSERT_ID();
            SELECT ruta_imagen, tipo_proyeccion INTO v_ruta_imagen, v_tipo_proyeccion
            FROM radiografias WHERE id_caso = p_id_caso_origen LIMIT 1;
            INSERT INTO radiografias (id_caso, ruta_imagen, tipo_proyeccion)
            VALUES (v_nuevo_id_caso, v_ruta_imagen, v_tipo_proyeccion);
        END IF;
        SELECT v_nuevo_id_caso AS nuevo_id_caso;
    END ;;
DROP PROCEDURE IF EXISTS `sp_crear_caso_clinico`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_caso_clinico`(IN p_id_curso INT, IN p_id_paciente INT, IN p_titulo VARCHAR(150), IN p_motivo TEXT, IN p_nivel VARCHAR(50))
BEGIN
                INSERT INTO casos_clinicos (id_curso, id_paciente, titulo_caso, motivo_consulta, nivel_dificultad) 
                VALUES (p_id_curso, p_id_paciente, p_titulo, p_motivo, p_nivel);
                SELECT LAST_INSERT_ID() AS id_caso;
            END ;;
DROP PROCEDURE IF EXISTS `sp_crear_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_curso`(IN p_id_catedratico INT, IN p_nombre VARCHAR(150), IN p_semestre VARCHAR(20), IN p_anio INT)
BEGIN
        INSERT INTO cursos_secciones (id_catedratico, nombre_curso, semestre, anio) VALUES (p_id_catedratico, p_nombre, p_semestre, p_anio);
        SELECT LAST_INSERT_ID() AS id_curso;
    END ;;
DROP PROCEDURE IF EXISTS `sp_crear_curso_catalogo`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_curso_catalogo`(IN p_nombre VARCHAR(150))
BEGIN
        INSERT IGNORE INTO catalogo_cursos (nombre_curso) VALUES (TRIM(p_nombre));
        SELECT id_curso_catalogo, nombre_curso FROM catalogo_cursos WHERE nombre_curso = TRIM(p_nombre) LIMIT 1;
    END ;;
DROP PROCEDURE IF EXISTS `sp_crear_ejercicio`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_ejercicio`(IN p_id_curso INT)
BEGIN
        DECLARE v_numero INT;
        SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero FROM ejercicios WHERE id_curso = p_id_curso FOR UPDATE;
        INSERT INTO ejercicios (id_curso, numero, nombre) VALUES (p_id_curso, v_numero, CONCAT('Ejercicio ', v_numero));
        SELECT LAST_INSERT_ID() AS id_ejercicio, CONCAT('Ejercicio ', v_numero) AS nombre;
    END ;;
DROP PROCEDURE IF EXISTS `sp_crear_evaluacion_cabecera`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_evaluacion_cabecera`(IN p_id_caso INT, IN p_id_estudiante INT, IN p_tiempo INT, IN p_justificacion TEXT)
BEGIN
                INSERT INTO evaluaciones_estudiantes (id_caso, id_estudiante, tiempo_analisis_segundos, justificacion_clinica) 
                VALUES (p_id_caso, p_id_estudiante, p_tiempo, p_justificacion);
                SELECT LAST_INSERT_ID() AS id_evaluacion;
            END ;;
DROP PROCEDURE IF EXISTS `sp_editar_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_editar_curso`(IN p_id INT, IN p_nombre VARCHAR(150), IN p_semestre VARCHAR(20), IN p_anio INT)
BEGIN
        UPDATE cursos_secciones SET nombre_curso = p_nombre, semestre = p_semestre, anio = p_anio WHERE id_curso = p_id;
    END ;;
DROP PROCEDURE IF EXISTS `sp_editar_estudiante_basico`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_editar_estudiante_basico`(IN p_id INT, IN p_nombre VARCHAR(150), IN p_correo VARCHAR(255))
BEGIN
                UPDATE usuarios SET nombre_completo = p_nombre, correo_electronico = p_correo WHERE id_usuario = p_id;
            END ;;
DROP PROCEDURE IF EXISTS `sp_editar_usuario_con_password`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_editar_usuario_con_password`(IN p_id INT, IN p_carnet VARCHAR(50), IN p_nombre VARCHAR(150), IN p_correo VARCHAR(255), IN p_hash VARCHAR(255), IN p_id_rol INT)
BEGIN
                UPDATE usuarios SET carnet = p_carnet, nombre_completo = p_nombre, correo_electronico = p_correo, contrasena_hash = p_hash, id_rol = p_id_rol WHERE id_usuario = p_id;
            END ;;
DROP PROCEDURE IF EXISTS `sp_editar_usuario_sin_password`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_editar_usuario_sin_password`(IN p_id INT, IN p_carnet VARCHAR(50), IN p_nombre VARCHAR(150), IN p_correo VARCHAR(255), IN p_id_rol INT)
BEGIN
                UPDATE usuarios SET carnet = p_carnet, nombre_completo = p_nombre, correo_electronico = p_correo, id_rol = p_id_rol WHERE id_usuario = p_id;
            END ;;
DROP PROCEDURE IF EXISTS `sp_eliminar_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_curso`(IN p_id INT, IN p_id_catedratico INT)
BEGIN
                DELETE FROM cursos_secciones WHERE id_curso = p_id AND id_catedratico = p_id_catedratico;
                SELECT ROW_COUNT() AS affectedRows;
            END ;;
DROP PROCEDURE IF EXISTS `sp_eliminar_ejercicio`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_ejercicio`(IN p_id_ejercicio INT, IN p_id_catedratico INT)
BEGIN
        DECLARE v_casos INT DEFAULT 0;
        IF EXISTS (
            SELECT 1 FROM ejercicios e JOIN cursos_secciones cs ON cs.id_curso = e.id_curso
            WHERE e.id_ejercicio = p_id_ejercicio AND cs.id_catedratico = p_id_catedratico
        ) THEN
            SELECT COUNT(*) INTO v_casos FROM casos_clinicos WHERE id_ejercicio = p_id_ejercicio;
            DELETE l FROM localizacion_lesiones_estudiante l
            INNER JOIN detalle_hallazgos_estudiante d ON l.id_detalle_hallazgo = d.id_detalle_hallazgo
            INNER JOIN evaluaciones_estudiantes e ON d.id_evaluacion = e.id_evaluacion
            INNER JOIN casos_clinicos c ON c.id_caso = e.id_caso
            WHERE c.id_ejercicio = p_id_ejercicio;
            DELETE d FROM detalle_hallazgos_estudiante d
            INNER JOIN evaluaciones_estudiantes e ON d.id_evaluacion = e.id_evaluacion
            INNER JOIN casos_clinicos c ON c.id_caso = e.id_caso
            WHERE c.id_ejercicio = p_id_ejercicio;
            DELETE e FROM evaluaciones_estudiantes e
            INNER JOIN casos_clinicos c ON c.id_caso = e.id_caso
            WHERE c.id_ejercicio = p_id_ejercicio;
            DELETE r FROM radiografias r
            INNER JOIN casos_clinicos c ON c.id_caso = r.id_caso
            WHERE c.id_ejercicio = p_id_ejercicio;
            DELETE FROM casos_clinicos WHERE id_ejercicio = p_id_ejercicio;
            DELETE FROM ejercicios WHERE id_ejercicio = p_id_ejercicio;
        END IF;
        SELECT v_casos AS casos_eliminados;
    END ;;
DROP PROCEDURE IF EXISTS `sp_eliminar_estudiante_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_estudiante_curso`(IN p_id_estudiante INT, IN p_id_catedratico INT)
BEGIN
                DELETE ae FROM asignaciones_estudiantes ae
                INNER JOIN cursos_secciones cs ON ae.id_curso = cs.id_curso
                WHERE ae.id_estudiante = p_id_estudiante AND cs.id_catedratico = p_id_catedratico;
                SELECT ROW_COUNT() AS affectedRows;
            END ;;
DROP PROCEDURE IF EXISTS `sp_eliminar_notificacion`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_notificacion`(IN p_id_notificacion INT, IN p_id_usuario INT)
BEGIN
            DELETE FROM notificaciones WHERE id_notificacion = p_id_notificacion AND id_usuario_destino = p_id_usuario;
            SELECT ROW_COUNT() AS filas;
        END ;;
DROP PROCEDURE IF EXISTS `sp_eliminar_usuario`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_usuario`(IN p_id INT)
BEGIN
                DELETE FROM usuarios WHERE id_usuario = p_id;
            END ;;
DROP PROCEDURE IF EXISTS `sp_guardar_radiografia`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_guardar_radiografia`(IN p_id_caso INT, IN p_proyeccion VARCHAR(50), IN p_ruta VARCHAR(255))
BEGIN
                INSERT INTO radiografias (id_caso, tipo_proyeccion, ruta_imagen) 
                VALUES (p_id_caso, p_proyeccion, p_ruta);
                SELECT LAST_INSERT_ID() AS id_radiografia;
            END ;;
DROP PROCEDURE IF EXISTS `sp_invalidar_evaluacion`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_invalidar_evaluacion`(IN p_id INT)
BEGIN
                DELETE FROM evaluaciones_estudiantes WHERE id_evaluacion = p_id;
            END ;;
DROP PROCEDURE IF EXISTS `sp_listar_usuarios_completos`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_listar_usuarios_completos`()
BEGIN
                SELECT u.id_usuario AS id, u.carnet, u.nombre_completo AS nombre, u.correo_electronico AS email, 
                       u.id_rol, r.nombre_rol AS rol, c.nombre_curso, cat.nombre_completo AS nombre_catedratico,
                       cat.carnet AS carnet_catedratico, cat.correo_electronico AS correo_catedratico
                FROM usuarios u
                INNER JOIN roles r ON u.id_rol = r.id_rol
                LEFT JOIN asignaciones_estudiantes ae ON u.id_usuario = ae.id_estudiante
                LEFT JOIN cursos_secciones c ON ae.id_curso = c.id_curso
                LEFT JOIN usuarios cat ON c.id_catedratico = cat.id_usuario;
            END ;;
DROP PROCEDURE IF EXISTS `sp_marcar_clave_definitiva`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_marcar_clave_definitiva`(IN p_id_usuario INT)
BEGIN
            UPDATE usuarios SET debe_cambiar_contrasena = FALSE WHERE id_usuario = p_id_usuario;
        END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_auditoria_accesos`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_auditoria_accesos`()
BEGIN
                SELECT a.id_acceso, u.nombre_completo, a.fecha_hora_login, a.direccion_ip 
                FROM auditoria_accesos a
                INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
                ORDER BY a.fecha_hora_login DESC LIMIT 50;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_caso_estudiante_raw`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_caso_estudiante_raw`(IN p_id_caso INT)
BEGIN
        SELECT c.id_caso, c.titulo_caso, c.motivo_consulta, c.nivel_dificultad, r.ruta_imagen, c.hallazgos_docente
        FROM casos_clinicos c
        JOIN radiografias r ON c.id_caso = r.id_caso
        WHERE c.id_caso = p_id_caso;
    END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_catalogo_cuestionarios`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_catalogo_cuestionarios`()
BEGIN
                SELECT * FROM cuestionarios_percepcion;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_catalogo_patologias`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_catalogo_patologias`()
BEGIN
                SELECT * FROM catalogo_patologias;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_catalogo_regiones`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_catalogo_regiones`()
BEGIN
                SELECT * FROM regiones_anatomicas;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_codigo_docente`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_codigo_docente`(IN p_id_usuario INT)
BEGIN
        SELECT codigo_docente FROM usuarios WHERE id_usuario = p_id_usuario AND id_rol = 1;
    END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_cursos_catedratico`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_cursos_catedratico`(IN p_id_catedratico INT)
BEGIN
                SELECT id_curso, nombre_curso, semestre, anio FROM cursos_secciones WHERE id_catedratico = p_id_catedratico;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_detalle_estudiante_usuario`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_detalle_estudiante_usuario`(IN p_id INT)
BEGIN
                SELECT id_usuario, nombre_completo, correo_electronico, fecha_registro FROM usuarios WHERE id_usuario = p_id;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_docente_por_codigo`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_docente_por_codigo`(IN p_codigo VARCHAR(10))
BEGIN
        SELECT u.id_usuario, u.nombre_completo, cs.id_curso, cs.nombre_curso, cs.semestre, cs.anio
        FROM usuarios u
        LEFT JOIN cursos_secciones cs ON cs.id_catedratico = u.id_usuario
        WHERE u.codigo_docente = p_codigo AND u.id_rol = 1 AND u.estado = 'Activo'
        ORDER BY cs.anio DESC, cs.id_curso;
    END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_estudiantes_por_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_estudiantes_por_curso`(IN p_id_curso INT)
BEGIN
                SELECT u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico 
                FROM asignaciones_estudiantes ae
                INNER JOIN usuarios u ON ae.id_estudiante = u.id_usuario
                WHERE ae.id_curso = p_id_curso;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_evaluaciones_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_evaluaciones_curso`(IN p_id_curso INT)
BEGIN
                SELECT e.id_evaluacion AS id, u.nombre_completo AS estudiante, c.titulo_caso AS caso, 
                       e.fecha_evaluacion AS fecha, e.justificacion_clinica AS justificacion, e.feedback_profesor
                FROM evaluaciones_estudiantes e
                INNER JOIN usuarios u ON e.id_estudiante = u.id_usuario
                INNER JOIN casos_clinicos c ON e.id_caso = c.id_caso
                WHERE c.id_curso = p_id_curso
                ORDER BY e.fecha_evaluacion DESC;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_info_correo_asignacion`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_info_correo_asignacion`(IN p_id_curso INT, IN p_id_estudiante INT)
BEGIN
                SELECT u.nombre_completo AS nombre_alumno, u.correo_electronico AS correo, c.nombre_curso, cat.nombre_completo AS nombre_catedratico
                FROM usuarios u
                JOIN cursos_secciones c ON c.id_curso = p_id_curso
                JOIN usuarios cat ON c.id_catedratico = cat.id_usuario
                WHERE u.id_usuario = p_id_estudiante;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_lista_usuarios`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_lista_usuarios`()
BEGIN
                SELECT u.id_usuario, u.carnet, u.nombre_completo, u.correo_electronico, r.nombre_rol, u.estado, u.fecha_registro 
                FROM usuarios u 
                INNER JOIN roles r ON u.id_rol = r.id_rol;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_logs_actividad`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_logs_actividad`(IN p_limite INT)
BEGIN
                SET @s = CONCAT('SELECT a.*, u.nombre_completo FROM auditoria_acciones a INNER JOIN usuarios u ON a.id_usuario = u.id_usuario ORDER BY a.fecha_accion DESC LIMIT ', p_limite);
                PREPARE stmt FROM @s;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_metricas_modelo`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_metricas_modelo`()
BEGIN
        SELECT p.nombre_patologia, m.auc, m.localizacion_pct, m.precision_valor, m.se_abstiene_siempre, m.nota_clinica
        FROM metricas_modelo_patologia m
        JOIN catalogo_patologias p ON m.id_patologia = p.id_patologia
        ORDER BY m.auc DESC;
    END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_nombres_cursos_disponibles`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_nombres_cursos_disponibles`()
BEGIN
        SELECT nombre_curso FROM catalogo_cursos
        UNION
        SELECT nombre_curso FROM cursos_secciones
        ORDER BY nombre_curso;
    END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_resumen_estudiante_edu`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_resumen_estudiante_edu`(IN p_id_estudiante INT)
BEGIN
        SELECT COALESCE(SUM(g.casos), 0) AS casos_resueltos, COALESCE(ROUND(AVG(g.prom_ej), 1), 0) AS precision_promedio
        FROM (
    SELECT ee.id_estudiante, COALESCE(cc.id_ejercicio, 0) AS grupo,
           ROUND(AVG(ee.eje1_diagnostico)) AS prom_ej, COUNT(*) AS casos
    FROM evaluaciones_estudiantes ee
    INNER JOIN casos_clinicos cc ON cc.id_caso = ee.id_caso
    WHERE ee.id_evaluacion = (SELECT MAX(e2.id_evaluacion) FROM evaluaciones_estudiantes e2
                              WHERE e2.id_estudiante = ee.id_estudiante AND e2.id_caso = ee.id_caso)
    AND ee.id_estudiante = p_id_estudiante
    GROUP BY ee.id_estudiante, COALESCE(cc.id_ejercicio, 0)) g;
        SELECT c.nivel_dificultad, COUNT(*) AS total, ROUND(AVG(e.eje1_diagnostico)) AS precision_promedio
        FROM evaluaciones_estudiantes e
        JOIN casos_clinicos c ON e.id_caso = c.id_caso
        WHERE e.id_estudiante = p_id_estudiante
          AND e.id_evaluacion = (SELECT MAX(e3.id_evaluacion) FROM evaluaciones_estudiantes e3 WHERE e3.id_estudiante = e.id_estudiante AND e3.id_caso = e.id_caso)
        GROUP BY c.nivel_dificultad;
    END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_roles`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_roles`()
BEGIN
                SELECT id_rol, nombre_rol, descripcion FROM roles;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_ruta_radiografia`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_ruta_radiografia`(IN p_id INT)
BEGIN
                SELECT ruta_imagen FROM radiografias WHERE id_radiografia = p_id;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_todas_evaluaciones`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_todas_evaluaciones`()
BEGIN
                SELECT e.id_evaluacion AS id, u.nombre_completo AS estudiante, c.titulo_caso AS caso, 
                       e.fecha_evaluacion AS fecha, e.justificacion_clinica AS justificacion, e.feedback_profesor
                FROM evaluaciones_estudiantes e
                INNER JOIN usuarios u ON e.id_estudiante = u.id_usuario
                INNER JOIN casos_clinicos c ON e.id_caso = c.id_caso
                ORDER BY e.fecha_evaluacion DESC;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_total_casos_catedratico`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_total_casos_catedratico`(IN p_id_catedratico INT)
BEGIN
                SELECT COUNT(*) AS totalCasos 
                FROM casos_clinicos c
                INNER JOIN cursos_secciones cs ON c.id_curso = cs.id_curso
                WHERE cs.id_catedratico = p_id_catedratico;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_usuario_por_correo`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_usuario_por_correo`(IN p_correo VARCHAR(255))
BEGIN
                SELECT u.id_usuario, u.id_rol, u.nombre_completo, u.correo_electronico, u.contrasena_hash, u.estado, u.debe_cambiar_contrasena, r.nombre_rol 
                FROM usuarios u 
                INNER JOIN roles r ON u.id_rol = r.id_rol 
                WHERE u.correo_electronico = p_correo;
            END ;;
DROP PROCEDURE IF EXISTS `sp_obtener_verdad_caso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_verdad_caso`(IN p_id_caso INT)
BEGIN
        SELECT hallazgos_docente FROM casos_clinicos WHERE id_caso = p_id_caso;
    END ;;
DROP PROCEDURE IF EXISTS `sp_purgar_auditoria_antigua`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_purgar_auditoria_antigua`()
BEGIN
      DELETE FROM auditoria_acciones WHERE fecha_accion < (NOW() - INTERVAL 30 DAY);
      SELECT ROW_COUNT() AS acciones_eliminadas;
      DELETE FROM auditoria_accesos WHERE fecha_hora_login < (NOW() - INTERVAL 30 DAY);
      SELECT ROW_COUNT() AS accesos_eliminados;
  END ;;
DROP PROCEDURE IF EXISTS `sp_registrar_auditoria_acceso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_auditoria_acceso`(
                IN p_id_usuario INT,
                IN p_ip VARCHAR(50)
            )
BEGIN
                INSERT INTO auditoria_accesos (id_usuario, direccion_ip) VALUES (p_id_usuario, p_ip);
            END ;;
DROP PROCEDURE IF EXISTS `sp_registrar_auditoria_actividad`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_auditoria_actividad`(
                IN p_id_usuario INT,
                IN p_accion VARCHAR(50),
                IN p_detalle TEXT
            )
BEGIN
                INSERT INTO auditoria_acciones (id_usuario, accion, detalle) 
                VALUES (p_id_usuario, p_accion, p_detalle);
                SELECT LAST_INSERT_ID() AS id_auditoria;
            END ;;
DROP PROCEDURE IF EXISTS `sp_registrar_usuario`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_usuario`(
                IN p_id_rol INT,
                IN p_nombre_completo VARCHAR(150),
                IN p_correo_electronico VARCHAR(255),
                IN p_contrasena_hash VARCHAR(255),
                IN p_carnet VARCHAR(50)
            )
BEGIN
                INSERT INTO usuarios (id_rol, nombre_completo, correo_electronico, contrasena_hash, carnet, estado, debe_cambiar_contrasena)
                VALUES (p_id_rol, p_nombre_completo, p_correo_electronico, p_contrasena_hash, p_carnet, 'Activo', TRUE);
                SELECT LAST_INSERT_ID() AS id_usuario;
            END ;;
DROP PROCEDURE IF EXISTS `sp_verificar_carnet_existe`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_verificar_carnet_existe`(IN p_carnet VARCHAR(20))
BEGIN
        SELECT id_usuario FROM usuarios WHERE carnet = p_carnet;
    END ;;
DROP PROCEDURE IF EXISTS `sp_verificar_correo_existe`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_verificar_correo_existe`(IN p_correo VARCHAR(255))
BEGIN
                SELECT id_usuario FROM usuarios WHERE correo_electronico = p_correo;
            END ;;
DROP PROCEDURE IF EXISTS `sp_verificar_estudiante_curso`;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_verificar_estudiante_curso`(IN p_id_curso INT, IN p_id_estudiante INT)
BEGIN
                SELECT id_asignacion FROM asignaciones_estudiantes WHERE id_curso = p_id_curso AND id_estudiante = p_id_estudiante;
            END ;;
DELIMITER ;

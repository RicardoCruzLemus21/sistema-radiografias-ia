-- Las notificaciones NUNCA se borran: "marcar como leída" solo pone leida = 1.
-- Reemplaza al antiguo sp_eliminar_notificacion (que hacía DELETE).
-- Es idempotente: DROP + CREATE, se puede correr en cada arranque.
DELIMITER ;;
DROP PROCEDURE IF EXISTS sp_marcar_notificacion_leida;;
CREATE PROCEDURE sp_marcar_notificacion_leida(IN p_id INT, IN p_usuario INT)
BEGIN
    UPDATE notificaciones SET leida = 1 WHERE id_notificacion = p_id AND id_usuario_destino = p_usuario;
    SELECT ROW_COUNT() AS filas;
END;;
DROP PROCEDURE IF EXISTS sp_marcar_todas_notificaciones_leidas;;
CREATE PROCEDURE sp_marcar_todas_notificaciones_leidas(IN p_usuario INT)
BEGIN
    UPDATE notificaciones SET leida = 1 WHERE id_usuario_destino = p_usuario AND leida = 0;
    SELECT ROW_COUNT() AS filas;
END;;
DELIMITER ;

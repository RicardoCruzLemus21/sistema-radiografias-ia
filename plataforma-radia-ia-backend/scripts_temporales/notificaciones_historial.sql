-- Historial permanente de notificaciones: cada notificación que se crea se copia aquí automáticamente
-- (trigger), y esta tabla nunca se borra desde la aplicación. Así, aunque la notificación original
-- se modifique o se elimine a nivel de base de datos, el registro queda guardado.
-- Idempotente: se puede correr en cada arranque.
CREATE TABLE IF NOT EXISTS notificaciones_historial (
  id_historial INT AUTO_INCREMENT PRIMARY KEY,
  id_notificacion INT NOT NULL,
  id_usuario_destino INT NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  fecha_creacion TIMESTAMP NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_historial_notificacion (id_notificacion),
  KEY idx_historial_usuario (id_usuario_destino)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DELIMITER ;;
DROP TRIGGER IF EXISTS trg_notificaciones_al_crear;;
CREATE TRIGGER trg_notificaciones_al_crear AFTER INSERT ON notificaciones
FOR EACH ROW
BEGIN
    INSERT IGNORE INTO notificaciones_historial (id_notificacion, id_usuario_destino, titulo, mensaje, fecha_creacion)
    VALUES (NEW.id_notificacion, NEW.id_usuario_destino, NEW.titulo, NEW.mensaje, NEW.fecha_creacion);
END;;
DELIMITER ;

-- Copia las notificaciones que ya existían antes de crear el historial (no duplica las ya copiadas)
INSERT IGNORE INTO notificaciones_historial (id_notificacion, id_usuario_destino, titulo, mensaje, fecha_creacion)
SELECT id_notificacion, id_usuario_destino, titulo, mensaje, fecha_creacion FROM notificaciones;

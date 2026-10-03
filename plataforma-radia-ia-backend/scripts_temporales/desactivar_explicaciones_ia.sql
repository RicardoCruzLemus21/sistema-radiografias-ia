-- Desactiva las explicaciones antiguas generadas con Gemini (origen = 'ia').
-- No se borran: quedan en la base de datos como 'rechazada', así que el estudiante vuelve a ver
-- la explicación base (origen 'plantilla') y el panel del docente ya no las lista.
-- Es idempotente: se puede correr en cada arranque sin efecto adicional.
UPDATE aprendizaje_explicaciones SET estado = 'rechazada' WHERE origen = 'ia' AND estado <> 'rechazada';

USE radia_ia_schema;

ALTER TABLE Evaluaciones_Estudiantes
ADD COLUMN nivel_confianza INT DEFAULT 0 AFTER justificacion_clinica,
ADD COLUMN marcador_estudiante JSON NULL AFTER nivel_confianza;

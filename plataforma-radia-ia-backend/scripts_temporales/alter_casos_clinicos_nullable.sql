USE radia_ia_schema;

-- Permite que Casos_Clinicos represente casos "globales" del banco NIH
-- (sin curso ni paciente simulado asociado todavía). Antes este ALTER
-- se ejecutaba en cada corrida de importar_banco.js; se formaliza aquí
-- para que solo se aplique una vez, siguiendo el patrón de alter_evaluaciones.sql.
ALTER TABLE Casos_Clinicos
MODIFY id_curso INT NULL,
MODIFY id_paciente INT NULL;

USE radia_ia_schema;

-- Métricas reales del modelo (v2, Colab) por patología, tomadas de
-- RESULTADOS_Y_DEFENSA_RADIA.md. Aditiva: no toca ninguna tabla existente.
-- Alimenta la Fase 3 del visor de diagnóstico para dar contexto real
-- ("el modelo acierta ~51% de las veces que opina esto") en vez de un
-- texto fijo, y para distinguir explícitamente las 2 patologías donde
-- el modelo se abstiene siempre.
CREATE TABLE IF NOT EXISTS Metricas_Modelo_Patologia (
    id_patologia INT PRIMARY KEY,
    auc DECIMAL(4,3) NOT NULL,
    localizacion_pct DECIMAL(5,1) NULL,
    precision_valor DECIMAL(4,3) NULL,
    se_abstiene_siempre BOOLEAN NOT NULL DEFAULT FALSE,
    nota_clinica VARCHAR(255) NULL,
    FOREIGN KEY (id_patologia) REFERENCES Catalogo_Patologias(id_patologia)
);

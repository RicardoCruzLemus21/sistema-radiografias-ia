const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log("Iniciando importación del banco de casos NIH...");
        console.log("(Nota: requiere haber corrido antes run_alter_casos_clinicos.js una sola vez)");

        // 1. Leer JSON
        const jsonPath = path.join(__dirname, '../uploads/banco_casos/banco_casos.json');
        console.log(`Leyendo datos desde: ${jsonPath}`);
        const banco = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const casos = banco.casos;
        
        console.log(`Se encontraron ${casos.length} casos para importar.`);

        let insertados = 0;
        for (const caso of casos) {
            const metadatosIA = {
                origen_metadata: 'nih_colab',
                etiquetas_reales: caso.etiquetas_reales,
                tiene_bbox: caso.tiene_bbox,
                bbox: caso.bbox,
                opinion_modelo: caso.opinion_modelo,
                modelo_se_abstiene: caso.modelo_se_abstiene,
                probabilidades: caso.probabilidades,
                gradcam: caso.gradcam,
                nota_docente: caso.nota_docente || ""
            };

            const titulo = `Caso NIH: ${caso.etiquetas_reales.length > 0 ? caso.etiquetas_reales.join(', ') : 'Normal'}`;
            
            let nivelEnum = 'Intermedio';
            if (caso.nivel === 1) nivelEnum = 'Básico';
            else if (caso.nivel >= 3) nivelEnum = 'Avanzado';

            // Validar si ya existe
            const [existente] = await db.query(
                `SELECT c.id_caso FROM Casos_Clinicos c
                 JOIN Radiografias r ON c.id_caso = r.id_caso 
                 WHERE r.ruta_imagen = ?`,
                [`/uploads/banco_casos/${caso.imagen}`]
            );

            if (existente.length === 0) {
                // Insertar el caso
                const [result] = await db.query(
                    `INSERT INTO Casos_Clinicos (
                        id_curso, id_paciente, titulo_caso, motivo_consulta, 
                        nivel_dificultad, origen, estado, hallazgos_docente
                    ) VALUES (
                        NULL, NULL, ?, ?, ?, 'nih', 'disponible', ?
                    )`,
                    [
                        titulo,
                        'Paciente de base de datos pública del NIH.',
                        nivelEnum,
                        JSON.stringify(metadatosIA)
                    ]
                );
                
                const idCasoInsertado = result.insertId;
                
                // Insertar la radiografía vinculada
                await db.query(
                    `INSERT INTO Radiografias (
                        id_caso, tipo_proyeccion, ruta_imagen
                    ) VALUES (
                        ?, 'AP/PA', ?
                    )`,
                    [
                        idCasoInsertado,
                        `/uploads/banco_casos/${caso.imagen}`
                    ]
                );
                
                insertados++;
            } else {
                // Caso existe, actualizamos su JSON y metadatos
                await db.query(
                    `UPDATE Casos_Clinicos 
                     SET hallazgos_docente = ?, nivel_dificultad = ?, titulo_caso = ?
                     WHERE id_caso = ?`,
                    [JSON.stringify(metadatosIA), nivelEnum, titulo, existente[0].id_caso]
                );
                // Si existieran más casos con la misma imagen (clonados), también deberíamos actualizar, pero por ahora actualizamos el base.
            }
            
            if (insertados % 100 === 0 && insertados > 0) {
                console.log(`Progreso: ${insertados} casos importados...`);
            }
        }

        console.log(`✅ Importación completada. Se insertaron ${insertados} nuevos casos.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error durante la importación:", error);
        process.exit(1);
    }
}

run();

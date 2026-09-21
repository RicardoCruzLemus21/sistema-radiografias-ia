// Sincroniza el estado de los casos del banco NIH con las imágenes que realmente existen en disco.
//
// La BD tiene 3.265 casos NIH pero uploads/banco_casos/imagenes solo trae parte de las radiografías;
// un caso sin imagen no sirve para un ejercicio (el estudiante vería "Imagen no disponible").
// En vez de borrarlos, se marcan como estado = 'sin_imagen' y el banco los ignora. Es idempotente:
// si más adelante se agregan imágenes a la carpeta, volver a correr el script los reactiva.
//
// Solo toca casos del banco global (origen 'nih' y sin curso asignado).
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

(async () => {
    try {
        const [col] = await pool.query("SHOW COLUMNS FROM Casos_Clinicos WHERE Field = 'estado'");
        if (!String(col[0].Type).includes("'sin_imagen'")) {
            await pool.query("ALTER TABLE Casos_Clinicos MODIFY estado ENUM('pendiente','disponible','sin_imagen') DEFAULT 'disponible'");
            console.log("✅ Columna Casos_Clinicos.estado ahora admite 'sin_imagen'.");
        }

        const [casos] = await pool.query(`
            SELECT c.id_caso, c.estado, r.ruta_imagen
            FROM Casos_Clinicos c
            JOIN Radiografias r ON r.id_caso = c.id_caso
            WHERE c.origen = 'nih' AND c.id_curso IS NULL`);

        const raiz = path.join(__dirname, '..');
        const aMarcar = [];      // tienen estado disponible pero falta el archivo
        const aReactivar = [];   // estaban sin_imagen y el archivo ya existe
        for (const c of casos) {
            const existe = fs.existsSync(path.join(raiz, c.ruta_imagen.replace(/^\//, '')));
            if (!existe && c.estado === 'disponible') aMarcar.push(c.id_caso);
            if (existe && c.estado === 'sin_imagen') aReactivar.push(c.id_caso);
        }

        const actualizar = async (ids, estado) => {
            for (let i = 0; i < ids.length; i += 500) {
                const lote = ids.slice(i, i + 500);
                await pool.query('UPDATE Casos_Clinicos SET estado = ? WHERE id_caso IN (?)', [estado, lote]);
            }
        };
        await actualizar(aMarcar, 'sin_imagen');
        await actualizar(aReactivar, 'disponible');

        const [resumen] = await pool.query(`
            SELECT estado, COUNT(*) AS casos FROM Casos_Clinicos
            WHERE origen = 'nih' AND id_curso IS NULL GROUP BY estado`);
        console.log(`Marcados sin_imagen: ${aMarcar.length} | reactivados: ${aReactivar.length}`);
        console.table(resumen);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();

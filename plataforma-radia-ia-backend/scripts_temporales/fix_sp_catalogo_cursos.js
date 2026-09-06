const pool = require('../src/config/database');

async function fix() {
    try {
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_catalogo_cursos');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_catalogo_cursos()
            BEGIN
                SELECT 
                    c.id_curso,
                    c.nombre_curso,
                    c.semestre,
                    c.anio,
                    u.nombre_completo AS nombre_catedratico,
                    COUNT(ae.id_estudiante) AS total_estudiantes
                FROM cursos_secciones c
                INNER JOIN usuarios u ON c.id_catedratico = u.id_usuario
                LEFT JOIN asignaciones_estudiantes ae ON c.id_curso = ae.id_curso
                GROUP BY c.id_curso, c.nombre_curso, c.semestre, c.anio, u.nombre_completo
                ORDER BY c.anio DESC, c.semestre DESC;
            END
        `);
        console.log('✅ sp_obtener_catalogo_cursos recreado con tablas correctas');

        // Probar inmediatamente
        const [result] = await pool.query('CALL sp_obtener_catalogo_cursos()');
        console.log('✅ SP funciona, cursos encontrados:', result[0].length);
        console.log(JSON.stringify(result[0].slice(0, 2), null, 2));
        process.exit(0);
    } catch(e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}
fix();

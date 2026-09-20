// Corrige sp_obtener_detalle_caso (definido originalmente en fix_sps_tablas.js):
//
// 1. INNER JOIN pacientes_simulados -> LEFT JOIN: los casos del banco NIH publicados
//    vía asignarCasosBanco se insertan con id_paciente = NULL (no tienen paciente
//    simulado real). Con INNER JOIN, sp_obtener_detalle_caso lanzaba "Caso clínico
//    no encontrado" para cualquiera de esos casos al abrir "Ver Ficha".
// 2. Se agregan cc.hallazgos_docente, cc.origen, cc.estado al SELECT: hoy el detalle
//    de un caso no incluye la verdad de referencia, mientras que el listado
//    (obtenerCasosDetallados) sí la incluye. El docente debería poder auditar qué
//    patologías tiene marcadas un caso antes de publicarlo.
const pool = require('../src/config/database');

async function fix() {
    try {
        console.log('🔧 Recreando sp_obtener_detalle_caso...');
        await pool.query('DROP PROCEDURE IF EXISTS sp_obtener_detalle_caso');
        await pool.query(`
            CREATE PROCEDURE sp_obtener_detalle_caso(IN p_id_caso INT)
            BEGIN
                SELECT
                    cc.id_caso,
                    cc.titulo_caso,
                    cc.motivo_consulta,
                    cc.nivel_dificultad,
                    cc.origen,
                    cc.estado,
                    cc.hallazgos_docente,
                    cc.id_curso,
                    cs.nombre_curso,
                    ps.id_paciente,
                    ps.codigo_paciente,
                    ps.edad,
                    ps.genero,
                    ps.antecedentes_medicos,
                    r.id_radiografia,
                    r.ruta_imagen,
                    r.tipo_proyeccion
                FROM casos_clinicos cc
                LEFT JOIN cursos_secciones cs ON cc.id_curso = cs.id_curso
                LEFT JOIN pacientes_simulados ps ON cc.id_paciente = ps.id_paciente
                LEFT JOIN radiografias r ON cc.id_caso = r.id_caso
                WHERE cc.id_caso = p_id_caso
                LIMIT 1;
            END
        `);
        console.log('✅ sp_obtener_detalle_caso corregido (LEFT JOIN + verdad de referencia expuesta).');

        await pool.query('CALL sp_obtener_detalle_caso(1)');
        console.log('✅ Verificación: el SP ejecuta sin errores.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}
fix();

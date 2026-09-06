const pool = require('../src/config/database');

// Lista completa de todos los SPs usados en el sistema
const spsConParametro = [
    'sp_verificar_correo_existe', 'sp_obtener_usuario_por_correo',
    'sp_cambiar_clave_inicial', 'sp_obtener_auditoria_accesos',
    'sp_registrar_auditoria_acceso', 'sp_obtener_lista_usuarios',
    'sp_listar_usuarios_completos', 'sp_eliminar_usuario',
    'sp_obtener_codigos_pacientes', 'sp_obtener_casos_detallados',
    'sp_obtener_cursos_catedratico', 'sp_obtener_total_casos_catedratico',
    'sp_obtener_estudiantes_resumen_catedratico', 'sp_obtener_estadisticas_curso',
    'sp_obtener_estudiantes_por_curso', 'sp_obtener_detalle_estudiante_usuario',
    'sp_obtener_detalle_estudiante_evaluaciones', 'sp_mi_rendimiento_estadisticas',
    'sp_obtener_mi_rendimiento_estadisticas', 'sp_obtener_evaluaciones_curso',
    'sp_obtener_todas_evaluaciones', 'sp_obtener_catalogo_patologias',
    'sp_obtener_catalogo_regiones', 'sp_obtener_catalogo_rubricas',
    'sp_obtener_catalogo_cuestionarios', 'sp_obtener_resultados_likert',
    'sp_obtener_logs_actividad', 'sp_obtener_roles', 'sp_obtener_catalogo_cursos',
];

async function diagnosticar() {
    const errores = [];
    console.log('=== DIAGNÓSTICO COMPLETO DE SPs ===\n');

    for (const sp of spsConParametro) {
        try {
            await pool.query(`CALL ${sp}(1)`);
            console.log(`✅ ${sp}`);
        } catch(e) {
            if (e.message.includes("PROCEDURE") && e.message.includes("does not exist")) {
                console.log(`⚠️  ${sp} - NO EXISTE`);
                errores.push({ sp, tipo: 'NO_EXISTE', error: e.message });
            } else {
                console.log(`❌ ${sp} - ${e.message}`);
                errores.push({ sp, tipo: 'ERROR_SQL', error: e.message });
            }
        }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Total SPs probados: ${spsConParametro.length}`);
    console.log(`Con errores: ${errores.length}`);
    errores.forEach(e => console.log(`  ${e.tipo}: ${e.sp} → ${e.error}`));
    process.exit(0);
}
diagnosticar();

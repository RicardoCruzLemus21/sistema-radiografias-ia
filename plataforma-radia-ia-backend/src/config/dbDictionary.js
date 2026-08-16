module.exports = {
    TABLAS: {

        // Módulo 1: Seguridad y Accesos
        ROLES: 'Roles',
        USUARIOS: 'Usuarios',
        AUDITORIA: 'Auditoria_Accesos',

        // Módulo 2
        CURSOS: 'Cursos_Secciones',
        ASIGNACIONES: 'Asignaciones_Estudiantes',
        ESTADISTICAS: 'Estadisticas_Dashboard',
        USUARIOS: 'Usuarios',
        
        // Módulo 3
        PACIENTES: 'Pacientes_Simulados',
        CASOS: 'Casos_Clinicos',
        RADIOGRAFIAS: 'Radiografias',

        // Módulo 4: Interacción y Diagnóstico Estudiantil
        CATALOGO_PATOLOGIAS: 'Catalogo_Patologias',
        REGIONES_ANATOMICAS: 'Regiones_Anatomicas',
        EVALUACIONES_ESTUDIANTES: 'Evaluaciones_Estudiantes',
        DETALLE_HALLAZGOS: 'Detalle_Hallazgos_Estudiante',
        LOCALIZACION_LESIONES: 'Localizacion_Lesiones_Estudiante',

        // Módulo 5: Inferencia de IA
        RESULTADOS_IA: 'Resultados_IA',
        CONCORDANCIA: 'Concordancia_Diagnostica',

        // Módulo 6: Medición Científica y Rúbricas
        RUBRICAS: 'Rubricas_Definicion',
        CALIFICACIONES: 'Calificaciones_Rubrica',
        CUESTIONARIOS: 'Cuestionarios_Percepcion',
        RESPUESTAS_LIKERT: 'Respuestas_Likert',

        // Módulo Extra: Empresarial
        AUDITORIA_ACCIONES: 'Auditoria_Acciones',
        NOTIFICACIONES: 'Notificaciones',
        COMENTARIOS: 'Comentarios_Catedratico',
        CONFIG_CORREOS: 'Configuracion_Correos',
        PLANTILLAS_CORREOS: 'Plantillas_Correos'
    },
    COLUMNAS: {
        // Módulo 2
        ID_CURSO: 'id_curso',
        ID_CATEDRATICO: 'id_catedratico',
        ID_ESTUDIANTE: 'id_estudiante',
        ID_USUARIO: 'id_usuario',
        NOMBRE_CURSO: 'nombre_curso',
        SEMESTRE: 'semestre',
        ANIO: 'anio',
        NOMBRE_COMPLETO: 'nombre_completo',
        CORREO: 'correo_electronico',
        TOTAL_CASOS: 'total_casos_resueltos',
        PROMEDIO_PRECISION: 'promedio_precision',
        ULTIMA_ACTUALIZACION: 'ultima_actualizacion', 

        // Módulo 3
        ID_PACIENTE: 'id_paciente',
        ID_CASO: 'id_caso',
        ID_RADIOGRAFIA: 'id_radiografia',
        CODIGO_PACIENTE: 'codigo_paciente',
        EDAD: 'edad',
        GENERO: 'genero',
        ANTECEDENTES: 'antecedentes_medicos',
        TITULO_CASO: 'titulo_caso',
        MOTIVO_CONSULTA: 'motivo_consulta',
        NIVEL_DIFICULTAD: 'nivel_dificultad',
        TIPO_PROYECCION: 'tipo_proyeccion',
        RUTA_IMAGEN: 'ruta_imagen',

        // Módulo 4
        ID_EVALUACION: 'id_evaluacion',
        ID_PATOLOGIA: 'id_patologia',
        NOMBRE_PATOLOGIA: 'nombre_patologia',
        ID_REGION: 'id_region',
        NOMBRE_REGION: 'nombre_region',
        ID_DETALLE_HALLAZGO: 'id_detalle_hallazgo',
        TIEMPO_ANALISIS: 'tiempo_analisis_segundos',
        JUSTIFICACION: 'justificacion_clinica',
        FECHA_EVALUACION: 'fecha_evaluacion',

        // Módulo 5
        ID_RESULTADO_IA: 'id_resultado_ia',
        ID_PATOLOGIA_DETECTADA: 'id_patologia_detectada',
        PROBABILIDAD: 'probabilidad_porcentaje',
        RUTA_MAPA_CALOR: 'ruta_mapa_calor',
        ID_CONCORDANCIA: 'id_concordancia',
        PORCENTAJE_CONCORDANCIA: 'porcentaje_concordancia',
        NIVEL_PRECISION: 'nivel_precision',

        // Módulo 6
        ID_CRITERIO: 'id_criterio',
        NOMBRE_CRITERIO: 'nombre_criterio',
        PESO_PORCENTAJE: 'peso_porcentaje',
        ID_CALIFICACION: 'id_calificacion',
        PUNTAJE_OBTENIDO: 'puntaje_obtenido',
        ID_CUESTIONARIO: 'id_cuestionario',
        DIMENSION_EVALUADA: 'dimension_evaluada',
        PUNTAJE_LIKERT: 'puntaje',

        // Módulo Extra
        ID_AUDITORIA: 'id_auditoria',
        ACCION: 'accion',
        DETALLE: 'detalle',
        FECHA_ACCION: 'fecha_accion',
        ID_NOTIFICACION: 'id_notificacion',
        ID_USUARIO_DESTINO: 'id_usuario_destino',
        TITULO: 'titulo',
        MENSAJE: 'mensaje',
        LEIDA: 'leida',
        FECHA_CREACION: 'fecha_creacion',
        ID_COMENTARIO: 'id_comentario',
        COMENTARIO: 'comentario',
        FECHA_COMENTARIO: 'fecha_comentario'
    }
};
const express = require('express');
const cors = require('cors');
require('dotenv').config({ override: true });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Permite que el frontend y el navegador accedan a las imágenes subidas
app.use('/uploads', express.static('uploads'));

// ==========================================
// IMPORTACIÓN DE MÓDULOS (RUTAS)
// ==========================================
const authRoutes = require('./src/routes/authRoutes');
const diagnosticoRoutes = require('./src/routes/diagnosticoRoutes');
const academicRoutes = require('./src/routes/academicRoutes');
const clinicalRoutes = require('./src/routes/clinicalRoutes');
const radiografiaRoutes = require('./src/routes/radiografiaRoutes');
const iaRoutes = require('./src/routes/iaRoutes');
const metricsRoutes = require('./src/routes/metricsRoutes');
const extraRoutes = require('./src/routes/extraRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const userRoutes = require('./src/routes/userRoutes');
const modeloRoutes = require('./src/routes/modeloRoutes');
const aprendizajeRoutes = require('./src/routes/aprendizajeRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// ==========================================
// REGISTRO DE ENDPOINTS REST
// ==========================================
app.use('/api/auth', authRoutes);           // MÓDULO 1: Autenticación y Usuarios
app.use('/api/academico', academicRoutes);  // MÓDULO 2: Gestión Académica y Rendimiento
app.use('/api/academic', academicRoutes);   // MÓDULO 2: Alias adicional
app.use('/api/clinical', clinicalRoutes);   // MÓDULO 3: Casos Clínicos y Pacientes
app.use('/api/radiografias', radiografiaRoutes); // MÓDULO 3: Subida y Gestión de Radiografías
app.use('/api/diagnostico', diagnosticoRoutes);  // MÓDULO 4: Diagnóstico y Catálogos
app.use('/api/ia', iaRoutes);               // MÓDULO 5: Inferencia IA y Concordancia
app.use('/api/metricas', metricsRoutes);     // MÓDULO 6 & 7: Rúbricas y Medición Científica (Likert)
app.use('/api/extra', extraRoutes);         // MÓDULO EXTRA: Auditoría, Notificaciones, Comentarios
app.use('/api/audit', auditRoutes);         // Visor de Auditoría (Timeline)
app.use('/api/modelo', modeloRoutes);       // Ficha del modelo de IA (estadísticas)
app.use('/api/aprendizaje', aprendizajeRoutes); // Módulo de aprendizaje: ruta por patología, repaso y errores
app.use('/api/users', userRoutes);          // Gestión de Usuarios (CRUD)
app.use('/api/admin', adminRoutes);         // Panel de Administración: KPIs globales del sistema

// TEMPORAL: diagnóstico de collation para depurar el despliegue en Railway. No expone datos
// sensibles (solo metadatos de columnas/parámetros). Eliminar una vez resuelto.
app.get('/api/diag-xyz988', async (req, res) => {
    try {
        const pool = require('./src/config/database');
        const [global] = await pool.query("SHOW VARIABLES LIKE 'default_collation_for_utf8mb4'");
        const [columna] = await pool.query(
            "SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'correo_electronico'"
        );
        const [parametro] = await pool.query(
            "SELECT PARAMETER_NAME, DATA_TYPE, CHARACTER_SET_NAME, COLLATION_NAME FROM INFORMATION_SCHEMA.PARAMETERS WHERE SPECIFIC_SCHEMA = DATABASE() AND SPECIFIC_NAME = 'sp_obtener_usuario_por_correo'"
        );
        res.json({ status: 'ok', global, columna, parametro });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

const iaService = require('./src/services/iaService');
const { iniciarLimpiezaProgramada } = require('./src/jobs/purgaAuditoria');
const { aplicarMigracionCasing } = require('./src/jobs/migracionCasing');

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`\n=================================================`);
    console.log(`🚀 SERVIDOR ACTIVO EN MODO DESARROLLO (WINDOWS)`);
    console.log(`📡 URL Base: http://localhost:${PORT}`);
    
    // Pre-cargar modelo de IA
    try {
        await iaService.cargarModeloIA();
    } catch (error) {
        console.error("❌ Error al pre-cargar el modelo de IA:", error.message);
    }
    console.log(`🛡️  Módulo 1 (Auth API): EN LÍNEA`);
    console.log(`🛡️  Módulo 2 (Academic API): EN LÍNEA`);
    console.log(`🛡️  Módulo 3 (Clinical API): EN LÍNEA`);
    console.log(`🛡️  Módulo 3 (Radiografías API): EN LÍNEA`);
    console.log(`🛡️  Módulo 4 (Diagnostic API): EN LÍNEA`);
    console.log(`🛡️  Módulo 5 (AI Engine API): EN LÍNEA`);
    console.log(`🛡️  Módulo 6 (Metrics & Likert API): EN LÍNEA`);
    console.log(`=================================================\n`);

    iniciarLimpiezaProgramada(); // Auditoría: retiene solo los últimos 30 días
    await aplicarMigracionCasing(); // Corrige nombres de tabla en mayúsculas dentro de procedimientos (una vez)
});
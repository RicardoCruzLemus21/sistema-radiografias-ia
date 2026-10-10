const express = require('express');
const cors = require('cors');
require('dotenv').config({ override: true });

const app = express();

// Railway pone un proxy de borde delante de la app: sin esto, req.ip devuelve la IP interna
// del proxy (rango 100.64.0.0/10) en vez de la IP real del cliente. Afecta tanto al log de
// inicio de sesion como al limitador de fuerza bruta de registro, que identifica por req.ip.
app.set('trust proxy', 1);

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

const iaService = require('./src/services/iaService');
const { cargarDistractores } = require('./src/config/distractores');
const { cargarLecciones } = require('./src/config/catalogoLecciones');
const { iniciarLimpiezaProgramada } = require('./src/jobs/purgaAuditoria');

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

    // Catálogo de lecciones y patologías (tabla aprendizaje_lecciones) en memoria
    try {
        await cargarLecciones();
    } catch (error) {
        console.error("❌ Error al cargar las lecciones desde la base:", error.message);
    }

    // Distractores por patología (tabla distractores) en memoria
    try {
        await cargarDistractores();
    } catch (error) {
        console.error("❌ Error al cargar los distractores desde la base:", error.message);
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
});
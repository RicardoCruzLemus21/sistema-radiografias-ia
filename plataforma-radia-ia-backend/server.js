const express = require('express');
const cors = require('cors');
require('dotenv').config();

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
app.use('/api/metrics', metricsRoutes);     // MÓDULO 6 & 7: Rúbricas y Medición Científica (Likert)
app.use('/api/extra', extraRoutes);         // MÓDULO EXTRA: Auditoría, Notificaciones, Comentarios
app.use('/api/audit', auditRoutes);         // Visor de Auditoría (Timeline)
app.use('/api/users', userRoutes);          // Gestión de Usuarios (CRUD)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 SERVIDOR ACTIVO EN MODO DESARROLLO (WINDOWS)`);
    console.log(`📡 URL Base: http://localhost:${PORT}`);
    console.log(`🛡️  Módulo 1 (Auth API): EN LÍNEA`);
    console.log(`🛡️  Módulo 2 (Academic API): EN LÍNEA`);
    console.log(`🛡️  Módulo 3 (Clinical API): EN LÍNEA`);
    console.log(`🛡️  Módulo 3 (Radiografías API): EN LÍNEA`);
    console.log(`🛡️  Módulo 4 (Diagnostic API): EN LÍNEA`);
    console.log(`🛡️  Módulo 5 (AI Engine API): EN LÍNEA`);
    console.log(`🛡️  Módulo 6 (Metrics & Likert API): EN LÍNEA`);
    console.log(`=================================================\n`);
});
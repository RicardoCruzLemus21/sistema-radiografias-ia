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
const academicRoutes = require('./src/routes/academicRoutes');
const clinicalRoutes = require('./src/routes/clinicalRoutes'); 
// const radiografiaRoutes = require('./src/routes/radiografiaRoutes'); // Comentado temporalmente
const diagnosticoRoutes = require('./src/routes/diagnosticoRoutes');
// const iaRoutes = require('./src/routes/iaRoutes'); // Comentado temporalmente
// const metricsRoutes = require('./src/routes/metricsRoutes'); // Comentado temporalmente

// ==========================================
// REGISTRO DE ENDPOINTS REST
// ==========================================
app.use('/api/auth', authRoutes); // MÓDULO 1
app.use('/api/academico', academicRoutes); // MÓDULO 2
app.use('/api/clinical', clinicalRoutes); // MÓDULO CLÍNICO
// app.use('/api/radiografias', radiografiaRoutes); // MÓDULO 3 (Comentado temporalmente)
app.use('/api/diagnostico', diagnosticoRoutes); // MÓDULO 4
// app.use('/api/ia', iaRoutes); // MÓDULO 5 (Comentado temporalmente)
// app.use('/api/metrics', metricsRoutes); // MÓDULO 6 (Comentado temporalmente)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 SERVIDOR ACTIVO EN MODO DESARROLLO (WINDOWS)`);
    console.log(`📡 URL Base: http://localhost:${PORT}`);
    console.log(`🛡️  Módulo 1 (Auth API): EN LÍNEA`);
    console.log(`🛡️  Módulo 2 (Academic API): EN LÍNEA`);
    console.log(`🛡️  Módulo 3 (Clinical API): EN LÍNEA`);
    console.log(`🛡️  Módulo 4 (Diagnostic API): EN LÍNEA`);
    console.log(`🛡️  Módulo 5 (AI Engine API): EN LÍNEA`);
    console.log(`🛡️  Módulo 6 (Metrics API): EN LÍNEA`);
    console.log(`=================================================\n`);
});
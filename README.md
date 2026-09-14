# 🩻 RADIA-IA (Sistema Educativo de Radiografías)

**RADIA-IA** es una plataforma interactiva de aprendizaje diseñada para estudiantes de medicina, enfocada en la lectura y evaluación de radiografías de tórax. Apoyada en modelos de Inteligencia Artificial (Redes Neuronales Convolucionales) y mapas de calor (Grad-CAM), la plataforma actúa como un compañero de estudio falible que fomenta el razonamiento clínico.

> **Principio Rector:** El modelo de IA no es un oráculo perfecto. Sus aciertos y errores son material didáctico diseñado para calibrar la confianza del estudiante frente a casos complejos.

---

## 🏗️ Arquitectura del Proyecto

El proyecto está compuesto por tres pilares principales fuertemente tipados y desacoplados:

### 1. Frontend (Angular)
Ubicado en `plataforma-radia-ia-frontend`.
- **Tecnología:** Angular 17+ (Componentes Standalone).
- **Diseño UI/UX:** Interfaz estrictamente construida bajo los principios de *Dark Mode* y *Glassmorphism* para reducir la fatiga visual en entornos clínicos.
- **Flujo Educativo (Visor de Diagnóstico):** Un Stepper interactivo de 4 Fases para evitar el sesgo de anclaje (Lectura a Ciegas, Verdad NIH, Opinión de IA, Discusión y Puntuación en 3 ejes).

### 2. Backend (Node.js & Express)
Ubicado en `plataforma-radia-ia-backend`.
- **Tecnología:** Node.js con Express.js.
- **Responsabilidad:** API REST encargada de la lógica de negocio, autenticación de usuarios (JWT), y servicio estático de imágenes y mapas Grad-CAM pre-calculados.
- **Seguridad:** Gestión de credenciales a través de variables de entorno (`.env`) y rutas protegidas por roles.

### 3. Base de Datos (MySQL)
- **Tecnología:** MySQL 8+ (Esquema: `radia_ia_schema`).
- **Integridad Transaccional:** La base de datos es el núcleo de la seguridad de la información. Todas las operaciones pesadas (como la creación de casos clínicos o inserción de evaluaciones de estudiantes) se manejan a nivel de motor mediante **Stored Procedures (Procedimientos Almacenados)**.
- **Evaluación Tridimensional:** Almacena métricas complejas de los estudiantes, como niveles de confianza, tiempos de análisis y coordenadas exactas (Bounding Boxes) de las lesiones marcadas en la interfaz gráfica.

### 4. Modelos de IA (TensorFlow / Keras)
- Entrenados externamente en Google Colab utilizando el dataset del NIH (National Institutes of Health).
- Los modelos generan inferencias (predicciones) y mapas de activación (Grad-CAM), los cuales se almacenan y son distribuidos a los estudiantes durante la Fase 3 del ciclo educativo.

---

## 🚀 Módulos Principales

*   **Dashboard Estudiante:** Acceso a la "Worklist" de casos pendientes asignados por el docente.
*   **Visor Clínico Interactivo:** Permite dibujar marcadores (rectángulos/puntos) sobre las radiografías, utilizar herramientas DICOM simuladas (Brillo, Contraste, Zoom, Inversión) y declarar la confianza clínica.
*   **Gestión Docente:** Permite a los catedráticos crear nuevos casos clínicos mediante arrastrar y soltar (Drag & Drop), gestionar a sus grupos de estudiantes y monitorear el rendimiento global.

---

## 🛠️ Instalación y Despliegue Local

### Requisitos Previos
- Node.js (v18 o superior)
- Angular CLI
- Servidor MySQL ejecutándose localmente.

### Instrucciones

1. **Clonar y configurar Base de Datos:**
   Importar el script SQL de creación de la base de datos `radia_ia_schema` junto con sus procedimientos almacenados en tu servidor local MySQL.

2. **Backend:**
   ```bash
   cd plataforma-radia-ia-backend
   npm install
   # Crear archivo .env basado en las credenciales locales de MySQL
   npm start
   ```

3. **Frontend:**
   ```bash
   cd plataforma-radia-ia-frontend
   npm install
   ng serve
   ```
   La plataforma estará disponible en `http://localhost:4200`.

---
*Desarrollado para el proyecto de graduación de Ingeniería en Sistemas de Información.*

// Mapeo de "distractores": por cada patología objetivo, qué otras 2-3 patologías se
// parecen más en una radiografía de tórax y por eso conviene mezclar en el ejercicio
// (para que el estudiante no aprenda "la estructura del examen" en vez de anatomía).
//
// IMPORTANTE: esto es una aproximación clínica razonable, NO viene de la matriz de
// confusión real del modelo entrenado en Colab. Si en algún momento se genera un
// distractores.json real (derivado de qué patologías confunde más el modelo v2),
// reemplazar este archivo por esos valores reales.
const DISTRACTORES = {
    'Atelectasia': ['Derrame Pleural', 'Infiltracion', 'Neumonia'],
    'Cardiomegalia': ['Infiltracion', 'Derrame Pleural', 'Atelectasia'],
    'Derrame Pleural': ['Atelectasia', 'Infiltracion', 'Neumonia'],
    'Infiltracion': ['Neumonia', 'Atelectasia', 'Derrame Pleural'],
    'Neumonia': ['Infiltracion', 'Derrame Pleural', 'Atelectasia'],
    'Neumotorax': ['Derrame Pleural', 'Atelectasia', 'Normal'],
    'Nodulos': ['Infiltracion', 'Neumonia', 'Normal'],
    'Normal': ['Atelectasia', 'Infiltracion', 'Nodulos']
};

// Orden de dificultad para comparaciones "<=" (incluir niveles más fáciles también)
const ORDEN_NIVELES = ['Básico', 'Intermedio', 'Avanzado'];

module.exports = { DISTRACTORES, ORDEN_NIVELES };

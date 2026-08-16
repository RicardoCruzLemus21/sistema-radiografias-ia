const db = require('./src/config/database'); 
async function test() { 
  try { 
    const [res] = await db.query("INSERT INTO Cursos_Secciones (id_catedratico, nombre_curso, semestre, anio) VALUES (7, 'Radiología Aplicada', 'Segundo Semestre', 2026)"); 
    const newCourseId = res.insertId; 
    // Mover a los estudiantes creados por este catedratico
    await db.query("UPDATE Asignaciones_Estudiantes SET id_curso = ? WHERE id_estudiante IN (9, 10, 11, 12)", [newCourseId]); 
    console.log('Fixed! New course ID:', newCourseId); 
  } catch(e) { 
    console.error(e); 
  } finally { 
    process.exit(); 
  } 
} 
test();

const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { asignarCodigoNuevo, normalizarCodigo, esCodigoValido } = require('./codigoDocenteService');

const registrarUsuario = async (datosUsuario) => {
    const { id_rol, nombre_completo, correo_electronico, contrasena, carnet, nombre_curso_asignar } = datosUsuario;

    // VALIDACIÓN ESTRICTA: Evita el error "Unknown column 'undefined'" rechazando peticiones incompletas
    if (!id_rol || !nombre_completo || !correo_electronico || !contrasena || !carnet) {
        throw new Error('Faltan datos obligatorios (id_rol, nombre_completo, correo_electronico, contrasena, carnet).');
    }

    // Validar el nombre del curso antes de crear el usuario (evita dejar un catedrático sin curso)
    if (Number(id_rol) === 1 && nombre_curso_asignar) {
        const largo = String(nombre_curso_asignar).trim().length;
        if (largo === 0 || largo > 150) {
            throw new Error('El nombre del curso debe tener entre 1 y 150 caracteres.');
        }
    }

    // 1. Validar que el correo no exista previamente
    const [existe] = await pool.query('CALL sp_verificar_correo_existe(?)', [correo_electronico]);
    if (existe[0].length > 0) {
        throw new Error('El correo electrónico ya se encuentra registrado.');
    }

    // 2. Generar el Hash con bcrypt
    const contrasena_hash = bcrypt.hashSync(contrasena, 10);

    // 3. Inserción segura usando texto plano para el nombre de las columnas (No usar dbDictionary aquí)
    const [resultado] = await pool.query('CALL sp_registrar_usuario(?, ?, ?, ?, ?)', [id_rol, nombre_completo, correo_electronico, contrasena_hash, carnet]);

    const nuevoIdUsuario = resultado[0][0].id_usuario;

    // Todo docente recibe un código único que comparte con sus estudiantes para que se registren solos
    if (Number(id_rol) === 1) {
        await asignarCodigoNuevo(nuevoIdUsuario);
    }

    // 4. Si es catedrático (id_rol == 1) y viene un curso para asignarle
    if (Number(id_rol) === 1 && nombre_curso_asignar) {
        // Si el admin escribió un curso nuevo se agrega al catálogo; si ya existe (aunque
        // cambien mayúsculas o tildes) se reutiliza su nombre canónico.
        const nombreCurso = String(nombre_curso_asignar).trim();
        const [cursoCatalogo] = await pool.query('CALL sp_crear_curso_catalogo(?)', [nombreCurso]);
        const nombreCanonico = cursoCatalogo[0][0].nombre_curso;

        // En este diseño, la tabla Cursos_Secciones crea el grupo para el catedrático.
        // Asignaremos semestre 1 y año actual por defecto.
        const anioActual = new Date().getFullYear();
        await pool.query('CALL sp_asignar_curso_inicial(?, ?, ?)', [nuevoIdUsuario, nombreCanonico, anioActual]);
    }

    return { id_usuario: nuevoIdUsuario, nombre_completo, correo_electronico, carnet };
};

const ROL_CATEDRATICO = 1;
const ROL_ESTUDIANTE = 2;

const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';

// Validaciones comunes de un auto-registro (docente o estudiante). Solo se aceptan textos:
// mysql2 expande arreglos/objetos dentro de las consultas, así que un cuerpo con
// {"correo_electronico": {...}} no debe llegar a la base de datos.
// Límites = tamaño real de las columnas (Usuarios.correo_electronico es varchar(100)).
const validarDatosPersona = ({ carnet, nombre_completo, correo_electronico, contrasena }) => {
    if ([carnet, nombre_completo, correo_electronico, contrasena].some(v => typeof v !== 'string' || v.length === 0)) {
        throw new Error('Todos los campos son obligatorios.');
    }

    const nombre = nombre_completo.trim().replace(/\s+/g, ' ');
    const correo = correo_electronico.trim();

    if (!/^\d{4}-\d{2}-\d{4}$/.test(carnet.trim())) {
        throw new Error('El carnet debe tener el formato XXXX-XX-XXXX.');
    }
    if (nombre.length < 3 || nombre.length > 150 || !new RegExp(`^[${LETRAS}][${LETRAS} .,'\\-]*$`).test(nombre)) {
        throw new Error('El nombre debe tener entre 3 y 150 caracteres y solo puede contener letras, espacios, punto, coma, apóstrofe y guion.');
    }
    if (correo.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
        throw new Error('El correo electrónico no es válido (máximo 100 caracteres).');
    }
    if (contrasena.length < 6 || contrasena.length > 72 || contrasena !== contrasena.trim()) {
        throw new Error('La contraseña debe tener entre 6 y 72 caracteres y no puede empezar ni terminar con espacios.');
    }

    return { carnet: carnet.trim(), nombre, correo };
};

// Auto-registro público de docentes. El rol se fuerza aquí en el servidor: nunca se acepta
// un id_rol enviado por el cliente en este flujo.
const registrarDocente = async (datos) => {
    const { contrasena, nombre_curso_asignar } = datos || {};
    const persona = validarDatosPersona(datos || {});

    if (typeof nombre_curso_asignar !== 'string' || nombre_curso_asignar.length === 0) {
        throw new Error('Todos los campos son obligatorios.');
    }
    const curso = nombre_curso_asignar.trim().replace(/\s+/g, ' ');
    if (curso.length < 3 || curso.length > 150 || !new RegExp(`^[${LETRAS}0-9][${LETRAS}0-9 .,\\-/()&]*$`).test(curso)) {
        throw new Error('El nombre del curso debe tener entre 3 y 150 caracteres y no puede contener caracteres especiales.');
    }

    const nuevo = await registrarUsuario({
        id_rol: ROL_CATEDRATICO,
        carnet: persona.carnet,
        nombre_completo: persona.nombre,
        correo_electronico: persona.correo,
        contrasena,
        nombre_curso_asignar: curso
    });

    await pool.query('CALL sp_marcar_clave_definitiva(?)', [nuevo.id_usuario]);
    return nuevo;
};

// Busca al docente dueño de un código. Devuelve null si el código no existe.
// (uso interno: incluye id_docente; el endpoint público no lo expone)
const buscarDocentePorCodigo = async (codigo_docente) => {
    const codigo = normalizarCodigo(codigo_docente);
    if (!esCodigoValido(codigo)) {
        throw new Error('El código de docente no tiene un formato válido.');
    }
    const [res] = await pool.query('CALL sp_obtener_docente_por_codigo(?)', [codigo]);
    const filas = res[0];
    if (filas.length === 0) return null;

    return {
        id_docente: filas[0].id_usuario,
        nombre_docente: filas[0].nombre_completo,
        cursos: filas.filter(f => f.id_curso !== null).map(f => ({
            id_curso: f.id_curso,
            nombre_curso: f.nombre_curso,
            semestre: f.semestre,
            anio: f.anio
        }))
    };
};

// Lo que ve un estudiante al escribir el código: nombre del docente y sus cursos (nunca ids de usuario ni correo).
const consultarDocentePorCodigo = async (codigo_docente) => {
    const docente = await buscarDocentePorCodigo(codigo_docente);
    if (!docente) throw new Error('No existe ningún docente con ese código.');
    return { nombre_docente: docente.nombre_docente, cursos: docente.cursos };
};

// Auto-registro público de estudiantes con el código de su docente. Crear el usuario y
// asignarlo al curso ocurre en una sola transacción: no puede quedar un estudiante sin curso.
const registrarEstudiante = async (datos) => {
    const { codigo_docente, id_curso, contrasena } = datos || {};
    const persona = validarDatosPersona(datos || {});

    const docente = await buscarDocentePorCodigo(codigo_docente);
    if (!docente) throw new Error('No existe ningún docente con ese código.');
    if (docente.cursos.length === 0) throw new Error('Este docente todavía no tiene cursos disponibles. Avísale para que cree uno.');

    let curso;
    if (docente.cursos.length === 1) {
        curso = docente.cursos[0];
    } else {
        curso = docente.cursos.find(c => c.id_curso === Number(id_curso));
        if (!curso) throw new Error('Selecciona uno de los cursos de tu docente.');
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existeCorreo] = await conn.query('CALL sp_verificar_correo_existe(?)', [persona.correo]);
        if (existeCorreo[0].length > 0) throw new Error('El correo electrónico ya se encuentra registrado.');

        const [existeCarnet] = await conn.query('CALL sp_verificar_carnet_existe(?)', [persona.carnet]);
        if (existeCarnet[0].length > 0) throw new Error('El carnet ya se encuentra registrado.');

        const contrasena_hash = bcrypt.hashSync(contrasena, 10);
        const [resultado] = await conn.query('CALL sp_registrar_usuario(?, ?, ?, ?, ?)', [ROL_ESTUDIANTE, persona.nombre, persona.correo, contrasena_hash, persona.carnet]);
        const id_usuario = resultado[0][0].id_usuario;

        await conn.query('CALL sp_asignar_estudiante_curso(?, ?)', [curso.id_curso, id_usuario]);
        await conn.query('CALL sp_marcar_clave_definitiva(?)', [id_usuario]);

        await conn.commit();
        require('./notificationService').notificarNuevoEstudiante(curso.id_curso, persona.nombre);
        return {
            id_usuario,
            nombre_completo: persona.nombre,
            correo_electronico: persona.correo,
            carnet: persona.carnet,
            nombre_docente: docente.nombre_docente,
            nombre_curso: curso.nombre_curso
        };
    } catch (error) {
        await conn.rollback();
        // Dos registros simultáneos con el mismo correo/carnet pasan la verificación previa y chocan en el UNIQUE
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error(/carnet/i.test(error.message) ? 'El carnet ya se encuentra registrado.' : 'El correo electrónico ya se encuentra registrado.');
        }
        throw error;
    } finally {
        conn.release();
    }
};

const loginUsuario = async (correo_electronico, contrasena_plana, ip_address) => {
    if (!correo_electronico || !contrasena_plana) {
        throw new Error('Correo y contraseña son requeridos.');
    }
    if (typeof correo_electronico !== 'string' || typeof contrasena_plana !== 'string' || correo_electronico.length > 255) {
        throw new Error('Correo o contraseña con formato inválido.');
    }
    correo_electronico = correo_electronico.trim();

    // 1. Buscar al usuario en la base de datos
    const [usuarios] = await pool.query('CALL sp_obtener_usuario_por_correo(?)', [correo_electronico]);

    if (usuarios[0].length === 0) {
        throw new Error('Credenciales inválidas.');
    }

    const usuario = usuarios[0][0];

    // 2. Validar que la cuenta esté activa
    if (usuario.estado !== 'Activo') {
        throw new Error('La cuenta de usuario se encuentra inactiva.');
    }

    // 3. Comparar la contraseña
    const esValida = bcrypt.compareSync(contrasena_plana, usuario.contrasena_hash);
    if (!esValida) {
        throw new Error('Credenciales inválidas.');
    }

    // 4. Generar el token JWT
    const payload = {
        id_usuario: usuario.id_usuario,
        id_rol: usuario.id_rol,
        nombre_rol: usuario.nombre_rol,
        correo_electronico: usuario.correo_electronico
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // 5. Registrar la actividad en la tabla Auditoria_Accesos
    const direccion_ip_segura = ip_address || 'Desconocida';
    await pool.query('CALL sp_registrar_auditoria_acceso(?, ?)', [usuario.id_usuario, direccion_ip_segura]);

    return {
        token,
        requiere_cambio_clave: !!usuario.debe_cambiar_contrasena,
        usuario: {
            id_usuario: usuario.id_usuario,
            nombre_completo: usuario.nombre_completo,
            correo_electronico: usuario.correo_electronico,
            rol: usuario.nombre_rol
        }
    };
};

const cambiarClaveInicial = async (id_usuario, nueva_contrasena) => {
    if (!nueva_contrasena || nueva_contrasena.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
    }
    const contrasena_hash = bcrypt.hashSync(nueva_contrasena, 10);
    await pool.query('CALL sp_cambiar_clave_inicial(?, ?)', [contrasena_hash, id_usuario]);
    return true;
};

const obtenerRoles = async () => {
    const [roles] = await pool.query('CALL sp_obtener_roles()');
    return roles[0];
};

const obtenerUsuarios = async () => {
    const [usuarios] = await pool.query('CALL sp_obtener_lista_usuarios()');
    return usuarios[0];
};

const obtenerAuditoria = async () => {
    const [auditoria] = await pool.query('CALL sp_obtener_auditoria_accesos()');
    return auditoria[0];
};

module.exports = {
    registrarUsuario,
    registrarDocente,
    registrarEstudiante,
    consultarDocentePorCodigo,
    loginUsuario,
    cambiarClaveInicial,
    obtenerRoles,
    obtenerUsuarios,
    obtenerAuditoria
};
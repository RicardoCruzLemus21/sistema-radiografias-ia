const multer = require('multer');
const path = require('path');
const fs = require('fs'); // 1. Importamos File System de Node.js

// Configuración del motor de almacenamiento en disco
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // En Windows, path.join resuelve correctamente las barras invertidas
        const dir = path.join(__dirname, '../../uploads/radiografias/');
        
        // 2. Verificamos si la carpeta existe; si no, la creamos automáticamente
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Renombrar archivo con timestamp para evitar sobreescritura
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'rx-' + uniqueSuffix + ext);
    }
});

// Filtro estricto para formatos clínicos web
const fileFilter = (req, file, cb) => {
    const permitidas = /jpeg|jpg|png/;
    const extname = permitidas.test(path.extname(file.originalname).toLowerCase());
    const mimetype = permitidas.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Formato de archivo inválido. Solo se admiten JPG o PNG para el análisis.'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // Aumentado a 15MB para soportar alta resolución clínica
});

module.exports = upload;
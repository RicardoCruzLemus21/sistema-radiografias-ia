// Contenido base de las lecciones del módulo de aprendizaje (una por categoría del banco).
// Redactado como material educativo de apoyo a partir de conocimiento radiológico estándar de la radiografía de tórax PA.
// Sirve de punto de partida: el docente puede revisarlo y editarlo desde "Contenido de aprendizaje".
// Los nombres de las categorías coinciden con los del banco (sin tilde), igual que las etiquetas reales de cada caso.

const LECCIONES = {
    'Normal': {
        nombre: 'Normal',
        resumen: 'Una radiografía de tórax PA normal muestra pulmones claros y simétricos, una silueta cardiaca de tamaño normal, diafragmas nítidos y ángulos costofrénicos libres.',
        que_buscar: [
            'Campos pulmonares con transparencia parecida en ambos lados y una trama vascular que se afina hacia la periferia.',
            'Silueta cardiaca menor a la mitad del ancho del tórax (índice cardiotorácico menor de 0,5 en PA).',
            'Ángulos costofrénicos agudos y diafragmas de borde nítido y cúpula lisa.',
            'Mediastino centrado, con la tráquea en la línea media.',
            'Ausencia de líneas, opacidades o zonas anormalmente negras.'
        ],
        se_confunde_con: [],
        errores_tipicos: [
            'Ver patología donde hay artefactos: pliegues de piel, pezones, botones o electrodos.',
            'Interpretar como enfermedad una imagen rotada o mal inspirada, que altera la simetría aparente.',
            'Marcar "algo" por inseguridad: en este banco más de 1 de cada 3 radiografías es normal.'
        ],
        dato_clave: 'Antes de buscar enfermedad, revisa la calidad de la imagen: rotación, inspiración y penetración.'
    },

    'Atelectasia': {
        nombre: 'Atelectasia',
        resumen: 'Colapso parcial o total del pulmón (un segmento, un lóbulo o todo el pulmón). Se ve como una opacidad con pérdida de volumen.',
        que_buscar: [
            'Opacidad lineal, en banda o triangular, en la zona que perdió aire.',
            'Pérdida de volumen: las cisuras se desplazan hacia la zona colapsada.',
            'Tracción del mediastino, la tráquea o el hilio hacia el lado afectado.',
            'Elevación del hemidiafragma del mismo lado y espacios intercostales más juntos.',
            'A veces se ve el broncograma aéreo dentro de la opacidad.'
        ],
        se_confunde_con: [
            { clase: 'Infiltracion', clave: 'La infiltración es una opacidad mal definida que no cambia el volumen del pulmón. En la atelectasia hay signos de retracción: cisuras, hilio o diafragma desplazados hacia la zona.' },
            { clase: 'Derrame Pleural', clave: 'El derrame borra el ángulo costofrénico con un menisco y, si es grande, empuja el mediastino hacia el lado contrario. La atelectasia lo jala hacia el lado afectado.' },
            { clase: 'Cardiomegalia', clave: 'Un colapso del lóbulo inferior izquierdo puede quedar detrás del corazón y hacerlo parecer más grande o más denso. Busca un borde triangular retrocardiaco y signos de retracción.' }
        ],
        errores_tipicos: [
            'Confundirla con neumonía: la atelectasia retrae, la neumonía ocupa sin retraer.',
            'Pasar por alto atelectasias laminares pequeñas en las bases.'
        ],
        dato_clave: 'Si la opacidad tira de las estructuras hacia ella, piensa en atelectasia; si las empuja hacia el lado contrario, piensa en un derrame grande.'
    },

    'Cardiomegalia': {
        nombre: 'Cardiomegalia',
        resumen: 'Aumento del tamaño de la silueta cardiaca. En una proyección PA se define con un índice cardiotorácico mayor de 0,5.',
        que_buscar: [
            'Índice cardiotorácico mayor de 0,5: el ancho del corazón supera la mitad del ancho interno del tórax.',
            'Silueta cardiaca globular o con bordes agrandados, sobre todo hacia la izquierda y abajo.',
            'Comprueba que la proyección sea PA: en AP el corazón se ve magnificado.',
            'Busca signos asociados: congestión vascular, redistribución del flujo o derrame pleural.'
        ],
        se_confunde_con: [
            { clase: 'Infiltracion', clave: 'Una opacidad basal izquierda o retrocardiaca puede borrar el borde del corazón. Verifica si el contorno cardiaco real es más ancho o solo está oculto por la opacidad pulmonar.' },
            { clase: 'Derrame Pleural', clave: 'Un derrame izquierdo puede aumentar la densidad de la base y simular un corazón grande. El menisco y el ángulo costofrénico borrado lo delatan.' },
            { clase: 'Atelectasia', clave: 'El colapso del lóbulo inferior izquierdo da una densidad retrocardiaca que parece un corazón mayor. Busca signos de retracción del pulmón.' }
        ],
        errores_tipicos: [
            'Diagnosticarla en radiografías AP, en espiración o en personas con obesidad, donde el corazón parece mayor.',
            'Medir mal: el ancho del corazón se compara con el ancho del tórax, no con la altura.'
        ],
        dato_clave: 'Mide antes de opinar: un corazón que ocupa más del 50 % del ancho del tórax en PA es cardiomegalia.'
    },

    'Derrame Pleural': {
        nombre: 'Derrame Pleural',
        resumen: 'Acumulación de líquido en el espacio pleural. Se ve como una opacidad homogénea en las bases con un borde superior cóncavo.',
        que_buscar: [
            'Borramiento del ángulo costofrénico: se pierde el seno agudo (requiere unos 200 a 300 mL en PA).',
            'Opacidad homogénea basal con borde superior cóncavo hacia arriba: el signo del menisco.',
            'El borde del diafragma se pierde detrás de la opacidad.',
            'En derrames grandes, el mediastino se desplaza hacia el lado contrario.',
            'No suele haber broncograma aéreo dentro de la opacidad, a diferencia de una consolidación.'
        ],
        se_confunde_con: [
            { clase: 'Infiltracion', clave: 'La infiltración es parcheada o difusa y no se limita a la base. El derrame es homogéneo, basal y con menisco.' },
            { clase: 'Atelectasia', clave: 'La atelectasia retrae el mediastino hacia el lado afectado. Un derrame grande lo empuja hacia el lado contrario.' },
            { clase: 'Cardiomegalia', clave: 'Un derrame izquierdo puede opacar la base y hacer que el corazón parezca mayor. El borde superior cóncavo (menisco) y el seno borrado lo delatan.' }
        ],
        errores_tipicos: [
            'Confundirlo con una elevación del hemidiafragma o con una atelectasia basal.',
            'No mirar el ángulo costofrénico: es el primer lugar donde aparece.'
        ],
        dato_clave: 'Menisco más seno costofrénico borrado: derrame pleural hasta que se demuestre lo contrario.'
    },

    'Infiltracion': {
        nombre: 'Infiltración',
        resumen: 'En el conjunto NIH, "infiltración" agrupa opacidades pulmonares mal definidas, de aspecto parcheado o difuso, sin una causa específica.',
        que_buscar: [
            'Opacidades parcheadas, en velo o en nube, con bordes poco definidos.',
            'Aumento de la densidad del pulmón sin pérdida de volumen.',
            'Pueden estar en un solo lóbulo o en varios, de un lado o de ambos.',
            'Los bordes del corazón o del diafragma pueden verse borrosos si la opacidad los toca.'
        ],
        se_confunde_con: [
            { clase: 'Derrame Pleural', clave: 'El derrame es homogéneo, basal y con menisco. La infiltración es parcheada y no se limita a la base.' },
            { clase: 'Atelectasia', clave: 'La atelectasia pierde volumen: cisuras, diafragma o mediastino se desplazan. La infiltración no.' },
            { clase: 'Cardiomegalia', clave: 'Una infiltración perihiliar puede borrar el contorno del corazón. Comprueba si la silueta real es mayor o solo está oculta.' }
        ],
        errores_tipicos: [
            'Es una etiqueta amplia y poco específica; incluso el modelo de IA de esta plataforma se abstiene siempre con ella.',
            'Confundirla con neumonía: "infiltración" describe lo que se ve; "neumonía" es un diagnóstico que necesita contexto clínico.'
        ],
        dato_clave: 'Infiltración describe lo que ves (una opacidad mal definida), no la causa.'
    },

    'Neumonia': {
        nombre: 'Neumonía',
        resumen: 'Infección del parénquima pulmonar. En la radiografía suele verse como una consolidación: una opacidad que "llena" los alvéolos.',
        que_buscar: [
            'Consolidación: opacidad homogénea de bordes irregulares, a menudo segmentaria o lobar.',
            'Broncograma aéreo: bronquios negros dentro de la opacidad.',
            'Sin pérdida importante de volumen, a diferencia de la atelectasia.',
            'Puede borrar bordes vecinos (signo de la silueta) según el lóbulo afectado.',
            'La imagen sola no basta: se correlaciona con fiebre, tos y análisis.'
        ],
        se_confunde_con: [
            { clase: 'Infiltracion', clave: 'La consolidación neumónica es más densa y con broncograma aéreo. La infiltración es más tenue y mal definida.' },
            { clase: 'Derrame Pleural', clave: 'El derrame es basal, con menisco y sin broncograma. La neumonía puede estar en cualquier lóbulo y muestra broncograma aéreo.' },
            { clase: 'Atelectasia', clave: 'La atelectasia retrae las estructuras vecinas. La neumonía no pierde volumen.' }
        ],
        errores_tipicos: [
            'Nombrar neumonía sin contexto: una consolidación también puede ser una atelectasia u otro proceso.',
            'Confundirla con un derrame: la neumonía tiene broncograma aéreo, el derrame no.'
        ],
        dato_clave: 'Consolidación más broncograma aéreo y sin retracción: piensa en neumonía.'
    },

    'Neumotorax': {
        nombre: 'Neumotórax',
        resumen: 'Presencia de aire en el espacio pleural que separa el pulmón de la pared torácica.',
        que_buscar: [
            'Una línea fina (la pleura visceral) separada de la pared del tórax.',
            'Ausencia de trama vascular entre esa línea y la pared.',
            'Zona más negra (hiperlucente) en la periferia, típicamente en el ápice si el paciente está de pie.',
            'En casos grandes, el pulmón colapsado se recoge hacia el hilio; si hay desplazamiento del mediastino, puede ser a tensión (urgencia).',
            'Revisa con atención los ápices y el borde lateral.'
        ],
        se_confunde_con: [
            { clase: 'Derrame Pleural', clave: 'Ambos separan el pulmón de la pared. El aire (neumotórax) es negro y sube al ápice; el líquido (derrame) es blanco y baja a la base.' },
            { clase: 'Infiltracion', clave: 'La infiltración es una opacidad blanca. El neumotórax es un área anormalmente negra, sin vasos.' },
            { clase: 'Atelectasia', clave: 'En el neumotórax el pulmón colapsado queda rodeado de aire negro y se ve su borde. En la atelectasia hay una opacidad con retracción.' }
        ],
        errores_tipicos: [
            'Confundir la línea pleural con un pliegue de piel o el borde de la escápula: la pleura visceral no tiene trama vascular por fuera de la línea.',
            'Pasarlo por alto cuando es pequeño y apical.'
        ],
        dato_clave: 'Una línea fina y sin trama vascular más allá de ella: neumotórax.'
    },

    'Nodulos': {
        nombre: 'Nódulos',
        resumen: 'Opacidad redonda u ovalada, bien definida y rodeada de pulmón, de hasta 3 cm. Si es mayor de 3 cm se llama masa.',
        que_buscar: [
            'Opacidad redonda con bordes definidos, rodeada de pulmón aireado.',
            'Tamaño: hasta 3 cm es nódulo; más de 3 cm, masa.',
            'Puede ser única o múltiple.',
            'Descarta imitadores frecuentes: pezones, botones, electrodos y vasos vistos de punta.',
            'Bordes lisos, espiculados o calcificados orientan la sospecha y se estudian después con tomografía.'
        ],
        se_confunde_con: [
            { clase: 'Infiltracion', clave: 'El nódulo tiene un borde neto y forma redonda. La infiltración es difusa y sin bordes claros.' },
            { clase: 'Atelectasia', clave: 'Una atelectasia redonda es rara y se asocia a la pleura. El nódulo típico es una esfera bien definida dentro del pulmón.' },
            { clase: 'Derrame Pleural', clave: 'Un derrame encapsulado pegado a la pared forma un ángulo obtuso con ella. Un nódulo dentro del pulmón está rodeado de pulmón y la toca con ángulo agudo.' }
        ],
        errores_tipicos: [
            'Tomar un pezón, un botón o un electrodo por un nódulo: mira si aparece simétrico o fuera del pulmón.',
            'Los nódulos pequeños se ocultan detrás de costillas y clavículas.'
        ],
        dato_clave: 'Redondo, bien definido y rodeado de aire: nódulo. Si dudas, sospecha primero un artefacto.'
    }
};

const CLASES = Object.keys(LECCIONES);

module.exports = { LECCIONES, CLASES };

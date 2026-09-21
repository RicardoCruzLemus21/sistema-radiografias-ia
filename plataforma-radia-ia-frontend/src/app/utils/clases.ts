// Categorías del banco (mismos nombres que las etiquetas reales de cada caso, sin tilde) y cómo se muestran.
export const CLASES = ['Normal', 'Atelectasia', 'Cardiomegalia', 'Derrame Pleural', 'Infiltracion', 'Neumonia', 'Neumotorax', 'Nodulos'];

export const NOMBRE_CLASE: Record<string, string> = {
  Infiltracion: 'Infiltración',
  Neumonia: 'Neumonía',
  Neumotorax: 'Neumotórax',
  Nodulos: 'Nódulos'
};

export const COLOR_CLASE: Record<string, string> = {
  'Normal': '#94a3b8',
  'Atelectasia': '#38bdf8',
  'Cardiomegalia': '#f472b6',
  'Derrame Pleural': '#34d399',
  'Infiltracion': '#fbbf24',
  'Neumonia': '#a78bfa',
  'Neumotorax': '#fb7185',
  'Nodulos': '#22d3ee'
};

export const nombreClase = (c: string): string => NOMBRE_CLASE[c] || c;
export const colorClase = (c: string): string => COLOR_CLASE[c] || '#94a3b8';

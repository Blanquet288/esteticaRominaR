import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const PRINT_LOGO_KEY = 'estetica-romina-print-logo';
const LOGO_MAX_BYTES = 800 * 1024;

export function getPrintLogo() {
  try {
    return localStorage.getItem(PRINT_LOGO_KEY) || '';
  } catch {
    return '';
  }
}

export function setPrintLogo(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(PRINT_LOGO_KEY, dataUrl);
    else localStorage.removeItem(PRINT_LOGO_KEY);
  } catch {
    // Cupo de localStorage agotado.
  }
}

export function emptyConfigMain() {
  return {
    nombreEmpresa: 'Estética Romina',
    ticketMensaje: '',
    dueno1Nombre: 'Socia 1',
    dueno2Nombre: 'Socia 2',
    logoDataUrl: '',
  };
}

export async function loadConfigMain() {
  const snapshot = await getDoc(doc(db, 'config', 'main'));
  const data = snapshot.exists() ? snapshot.data() : {};
  const logoDataUrl = data.logoDataUrl || getPrintLogo();
  if (data.logoDataUrl) setPrintLogo(data.logoDataUrl);

  return {
    nombreEmpresa: data.nombreEmpresa || 'Estética Romina',
    ticketMensaje: data.ticketMensaje || '',
    dueno1Nombre: data.dueno1Nombre || 'Socia 1',
    dueno2Nombre: data.dueno2Nombre || 'Socia 2',
    logoDataUrl,
  };
}

export async function saveConfigMain(payload) {
  await setDoc(
    doc(db, 'config', 'main'),
    {
      nombreEmpresa: String(payload.nombreEmpresa || '').trim() || 'Estética Romina',
      ticketMensaje: String(payload.ticketMensaje || '').trim(),
      dueno1Nombre: String(payload.dueno1Nombre || '').trim() || 'Socia 1',
      dueno2Nombre: String(payload.dueno2Nombre || '').trim() || 'Socia 2',
      actualizado: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveConfigLogo(logoDataUrl) {
  setPrintLogo(logoDataUrl);
  await setDoc(
    doc(db, 'config', 'main'),
    {
      logoDataUrl: logoDataUrl || '',
      actualizado: serverTimestamp(),
    },
    { merge: true },
  );
}

export function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Selecciona una imagen.'));
      return;
    }
    if (!String(file.type || '').startsWith('image/')) {
      reject(new Error('El archivo debe ser una imagen.'));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      reject(new Error('El logo debe pesar menos de 800 KB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function slugId(nombre) {
  const slug = String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'turno'}-${Date.now().toString(36).slice(-4)}`;
}

export function parseTurnosLista(data) {
  if (!data) return [];

  if (Array.isArray(data.lista)) {
    return data.lista
      .map((item, index) => ({
        id: String(item.id || item.turnoId || `turno-${index + 1}`),
        nombre: item.nombre || item.turnoNombre || item.label || `Turno ${index + 1}`,
        descripcion: item.descripcion || '',
        orden: Number(item.orden) || index + 1,
      }))
      .filter((item) => item.id && item.id !== '__descanso__')
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
  }

  const source = data.turnos || data.items || data;
  return Object.entries(source)
    .filter(([id]) => !['updatedAt', 'createdAt', 'ts', 'id', 'lista', 'turnos', 'items'].includes(id))
    .map(([id, value], index) => {
      if (typeof value === 'string') {
        return { id, nombre: value, descripcion: '', orden: index + 1 };
      }
      return {
        id: String(value?.id || value?.turnoId || id),
        nombre: value?.nombre || value?.turnoNombre || value?.label || id,
        descripcion: value?.descripcion || '',
        orden: Number(value?.orden) || index + 1,
      };
    })
    .filter((item) => item.id && item.id !== '__descanso__')
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
}

export async function loadTurnosLista() {
  const snapshot = await getDoc(doc(db, 'config', 'turnos'));
  return parseTurnosLista(snapshot.exists() ? snapshot.data() : {});
}

export async function saveTurnosLista(lista) {
  const normalized = lista
    .map((item, index) => ({
      id: item.id || slugId(item.nombre),
      nombre: String(item.nombre || '').trim(),
      descripcion: String(item.descripcion || '').trim(),
      orden: Number(item.orden) || index + 1,
    }))
    .filter((item) => item.nombre)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));

  await setDoc(doc(db, 'config', 'turnos'), {
    lista: normalized,
    actualizado: serverTimestamp(),
  });

  return normalized;
}

export function createTurnoId(nombre) {
  return slugId(nombre);
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, firebaseConfig } from './firebase';

export const PERMISOS_MODULOS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    children: [
      { key: 'dash_kpi_ventas', label: 'Tarjeta total de ventas' },
      { key: 'dash_kpi_gastos', label: 'Tarjeta total de gastos' },
      { key: 'dash_kpi_balance', label: 'Tarjeta balance y utilidad' },
      { key: 'dash_kpi_ahorro', label: 'Tarjeta fondo de ahorro' },
      { key: 'dash_grafica_ventas', label: 'Gráfica evolución diaria' },
      { key: 'dash_servicios', label: 'Gráfica distribución de servicios' },
    ],
  },
  {
    key: 'ventas',
    label: 'Registrar ventas',
    children: [
      { key: 'ventas_rapida', label: 'Venta rápida' },
      { key: 'ventas_corte_empleada', label: 'Corte masivo por empleada' },
      { key: 'ventas_cancelar', label: 'Eliminar / anular ventas' },
    ],
  },
  {
    key: 'gastos',
    label: 'Gastos',
    children: [
      { key: 'gastos_ver', label: 'Listar gastos', autoOn: true },
      { key: 'gastos_crear', label: 'Registrar nuevo gasto' },
      { key: 'gastos_eliminar', label: 'Eliminar gastos' },
    ],
  },
  {
    key: 'historial_ventas',
    label: 'Historial de ventas',
    children: [],
  },
  {
    key: 'finanzas',
    label: 'Finanzas y cierres',
    children: [
      {
        key: 'finanzas_rendimiento',
        label: 'Rendimiento por personal',
        children: [
          {
            key: 'rendimiento_vista_incentivos',
            label: 'Vista incentivos (servicios, comisiones y logros del personal)',
          },
          {
            key: 'rendimiento_vista_admin',
            label: 'Vista administrativa (métricas internas, costos y utilidad)',
          },
        ],
      },
      { key: 'finanzas_ahorro_movs', label: 'Movimientos de ahorro' },
      { key: 'finanzas_cierre_mensual', label: 'Cierre mensual y reparto' },
      { key: 'finanzas_reporte_anual', label: 'Reportes y métricas anuales' },
    ],
  },
  {
    key: 'catalogo',
    label: 'Catálogo',
    children: [
      { key: 'cat_ver', label: 'Ver catálogo', autoOn: true },
      { key: 'cat_crear_editar', label: 'Crear y editar servicios' },
      { key: 'cat_eliminar', label: 'Borrar servicios' },
    ],
  },
  {
    key: 'empleados',
    label: 'Empleadas',
    children: [
      { key: 'emp_ver', label: 'Ver directorio', autoOn: true },
      { key: 'emp_crear_editar', label: 'Crear y editar empleadas' },
      { key: 'emp_eliminar', label: 'Eliminar empleadas' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    children: [],
  },
  {
    key: 'usuarios_roles',
    label: 'Usuarios y roles',
    children: [],
  },
];

function flattenPermisoItems(items = []) {
  return items.flatMap((item) => [
    { key: item.key, label: item.label },
    ...flattenPermisoItems(item.children),
  ]);
}

export const PERMISOS_TODOS = PERMISOS_MODULOS.flatMap((modulo) => [
  { key: modulo.key, label: modulo.label },
  ...flattenPermisoItems(modulo.children),
]);
export const PERMISO_KEYS = PERMISOS_TODOS.map((item) => item.key);
export const DASHBOARD_PERMISO_KEYS = PERMISOS_MODULOS[0].children.map((item) => item.key);
export const PERMISOS_GRUPOS = PERMISOS_MODULOS;

const LEGACY_TO_NEW = {
  dashboard: DASHBOARD_PERMISO_KEYS,
  ventas: ['ventas_rapida', 'ventas_corte_empleada', 'ventas_cancelar'],
  gastos: ['gastos_ver', 'gastos_crear', 'gastos_eliminar'],
  historial_ventas: [],
  rendimiento: ['finanzas_rendimiento', 'rendimiento_vista_incentivos', 'rendimiento_vista_admin'],
  finanzas_rendimiento: ['rendimiento_vista_incentivos', 'rendimiento_vista_admin'],
  ahorro: ['finanzas_ahorro_movs'],
  cierre_mensual: ['finanzas_cierre_mensual'],
  reporte_anual: ['finanzas_reporte_anual'],
  catalogo: ['cat_ver', 'cat_crear_editar', 'cat_eliminar'],
  empleados: ['emp_ver', 'emp_crear_editar', 'emp_eliminar'],
  configuracion: [],
  config_general: ['configuracion'],
};

export const PERMISOS_DASHBOARD = PERMISOS_MODULOS[0].children;

export function emptyPermisos() {
  return Object.fromEntries(PERMISO_KEYS.map((key) => [key, false]));
}

export function allPermisos() {
  return Object.fromEntries(PERMISO_KEYS.map((key) => [key, true]));
}

export function childKeysOf(modulo) {
  return (modulo.children || []).map((item) => item.key);
}

export function descendantKeysOf(item) {
  return flattenPermisoItems(item?.children).map((entry) => entry.key);
}

export function patchNode(item, enabled) {
  const patch = { [item.key]: enabled === true };
  descendantKeysOf(item).forEach((key) => {
    patch[key] = false;
  });
  if (enabled) {
    (item.children || [])
      .filter((child) => child.autoOn)
      .forEach((child) => {
        patch[child.key] = true;
      });
  }
  return patch;
}

export function patchModulo(modulo, enabled) {
  return patchNode(modulo, enabled);
}

export function patchBloque(modulo, enabled) {
  const patch = {};
  descendantKeysOf(modulo).forEach((key) => {
    patch[key] = enabled === true;
  });
  if (enabled) patch[modulo.key] = true;
  return patch;
}

export function normalizePermisos(raw) {
  const base = emptyPermisos();
  if (!raw || typeof raw !== 'object') return base;

  PERMISO_KEYS.forEach((key) => {
    if (raw[key] === true) base[key] = true;
    if (raw[key] === false) base[key] = false;
  });

  Object.entries(LEGACY_TO_NEW).forEach(([legacy, children]) => {
    if (raw[legacy] !== true) return;
    if (PERMISO_KEYS.includes(legacy)) base[legacy] = true;
    if (!children.length) return;
    const alreadyGranular = children.some((child) => raw[child] !== undefined);
    if (alreadyGranular) return;
    children.forEach((child) => {
      base[child] = true;
    });
  });

  const inferParents = (item) => {
    const children = item.children || [];
    children.forEach(inferParents);
    if (children.some((child) => base[child.key])) {
      base[item.key] = true;
    }
  };
  PERMISOS_MODULOS.forEach(inferParents);

  if (raw.config_general === true) base.configuracion = true;

  const hadVentas =
    raw.ventas === true ||
    ['ventas_rapida', 'ventas_corte_empleada', 'ventas_cancelar'].some((key) => raw[key] === true);
  if (raw.historial_ventas === undefined && hadVentas) {
    base.historial_ventas = true;
  }

  return base;
}

export function slugifyRol(value) {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'rol';
}

function mapRol(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    nombre: data.nombre || snapshot.id,
    descripcion: data.descripcion || '',
    permisos: normalizePermisos(data.permisos),
  };
}

function mapUsuario(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    email: data.email || '',
    nombre: data.nombre || data.email?.split('@')[0] || 'Usuario',
    rolId: String(data.rolId || ''),
    activo: data.activo !== false,
  };
}

export function defaultAdminRolePayload() {
  return {
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema',
    permisos: allPermisos(),
  };
}

export async function ensureAdminRoleDoc() {
  const ref = doc(db, 'roles', 'admin');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, defaultAdminRolePayload());
  }
}

export async function ensureDefaultRoles() {
  const snapshot = await getDocs(query(collection(db, 'roles'), limit(1)));
  if (snapshot.empty) {
    await setDoc(doc(db, 'roles', 'admin'), defaultAdminRolePayload());
  }
}

export async function ensureUsuarioDoc(authUser) {
  const ref = doc(db, 'usuarios', authUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return mapUsuario(snap);

  await ensureAdminRoleDoc();
  await setDoc(ref, {
    email: authUser.email || '',
    nombre: authUser.displayName || authUser.email?.split('@')[0] || 'Administrador',
    rolId: 'admin',
    activo: true,
    ts: serverTimestamp(),
  });

  const created = await getDoc(ref);
  return mapUsuario(created);
}

export async function resolveSession(authUser) {
  await ensureDefaultRoles();
  const profile = await ensureUsuarioDoc(authUser);
  const roleSnap = await getDoc(doc(db, 'roles', profile.rolId || 'admin'));
  const role = roleSnap.exists()
    ? mapRol(roleSnap)
    : {
        id: profile.rolId || 'admin',
        nombre: profile.rolId || 'admin',
        descripcion: '',
        permisos: profile.rolId === 'admin' ? allPermisos() : emptyPermisos(),
      };

  return { profile, role, permissions: role.permisos };
}

export function subscribeRoles(onData, onError) {
  return onSnapshot(
    collection(db, 'roles'),
    (snapshot) => {
      const rows = snapshot.docs
        .map(mapRol)
        .sort((a, b) => {
          if (a.id === 'admin') return -1;
          if (b.id === 'admin') return 1;
          return a.nombre.localeCompare(b.nombre, 'es');
        });
      onData(rows);
    },
    (cause) => onError?.(cause),
  );
}

export function subscribeUsuarios(onData, onError) {
  return onSnapshot(
    collection(db, 'usuarios'),
    (snapshot) => {
      const rows = snapshot.docs
        .map(mapUsuario)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      onData(rows);
    },
    (cause) => onError?.(cause),
  );
}

export function subscribeUsuario(uid, onData, onError) {
  return onSnapshot(
    doc(db, 'usuarios', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(mapUsuario(snapshot));
    },
    (cause) => onError?.(cause),
  );
}

export function subscribeRol(rolId, onData, onError) {
  if (!rolId) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'roles', rolId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(mapRol(snapshot));
    },
    (cause) => onError?.(cause),
  );
}

export async function crearRol({ nombre, descripcion, permisos }) {
  const trimmed = String(nombre || '').trim();
  if (!trimmed) {
    throw new Error('Escribe el nombre del rol.');
  }

  const base = slugifyRol(trimmed);
  let id = base;
  let suffix = 2;
  while ((await getDoc(doc(db, 'roles', id))).exists()) {
    id = `${base}_${suffix}`;
    suffix += 1;
  }

  await setDoc(doc(db, 'roles', id), {
    nombre: trimmed,
    descripcion: String(descripcion || '').trim(),
    permisos: normalizePermisos(permisos),
  });

  return id;
}

export async function actualizarRol(id, payload) {
  const data = {};
  if (payload.nombre !== undefined) data.nombre = String(payload.nombre || '').trim();
  if (payload.descripcion !== undefined) {
    data.descripcion = String(payload.descripcion || '').trim();
  }
  if (payload.permisos !== undefined) data.permisos = normalizePermisos(payload.permisos);
  await updateDoc(doc(db, 'roles', id), data);
}

export async function actualizarPermisoRol(id, permisoKey, value) {
  if (!PERMISO_KEYS.includes(permisoKey)) return;
  await updateDoc(doc(db, 'roles', id), {
    [`permisos.${permisoKey}`]: value === true,
  });
}

export async function actualizarPermisosMasivo(id, patch) {
  const data = {};
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (!PERMISO_KEYS.includes(key)) return;
    data[`permisos.${key}`] = value === true;
  });
  if (!Object.keys(data).length) return;
  await updateDoc(doc(db, 'roles', id), data);
}

export async function actualizarUsuario(id, payload) {
  const data = {};
  if (payload.nombre !== undefined) data.nombre = String(payload.nombre || '').trim();
  if (payload.rolId !== undefined) data.rolId = String(payload.rolId || '').trim();
  if (payload.activo !== undefined) data.activo = payload.activo === true;
  await updateDoc(doc(db, 'usuarios', id), data);
}

const AUTH_CREATE_ERRORS = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/invalid-email': 'El correo electrónico no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/operation-not-allowed': 'El registro por correo no está habilitado en Firebase.',
};

export async function crearUsuarioSistema({ nombre, email, password, rolId }) {
  const trimmedName = String(nombre || '').trim();
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const trimmedPassword = String(password || '');
  const role = String(rolId || '').trim();

  if (!trimmedName) throw new Error('Escribe el nombre.');
  if (!trimmedEmail) throw new Error('Escribe el correo.');
  if (trimmedPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
  if (!role) throw new Error('Selecciona un rol.');

  const existing = getApps().find((item) => item.name === 'SecondaryApp');
  if (existing) await deleteApp(existing);

  const secondary = initializeApp(firebaseConfig, 'SecondaryApp');

  try {
    const secondaryAuth = getAuth(secondary);
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      trimmedEmail,
      trimmedPassword,
    );

    await setDoc(doc(db, 'usuarios', credential.user.uid), {
      nombre: trimmedName,
      email: trimmedEmail,
      rolId: role,
      activo: true,
      ts: serverTimestamp(),
    });

    return credential.user.uid;
  } catch (cause) {
    throw new Error(AUTH_CREATE_ERRORS[cause?.code] || cause?.message || 'No se pudo crear el usuario.');
  } finally {
    try {
      await deleteApp(secondary);
    } catch {
      // La instancia ya fue eliminada.
    }
  }
}

export async function enviarResetPassword(email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    throw new Error('Este usuario no tiene un correo para recuperar la contraseña.');
  }
  await sendPasswordResetEmail(auth, trimmed);
}

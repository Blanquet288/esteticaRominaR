import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  emptyPermisos,
  resolveSession,
  subscribeRol,
  subscribeUsuario,
} from '../services/rbacService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [userPermissions, setUserPermissions] = useState(emptyPermisos);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const unsubUserRef = useRef(null);
  const unsubRoleRef = useRef(null);

  const clearListeners = () => {
    unsubUserRef.current?.();
    unsubRoleRef.current?.();
    unsubUserRef.current = null;
    unsubRoleRef.current = null;
  };

  const applyRole = (nextRole, rolId) => {
    if (nextRole) {
      setRole(nextRole);
      setUserPermissions(nextRole.permisos || emptyPermisos());
      return;
    }
    setRole(rolId ? { id: rolId, nombre: rolId, descripcion: '', permisos: emptyPermisos() } : null);
    setUserPermissions(emptyPermisos());
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      clearListeners();
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setUserPermissions(emptyPermisos());
        setLoading(false);
        return;
      }

      setAccessError('');
      setLoading(true);

      try {
        const session = await resolveSession(currentUser);
        if (session.profile.activo === false) {
          setAccessError('Tu cuenta está inactiva. Contacta a la administradora.');
          setLoading(false);
          await signOut(auth);
          return;
        }

        setUser(currentUser);
        setProfile(session.profile);
        applyRole(session.role, session.profile.rolId);
        setLoading(false);

        unsubUserRef.current = subscribeUsuario(
          currentUser.uid,
          (nextProfile) => {
            if (!nextProfile) return;
            if (nextProfile.activo === false) {
              setAccessError('Tu cuenta está inactiva. Contacta a la administradora.');
              signOut(auth);
              return;
            }

            setProfile(nextProfile);
            unsubRoleRef.current?.();
            unsubRoleRef.current = subscribeRol(
              nextProfile.rolId,
              (nextRole) => applyRole(nextRole, nextProfile.rolId),
              (cause) => setAccessError(cause?.message || 'No se pudo cargar el rol.'),
            );
          },
          (cause) => setAccessError(cause?.message || 'No se pudo cargar el usuario.'),
        );
      } catch (cause) {
        setUser(currentUser);
        setProfile(null);
        setRole(null);
        setUserPermissions(emptyPermisos());
        setAccessError(cause?.message || 'No se pudo cargar el acceso.');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      clearListeners();
    };
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email.trim(), password);

  const logout = () => signOut(auth);

  const userRole = profile?.rolId || role?.id || '';

  const hasPermission = useCallback(
    (permisoKey) => {
      if (!permisoKey) return true;
      if (userRole === 'admin') return true;
      return userPermissions?.[permisoKey] === true;
    },
    [userRole, userPermissions],
  );

  const hasAnyPermission = useCallback(
    (keys = []) => {
      if (userRole === 'admin') return true;
      return keys.some((key) => userPermissions?.[key] === true);
    },
    [userRole, userPermissions],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      userRole,
      userPermissions,
      hasPermission,
      hasAnyPermission,
      loading,
      accessError,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, profile, role, userRole, userPermissions, hasPermission, hasAnyPermission, loading, accessError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}

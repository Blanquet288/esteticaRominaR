import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoRomina from '../../assets/RominaLetras.png';
import './LoginPage.css';

const AUTH_ERRORS = {
  'auth/invalid-email': 'El correo electrónico no es válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/user-not-found': 'No existe una cuenta con este correo.',
  'auth/wrong-password': 'La contraseña es incorrecta.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
};

function getAuthErrorMessage(error) {
  return AUTH_ERRORS[error?.code] || 'No se pudo iniciar sesión. Intenta de nuevo.';
}

export default function LoginPage() {
  const { login, accessError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  };

  const formError = error || accessError;

  return (
    <div className="login-screen">
      <section className="login-visual">
        <svg
          className="login-wave login-wave-fill"
          viewBox="0 0 800 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="loginWaveBack" x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0%" stopColor="#F7EFEA" />
              <stop offset="55%" stopColor="#E4B8B4" />
              <stop offset="100%" stopColor="#C48B9F" />
            </linearGradient>
            <linearGradient id="loginWaveFront" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F4EAE6" />
              <stop offset="42%" stopColor="#E8C4C0" />
              <stop offset="100%" stopColor="#B76B78" />
            </linearGradient>
          </defs>
          <path
            fill="url(#loginWaveBack)"
            d="M0 0 H760 C800 110 700 190 750 310 C800 430 680 510 740 640 C800 770 700 870 760 1000 H0 Z"
          />
          <path
            fill="url(#loginWaveFront)"
            d="M0 0 H640 C710 90 580 170 650 290 C720 410 560 490 630 620 C700 750 540 850 620 1000 H0 Z"
          />
        </svg>

        <svg
          className="login-wave login-wave-divider"
          viewBox="0 0 120 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="#FFFFFF"
            d="M120 0 L120 1000 L38 1000 C8 900 78 820 22 720 C-6 620 72 540 26 440 C-8 340 76 260 20 160 C6 80 58 36 42 0 Z"
          />
        </svg>

        <svg
          className="login-wave login-wave-mobile"
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="var(--color-bg-form)"
            d="M0 72 C240 140 420 8 720 64 C1020 120 1200 24 1440 80 L1440 160 L0 160 Z"
          />
        </svg>

        <div className="login-logo-wrap">
          <img
            src={logoRomina}
            alt="Estética Romina"
            className="login-logo"
          />
        </div>
      </section>

      <section className="login-form-column">
        <div className="login-panel">
          <header className="login-heading">
            <p className="login-kicker">Estética Romina</p>
            <h1>Bienvenida</h1>
            <p className="login-lead">
              Ingresa tus credenciales para acceder al panel
            </p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Correo electrónico</span>
              <div className="field-control">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="romina@estetica.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Contraseña</span>
              <div className="field-control">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {formError ? <p className="form-error">{formError}</p> : null}

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Entrar al panel'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

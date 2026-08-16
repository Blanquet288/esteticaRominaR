import { useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Minus,
  PiggyBank,
  Plus,
  X,
} from 'lucide-react';
import { formatMoney } from '../../services/dashboardService';
import useAhorro from './useAhorro';
import './AhorroPage.css';

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="ahorro-toast" role="status">
      {message}
    </div>
  );
}

function formatTableDate(value) {
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value || '—';
  return `${day}/${month}/${year}`;
}

export default function AhorroPage() {
  const ahorro = useAhorro();
  const isRetiro = ahorro.form.tipo === 'retiro';

  useEffect(() => {
    if (!ahorro.modalOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') ahorro.closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ahorro.modalOpen, ahorro.closeModal]);

  return (
    <div className="ahorro-page">
      <header className="ahorro-hero">
        <p className="ahorro-kicker">Reserva del negocio</p>
        <h2>Fondo de ahorro</h2>
        <p>Guarda depósitos y retiros de la reserva, con saldo siempre actualizado.</p>
      </header>

      {ahorro.error && !ahorro.modalOpen ? <p className="ahorro-error">{ahorro.error}</p> : null}

      <section className="saldo-card">
        <span>Saldo total disponible</span>
        <strong>{ahorro.loading ? '…' : formatMoney(ahorro.saldoActual)}</strong>
        <div className="saldo-actions">
          <button type="button" className="is-deposit" onClick={() => ahorro.openModal('deposito')}>
            <Plus size={16} />
            Aportar / Depositar
          </button>
          <button type="button" className="is-withdraw" onClick={() => ahorro.openModal('retiro')}>
            <Minus size={16} />
            Retirar fondos
          </button>
        </div>
      </section>

      <section className="historial-card">
        <div className="historial-heading">
          <h3>Historial de movimientos</h3>
          <p>Los más recientes aparecen primero.</p>
        </div>

        {ahorro.loading ? (
          <div className="ahorro-empty">Cargando historial…</div>
        ) : ahorro.historial.length ? (
          <div className="historial-wrap">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Motivo</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {ahorro.historial.map((item, index) => (
                  <tr key={`${item.fecha}-${item.tipo}-${index}`}>
                    <td>{formatTableDate(item.fecha)}</td>
                    <td>
                      <span className={`tipo-badge is-${item.tipo}`}>
                        {item.tipo === 'retiro' ? (
                          <ArrowDownLeft size={13} />
                        ) : (
                          <ArrowUpRight size={13} />
                        )}
                        {item.tipo === 'retiro' ? 'Retiro' : 'Depósito'}
                      </span>
                    </td>
                    <td>{item.motivo}</td>
                    <td className={`is-money is-${item.tipo}`}>
                      {item.tipo === 'retiro' ? '−' : '+'}
                      {formatMoney(item.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ahorro-empty">
            <PiggyBank size={22} />
            <p>Aún no hay movimientos en el fondo de ahorro.</p>
          </div>
        )}
      </section>

      {ahorro.modalOpen ? (
        <div className="ahorro-overlay" onClick={ahorro.closeModal} role="presentation">
          <form
            className="ahorro-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              ahorro.save();
            }}
          >
            <button
              type="button"
              className="ahorro-close"
              onClick={ahorro.closeModal}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <p className="ahorro-kicker">{isRetiro ? 'Salida de reserva' : 'Nuevo aporte'}</p>
            <h3>{isRetiro ? 'Retirar fondos' : 'Aportar / Depositar'}</h3>

            <label className="ahorro-field">
              <span>
                <CalendarDays size={14} /> Fecha
              </span>
              <input
                type="date"
                value={ahorro.form.fecha}
                onChange={(event) => ahorro.updateForm('fecha', event.target.value)}
                required
              />
            </label>

            <label className="ahorro-field">
              Monto ($ MXN)
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={ahorro.form.monto}
                onChange={(event) => ahorro.updateForm('monto', event.target.value)}
                required
              />
            </label>

            <label className="ahorro-field">
              Motivo / concepto
              <input
                type="text"
                placeholder={isRetiro ? 'Compra de equipo, imprevisto…' : 'Ahorro semanal, meta…'}
                value={ahorro.form.motivo}
                onChange={(event) => ahorro.updateForm('motivo', event.target.value)}
                required
              />
            </label>

            {isRetiro && ahorro.exceedsSaldo ? (
              <p className="ahorro-error">
                El retiro supera el saldo disponible ({formatMoney(ahorro.saldoActual)}).
              </p>
            ) : null}

            {ahorro.error ? <p className="ahorro-error">{ahorro.error}</p> : null}

            <button
              type="submit"
              className={`ahorro-submit ${isRetiro ? 'is-withdraw' : ''}`}
              disabled={ahorro.saving || ahorro.exceedsSaldo}
            >
              {ahorro.saving ? 'Guardando…' : isRetiro ? 'Confirmar retiro' : 'Confirmar depósito'}
            </button>
          </form>
        </div>
      ) : null}

      {ahorro.toast ? <Toast message={ahorro.toast} onClose={() => ahorro.setToast('')} /> : null}
    </div>
  );
}

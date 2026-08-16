import { useEffect } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { formatMoney } from '../../services/dashboardService';
import { GASTO_CATEGORIAS } from '../../services/gastosService';
import useGastos from './useGastos';
import './GastosPage.css';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="gastos-toast" role="status">
      {message}
    </div>
  );
}

function formatTableDate(value) {
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function GastosPage() {
  const gastos = useGastos();

  useEffect(() => {
    if (!gastos.modalOpen && !gastos.confirmId) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (gastos.confirmId) gastos.setConfirmId(null);
      else gastos.closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [gastos.modalOpen, gastos.confirmId, gastos.closeModal, gastos.setConfirmId]);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    new Set([...Array.from({ length: 7 }, (_, index) => currentYear - 3 + index), gastos.year]),
  ).sort((a, b) => a - b);

  return (
    <div className="gastos-page">
      <header className="gastos-hero">
        <div>
          <p className="gastos-kicker">Control de egresos</p>
          <h2>Gastos del mes</h2>
          <p>Registra fijos y operativos, y asígnalos a la semana en que se descontarán.</p>
        </div>
        <button type="button" className="gastos-add is-header" onClick={gastos.openCreate}>
          <Plus size={16} />
          Registrar gasto
        </button>
      </header>

      <section className="month-nav" aria-label="Mes y año">
        <button type="button" onClick={() => gastos.shiftMonth(-1)} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <select
          className="month-select"
          value={gastos.month}
          onChange={(event) => gastos.setMonth(Number(event.target.value))}
          aria-label="Mes"
        >
          {MONTHS.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="year-select"
          value={gastos.year}
          onChange={(event) => gastos.setYear(Number(event.target.value))}
          aria-label="Año"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => gastos.shiftMonth(1)} aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
      </section>

      {gastos.error ? <p className="gastos-error">{gastos.error}</p> : null}

      <section className="gastos-kpis">
        <article>
          <span>Total del mes</span>
          <strong>{formatMoney(gastos.summary.total)}</strong>
        </article>
        <article>
          <span>Gastos fijos</span>
          <strong>{formatMoney(gastos.summary.fijos)}</strong>
        </article>
        <article>
          <span>Gastos operativos</span>
          <strong>{formatMoney(gastos.summary.operativos)}</strong>
        </article>
      </section>

      <section className="week-grid">
        {[1, 2, 3, 4].map((week) => (
          <article key={week}>
            <span>Semana {week}</span>
            <strong>{formatMoney(gastos.summary.weeks[week])}</strong>
          </article>
        ))}
      </section>

      <button type="button" className="gastos-add is-inline" onClick={gastos.openCreate}>
        <Plus size={16} />
        Registrar nuevo gasto
      </button>

      <section className="gastos-table-card">
        {gastos.loading ? (
          <div className="gastos-empty">Cargando gastos…</div>
        ) : gastos.gastos.length ? (
          <div className="table-wrap">
            <table className="gastos-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Semana</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastos.gastos.map((item) => (
                  <tr key={item.id}>
                    <td>{formatTableDate(item.fecha)}</td>
                    <td>{item.concepto}</td>
                    <td>
                      <span className={`badge badge-${item.categoria.toLowerCase()}`}>
                        {item.categoria}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-week">Semana {item.semanaAsignada}</span>
                    </td>
                    <td className="is-money">{formatMoney(item.monto)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => gastos.openEdit(item)}
                          aria-label="Editar gasto"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => gastos.setConfirmId(item.id)}
                          aria-label="Eliminar gasto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gastos-empty">
            <Wallet size={22} />
            <p>Sin gastos registrados en {gastos.label}.</p>
          </div>
        )}
      </section>

      {gastos.modalOpen ? (
        <div className="gastos-overlay" onClick={gastos.closeModal} role="presentation">
          <form
            className="gastos-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              gastos.save();
            }}
          >
            <button
              type="button"
              className="gastos-close"
              onClick={gastos.closeModal}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <p className="gastos-kicker">
              {gastos.editingId ? 'Editar gasto' : 'Nuevo gasto'}
            </p>
            <h3>{gastos.editingId ? 'Actualizar registro' : 'Registrar egreso'}</h3>

            <label className="gastos-field">
              <span>
                <CalendarDays size={14} /> Fecha
              </span>
              <input
                type="date"
                value={gastos.form.fecha}
                onChange={(event) => gastos.updateForm('fecha', event.target.value)}
                required
              />
            </label>

            <label className="gastos-field">
              Categoría
              <select
                value={gastos.form.categoria}
                onChange={(event) => gastos.updateForm('categoria', event.target.value)}
              >
                {GASTO_CATEGORIAS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="gastos-field">
              Concepto
              <input
                type="text"
                placeholder="Renta local, tintes, luz…"
                value={gastos.form.concepto}
                onChange={(event) => gastos.updateForm('concepto', event.target.value)}
                required
              />
            </label>

            <div className="gastos-grid">
              <label className="gastos-field">
                Monto ($ MXN)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gastos.form.monto}
                  onChange={(event) => gastos.updateForm('monto', event.target.value)}
                  required
                />
              </label>
              <label className="gastos-field">
                Semana a descontar
                <select
                  value={gastos.form.semanaAsignada}
                  onChange={(event) =>
                    gastos.updateForm('semanaAsignada', Number(event.target.value))
                  }
                >
                  {[1, 2, 3, 4].map((week) => (
                    <option key={week} value={week}>
                      Semana {week}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" className="gastos-submit" disabled={gastos.saving}>
              {gastos.saving ? 'Guardando…' : gastos.editingId ? 'Guardar cambios' : 'Registrar gasto'}
            </button>
          </form>
        </div>
      ) : null}

      {gastos.confirmId ? (
        <div className="gastos-overlay" onClick={() => gastos.setConfirmId(null)} role="presentation">
          <div className="gastos-modal is-confirm" onClick={(event) => event.stopPropagation()}>
            <h3>¿Eliminar este gasto?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className="confirm-actions">
              <button type="button" onClick={() => gastos.setConfirmId(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={() => gastos.remove(gastos.confirmId)}
                disabled={gastos.saving}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {gastos.toast ? (
        <Toast message={gastos.toast} onClose={() => gastos.setToast('')} />
      ) : null}
    </div>
  );
}

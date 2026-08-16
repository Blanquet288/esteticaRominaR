import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Eraser,
  History,
  Scale,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { formatMoney } from '../../services/dashboardService';
import { BILL_DENOMS, WEEK_RANGES, parseCounts } from '../../services/calculadoraService';
import useCalculadoraBilletes from './useCalculadoraBilletes';
import './CalculadoraBilletesPage.css';

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
    <div className="calc-toast" role="status">
      {message}
    </div>
  );
}

function diffLabel(value) {
  if (value > 0) return 'Sobrante';
  if (value < 0) return 'Faltante';
  return 'Cuadrado';
}

function CountPicker({ picker, draft, setDraft, onClose, onAccept }) {
  const inputRef = useRef(null);
  const qty = Number(draft) || 0;
  const subtotal = picker.isCoins ? qty : qty * picker.unit;

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Enter') onAccept();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onAccept, onClose]);

  const add = (amount) => {
    setDraft(String(Math.max(0, qty + amount)));
  };

  return (
    <div className="calc-overlay" onClick={onClose} role="presentation">
      <form
        className="count-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onAccept();
        }}
      >
        <button type="button" className="calc-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        {picker.image ? (
          <img src={picker.image} alt="" className="count-modal-img" />
        ) : (
          <div className="count-modal-coin">
            <Coins size={36} />
          </div>
        )}
        <p className="calc-kicker">{picker.isCoins ? 'Monedas' : 'Billete'}</p>
        <h3>{picker.label} MXN</h3>
        <label className="count-field">
          {picker.isCoins ? 'Monto en pesos' : 'Cantidad de piezas'}
          <input
            ref={inputRef}
            type="number"
            min="0"
            step={picker.isCoins ? '0.01' : '1'}
            inputMode={picker.isCoins ? 'decimal' : 'numeric'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <div className="count-quick">
          <button type="button" onClick={() => add(1)}>+1</button>
          <button type="button" onClick={() => add(5)}>+5</button>
          <button type="button" onClick={() => add(10)}>+10</button>
          <button type="button" className="is-clear" onClick={() => setDraft('')}>
            Limpiar
          </button>
        </div>
        <p className="count-subtotal">
          {picker.isCoins
            ? `Monedas = ${formatMoney(subtotal)}`
            : `${qty} ${qty === 1 ? 'billete' : 'billetes'} = ${formatMoney(subtotal)}`}
        </p>
        <button type="submit" className="calc-btn">
          Listo / Aceptar
        </button>
      </form>
    </div>
  );
}

function BillGrid({ form, onPick }) {
  return (
    <div className="bill-grid">
      {BILL_DENOMS.map((bill) => {
        const qty = Number(form[bill.value]) || 0;
        const subtotal = qty * bill.value;
        return (
          <button
            key={bill.value}
            type="button"
            className={`bill-card ${qty ? 'has-count' : ''}`}
            onClick={() => onPick({ field: bill.value, label: bill.label, image: bill.image, unit: bill.value })}
          >
            <img src={bill.image} alt="" />
            <div className="bill-card-body">
              <strong>{bill.label}</strong>
              <em>{qty}</em>
              <small>{qty === 1 ? 'pieza' : 'piezas'} · {formatMoney(subtotal)}</small>
            </div>
          </button>
        );
      })}
      <button
        type="button"
        className={`bill-card is-coins ${Number(form.monedas) ? 'has-count' : ''}`}
        onClick={() => onPick({ field: 'monedas', label: 'Monedas ($)', isCoins: true, unit: 1 })}
      >
        <div className="coin-mark" aria-hidden="true">
          <Coins size={22} />
        </div>
        <div className="bill-card-body">
          <strong>Monedas</strong>
          <em>{formatMoney(Number(form.monedas) || 0)}</em>
          <small>Toque para capturar</small>
        </div>
      </button>
    </div>
  );
}

function MonthNav({ calc }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    new Set([...Array.from({ length: 7 }, (_, index) => currentYear - 3 + index), calc.year]),
  ).sort((a, b) => a - b);

  return (
    <section className="month-nav" aria-label="Mes y año">
      <button type="button" onClick={() => calc.shiftMonth(-1)} aria-label="Mes anterior">
        <ChevronLeft size={18} />
      </button>
      <select
        className="month-select"
        value={calc.month}
        onChange={(event) => calc.setMonth(Number(event.target.value))}
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
        value={calc.year}
        onChange={(event) => calc.setYear(Number(event.target.value))}
        aria-label="Año"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => calc.shiftMonth(1)} aria-label="Mes siguiente">
        <ChevronRight size={18} />
      </button>
    </section>
  );
}

function CalculadoraSkeleton() {
  return (
    <div className="calc-page">
      <div className="calc-skel calc-skel-title" />
      <div className="calc-skel calc-skel-nav" />
      <div className="bill-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="calc-skel calc-skel-bill" />
        ))}
      </div>
    </div>
  );
}

export default function CalculadoraBilletesPage() {
  const calc = useCalculadoraBilletes();
  const [picker, setPicker] = useState(null);
  const [draft, setDraft] = useState('');

  const openPicker = (item, currentValue, apply) => {
    setDraft(currentValue === 0 || currentValue === '0' ? '' : String(currentValue || ''));
    setPicker({ ...item, apply });
  };

  const closePicker = () => setPicker(null);

  const acceptPicker = () => {
    if (!picker) return;
    picker.apply(picker.field, draft);
    setPicker(null);
  };

  const libreCounts = parseCounts(calc.libreForm);
  const librePiezas = BILL_DENOMS.reduce((sum, bill) => sum + (libreCounts[bill.value] || 0), 0);

  if (calc.loading && calc.tab === 'arqueo' && !calc.showReparto) {
    return <CalculadoraSkeleton />;
  }

  return (
    <div className="calc-page">
      <header className="calc-hero">
        <p className="calc-kicker">Finanzas y cierres</p>
        <h2>Calculadora de billetes</h2>
        <p>Arqueo semanal, conteo libre y reparto 50/50 de las pacas.</p>
      </header>

      <nav className="calc-tabs" aria-label="Vistas de la calculadora">
        <button
          type="button"
          className={calc.tab === 'arqueo' ? 'is-active' : ''}
          onClick={() => calc.setTab('arqueo')}
        >
          <Scale size={16} />
          Arqueo por semanas
        </button>
        <button
          type="button"
          className={calc.tab === 'libre' ? 'is-active' : ''}
          onClick={() => calc.setTab('libre')}
        >
          <Wallet size={16} />
          Calculadora libre
        </button>
        <button
          type="button"
          className={calc.tab === 'historial' ? 'is-active' : ''}
          onClick={() => calc.setTab('historial')}
        >
          <History size={16} />
          Historial de arqueos
        </button>
      </nav>

      {calc.error ? <p className="calc-error">{calc.error}</p> : null}

      {calc.tab === 'arqueo' && !calc.showReparto ? (
        <div className="count-step">
          <p className="step-badge">Paso 1 · Conteo por semanas</p>
          <MonthNav calc={calc} />

          <div className="count-layout">
            <aside className="count-side">
              <nav className="week-pills" aria-label="Semana del mes">
                {WEEK_RANGES.map((item) => (
                  <button
                    key={item.semana}
                    type="button"
                    className={calc.week === item.semana ? 'is-active' : ''}
                    onClick={() => calc.setWeek(item.semana)}
                  >
                    Sem {item.semana}
                  </button>
                ))}
              </nav>

              <section className="cuadre-card">
                <p className="calc-kicker">Cuadre de caja · Semana {calc.week}</p>
                <div className="cuadre-stack">
                  <article>
                    <span>Esperado en sistema</span>
                    <strong>{formatMoney(calc.currentExpected)}</strong>
                  </article>
                  <article>
                    <span>Físico contado</span>
                    <strong>{formatMoney(calc.currentPhysical)}</strong>
                  </article>
                  <article className={calc.currentDiff === 0 ? 'is-ok' : 'is-diff'}>
                    <span>{diffLabel(calc.currentDiff)}</span>
                    <strong>{formatMoney(calc.currentDiff)}</strong>
                  </article>
                </div>
              </section>

              <section className="total-card">
                <span>Gran total físico del mes</span>
                <strong>{formatMoney(calc.summary.totalFisico)}</strong>
                <small>{calc.label}</small>
              </section>

              <button
                type="button"
                className="calc-btn is-process"
                onClick={() => calc.setShowReparto(true)}
                disabled={calc.summary.totalFisico <= 0}
              >
                <Sparkles size={16} />
                Procesar cierre y reparto
              </button>
            </aside>

            <section className="count-tray">
              <p className="tray-title">Conteo físico · Semana {calc.week}</p>
              <BillGrid
                form={calc.weekForms[calc.week]}
                onPick={(item) =>
                  openPicker(item, calc.weekForms[calc.week][item.field], calc.updateWeekCount)
                }
              />
            </section>
          </div>
        </div>
      ) : null}

      {calc.tab === 'arqueo' && calc.showReparto ? (
        <section className="reparto-panel is-step">
          <p className="step-badge">Paso 2 · Resultado de reparto 50/50</p>
          <h3>{calc.label}</h3>
          <div className="cuadre-grid">
            <article>
              <span>Total físico</span>
              <strong>{formatMoney(calc.split.totalFisico)}</strong>
            </article>
            <article>
              <span>Teórico del sistema</span>
              <strong>{formatMoney(calc.summary.totalTeorico)}</strong>
            </article>
            <article>
              <span>Meta 50%</span>
              <strong>
                {formatMoney(calc.split.meta)} / {formatMoney(calc.split.totalFisico - calc.split.meta)}
              </strong>
            </article>
          </div>

          <div className="reparto-cols">
            <article>
              <span>{calc.split.socio1.nombre}</span>
              <strong>{formatMoney(calc.split.socio1.monto)}</strong>
              <p>{calc.split.socio1.instruccion}</p>
              <ul>
                {calc.split.socio1.pacas.map((paca) => (
                  <li key={paca.semana}>
                    <em>Semana {paca.semana}</em>
                    {paca.texto}
                  </li>
                ))}
              </ul>
            </article>
            <article>
              <span>{calc.split.socio2.nombre}</span>
              <strong>{formatMoney(calc.split.socio2.monto)}</strong>
              <p>{calc.split.socio2.instruccion}</p>
              <ul>
                {calc.split.socio2.pacas.map((paca) => (
                  <li key={paca.semana}>
                    <em>Semana {paca.semana}</em>
                    {paca.texto}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="reparto-actions">
            <button type="button" className="calc-btn is-ghost" onClick={() => calc.setShowReparto(false)}>
              <ChevronLeft size={16} />
              Volver al conteo
            </button>
            <button type="button" className="calc-btn" onClick={calc.save} disabled={calc.saving}>
              {calc.saving ? 'Guardando…' : 'Confirmar y guardar en Firebase'}
            </button>
          </div>
        </section>
      ) : null}

      {calc.tab === 'libre' ? (
        <section className="count-step is-libre">
          <div className="count-layout">
            <aside className="count-side">
              <section className="libre-panel">
                <p className="calc-kicker">Conteo volátil</p>
                <h3>Arqueo rápido / libre</h3>
                <p>Conteo volátil en memoria (no afecta Firebase).</p>
                <strong className="libre-total">{formatMoney(calc.libreTotal)}</strong>
                <dl className="libre-breakdown">
                  <div>
                    <dt>Billetes físicos</dt>
                    <dd>{librePiezas} {librePiezas === 1 ? 'pieza' : 'piezas'}</dd>
                  </div>
                  <div>
                    <dt>Monedas</dt>
                    <dd>{formatMoney(libreCounts.monedas)}</dd>
                  </div>
                </dl>
              </section>
              <button type="button" className="calc-btn is-ghost is-clear" onClick={calc.resetLibre}>
                <Eraser size={16} />
                Limpiar calculadora / Poner a cero
              </button>
            </aside>

            <section className="count-tray">
              <p className="tray-title">Bandeja de billetes</p>
              <BillGrid
                form={calc.libreForm}
                onPick={(item) => openPicker(item, calc.libreForm[item.field], calc.updateLibreCount)}
              />
            </section>
          </div>
        </section>
      ) : null}

      {calc.tab === 'historial' ? (
        <section className="hist-list">
          {calc.historialError ? <p className="calc-error">{calc.historialError}</p> : null}
          {calc.historialLoading ? (
            Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="calc-skel calc-skel-hist" />
            ))
          ) : calc.historial.length ? (
            calc.historial.map((item) => {
              const socio1 = item.reparto?.socio1;
              const socio2 = item.reparto?.socio2;
              const diff = item.diferencia || item.totalFisico - item.totalTeoricoSistema;
              return (
                <article key={item.id} className="hist-card">
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.monthKey || item.id}</small>
                  </div>
                  <dl>
                    <div>
                      <dt>Gran total físico</dt>
                      <dd>{formatMoney(item.totalFisico)}</dd>
                    </div>
                    <div>
                      <dt>Teórico del sistema</dt>
                      <dd>{formatMoney(item.totalTeoricoSistema)}</dd>
                    </div>
                    <div>
                      <dt>{diffLabel(diff)}</dt>
                      <dd className={diff === 0 ? '' : 'is-diff'}>{formatMoney(diff)}</dd>
                    </div>
                  </dl>
                  {socio1 || socio2 ? (
                    <p>
                      {socio1?.nombre || 'Socio 1'}: {formatMoney(socio1?.monto)} ·{' '}
                      {socio2?.nombre || 'Socio 2'}: {formatMoney(socio2?.monto)}
                    </p>
                  ) : (
                    <p>Este mes tiene cierre, pero aún no hay reparto de pacas.</p>
                  )}
                  <div className="hist-actions">
                    <button
                      type="button"
                      className="calc-btn is-ghost"
                      onClick={() => calc.openHistorialMes(item)}
                    >
                      Ver / Modificar arqueo
                    </button>
                    <button
                      type="button"
                      className="calc-btn is-danger"
                      onClick={() => calc.askDelete(item)}
                    >
                      <Trash2 size={16} />
                      Eliminar arqueo
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="calc-empty">
              <History size={20} />
              <p>Aún no hay arqueos mensuales guardados.</p>
            </div>
          )}
        </section>
      ) : null}

      {picker ? (
        <CountPicker
          picker={picker}
          draft={draft}
          setDraft={setDraft}
          onClose={closePicker}
          onAccept={acceptPicker}
        />
      ) : null}

      {calc.confirmDelete ? (
        <div className="calc-overlay" onClick={calc.cancelDelete} role="presentation">
          <div className="calc-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="calc-close" onClick={calc.cancelDelete} aria-label="Cerrar">
              <X size={18} />
            </button>
            <p className="calc-kicker">Eliminar arqueo</p>
            <h3>¿Borrar {calc.confirmDelete.label}?</h3>
            <p>Se eliminará el documento {calc.confirmDelete.monthKey || calc.confirmDelete.id} de Firestore.</p>
            <div className="calc-confirm">
              <button type="button" onClick={calc.cancelDelete}>
                Cancelar
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={calc.remove}
                disabled={calc.saving}
              >
                {calc.saving ? 'Eliminando…' : 'Eliminar arqueo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {calc.toast ? <Toast message={calc.toast} onClose={() => calc.setToast('')} /> : null}
    </div>
  );
}

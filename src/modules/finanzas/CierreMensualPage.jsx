import { useEffect, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Printer,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { formatMoney } from '../../services/dashboardService';
import { formatDiaCorto } from '../../services/ventasService';
import CierreMensualPrint from './CierreMensualPrint';
import CierrePrintModal, { DEFAULT_CIERRE_SECTIONS } from './CierrePrintModal';
import useCierreMensual from './useCierreMensual';
import './CierreMensualPage.css';

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
    <div className="cierre-toast" role="status">
      {message}
    </div>
  );
}

function CierreSkeleton() {
  return (
    <div className="cierre-page">
      <div className="cierre-skel cierre-skel-title" />
      <div className="cierre-skel cierre-skel-nav" />
      <div className="week-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="cierre-skel cierre-skel-week" />
        ))}
      </div>
      <div className="cierre-skel cierre-skel-block" />
    </div>
  );
}

function ActionButtons({ cierre, inline, onPrint }) {
  return (
    <div className={`cierre-actions ${inline ? 'is-inline' : 'is-header'}`}>
      <button type="button" className="cierre-btn" onClick={cierre.save} disabled={cierre.saving}>
        <Save size={16} />
        {cierre.saving ? 'Guardando…' : 'Guardar cierre de mes'}
      </button>
      <button type="button" className="cierre-btn is-ghost" onClick={onPrint} disabled={!cierre.snapshot}>
        <Printer size={16} />
        Imprimir reporte de cierre
      </button>
      {cierre.saved ? (
        <button
          type="button"
          className="cierre-btn is-danger"
          onClick={() =>
            cierre.askDelete({
              monthKey: cierre.monthKey,
              id: cierre.monthKey,
              label: cierre.label,
            })
          }
        >
          <Trash2 size={16} />
          Eliminar cierre de este mes
        </button>
      ) : null}
    </div>
  );
}

export default function CierreMensualPage() {
  const cierre = useCierreMensual();
  const [printOpen, setPrintOpen] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const [printSections, setPrintSections] = useState(DEFAULT_CIERRE_SECTIONS);
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    new Set([...Array.from({ length: 7 }, (_, index) => currentYear - 3 + index), cierre.year]),
  ).sort((a, b) => a - b);

  const openPrint = () => {
    setPrintSections({
      ...DEFAULT_CIERRE_SECTIONS,
      anexo: Boolean(cierre.incluirDetalle),
    });
    setPrintOpen(true);
  };

  const togglePrintSection = (id) => {
    if (id === 'resumen') return;
    setPrintSections((current) => ({ ...current, [id]: !current[id] }));
  };

  const confirmPrint = () => {
    setPrintOpen(false);
    setPrintReady(true);
  };

  useEffect(() => {
    if (!printReady) return undefined;
    const timer = window.setTimeout(() => window.print(), 80);
    const reset = () => setPrintReady(false);
    window.addEventListener('afterprint', reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', reset);
    };
  }, [printReady]);

  useEffect(() => {
    if (!printOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setPrintOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [printOpen]);

  if (cierre.loading) {
    return <CierreSkeleton />;
  }

  const snapshot = cierre.snapshot;

  return (
    <div className="cierre-page">
      <header className="cierre-hero no-print">
        <div>
          <p className="cierre-kicker">Finanzas y cierres</p>
          <h2>Cierre mensual</h2>
          <p>Cuadra semanas, aparta ahorro y reparte la utilidad entre socias.</p>
        </div>
        <ActionButtons cierre={cierre} onPrint={openPrint} />
      </header>

      <section className="month-nav no-print" aria-label="Mes y año">
        <button type="button" onClick={() => cierre.shiftMonth(-1)} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <select
          className="month-select"
          value={cierre.month}
          onChange={(event) => cierre.setMonth(Number(event.target.value))}
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
          value={cierre.year}
          onChange={(event) => cierre.setYear(Number(event.target.value))}
          aria-label="Año"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => cierre.shiftMonth(1)} aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
      </section>

      <ActionButtons cierre={cierre} inline onPrint={openPrint} />

      {cierre.error ? <p className="cierre-error no-print">{cierre.error}</p> : null}

      {cierre.saved ? (
        <p className="cierre-saved no-print">Este mes ya tiene un cierre guardado. Puedes actualizarlo.</p>
      ) : null}

      {snapshot ? (
        <>
          <section className="impact-card no-print">
            <p className="impact-kicker">Indicador clave del periodo</p>
            <h3>Ganancia neta del mes</h3>
            <p className="impact-formula">
              (Ventas totales brutas) − (Comisiones) − (Gastos) = Utilidad neta del estudio
            </p>
            <div className="impact-kpis">
              <article>
                <span>Ventas totales</span>
                <strong>{formatMoney(snapshot.totales.ventasBrutas)}</strong>
              </article>
              <article>
                <span>Comisiones pagadas</span>
                <strong>{formatMoney(snapshot.totales.comisionesPagadas)}</strong>
              </article>
              <article>
                <span>Gastos (fijos + operativos)</span>
                <strong>{formatMoney(snapshot.totales.totalGastos)}</strong>
              </article>
            </div>
            <div className="impact-result">
              <span>Utilidad neta del estudio</span>
              <strong>
                {formatMoney(
                  snapshot.totales.ventasBrutas -
                    snapshot.totales.comisionesPagadas -
                    snapshot.totales.totalGastos,
                )}
              </strong>
            </div>
          </section>

          <section className="cierre-section no-print">
            <div className="cierre-section-head">
              <p className="cierre-kicker">Sección 1</p>
              <h3>Cuadre por semana</h3>
            </div>
            <div className="week-grid">
              {snapshot.cuadrePorSemana.map((week) => (
                <article key={week.semana} className="week-card">
                  <span>Semana {week.semana}</span>
                  <strong>{week.rango}</strong>
                  <dl>
                    <div>
                      <dt>Neto del negocio</dt>
                      <dd>{formatMoney(week.neto)}</dd>
                    </div>
                    <div>
                      <dt>Gastos asignados</dt>
                      <dd>{formatMoney(week.gastos)}</dd>
                    </div>
                    <div>
                      <dt>Caja semanal</dt>
                      <dd className={week.balance < 0 ? 'is-neg' : ''}>{formatMoney(week.balance)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="cierre-section no-print">
            <div className="cierre-section-head">
              <p className="cierre-kicker">Sección 2</p>
              <h3>Resumen financiero</h3>
            </div>
            <div className="cierre-kpis">
              <article>
                <span>Ventas brutas</span>
                <strong>{formatMoney(snapshot.totales.ventasBrutas)}</strong>
              </article>
              <article>
                <span>Comisiones</span>
                <strong>{formatMoney(snapshot.totales.comisionesPagadas)}</strong>
              </article>
              <article>
                <span>Gastos totales</span>
                <strong>{formatMoney(snapshot.totales.totalGastos)}</strong>
              </article>
              <article className="is-input">
                <span>
                  <PiggyBank size={14} /> Ahorro aportado
                </span>
                <label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cierre.fondoAhorro}
                    onChange={(event) => cierre.setFondoAhorro(event.target.value)}
                    aria-label="Ahorro aportado"
                  />
                </label>
              </article>
              <article className="is-accent">
                <span>Utilidad final</span>
                <strong>{formatMoney(snapshot.totales.utilidadNeta)}</strong>
              </article>
            </div>
          </section>

          <section className="cierre-section no-print">
            <div className="cierre-section-head">
              <p className="cierre-kicker">Sección 3</p>
              <h3>Reparto de socios</h3>
            </div>
            <nav className="cierre-toggle" aria-label="Modalidad de reparto">
              <button
                type="button"
                className={cierre.modalidad === '2_socios' ? 'is-active' : ''}
                onClick={() => cierre.setModalidad('2_socios')}
              >
                2 socias · 50/50
              </button>
              <button
                type="button"
                className={cierre.modalidad === '1_socio' ? 'is-active' : ''}
                onClick={() => cierre.setModalidad('1_socio')}
              >
                1 socia
              </button>
            </nav>
            <div className={`reparto-grid ${cierre.modalidad === '1_socio' ? 'is-one' : ''}`}>
              <article>
                <span>{snapshot.reparto.socio1.nombre}</span>
                <strong>{formatMoney(snapshot.reparto.socio1.monto)}</strong>
                <small>{cierre.modalidad === '2_socios' ? '50% de la utilidad' : '100% de la utilidad'}</small>
              </article>
              {cierre.modalidad === '2_socios' ? (
                <article>
                  <span>{snapshot.reparto.socio2.nombre}</span>
                  <strong>{formatMoney(snapshot.reparto.socio2.monto)}</strong>
                  <small>50% de la utilidad</small>
                </article>
              ) : null}
            </div>
          </section>

          <section className="cierre-section no-print">
            <div className="cierre-section-head is-split">
              <div>
                <p className="cierre-kicker">Sección 4</p>
                <h3>Ganancias diarias por empleada</h3>
              </div>
              <button
                type="button"
                className={`detail-toggle ${cierre.mostrarDetalleDiario ? 'is-open' : ''}`}
                onClick={() => cierre.setMostrarDetalleDiario((current) => !current)}
                aria-expanded={cierre.mostrarDetalleDiario}
              >
                {cierre.mostrarDetalleDiario ? 'Ocultar detalle' : 'Ver detalle diario'}
                <ChevronDown size={16} />
              </button>
            </div>
            <label className={`cierre-switch ${cierre.incluirDetalle ? 'is-on' : ''}`}>
              <input
                type="checkbox"
                checked={cierre.incluirDetalle}
                onChange={(event) => cierre.setIncluirDetalle(event.target.checked)}
              />
              <span className="cierre-switch-ui" aria-hidden="true" />
              Incluir anexo diario en el reporte final
            </label>

            {cierre.mostrarDetalleDiario ? (
              snapshot.dias.length ? (
                <div className="cierre-table-wrap is-scroll is-daily">
                  <table className="cierre-table is-daily">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>
                          <span className="th-short">Emp.</span>
                          <span className="th-long">Colaboradora</span>
                        </th>
                        <th>
                          <span className="th-short">Comisión</span>
                          <span className="th-long">Se llevó</span>
                        </th>
                        <th>Negocio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.dias.flatMap((day) =>
                        day.rows.map((row, index) => (
                          <tr key={`${day.fecha}-${row.idEmpleado}`}>
                            <td>
                              {index === 0 ? (
                                <>
                                  <span className="dia-short">{formatDiaCorto(day.fecha)}</span>
                                  <span className="dia-long">{day.label}</span>
                                </>
                              ) : null}
                            </td>
                            <td className="is-name">{row.nombre}</td>
                            <td className="is-money">{formatMoney(row.comision)}</td>
                            <td className="is-money">{formatMoney(row.utilidad)}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cierre-empty">
                  <Calculator size={20} />
                  <p>
                    {cierre.hayMovimientos
                      ? 'Hay gastos en el mes, pero no hay ventas para el anexo diario.'
                      : `No hay ventas ni gastos registrados en ${cierre.label}.`}
                  </p>
                </div>
              )
            ) : null}
          </section>
        </>
      ) : null}

      {cierre.confirmDelete ? (
        <div className="cierre-overlay no-print" onClick={cierre.cancelDelete} role="presentation">
          <div className="cierre-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="cierre-close" onClick={cierre.cancelDelete} aria-label="Cerrar">
              <X size={18} />
            </button>
            <p className="cierre-kicker">Acción irreversible</p>
            <h3>Confirmar eliminación de cierre mensual</h3>
            <p>
              Estás a punto de borrar el registro oficial del mes{' '}
              <strong>{cierre.confirmDelete.label}</strong>. Se perderá el desglose de semanas, el
              arqueo de efectivo y el reparto de socias.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (cierre.canDelete) cierre.remove();
              }}
            >
              <label className="cierre-field">
                Para continuar, escribe la palabra ELIMINAR en el campo inferior:
                <input
                  type="text"
                  autoComplete="off"
                  autoFocus
                  placeholder="Escribe ELIMINAR"
                  value={cierre.confirmText}
                  onChange={(event) => cierre.setConfirmText(event.target.value)}
                />
              </label>
              <div className="cierre-confirm">
                <button type="button" onClick={cierre.cancelDelete}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="is-danger"
                  disabled={!cierre.canDelete || cierre.saving}
                >
                  {cierre.saving ? 'Eliminando…' : 'Eliminar definitivamente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {printOpen ? (
        <CierrePrintModal
          sections={printSections}
          onToggle={togglePrintSection}
          onClose={() => setPrintOpen(false)}
          onPrint={confirmPrint}
        />
      ) : null}

      {cierre.toast ? <Toast message={cierre.toast} onClose={() => cierre.setToast('')} /> : null}

      {printReady ? (
        <CierreMensualPrint
          snapshot={snapshot}
          label={cierre.label}
          empresa={cierre.config.nombreEmpresa}
          saved={Boolean(cierre.saved)}
          logo={cierre.config.logoDataUrl}
          sections={printSections}
        />
      ) : null}
    </div>
  );
}

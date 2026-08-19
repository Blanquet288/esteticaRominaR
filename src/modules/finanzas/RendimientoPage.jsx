import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Printer,
  ShieldOff,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { formatMoney } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import '../../components/ui/ModulePlaceholder.css';
import RendimientoPrint from './RendimientoPrint';
import RendimientoReportModal from './RendimientoReportModal';
import useRendimiento from './useRendimiento';
import './RendimientoPage.css';

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

const CHART_COLORS = ['#7e3544', '#c48b9f', '#c9a96e', '#c47c65', '#9e5a63', '#d7b7b0'];

function roleClass(rol) {
  return `role-${String(rol || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')}`;
}

function ChartTooltip({ active, payload, hideMoney }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rend-tooltip">
      <strong>{item.name}</strong>
      <span>
        {item.cantidad} {item.cantidad === 1 ? 'servicio' : 'servicios'}
      </span>
      {hideMoney ? null : <span>{formatMoney(item.monto)}</span>}
    </div>
  );
}

function RendimientoSkeleton() {
  return (
    <div className="rend-page">
      <div className="rend-skel rend-skel-title" />
      <div className="rend-skel rend-skel-nav" />
      <div className="rend-kpis">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rend-skel rend-skel-kpi" />
        ))}
      </div>
      <div className="staff-grid">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rend-skel rend-skel-card" />
        ))}
      </div>
    </div>
  );
}

export default function RendimientoPage() {
  const data = useRendimiento();
  const { hasPermission } = useAuth();
  const canIncentivos = hasPermission('rendimiento_vista_incentivos');
  const canAdmin = hasPermission('rendimiento_vista_admin');
  const canBothViews = canIncentivos && canAdmin;
  const [reportOpen, setReportOpen] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const [scope, setScope] = useState('equipo');
  const [format, setFormat] = useState('recibos');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState(() => (canAdmin ? 'admin' : 'incentivos'));
  const incentives = view === 'incentivos';
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    new Set([...Array.from({ length: 7 }, (_, index) => currentYear - 3 + index), data.year]),
  ).sort((a, b) => a - b);

  const staffWithSales = data.staff.filter((item) => item.servicios > 0);
  const teamServicios = data.totals.servicios || 1;
  const topId = useMemo(() => {
    if (!staffWithSales.length) return '';
    return [...staffWithSales].sort((a, b) => b.bruto - a.bruto || b.servicios - a.servicios)[0].id;
  }, [staffWithSales]);

  const staffForUi = data.staff.map((item) => ({
    ...item,
    aportePct: item.servicios ? Math.round((item.servicios / teamServicios) * 100) : 0,
  }));

  const printableStaff = staffForUi.filter(
    (item) => item.servicios > 0 && selectedIds.includes(item.id),
  );

  const openReport = (presetId = '') => {
    const ids = presetId
      ? [presetId]
      : staffWithSales.map((item) => item.id);
    setScope(presetId ? 'especifico' : 'equipo');
    setFormat(presetId ? 'recibos' : 'recibos');
    setSelectedIds(ids);
    setSearch('');
    setPrintReady(false);
    setReportOpen(true);
  };

  const changeScope = (next) => {
    setScope(next);
    if (next === 'equipo') {
      setSelectedIds(staffWithSales.map((item) => item.id));
      return;
    }
    if (next === 'especifico') {
      setSelectedIds((current) =>
        current[0] ? [current[0]] : staffWithSales[0] ? [staffWithSales[0].id] : [],
      );
    }
  };

  const toggleId = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const confirmPrint = () => {
    if (!selectedIds.length) return;
    setReportOpen(false);
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
    if (view === 'admin' && !canAdmin && canIncentivos) setView('incentivos');
    if (view === 'incentivos' && !canIncentivos && canAdmin) setView('admin');
  }, [view, canAdmin, canIncentivos]);

  useEffect(() => {
    if (!reportOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setReportOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reportOpen]);

  if (!canIncentivos && !canAdmin) {
    return (
      <section className="module-placeholder">
        <div className="placeholder-icon">
          <ShieldOff size={28} />
        </div>
        <h3>Acceso no autorizado</h3>
        <p>Tu rol puede entrar a Finanzas, pero no tiene una vista de rendimiento asignada.</p>
      </section>
    );
  }

  if (data.loading) {
    return <RendimientoSkeleton />;
  }

  return (
    <div className="rend-page">
      <header className="rend-hero no-print">
        <div>
          <p className="rend-kicker">Finanzas y cierres</p>
          <h2>Rendimiento por personal</h2>
          <p>
            {incentives
              ? 'Modo incentivos: servicios, comisiones y logros. Sin métricas internas del negocio.'
              : 'Comisiones congeladas por venta, utilidad del negocio y servicio estrella del mes.'}
          </p>
        </div>
        <button
          type="button"
          className="print-btn"
          onClick={() => openReport()}
          disabled={!data.hayVentas}
        >
          <Printer size={16} />
          Generar reporte
        </button>
      </header>

      {canBothViews ? (
        <nav className="view-toggle no-print" aria-label="Tipo de vista">
          <button
            type="button"
            className={incentives ? 'is-active' : ''}
            onClick={() => setView('incentivos')}
          >
            Vista incentivos
          </button>
          <button
            type="button"
            className={!incentives ? 'is-active' : ''}
            onClick={() => setView('admin')}
          >
            Vista administrativa
          </button>
        </nav>
      ) : null}

      <section className="month-nav no-print" aria-label="Mes y año">
        <button type="button" onClick={() => data.shiftMonth(-1)} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <select
          className="month-select"
          value={data.month}
          onChange={(event) => data.setMonth(Number(event.target.value))}
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
          value={data.year}
          onChange={(event) => data.setYear(Number(event.target.value))}
          aria-label="Año"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => data.shiftMonth(1)} aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
      </section>

      {data.error ? <p className="rend-error no-print">{data.error}</p> : null}

      <section className={`rend-kpis no-print ${incentives ? 'is-two' : ''}`}>
        {incentives ? null : (
          <article>
            <span>Total generado por el equipo</span>
            <strong>{formatMoney(data.totals.bruto)}</strong>
          </article>
        )}
        <article>
          <span>{incentives ? 'Total comisión a pagar' : 'Comisiones del mes'}</span>
          <strong>{formatMoney(data.totals.comision)}</strong>
        </article>
        {incentives ? (
          <article>
            <span>Servicios del equipo</span>
            <strong>{data.totals.servicios}</strong>
          </article>
        ) : (
          <article>
            <span>Utilidad neta del negocio</span>
            <strong>{formatMoney(data.totals.utilidad)}</strong>
          </article>
        )}
      </section>

      {!data.staff.length ? (
        <div className="rend-empty no-print">
          <Sparkles size={22} />
          <p>No hay colaboradoras registradas.</p>
        </div>
      ) : (
        <>
          {!data.hayVentas ? (
            <div className="rend-empty is-soft no-print">
              <Sparkles size={22} />
              <p>Sin ventas registradas en {data.label}.</p>
            </div>
          ) : null}
          <section className="staff-grid no-print">
            {staffForUi.map((item) => {
              const isActive = data.selectedId === item.id;
              const isTop = item.id === topId && item.servicios > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`staff-card ${isActive ? 'is-active' : ''} ${item.servicios ? '' : 'is-empty'}`}
                  onClick={() => data.setSelectedId(item.id)}
                >
                  <div className="staff-card-top">
                    <span className="staff-avatar">{item.inicial}</span>
                    <div>
                      <strong>{item.nombre}</strong>
                      <em className={`staff-role ${roleClass(item.rol)}`}>{item.rol}</em>
                    </div>
                    <ChevronDown size={16} className={`staff-caret ${isActive ? 'is-open' : ''}`} />
                  </div>
                  <div className={`staff-metrics ${incentives ? 'is-two' : ''}`}>
                    {incentives ? null : (
                      <div>
                        <span>Facturado</span>
                        <b>{formatMoney(item.bruto)}</b>
                      </div>
                    )}
                    <div>
                      <span>Comisión</span>
                      <b className="is-commission">{formatMoney(item.comision)}</b>
                    </div>
                    {incentives ? (
                      <div>
                        <span>Servicios</span>
                        <b>{item.servicios}</b>
                      </div>
                    ) : (
                      <div>
                        <span>Utilidad</span>
                        <b>{formatMoney(item.utilidad)}</b>
                      </div>
                    )}
                  </div>
                  {item.estrella ? (
                    <p className="star-badge">
                      <Sparkles size={13} />
                      {item.estrella.name} ({item.estrella.cantidad}{' '}
                      {item.estrella.cantidad === 1 ? 'servicio' : 'servicios'})
                    </p>
                  ) : (
                    <p className="star-badge is-muted">Sin servicios este mes</p>
                  )}
                  {incentives && isTop ? (
                    <p className="star-badge is-top">Mayor rendimiento del mes</p>
                  ) : null}
                  <p className={`star-badge ${item.inasistencias ? '' : 'is-muted'}`}>
                    Inasistencias en el mes: {item.inasistencias}
                  </p>
                </button>
              );
            })}
          </section>

          {data.selected ? (
            <section className="detail-card no-print">
              <div className="detail-heading">
                <div>
                  <h3>{data.selected.nombre}</h3>
                  <p>
                    {data.selected.servicios}{' '}
                    {data.selected.servicios === 1 ? 'servicio' : 'servicios'} en {data.label}
                    {' · '}
                    Inasistencias en el mes: {data.selected.inasistencias}
                    {data.selected.inasistencias
                      ? ` (${data.selected.faltas} ${data.selected.faltas === 1 ? 'falta' : 'faltas'}, ${data.selected.permisos} ${data.selected.permisos === 1 ? 'permiso' : 'permisos'})`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="print-btn is-ghost"
                  onClick={() => openReport(data.selected.id)}
                  disabled={!data.selected.servicios}
                >
                  <Printer size={16} />
                  Generar reporte
                </button>
              </div>

              {data.selected.servicios ? (
                <div className="detail-layout">
                  <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.selected.desglose}
                          dataKey="cantidad"
                          nameKey="name"
                          innerRadius={48}
                          outerRadius={74}
                          paddingAngle={3}
                        >
                          {data.selected.desglose.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip hideMoney={incentives} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="detail-table-wrap">
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Servicio realizado</th>
                          <th>Cantidad</th>
                          {incentives ? null : <th>Subtotal</th>}
                          <th>Comisión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.selected.desglose.map((row) => (
                          <tr key={row.name}>
                            <td>{row.name}</td>
                            <td>{row.cantidad}</td>
                            {incentives ? null : <td>{formatMoney(row.monto)}</td>}
                            <td>{formatMoney(row.comision)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {incentives ? (
                      <p className="commission-total">
                        Total comisión a pagar: <strong>{formatMoney(data.selected.comision)}</strong>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rend-empty is-soft">
                  <Users size={20} />
                  <p>Esta empleada no tiene ventas en {data.label}.</p>
                </div>
              )}
            </section>
          ) : null}
        </>
      )}

      <p className="rend-note no-print">
        <TrendingUp size={14} />
        Las comisiones se leen de cada venta y no se recalculan.
      </p>

      {reportOpen ? (
        <RendimientoReportModal
          staff={staffWithSales}
          scope={scope}
          format={format}
          view={view}
          selectedIds={selectedIds}
          search={search}
          allowedViews={[
            canIncentivos ? 'incentivos' : null,
            canAdmin ? 'admin' : null,
          ].filter(Boolean)}
          onScope={changeScope}
          onFormat={setFormat}
          onView={setView}
          onToggle={toggleId}
          onSearch={setSearch}
          onPickOne={(id) => setSelectedIds([id])}
          onClose={() => setReportOpen(false)}
          onPrint={confirmPrint}
        />
      ) : null}

      <RendimientoPrint
        ready={printReady}
        format={format}
        view={view}
        period={data.label}
        staff={printableStaff}
        logo={data.logo}
      />
    </div>
  );
}

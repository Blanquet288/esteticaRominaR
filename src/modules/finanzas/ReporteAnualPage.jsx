import { Link } from 'react-router-dom';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { formatMoney } from '../../services/dashboardService';
import ReporteAnualPrint from './ReporteAnualPrint';
import useReporteAnual from './useReporteAnual';
import './ReporteAnualPage.css';

const RANK_COLORS = ['#7E3544', '#9e5a63', '#C48B9F', '#c47c65', '#c9a96e', '#d7b7b0'];

function formatCompact(value) {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);
  if (abs >= 10000) return `$${(amount / 1000).toFixed(0)}k`;
  if (abs >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return formatMoney(amount);
}

function initials(nombre) {
  const parts = String(nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'E';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="anual-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}>
          {item.name}: {formatMoney(item.value)}
        </span>
      ))}
    </div>
  );
}

function RankTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="anual-tooltip">
      <strong>
        #{item.puesto} {item.nombre}
      </strong>
      <span>{formatMoney(item.ventas)}</span>
      <span>{item.aportePct}% del total anual</span>
    </div>
  );
}

function AnualSkeleton() {
  return (
    <div className="anual-page">
      <div className="anual-skel anual-skel-title" />
      <div className="anual-skel anual-skel-nav" />
      <div className="anual-kpis">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="anual-skel anual-skel-kpi" />
        ))}
      </div>
      <div className="anual-skel anual-skel-chart" />
      <div className="anual-skel anual-skel-chart" />
      <div className="anual-skel anual-skel-table" />
    </div>
  );
}

export default function ReporteAnualPage() {
  const data = useReporteAnual();
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    new Set([...Array.from({ length: 7 }, (_, index) => currentYear - 3 + index), data.year]),
  ).sort((a, b) => a - b);

  if (data.loading) {
    return <AnualSkeleton />;
  }

  const chartHeight = Math.max(240, data.ranking.length * 42 + 48);

  return (
    <div className="anual-page">
      <header className="anual-hero no-print">
        <div>
          <p className="anual-kicker">Finanzas y cierres</p>
          <h2>Métricas y Análisis Anual</h2>
          <p>Evolución de facturación, gastos y utilidad neta del estudio a lo largo del año.</p>
        </div>
      </header>

      <div className="anual-toolbar no-print">
        <section className="month-nav" aria-label="Año">
          <button type="button" onClick={() => data.shiftYear(-1)} aria-label="Año anterior">
            <ChevronLeft size={18} />
          </button>
          <select
            className="year-select is-wide"
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
          <button type="button" onClick={() => data.shiftYear(1)} aria-label="Año siguiente">
            <ChevronRight size={18} />
          </button>
        </section>
        <button type="button" className="anual-print-btn" onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir Reporte Anual
        </button>
      </div>

      {data.error ? <p className="anual-error no-print">{data.error}</p> : null}

      <section className="anual-kpis no-print">
        <article style={{ animationDelay: '0.04s' }}>
          <span>Facturación total del año</span>
          <strong>{formatMoney(data.totals.ventas)}</strong>
        </article>
        <article style={{ animationDelay: '0.08s' }}>
          <span>Gastos totales del año</span>
          <strong>{formatMoney(data.totals.gastos)}</strong>
        </article>
        <article className="is-accent" style={{ animationDelay: '0.12s' }}>
          <span>Ganancia neta anual</span>
          <strong>{formatMoney(data.totals.gananciaNeta)}</strong>
        </article>
        <article className="is-record" style={{ animationDelay: '0.16s' }}>
          <span>
            <Trophy size={13} /> Mes récord
          </span>
          <strong>{data.mesEstrella ? data.mesEstrella.label : '—'}</strong>
          <small>
            {data.mesEstrella ? formatMoney(data.mesEstrella.ventas) : 'Sin ventas registradas'}
          </small>
          {data.mesEstrella ? <em className="anual-badge is-best">Mejor mes</em> : null}
        </article>
        <article className="is-low" style={{ animationDelay: '0.2s' }}>
          <span>
            <TrendingDown size={13} /> Mes más bajo
          </span>
          <strong>{data.mesMenor ? data.mesMenor.label : '—'}</strong>
          <small>
            {data.mesMenor ? formatMoney(data.mesMenor.ventas) : 'Sin ventas registradas'}
          </small>
          {data.mesMenor ? <em className="anual-badge is-low">Menor venta</em> : null}
        </article>
      </section>

      <section className="anual-card no-print">
        <div className="anual-card-head">
          <p className="anual-kicker">Evolución mensual</p>
          <h3>Ventas, gastos y utilidad neta</h3>
        </div>
        {data.hayMovimientos ? (
          <div className="anual-chart">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#efe8e1" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="short" tick={{ fill: '#7a6a6a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: '#7a6a6a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#7a6a6a' }} />
                <Bar dataKey="ventas" name="Ventas" fill="#7E3544" radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="gastos" name="Gastos" fill="#C48B9F" radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Area
                  type="monotone"
                  dataKey="gananciaNeta"
                  name="Utilidad neta"
                  stroke="#C9A96E"
                  fill="rgba(201, 169, 110, 0.22)"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="anual-empty">
            <TrendingUp size={20} />
            <p>No hay ventas ni gastos registrados en {data.year}.</p>
          </div>
        )}
      </section>

      <section className="anual-card anual-team no-print">
        <div className="anual-card-head">
          <p className="anual-kicker">Desempeño anual del equipo</p>
          <h3>Rendimiento Anual del Personal</h3>
          <p>Ranking de aportación, comisiones y participación sobre la facturación del año.</p>
        </div>

        {data.ranking.length ? (
          <>
            <div className="anual-podium">
              {data.ranking.map((item) => (
                <article
                  key={item.id}
                  className={`anual-staff ${item.puesto === 1 ? 'is-first' : ''}`}
                >
                  <div className="anual-staff-top">
                    <span className="anual-avatar">{initials(item.nombre)}</span>
                    <div>
                      <strong>{item.nombre}</strong>
                      <small>{item.rol || 'Colaboradora'}</small>
                    </div>
                    <em className="anual-rank">#{item.puesto}</em>
                  </div>
                  <p className="anual-staff-amount">{formatMoney(item.ventas)}</p>
                  <span className="anual-staff-share">{item.aportePct}% del total anual</span>
                  <small>Comisiones ganadas: {formatMoney(item.comisiones)}</small>
                </article>
              ))}
            </div>

            <div className="anual-chart">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={data.ranking}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke="#efe8e1" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={formatCompact}
                    tick={{ fill: '#7a6a6a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={96}
                    tick={{ fill: '#2d2424', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<RankTooltip />} />
                  <Bar dataKey="ventas" name="Ventas" radius={[0, 8, 8, 0]} barSize={18}>
                    {data.ranking.map((item, index) => (
                      <Cell key={item.id} fill={RANK_COLORS[index % RANK_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="anual-empty">
            <Sparkles size={20} />
            <p>Aún no hay ventas asignadas a colaboradoras en {data.year}.</p>
          </div>
        )}
      </section>

      <section className="anual-card no-print">
        <div className="anual-card-head">
          <p className="anual-kicker">Tabla ejecutiva</p>
          <h3>Mes a mes</h3>
        </div>
        <div className="anual-table-wrap">
          <table className="anual-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ventas</th>
                <th>
                  <span className="th-short">Comis.</span>
                  <span className="th-long">Comisiones pagadas</span>
                </th>
                <th>Gastos</th>
                <th>
                  <span className="th-short">Utilidad</span>
                  <span className="th-long">Utilidad neta</span>
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((month) => (
                <tr
                  key={month.monthKey}
                  className={data.mesEstrella?.monthKey === month.monthKey ? 'is-star-row' : ''}
                >
                  <td>{month.label}</td>
                  <td className="is-money">{formatMoney(month.ventas)}</td>
                  <td className="is-money">{formatMoney(month.comisiones)}</td>
                  <td className="is-money">{formatMoney(month.gastos)}</td>
                  <td className="is-money">{formatMoney(month.gananciaNeta)}</td>
                  <td>
                    <Link className="anual-link" to={`/finanzas/cierre?mes=${month.monthKey}`}>
                      Ver cierre
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReporteAnualPrint
        year={data.year}
        empresa={data.config.nombreEmpresa}
        socio1={data.config.dueno1Nombre}
        socio2={data.config.dueno2Nombre}
        totals={data.totals}
        months={data.months}
        ranking={data.ranking}
        mesEstrella={data.mesEstrella}
        mesMenor={data.mesMenor}
        logo={data.config.logoDataUrl}
      />
    </div>
  );
}

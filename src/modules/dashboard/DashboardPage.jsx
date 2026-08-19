import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  PiggyBank,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  formatFechaElegante,
  formatMoney,
} from '../../services/dashboardService';
import useDashboardData from './useDashboardData';
import './DashboardPage.css';

const SERVICE_COLORS = ['#7e3544', '#c48b9f', '#c9a96e', '#c47c65', '#9e5a63', '#d7b7b0'];

function KpiCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <article className={`kpi-card kpi-${tone}`}>
      <span className="kpi-icon">
        <Icon size={20} />
      </span>
      <p className="kpi-label">{label}</p>
      <strong className="kpi-value">{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function DashboardSkeleton({ count = 4 }) {
  return (
    <div className="dashboard-page">
      <div className="skeleton-block skeleton-header" />
      <div className="kpi-grid" data-count={count}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="skeleton-block skeleton-kpi" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="dashboard-empty">
      <span className="empty-mark">
        <Sparkles size={22} />
      </span>
      <h3>Sin movimientos registrados este mes</h3>
      <p>Cuando se registren ventas o gastos, aquí verás la evolución y el top de servicios.</p>
    </div>
  );
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <strong>Día {label}</strong>
      <span>{formatMoney(payload[0].value)}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { loading, error, data, flags } = useDashboardData();
  const displayName = profile?.nombre || user?.displayName || user?.email?.split('@')[0] || 'Romina';
  const today = data?.generatedAt || new Date();

  const kpiCards = [
    flags.kpiVentas
      ? {
          key: 'ventas',
          icon: ShoppingBag,
          label: 'Ventas del mes',
          value: formatMoney(data?.totalVentas),
          hint: data?.mesEtiqueta,
          tone: 'wine',
        }
      : null,
    flags.kpiGastos
      ? {
          key: 'gastos',
          icon: Wallet,
          label: 'Gastos del mes',
          value: formatMoney(data?.totalGastos),
          hint: 'Egresos registrados',
          tone: 'rose',
        }
      : null,
    flags.kpiBalance
      ? {
          key: 'balance',
          icon: TrendingUp,
          label: 'Balance / utilidad',
          value: formatMoney(data?.balance),
          hint: 'Ventas menos gastos',
          tone: 'gold',
        }
      : null,
    flags.kpiAhorro
      ? {
          key: 'ahorro',
          icon: PiggyBank,
          label: 'Fondo de ahorro',
          value: formatMoney(data?.saldoAhorro),
          hint: 'Saldo actual',
          tone: 'blush',
        }
      : null,
  ].filter(Boolean);

  const showGrafica = flags.graficaVentas && data?.hayVentas;
  const showServicios = flags.servicios && data?.hayVentas;
  const chartCount = Number(showGrafica) + Number(showServicios);
  const canSeeVentasWidgets = flags.kpiVentas || flags.graficaVentas || flags.servicios;

  if (loading) {
    return <DashboardSkeleton count={Math.max(kpiCards.length, 1)} />;
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <p className="dashboard-kicker">{formatFechaElegante(today)}</p>
        <h2>Bienvenida, {displayName}</h2>
        <p className="dashboard-lead">
          Resumen del estudio en {data?.mesEtiqueta || 'este mes'}.
        </p>
      </header>

      {error ? (
        <p className="dashboard-error">{error}</p>
      ) : null}

      {kpiCards.length ? (
        <section className="kpi-grid" data-count={kpiCards.length}>
          {kpiCards.map((card) => (
            <KpiCard
              key={card.key}
              icon={card.icon}
              label={card.label}
              value={card.value}
              hint={card.hint}
              tone={card.tone}
            />
          ))}
        </section>
      ) : null}

      {!error && canSeeVentasWidgets && !data?.hayVentas ? <EmptyState /> : null}

      {!error && !kpiCards.length && chartCount === 0 ? (
        <div className="dashboard-empty">
          <span className="empty-mark">
            <Sparkles size={22} />
          </span>
          <h3>Dashboard sin widgets</h3>
          <p>Tu rol puede entrar aquí, pero aún no tiene tarjetas ni gráficos asignados.</p>
        </div>
      ) : null}

      {chartCount > 0 && (
        <section className="charts-grid" data-count={chartCount}>
          {showGrafica ? (
            <article className="panel-card chart-panel">
              <div className="panel-heading">
                <h3>Evolución de ventas</h3>
                <p>Totales diarios del mes en curso</p>
              </div>
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.serieDiaria} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7e3544" stopOpacity={0.38} />
                        <stop offset="72%" stopColor="#c9a96e" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#f4eae6" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eadfd8" strokeDasharray="4 6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#7a6a6a', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#7a6a6a', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) =>
                        value >= 1000 ? `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `$${value}`
                      }
                      width={42}
                    />
                    <Tooltip content={<MoneyTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#7e3544"
                      strokeWidth={2.4}
                      fill="url(#ventasGradient)"
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          ) : null}

          {showServicios ? (
            <article className="panel-card services-panel">
              <div className="panel-heading">
                <h3>Servicios realizados</h3>
                <p>
                  {data.totalServicios} {data.totalServicios === 1 ? 'servicio' : 'servicios'} este mes
                </p>
              </div>

              <div className="services-layout">
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.servicios}
                        dataKey="cantidad"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                        animationDuration={800}
                      >
                        {data.servicios.map((entry, index) => (
                          <Cell key={entry.name} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} servicios`, name]}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #eadfd8',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <strong>{data.totalServicios}</strong>
                    <span>total</span>
                  </div>
                </div>

                <ul className="service-list">
                  {data.servicios.map((service, index) => (
                    <li key={service.name}>
                      <div className="service-row">
                        <span
                          className="service-dot"
                          style={{ background: SERVICE_COLORS[index % SERVICE_COLORS.length] }}
                        />
                        <strong>{service.name}</strong>
                        <em>{service.cantidad}</em>
                      </div>
                      <div className="progress-track">
                        <span
                          className="progress-fill"
                          style={{
                            width: `${service.porcentaje}%`,
                            background: SERVICE_COLORS[index % SERVICE_COLORS.length],
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ) : null}
        </section>
      )}
    </div>
  );
}


import { useState } from "react";
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMonthlyMetrics, useCompradores, useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { monthLabel, fmtCurrency } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import { TrendingUp, Sparkles, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

const NUTRA_COLOR    = "hsl(221,83%,53%)";
const VET_COLOR      = "hsl(220,55%,62%)";
const TICKET_COLOR   = "hsl(218,33%,70%)";
const FORECAST_COLOR = "hsl(218,33%,70%)";

// ─── Tooltips ───────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">
            {p.name === 'Ticket Medio' ? `€${Number(p.value).toFixed(0)}` : `€${Number(p.value).toLocaleString('es-ES')}`}
          </span>
        </div>
      ))}
    </div>
  );
};

const ForecastTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const actual   = payload.find(p => p.dataKey === 'actual');
  const forecast = payload.find(p => p.dataKey === 'forecast');
  const lower    = payload.find(p => p.dataKey === 'forecastLower');
  const band     = payload.find(p => p.dataKey === 'forecastBand');
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {actual && (
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: NUTRA_COLOR }} />
          <span className="text-muted-foreground">Histórico:</span>
          <span className="font-mono font-medium">{fmtCurrency(actual.value)}</span>
        </div>
      )}
      {forecast && lower && band && (
        <>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FORECAST_COLOR }} />
            <span className="text-muted-foreground">Proyección:</span>
            <span className="font-mono font-medium">{fmtCurrency(forecast.value)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 pl-4">
            IC 95%: {fmtCurrency(lower.value)} – {fmtCurrency(Number(lower.value) + Number(band.value))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Regresión lineal + intervalo de predicción IC 95% ──────
function linearReg(values) {
  const n = values.length;
  if (n < 3) return null;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  const sxx   = values.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
  const sxy   = values.reduce((s, v, i) => s + (i - xMean) * (v - yMean), 0);
  if (sxx === 0) return null;
  const slope     = sxy / sxx;
  const intercept = yMean - slope * xMean;
  const sse       = values.reduce((s, v, i) => s + (v - (intercept + slope * i)) ** 2, 0);
  const se        = Math.sqrt(sse / (n - 2));
  const yMeanAll  = yMean;
  const ssTot     = values.reduce((s, v) => s + (v - yMeanAll) ** 2, 0);
  const r2        = ssTot > 0 ? 1 - sse / ssTot : 0;
  return { slope, intercept, se, sxx, xMean, n, r2 };
}

function predict(reg, x) {
  if (!reg) return null;
  const { slope, intercept, se, sxx, xMean, n } = reg;
  const df     = n - 2;
  const t      = df >= 30 ? 2.042 : df >= 25 ? 2.064 : df >= 20 ? 2.086 : df >= 15 ? 2.131 : 2.228;
  const yHat   = intercept + slope * x;
  const margin = t * se * Math.sqrt(1 + 1 / n + (x - xMean) ** 2 / sxx);
  return {
    forecast: Math.max(0, yHat),
    lower:    Math.max(0, yHat - margin),
    upper:    Math.max(0, yHat + margin),
    band:     Math.max(0, 2 * margin),
  };
}

function sortByYearMonth(arr) {
  return [...arr].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function DailyRevenueChart({ data }) {
  const [range, setRange] = useState(90);
  const sorted = [...data].sort((a,b) => a.year !== b.year ? a.year-b.year : a.month !== b.month ? a.month-b.month : a.day-b.day);
  const sliced = range === 0 ? sorted : sorted.slice(-range);
  const chartData = sliced.map(d => ({
    name: `${d.day} ${MONTHS_ES[(d.month||1)-1]} ${String(d.year).slice(2)}`,
    Revenue: d.revenue || 0,
    Compras: d.purchases || 0,
  }));
  const total = sliced.reduce((s,d) => s+(d.revenue||0), 0);
  const avg   = sliced.length > 0 ? total/sliced.length : 0;
  const maxDay = sliced.reduce((mx,d) => (d.revenue||0) > (mx?.revenue||0) ? d : mx, null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>Total: <span className="font-semibold text-foreground">{fmtCurrency(total)}</span></span>
          <span>Media/día: <span className="font-semibold text-foreground">{fmtCurrency(avg)}</span></span>
          {maxDay && <span>Mejor día: <span className="font-semibold text-foreground">{maxDay.day}/{maxDay.month}/{maxDay.year} ({fmtCurrency(maxDay.revenue)})</span></span>}
        </div>
        <div className="flex gap-1">
          {[30,90,0].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${range===r ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
              {r===0 ? 'Todo' : `${r}d`}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sin datos diarios aún — sync pendiente</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="dailyRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NUTRA_COLOR} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={NUTRA_COLOR} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                interval={Math.max(1, Math.floor(chartData.length/10))}/>
              <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                tickFormatter={v => `€${(v/1000).toFixed(0)}K`}/>
              <Tooltip formatter={(v,n) => [fmtCurrency(v), n]} labelStyle={{ fontSize: 11 }}/>
              <Area type="monotone" dataKey="Revenue" stroke={NUTRA_COLOR} fill="url(#dailyRevGrad)"
                strokeWidth={1.5} dot={false} connectNulls={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function RevenueChart() {
  const [granularity, setGranularity] = useState('monthly');
  const { data: metrics     = [] } = useMonthlyMetrics(); // Nutracéuticos
  const { data: compradores = [] } = useCompradores();    // BVS Vet Shop
  const { data: dailyRev    = [] } = useDailyRevenue();
  const { filterByPeriod } = useComparison();

  const sortedNutra = sortByYearMonth(filterByPeriod(metrics));
  const sortedVet   = sortByYearMonth(filterByPeriod(compradores));

  // Mapa unificado por año-mes
  const allKeys  = new Set([
    ...sortedNutra.map(d => `${d.year}-${d.month}`),
    ...sortedVet.map(d   => `${d.year}-${d.month}`),
  ]);
  const nutraMap = Object.fromEntries(sortedNutra.map(d => [`${d.year}-${d.month}`, d]));
  const vetMap   = Object.fromEntries(sortedVet.map(d   => [`${d.year}-${d.month}`, d]));

  const chartData = [...allKeys].sort().map(key => {
    const [year, month] = key.split('-').map(Number);
    const n = nutraMap[key];
    return {
      name:          `${monthLabel(month)} ${String(year).slice(2)}`,
      Nutracéuticos: n?.revenue      ?? null,
      'Vet Shop':    vetMap[key]?.revenue ?? null,
      TicketMedio:   n?.avgPurchase  ?? null,
      EmailAttr:     n ? Math.round((n.emailAttr || 0) * (n.avgPurchase || 0)) : null,
      PushAttr:      n ? Math.round((n.pushAttr  || 0) * (n.avgPurchase || 0)) : null,
      WebAttr:       n ? Math.round((n.webAttr   || 0) * (n.avgPurchase || 0)) : null,
    };
  });

  const tickets     = sortedNutra.map(d => d.avgPurchase || 0).filter(v => v > 0);
  const lastTicket  = tickets[tickets.length - 1] || 0;
  const firstTicket = tickets[0] || 0;
  const ticketTrend = firstTicket > 0 ? (((lastTicket - firstTicket) / firstTicket) * 100).toFixed(1) : null;

  const firstNutra = sortedNutra[0];
  const lastNutra  = sortedNutra[sortedNutra.length - 1];
  const subtitle = firstNutra && lastNutra
    ? `${monthLabel(firstNutra.month)} ${firstNutra.year} – ${monthLabel(lastNutra.month)} ${lastNutra.year} · ${sortedNutra.length} meses Nutracéuticos · ${sortedVet.length} meses Vet Shop`
    : 'Datos en tiempo real';

  // ── Forecasting ─────────────────────────────────────────────
  const nutraRevenues = sortedNutra.map(d => d.revenue || 0);
  const reg           = linearReg(nutraRevenues);

  const futurePredictions = [];
  if (lastNutra && reg) {
    let yr = lastNutra.year;
    let mo = lastNutra.month;
    for (let k = 1; k <= 4; k++) {
      mo++;
      if (mo > 12) { mo = 1; yr++; }
      const pred = predict(reg, nutraRevenues.length - 1 + k);
      futurePredictions.push({ name: `${monthLabel(mo)} ${String(yr).slice(2)}`, ...pred });
    }
  }

  // Dataset para gráfico de forecast: últimos 12 meses reales + 4 proyectados
  const histSlice   = sortedNutra.slice(-12);
  const lastHist    = histSlice[histSlice.length - 1];
  const lastActual  = lastHist?.revenue || 0;

  const forecastChartData = reg && histSlice.length > 0 ? [
    ...histSlice.slice(0, -1).map(d => ({
      name:   `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
      actual: d.revenue || 0,
    })),
    // Punto de unión: histórico + inicio de la banda (ancho 0)
    {
      name:          `${monthLabel(lastHist.month)} ${String(lastHist.year).slice(2)}`,
      actual:        lastActual,
      forecast:      lastActual,
      forecastLower: lastActual,
      forecastBand:  0,
    },
    // Puntos proyectados
    ...futurePredictions.map(p => ({
      name:          p.name,
      forecast:      Math.round(p.forecast),
      forecastLower: Math.round(p.lower),
      forecastBand:  Math.round(p.band),
    })),
  ] : [];

  const trendSlope = reg ? reg.slope : 0;
  const trendMonthly = trendSlope >= 0
    ? `+${fmtCurrency(trendSlope)}/mes`
    : `${fmtCurrency(trendSlope)}/mes`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Evolución Revenue por Marca"
        subtitle={subtitle}
        icon={TrendingUp}
      />

      {/* Granularity toggle */}
      <div className="flex gap-1 mb-4 p-1 bg-muted/40 rounded-lg w-fit">
        <button onClick={() => setGranularity('monthly')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${granularity==='monthly' ? 'bg-card shadow text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
          <TrendingUp className="w-3 h-3"/> Mensual
        </button>
        <button onClick={() => setGranularity('daily')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${granularity==='daily' ? 'bg-card shadow text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
          <CalendarDays className="w-3 h-3"/> Diario
        </button>
      </div>

      {/* Daily view */}
      {granularity === 'daily' && <DailyRevenueChart data={dailyRev} />}

      {/* Monthly view */}
      {granularity === 'monthly' && <>

      {/* KPIs ticket medio */}
      {ticketTrend !== null && (
        <div className="mb-3 flex gap-4">
          <div className="text-xs text-muted-foreground">
            Ticket medio actual (Nutracéuticos):
            <span className="font-mono font-semibold text-foreground ml-1">€{lastTicket.toFixed(0)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Variación histórica:
            <span className={`font-mono font-semibold ml-1 ${parseFloat(ticketTrend) >= 0 ? 'text-blue-500' : 'text-slate-500'}`}>
              {parseFloat(ticketTrend) >= 0 ? '+' : ''}{ticketTrend}%
            </span>
          </div>
        </div>
      )}

      {/* Gráfico principal: Revenue por marca + Ticket Medio */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 40, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="nutraGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={NUTRA_COLOR} stopOpacity={0.25} />
                <stop offset="95%" stopColor={NUTRA_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
              interval={Math.max(1, Math.floor(chartData.length / 8))} />
            <YAxis domain={[0, 'auto']} tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Nutracéuticos"
              stroke={NUTRA_COLOR} fill="url(#nutraGrad)" strokeWidth={2.5}
              dot={{ r: 2, fill: NUTRA_COLOR }} connectNulls={false} />
            <Line type="monotone" dataKey="Vet Shop"
              stroke={VET_COLOR} strokeWidth={2} dot={{ r: 2.5, fill: VET_COLOR }}
              strokeDasharray="6 3" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico secundario: Revenue atribuido por canal */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Revenue atribuido por canal — Nutracéuticos (estimado last-touch)
        </p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                interval={Math.max(2, Math.floor(chartData.length / 6))} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v, name) => [`€${Number(v).toLocaleString('es-ES')}`, name]} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="EmailAttr" name="Email"       stackId="a" fill={NUTRA_COLOR} radius={[0,0,0,0]} />
              <Bar dataKey="PushAttr"  name="Push"        stackId="a" fill="hsl(220,55%,62%)" radius={[0,0,0,0]} />
              <Bar dataKey="WebAttr"   name="Web Content" stackId="a" fill={VET_COLOR} radius={[4,4,0,0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Estimado = compras atribuidas × ticket medio. Son subconjuntos del revenue total, no aditivos.
        </p>
      </div>

      {/* ── Forecasting ──────────────────────────────────────── */}
      {reg && futurePredictions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          {/* Header + KPI chips */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: FORECAST_COLOR }} />
                Proyección Revenue — Nutracéuticos
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Regresión lineal · IC 95% · R²={reg.r2.toFixed(2)} · tendencia {trendMonthly}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end shrink-0">
              {futurePredictions.map(p => (
                <div key={p.name} className="text-center bg-muted/40 rounded-lg px-2.5 py-1.5 border border-border/50">
                  <p className="text-[9px] text-muted-foreground font-semibold whitespace-nowrap">{p.name}</p>
                  <p className="text-sm font-bold font-heading" style={{ color: FORECAST_COLOR }}>
                    {fmtCurrency(p.forecast)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {fmtCurrency(p.lower)}–{fmtCurrency(p.upper)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico forecast */}
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fcBandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor={FORECAST_COLOR} stopOpacity={0.20} />
                    <stop offset="100%" stopColor={FORECAST_COLOR} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<ForecastTooltip />} />
                {/* Banda de confianza (truco stackId: base transparente + banda coloreada) */}
                <Area dataKey="forecastLower" stackId="ci" fill="transparent" stroke="none" legendType="none" />
                <Area dataKey="forecastBand"  stackId="ci" name="IC 95%" fill="url(#fcBandGrad)"
                  stroke={FORECAST_COLOR} strokeWidth={0.5} strokeDasharray="4 4" legendType="square" />
                {/* Línea histórica */}
                <Line dataKey="actual" name="Histórico" stroke={NUTRA_COLOR} strokeWidth={2.5}
                  dot={{ r: 2.5, fill: NUTRA_COLOR }} connectNulls={false} />
                {/* Línea de proyección */}
                <Line dataKey="forecast" name="Proyección" stroke={FORECAST_COLOR} strokeWidth={2}
                  strokeDasharray="6 3" dot={{ r: 3, fill: FORECAST_COLOR }} connectNulls={false} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-muted-foreground mt-1.5">
            ⚠ Basado en tendencia lineal de los últimos {nutraRevenues.length} meses. No contempla estacionalidad ni promociones puntuales.
          </p>
        </div>
      )}

      </>} {/* end monthly view */}
    </motion.div>
  );
}

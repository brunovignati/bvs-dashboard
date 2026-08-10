/**
 * MiCompiCard — Registros del perfil de mascota (Mi Compi).
 * Vista A: curva acumulada de registros.
 * Vista B: barras diarias por especie (perro/gato/otros).
 */
import { Fragment } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useMiCompiDaily, useMiCompiCumulative, useMiCompiRegistrations } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";
import { CHART, SCALE } from "@/lib/dss/palette";

const M_SHORT = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fmtDia(d) {
  if (!d) return "";
  const [, m, dd] = d.split("-");
  return `${parseInt(dd)} ${M_SHORT[parseInt(m)] || m}`;
}

export default function MiCompiCard({ delay }) {
  const { data: daily = [] } = useMiCompiDaily();
  const { data: cumul = [] } = useMiCompiCumulative();
  const { data: regs = [] } = useMiCompiRegistrations();

  // Totales
  const totalRegs = daily.reduce((s, d) => s + (d.registros || 0), 0);
  const totalCompis = daily.reduce((s, d) => s + (d.total_compis || 0), 0);
  const totalPerros = daily.reduce((s, d) => s + (d.perros || 0), 0);
  const totalGatos = daily.reduce((s, d) => s + (d.gatos || 0), 0);
  const totalOtros = daily.reduce((s, d) => s + (d.otros || 0), 0);
  const avgCompis = totalRegs > 0 ? (totalCompis / totalRegs).toFixed(1) : "—";
  const hasData = daily.length >= 1 && totalRegs > 0;

  // Hoy
  const today = new Date().toISOString().slice(0, 10);
  const todayRow = daily.find(d => d.dia === today);
  const hoy = todayRow?.registros || 0;

  // Species for pie
  const speciesData = [
    { name: "Perros", value: totalPerros },
    { name: "Gatos", value: totalGatos },
    { name: "Otros", value: totalOtros },
  ].filter(d => d.value > 0);
  const PIE_COLORS = [CHART.primary, CHART.positive, CHART.neutral];

  // ── Vista B — barras diarias por especie ──
  const altView = hasData ? (
    <div className="space-y-3">
      <div className="flex gap-6">
        <div className="flex-1 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="dia" tickFormatter={fmtDia}
                tick={{ fontSize: 9, fill: CHART.axis }} axisLine={false} tickLine={false}
                interval={Math.max(0, Math.floor(daily.length / 8))} />
              <YAxis tick={{ fontSize: 8, fill: CHART.axis }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip labelFormatter={fmtDia} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="perros" name="Perros" fill={CHART.primary} radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="gatos" name="Gatos" fill={CHART.positive} radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="otros" name="Otros" fill={CHART.neutral} radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {speciesData.length > 0 && (
          <div className="w-36 h-52 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={speciesData} cx="50%" cy="50%" innerRadius={30} outerRadius={55}
                  paddingAngle={3} dataKey="value" label={({ name, value }) => `${value}`}>
                  {speciesData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {/* Mini tabla últimos registros */}
      {regs.length > 0 && (
        <div className="border-t border-border/60 pt-2">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">Últimos registros</p>
          <div className="grid grid-cols-5 gap-x-3 text-[10px]">
            <span className="font-semibold text-muted-foreground">Email</span>
            <span className="font-semibold text-muted-foreground">Compi</span>
            <span className="font-semibold text-muted-foreground">Especie</span>
            <span className="font-semibold text-muted-foreground">Raza</span>
            <span className="font-semibold text-muted-foreground">Fecha</span>
            {regs.slice(0, 5).map((r, i) => (
              <Fragment key={i}>
                <span className="text-muted-foreground truncate">{r.email?.replace(/(.{3}).*(@.*)/, "$1…$2")}</span>
                <span className="font-medium">{r.nombre_1 || "—"}</span>
                <span>{r.especie_1 || "—"}</span>
                <span className="truncate">{r.raza_1 || "—"}</span>
                <span className="text-muted-foreground">{r.first_seen_at ? new Date(r.first_seen_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—"}</span>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Cuántos clientes han registrado su compi?"
      answer={hasData ? `${fmtNumber(totalRegs)} registros` : "Sin datos — ejecuta el sync"}
      answerTone={hasData ? "neutral" : "neutral"}
      context={hasData
        ? `${fmtNumber(totalCompis)} compis totales · media ${avgCompis}/registro · hoy: ${hoy} · ${fmtNumber(totalPerros)} perros, ${fmtNumber(totalGatos)} gatos`
        : "La tabla mi_compi_registrations se pobla tras el primer sync Connectif → Supabase."}
      maturity={hasData ? "green" : "grey"}
      actions={[
        { verb: "activar", rationale: "Usa la base de perfiles para personalizar email, recomendaciones y contenido." },
        { verb: "crecer", rationale: hasData && totalRegs < 500
          ? "Menos de 500 registros: prioriza visibilidad del formulario (categoría, ficha, carrito)."
          : "Mide el ratio registro/visita para optimizar el funnel." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Acumulado", b: "Detalle diario" }}
      note="Fuente: Connectif → mi_compi_registrations (sync cada 6h). first_seen_at = primera detección del registro, no fecha exacta de completar el formulario."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumul} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMiCompi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.primary} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="dia" tickFormatter={fmtDia}
                tick={{ fontSize: 9, fill: CHART.axis }} axisLine={false} tickLine={false}
                interval={Math.max(0, Math.floor(cumul.length / 8))} />
              <YAxis tick={{ fontSize: 8, fill: CHART.axis }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={fmtDia}
                formatter={(v) => [fmtNumber(v), "Acumulado"]} />
              <Area type="monotone" dataKey="acumulado" stroke={CHART.primary}
                strokeWidth={2.2} fill="url(#gradMiCompi)" dot={false}
                activeDot={{ r: 4, fill: CHART.primary }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}

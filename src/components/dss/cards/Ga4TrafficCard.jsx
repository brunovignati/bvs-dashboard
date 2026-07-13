/**
 * Ga4TrafficCard (Marketing) — tráfico web y su comportamiento desde GA4.
 * Usa todo el esquema disponible de ga4_daily: sessions, users, pageviews, bounce_rate.
 * Responde: ¿cuánta gente llega a la web y con qué calidad de visita?
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useGa4Daily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { upToCutoff } from "@/lib/dss/dssUtils";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const lbl = (r) => (r.month ? `${r.day || ""} ${M[r.month] || ""}`.trim() : String(r.date_str || "").slice(5));

export default function Ga4TrafficCard({ delay }) {
  const { data: dataRaw = [] } = useGa4Daily();
  const { rangeB } = useComparison();
  // El comparador controla la ventana: analizamos hasta el final del período principal.
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const data = upToCutoff(dataRaw, cutoff);
  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <EvidenceCard sources={["ga4"]}
        question="¿Cuánto tráfico web llega y cómo se comporta?"
        answer="Sin datos de GA4 aún"
        answerTone="neutral"
        context="La tabla ga4_daily todavía no tiene filas."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Confirma que el sync de GA4 esté poblando ga4_daily (sesiones/usuarios por día)." }]}
        delay={delay}
        note="Fuente: GA4 · ga4_daily. Se enciende automáticamente cuando haya datos."
      />
    );
  }

  const rows = [...data]
    .sort((a, b) => ((a.date_str || "") < (b.date_str || "") ? -1 : 1))
    .map(r => ({
      name: lbl(r),
      Sesiones: Number(r.sessions) || 0,
      Usuarios: Number(r.users) || 0,
      "Páginas vistas": Number(r.pageviews) || 0,
      bounce: Number(r.bounce_rate) || 0,
    }))
    .slice(-90);

  const last = rows[rows.length - 1] || {};
  const first = rows[0] || {};
  const sesTrend = first.Sesiones > 0 ? ((last.Sesiones - first.Sesiones) / first.Sesiones) * 100 : null;
  const avgBounce = rows.reduce((s, r) => s + r.bounce, 0) / rows.length;
  const bouncePct = avgBounce > 1 ? avgBounce : avgBounce * 100; // GA4 devuelve ratio 0-1

  return (
    <EvidenceCard sources={["ga4"]}
      question="¿Cuánto tráfico web llega y cómo se comporta?"
      answer={`${fmtNumber(last.Sesiones)} sesiones/día`}
      answerTone="neutral"
      context={`${fmtNumber(last.Usuarios)} usuarios y ${fmtNumber(last["Páginas vistas"])} páginas vistas el último día · rebote medio ${bouncePct.toFixed(0)}%${sesTrend != null ? ` · sesiones ${sesTrend >= 0 ? "+" : ""}${sesTrend.toFixed(0)}% en el rango` : ""}.`}
      maturity="amber"
      actions={[
        { verb: "investigar", rationale: "Cruza los picos de tráfico con los envíos de Email/Push para ver qué canal atrae visitas." },
        { verb: "crear", rationale: bouncePct >= 60 ? "Rebote alto: revisa velocidad y relevancia de la landing." : "Si el tráfico sube pero no la venta, revisa la conversión on-site (sticky/contenido web)." },
      ]}
      delay={delay}
      note="Fuente: GA4 · ga4_daily (sessions, users, pageviews, bounce_rate). Histórico corto: madura con el tiempo."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(rows.length / 8))} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => fmtNumber(v)} />
            <Tooltip formatter={(v, n) => [fmtNumber(v), n]} labelStyle={{ fontSize: 11 }} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="Sesiones" stroke="hsl(16,79%,57%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Usuarios" stroke="hsl(30,72%,66%)" strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="Páginas vistas" stroke="hsl(37,42%,74%)" strokeWidth={1.6} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}

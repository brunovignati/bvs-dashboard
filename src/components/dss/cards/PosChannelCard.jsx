/**
 * PosChannelCard (Tiendas · Clientes) — ¿Compra el cliente de tienda también en la web? Por trimestre natural, los
 * clientes identificados de tienda que además compraron en la web (ambos canales), los que solo compran en tienda y
 * los que solo compran en la web, con lo que gasta cada grupo. Origen: PrestaShop (pedidos TPV + pedidos web).
 * Vista B: gasto por cliente de cada grupo en el trimestre elegido.
 */
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePosChannelQuarter, usePosMeta } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";
import { COLORS, GRID, AXIS, GOOD, num, qKey, qLabel, pickQ, currentQ, fmtPts } from "./posUtils";

const SEGS = [["solo_tienda", "Solo tienda"], ["ambos", "Tienda y web"], ["solo_web", "Solo web"]];

function byQuarter(raw) {
  const out = {};
  for (const r of raw) {
    const q = (out[qKey(r)] ||= {});
    q[r.seg] = { c: num(r.customers), rs: num(r.rev_store), rw: num(r.rev_web) };
  }
  return out;
}
const per = (s, f) => (s && s.c > 0 ? f(s) / s.c : null);

export default function PosChannelCard({ delay }) {
  const { data: raw = [] } = usePosChannelQuarter();
  const { data: meta = [] } = usePosMeta();
  const { rangeB } = useComparison();

  const Qs = byQuarter(raw);
  const keys = Object.keys(Qs).map(Number).sort((a, b) => a - b);
  const Q = pickQ(keys, rangeB);
  const qNow = currentQ(meta);
  const cur = Q != null ? Qs[Q] : null;
  const prev = Q != null ? Qs[Q - 4] : null;
  const hasData = !!(cur && cur.solo_tienda && cur.ambos);
  const partial = Q != null && Q === qNow;

  const storeCust = (q) => (q?.solo_tienda?.c || 0) + (q?.ambos?.c || 0);
  const pctBoth = (q) => (storeCust(q) > 0 ? ((q.ambos?.c || 0) / storeCust(q)) * 100 : null);
  const vTienda = per(cur?.solo_tienda, (s) => s.rs), vBoth = per(cur?.ambos, (s) => s.rs + s.rw), vWeb = per(cur?.solo_web, (s) => s.rw);
  const ratio = vTienda && vBoth ? vBoth / vTienda : null;
  const pNow = hasData ? pctBoth(cur) : null, pPrev = prev ? pctBoth(prev) : null;

  // Evolución: últimos 8 trimestres hasta el elegido (el trimestre en curso, si está incompleto, solo cuenta como el último)
  const trend = keys.filter((k) => k <= (Q ?? -1) && (k < qNow || k === Q)).slice(-8).map((k) => ({ name: qLabel(k), "% de clientes de tienda que también compran en la web": Math.round(pctBoth(Qs[k]) * 10) / 10 }));

  const bars = hasData ? SEGS.map(([k, l]) => {
    const s = cur[k];
    return { name: l, Tienda: Math.round(per(s, (x) => x.rs) || 0), Web: Math.round(per(s, (x) => x.rw) || 0), n: s?.c || 0 };
  }) : [];
  const altView = bars.length ? (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} />
          <YAxis {...AXIS} tickFormatter={(v) => `${v} €`} />
          <Tooltip formatter={(v, n) => [`${v} €`, `${n} por cliente`]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Tienda" stackId="a" fill={COLORS[0]} />
          <Bar dataKey="Web" stackId="a" fill={COLORS[3]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Compra el cliente de tienda también en la web?"
      kpis={hasData ? [
        { value: `${pNow.toFixed(1)}%`, label: `Clientes de tienda que también compran en la web · ${qLabel(Q)}`, delta: pPrev != null ? pNow - pPrev : undefined, deltaSuffix: " pts" },
        { value: ratio ? `${ratio.toFixed(1)}×` : "—", label: "Gasto del cliente de los dos canales frente al de solo tienda" },
        { value: fmtNumber(storeCust(cur)), label: "Clientes identificados de tienda en el trimestre" },
      ] : undefined}
      answer={!hasData ? "Aún no hay trimestres con datos de tienda y web" : undefined}
      context={hasData ? `${qLabel(Q)}: ${fmtNumber(cur.ambos.c)} clientes compraron en tienda y en web, ${fmtNumber(cur.solo_tienda.c)} solo en tienda${cur.solo_web ? ` y ${fmtNumber(cur.solo_web.c)} solo en la web` : ""}. Gasto por cliente: ${vTienda ? `${vTienda.toFixed(0)} € solo tienda` : ""}${vBoth ? `, ${vBoth.toFixed(0)} € tienda y web` : ""}${vWeb ? `, ${vWeb.toFixed(0)} € solo web` : ""}.${pPrev != null ? ` Hace un año: ${pPrev.toFixed(1)}% (${fmtPts(pNow - pPrev)}).` : ""}${partial ? ` Ojo: ${qLabel(Q)} aún no ha terminado.` : ""}` : undefined}
      maturity={hasData && !partial ? "amber" : "amber"}
      actions={[
        { verb: "probar", rationale: hasData ? `Solo ${pNow.toFixed(0)}% de los clientes de tienda compra también en la web, y quien lo hace gasta ${ratio ? `${ratio.toFixed(1)}×` : "más"} lo del solo tienda. Probar a invitar a un grupo de clientes de tienda a la web, dejando otro sin invitar para medir si el gasto sube de verdad.` : "Prueba a invitar a clientes de tienda a la web con un grupo de control." },
        { verb: "vigilar", rationale: "Quien usa los dos canales ya era un cliente más activo: el gasto mayor no prueba que la web lo cause. Leer como oportunidad, no como efecto." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Evolución", b: "Gasto por cliente" }}
      note="Fuente: PrestaShop · pos_channel_quarter. Clientes identificados de tienda (excluye caja genérica) con ticket TPV en el trimestre; 'también web' = tienen además un pedido web válido en el mismo trimestre (mismo id de cliente). Solo web = clientes con pedido web en el trimestre que no compraron en tienda con cuenta. Gasto = ingreso con IVA de pedidos pagados / clientes del grupo. Trimestres naturales; el elegido es el del fin del periodo del selector. Un cliente que compra en tienda como caja genérica o con otra cuenta en la web no se enlaza: el % es un mínimo."
    >
      {hasData && trend.length >= 2 && (
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis {...AXIS} domain={[0, "auto"]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, "Clientes de tienda que también compran en la web"]} labelStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="% de clientes de tienda que también compran en la web" stroke={GOOD} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}

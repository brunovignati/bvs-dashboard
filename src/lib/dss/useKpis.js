/**
 * useKpis — bandas-resumen (4 KPIs) por vista, calculadas SOLO con datos existentes.
 * Cada hook devuelve un array listo para <KpiBand items={...} />.
 * KPIs que exigirían datos que no tenemos (ROAS, entrega, stock, SKU, reseñas) se omiten.
 */
import {
  useDailyRevenue, useBuyerCohorts, useChannelSegmentation,
  useEmailCampaigns, usePushCampaigns, useSubscribers, useStickyData, useSegments,
} from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import {
  Target, TrendingUp, Receipt, CalendarRange, UserPlus, Repeat, Network, Layers,
  Mail, Bell, MousePointerClick, Globe, UserMinus, Users, Wallet, AlertTriangle,
} from "lucide-react";

const sumM = (rows, y, m, f) => rows.filter(r => r.year === y && r.month === m).reduce((s, r) => s + (r[f] || 0), 0);
const isSub = (s) => /^subscrib/i.test(String(s || ""));
const isUnsub = (s) => /^unsubscrib/i.test(String(s || ""));

export function useEstadoKpis() {
  const { data: daily = [] } = useDailyRevenue();
  const { rangeB } = useComparison();
  const cy = rangeB.end.year, cm = rangeB.end.month;
  const pm = cm === 1 ? 12 : cm - 1, pmy = cm === 1 ? cy - 1 : cy;
  const rev = sumM(daily, cy, cm, "revenue");
  const orders = sumM(daily, cy, cm, "purchases");
  const prevRev = sumM(daily, pmy, pm, "revenue");
  const yoyRev = sumM(daily, cy - 1, cm, "revenue");
  const ticket = orders ? rev / orders : 0;
  const mom = prevRev ? ((rev - prevRev) / prevRev) * 100 : null;
  const yoy = yoyRev ? ((rev - yoyRev) / yoyRev) * 100 : null;
  const monthRows = daily.filter(r => r.year === cy && r.month === cm);
  const daysElapsed = monthRows.length ? Math.max(...monthRows.map(r => r.day || 0)) : 0;
  const dim = new Date(cy, cm, 0).getDate();
  const target = Number((typeof window !== "undefined" && window.localStorage.getItem("bvs_revenue_target_month")) || 0);
  const projection = daysElapsed ? (rev / daysElapsed) * dim : 0;
  const pct = target > 0 ? (projection / target) * 100 : 0;
  return [
    { label: "Proyección vs objetivo", value: target > 0 ? `${pct.toFixed(0)}%` : "—",
      tone: target > 0 && pct < 100 ? "bad" : undefined, hint: target > 0 ? (pct >= 100 ? "en objetivo" : "en riesgo") : "fija un objetivo", Icon: Target },
    { label: `Revenue ${monthLabel(cm)} ${cy}`, value: fmtCurrency(rev), delta: mom == null ? undefined : mom, hint: "vs mes anterior", Icon: TrendingUp },
    { label: "Ticket medio", value: `€${ticket.toFixed(0)}`, Icon: Receipt },
    { label: "Vs. año anterior", value: yoy == null ? "—" : `${yoy >= 0 ? "+" : ""}${yoy.toFixed(0)}%`,
      tone: yoy != null && yoy < 0 ? "bad" : undefined, hint: "interanual", Icon: CalendarRange },
  ];
}

export function useGrowthKpis() {
  const { data: coh = [] } = useBuyerCohorts();
  const { data: ch = [] } = useChannelSegmentation();
  const { data: daily = [] } = useDailyRevenue();
  const { rangeB } = useComparison();
  const cy = rangeB.end.year, cm = rangeB.end.month;
  const pm = cm === 1 ? 12 : cm - 1, pmy = cm === 1 ? cy - 1 : cy;
  const first = sumM(coh, cy, cm, "firstTime");
  const rec = sumM(coh, cy, cm, "recurring");
  const buyers = first + rec;
  const firstPrev = sumM(coh, pmy, pm, "firstTime");
  const newsDelta = firstPrev ? ((first - firstPrev) / firstPrev) * 100 : null;
  const recompra = buyers ? (rec / buyers) * 100 : 0;
  const chRow = ch.filter(r => r.year === cy && r.month === cm)[0] || {};
  const chTot = (chRow.digital || 0) + (chRow.retail || 0) + (chRow.omnichannel || 0);
  const omni = chTot ? ((chRow.omnichannel || 0) / chTot) * 100 : 0;
  const orders = sumM(daily, cy, cm, "purchases");
  const attr = sumM(daily, cy, cm, "emailAttr") + sumM(daily, cy, cm, "pushAttr") + sumM(daily, cy, cm, "webAttr") + sumM(daily, cy, cm, "smsAttr");
  const noAttr = orders ? Math.max(0, (orders - attr) / orders) * 100 : 0;
  return [
    { label: "Nuevos clientes", value: first ? fmtNumber(first) : "—", delta: newsDelta == null ? undefined : newsDelta, hint: "vs mes anterior", Icon: UserPlus },
    { label: "Tasa de recompra", value: buyers ? `${recompra.toFixed(0)}%` : "—", hint: "recurrentes / compradores", Icon: Repeat },
    { label: "Compra omnicanal", value: chTot ? `${omni.toFixed(0)}%` : "—", hint: "físico + digital", Icon: Network },
    { label: "Revenue no atribuido", value: orders ? `${noAttr.toFixed(0)}%` : "—", tone: noAttr > 50 ? "bad" : undefined, hint: "sin canal identificado", Icon: Layers },
  ];
}

export function useMarketingKpis() {
  const { data: email = [] } = useEmailCampaigns();
  const { data: push = [] } = usePushCampaigns();
  const { data: sticky = [] } = useStickyData();
  const { rangeB } = useComparison();
  const cy = rangeB.end.year, cm = rangeB.end.month;
  const emailRev = sumM(email, cy, cm, "revenue");
  const pushRev = sumM(push, cy, cm, "revenue");
  const sent = sumM(email, cy, cm, "sent");
  const clicks = sumM(email, cy, cm, "clicks");
  const ctr = sent ? (clicks / sent) * 100 : 0;
  const active = sticky.filter(s => (s.convRate || 0) > 0);
  const stickyConv = active.length ? active.reduce((s, r) => s + (r.convRate || 0), 0) / active.length : 0;
  return [
    { label: `Revenue email · ${monthLabel(cm)}`, value: emailRev ? fmtCurrency(emailRev) : "—", Icon: Mail },
    { label: `Revenue push · ${monthLabel(cm)}`, value: pushRev ? fmtCurrency(pushRev) : "—", Icon: Bell },
    { label: "Clic / envío (email)", value: sent ? `${ctr.toFixed(1)}%` : "—", hint: "no afectado por MPP", Icon: MousePointerClick },
    { label: "Conversión web/sticky", value: active.length ? `${stickyConv.toFixed(1)}%` : "—", hint: "contenido web activo", Icon: Globe },
  ];
}

export function useOpsKpis() {
  const { data: subs = [] } = useSubscribers();
  const { data: daily = [] } = useDailyRevenue();
  const { data: coh = [] } = useBuyerCohorts();
  const { data: segs = [] } = useSegments();
  const { rangeB } = useComparison();
  const cy = rangeB.end.year, cm = rangeB.end.month;
  const pm = cm === 1 ? 12 : cm - 1, pmy = cm === 1 ? cy - 1 : cy;
  const base = subs.filter(r => r.year === cy && r.month === cm && isSub(r.status)).reduce((s, r) => s + (r.contacts || 0), 0);
  const unsub = subs.filter(r => r.year === cy && r.month === cm && isUnsub(r.status)).reduce((s, r) => s + (r.unsubs || 0), 0);
  const baseP = subs.filter(r => r.year === pmy && r.month === pm && isSub(r.status)).reduce((s, r) => s + (r.contacts || 0), 0);
  const unsubP = subs.filter(r => r.year === pmy && r.month === pm && isUnsub(r.status)).reduce((s, r) => s + (r.unsubs || 0), 0);
  const rate = base ? (unsub / base) * 100 : 0;
  const rateP = baseP ? (unsubP / baseP) * 100 : 0;
  const rateDelta = rateP ? rate - rateP : null; // en puntos
  const baseDelta = baseP ? ((base - baseP) / baseP) * 100 : null;
  const rev = sumM(daily, cy, cm, "revenue");
  const orders = sumM(daily, cy, cm, "purchases");
  const buyers = sumM(coh, cy, cm, "firstTime") + sumM(coh, cy, cm, "recurring");
  const valuePerBuyer = buyers ? rev / buyers : (orders ? rev / orders : 0);
  const riskNames = new Set(segs.filter(s => /riesgo|fuga|atenci/i.test(String(s.segment || ""))).map(s => s.segment));
  return [
    { label: "Tasa de baja", value: base ? `${rate.toFixed(1)}%` : "—", delta: rateDelta == null ? undefined : rateDelta, deltaSuffix: "pp", deltaGood: false,
      tone: rateDelta != null && rateDelta > 0 ? "bad" : undefined, hint: "de la base", Icon: UserMinus },
    { label: "Base activa", value: base ? fmtNumber(base) : "—", delta: baseDelta == null ? undefined : baseDelta, hint: "suscriptores", Icon: Users },
    { label: "Valor por comprador", value: valuePerBuyer ? fmtCurrency(valuePerBuyer) : "—", hint: "gasto medio/mes", Icon: Wallet },
    { label: "Segmentos en riesgo", value: riskNames.size ? String(riskNames.size) : "—", tone: riskNames.size ? "warn" : undefined, hint: "requieren reactivación", Icon: AlertTriangle },
  ];
}

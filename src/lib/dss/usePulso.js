/**
 * usePulso — deriva las señales y datos del modo Pulso a partir de los hooks diarios.
 * Se usa tanto en PulsoMode (para renderizar tarjetas) como en la página (para el
 * contador de señales del nav). React Query cachea los fetch, así que no duplica red.
 */
import { useMemo } from "react";
import { useDailyRevenue, useDailyPush } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { sortByYMD, trailingStats, matchName } from "./dssUtils";

const MONTHS = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const dLabel = (r) => `${r.day} ${MONTHS[r.month] || r.month}`;
const CRITICAL = /carrito|reactiv|reabast|recuper|abandon/i;

export function usePulso() {
  const { data: dailyRev = [] } = useDailyRevenue();
  const { data: dailyPush = [] } = useDailyPush();
  const { rangeB } = useComparison();
  // El comparador controla la ventana: analizamos hasta el final del período principal
  // (rangeB.end), de modo que el usuario pueda mirar periodos anteriores, no solo lo último.
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  return useMemo(() => {
    const leq = (arr) => (arr || []).filter(r => (r.year || 0) * 12 + (r.month || 0) <= cutoff);
    const signals = [];

    // ── Revenue diario vs. banda ──
    const rev = sortByYMD(leq(dailyRev));
    const revenue = { series: [], lastValue: 0, mean: 0, std: 0, outside: false, direction: 0 };
    if (rev.length >= 8) {
      revenue.series = rev.slice(-60).map(r => ({ name: dLabel(r), value: r.revenue || 0 }));
      const last = rev[rev.length - 1];
      revenue.lastValue = last.revenue || 0;
      const trailing = rev.slice(-29, -1).map(r => r.revenue || 0);
      const { mean, std } = trailingStats(trailing);
      revenue.mean = mean; revenue.std = std;
      revenue.outside = std > 0 && Math.abs(revenue.lastValue - mean) > 2 * std;
      revenue.direction = Math.sign(revenue.lastValue - mean);
      if (revenue.outside) {
        signals.push({
          severity: revenue.direction < 0 ? "high" : "low",
          title: revenue.direction < 0 ? "Revenue de ayer por debajo de lo normal" : "Pico de revenue inusual ayer",
          detail: `€${(revenue.lastValue/1000).toFixed(1)}K vs. media 28d €${(mean/1000).toFixed(1)}K`,
          verb: "Investigar",
        });
      }
    }

    // ── Entregabilidad / apertura email ──
    // La apertura de email vive en EmailDeliverabilityCard (email_campaigns, mensual);
    // usePulso ya NO descarga daily_email (150k filas) para no penalizar la carga.
    const email = { series: [], lastRate: 0, mean: 0, drop: false, hasData: false };

    // ── Caída de canal atribuido ──
    const CH = [
      { key: "emailAttr", name: "Email" },
      { key: "pushAttr", name: "Push" },
      { key: "webAttr", name: "Web" },
      { key: "smsAttr", name: "SMS" },
    ];
    const attrTotal = rev.reduce((s, r) => s + CH.reduce((t, c) => t + (r[c.key] || 0), 0), 0);
    const channelData = { channels: [], worst: null, hasAttribution: attrTotal > 0 };
    if (channelData.hasAttribution && rev.length >= 15) {
      const last = rev[rev.length - 1];
      const prior14 = rev.slice(-15, -1);
      channelData.channels = CH.map(c => {
        const cur = last[c.key] || 0;
        const base = prior14.reduce((s, r) => s + (r[c.key] || 0), 0) / prior14.length;
        const delta = base > 0 ? ((cur - base) / base) * 100 : 0;
        return { name: c.name, delta };
      });
      channelData.worst = channelData.channels.reduce((mn, c) => (c.delta < (mn?.delta ?? 999) ? c : mn), null);
      if (channelData.worst && channelData.worst.delta < -25) {
        signals.push({
          severity: "medium",
          title: `Canal ${channelData.worst.name} en caída`,
          detail: `${channelData.worst.delta.toFixed(0)}% vs. media 14d`,
          verb: "Investigar",
        });
      }
    }

    // ── Workflows críticos parados ──
    const wf = { workflows: [], anyStalled: false, hasData: false };
    const pushRows = leq(dailyPush);
    if (pushRows.length >= 20) {
      const crit = pushRows.filter(r => matchName(r, CRITICAL));
      const ord = (r) => r.year * 10000 + r.month * 100 + (r.day || 0);
      const allDays = [...new Set(pushRows.map(ord))].sort((a, b) => a - b);
      if (allDays.length >= 5 && crit.length > 0) {
        wf.hasData = true;
        const last7 = new Set(allDays.slice(-7));
        const last3 = new Set(allDays.slice(-3));
        const groups = {};
        for (const r of crit) {
          const name = r.workflow || "—";
          if (!groups[name]) groups[name] = { name, distinctDays: new Set(), lastOrd: 0, recentSent: 0 };
          const o = ord(r);
          groups[name].distinctDays.add(o);
          groups[name].lastOrd = Math.max(groups[name].lastOrd, o);
          if (last7.has(o)) groups[name].recentSent += r.sent || 0;
        }
        wf.workflows = Object.values(groups)
          .map(g => ({
            name: g.name,
            recentSent: g.recentSent,
            stalled: g.distinctDays.size >= 8 && !last3.has(g.lastOrd),
          }))
          .sort((a, b) => Number(b.stalled) - Number(a.stalled) || b.recentSent - a.recentSent);
        wf.anyStalled = wf.workflows.some(w => w.stalled);
        if (wf.anyStalled) {
          const s = wf.workflows.find(w => w.stalled);
          signals.push({
            severity: "high",
            title: "Workflow crítico parado",
            detail: s ? s.name : "Un flujo de carrito/reactivación no envía hace 3+ días",
            verb: "Investigar",
          });
        }
      }
    }

    const rank = { high: 3, medium: 2, low: 1, ok: 0 };
    signals.sort((a, b) => rank[b.severity] - rank[a.severity]);
    const signalCount = signals.filter(s => s.severity !== "ok").length;

    return { signals, signalCount, revenue, email, channelData, wf };
  }, [dailyRev, dailyPush, cutoff]);
}

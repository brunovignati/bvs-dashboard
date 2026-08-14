/**
 * MiCompiParqueCard — Composición del parque de compis.
 * Vista A: pirámide de edad por especie + etapa vital + transiciones próximas.
 * Vista B: cumpleaños por mes + hogares multi-compi + completitud del dato.
 * Todo derivado de mi_compi_registrations — no requiere captura nueva.
 */
import { Fragment } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useMiCompiParque } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";
import { CHART } from "@/lib/dss/palette";

const M_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const TRAMOS = ["<1 año", "1–3", "3–7", "7–10", "10+", "Sin fecha"];

// ── Derivación por compi ──
function especieGrupo(e) {
  const s = (e || "").toLowerCase();
  if (s.includes("perro")) return "Perro";
  if (s.includes("gato")) return "Gato";
  return e ? "Otros" : "Sin especie";
}

function mesesEdad(nacimiento) {
  if (!nacimiento) return null;
  const n = new Date(nacimiento);
  if (isNaN(n)) return null;
  const hoy = new Date();
  const m = (hoy.getFullYear() - n.getFullYear()) * 12 + (hoy.getMonth() - n.getMonth());
  return m >= 0 ? m : null;
}

// Umbral senior: perros grandes/gigantes 7 años, resto (perros peq/med y gatos) 10.
function umbralSeniorMeses(grupo, talla) {
  const t = (talla || "").toLowerCase();
  if (grupo === "Perro" && (t.includes("grande") || t.includes("gigante"))) return 84;
  return 120;
}

function flatten(rows) {
  const compis = [];
  for (const r of rows) {
    for (let s = 1; s <= 4; s++) {
      const nombre = r[`nombre_${s}`];
      if (!nombre) continue;
      const especie = r[`especie_${s}`];
      const grupo = especieGrupo(especie);
      const nacimiento = r[`nacimiento_${s}`] || null;
      const talla = s === 1 ? r.talla_peso_1 : null;
      const em = mesesEdad(nacimiento);
      const senior = umbralSeniorMeses(grupo, talla);
      let etapa = "Sin fecha";
      if (em !== null) etapa = em < 12 ? "Cachorro" : em >= senior ? "Senior" : "Adulto";
      compis.push({
        email: r.email, nombre, grupo, raza: r[`raza_${s}`] || null,
        nacimiento, edadMeses: em, etapa, seniorUmbral: senior,
      });
    }
  }
  return compis;
}

function tramoEdad(em) {
  if (em === null) return "Sin fecha";
  if (em < 12) return "<1 año";
  if (em < 36) return "1–3";
  if (em < 84) return "3–7";
  if (em < 120) return "7–10";
  return "10+";
}

// Transiciones de etapa en los próximos N días (cachorro→adulto a 12m, adulto→senior al umbral).
function transiciones(compis, dias = 90) {
  const hoy = new Date();
  const limite = new Date(hoy.getTime() + dias * 86400000);
  const out = [];
  for (const c of compis) {
    if (!c.nacimiento) continue;
    const n = new Date(c.nacimiento);
    const fAdulto = new Date(n); fAdulto.setMonth(fAdulto.getMonth() + 12);
    const fSenior = new Date(n); fSenior.setMonth(fSenior.getMonth() + c.seniorUmbral);
    if (fAdulto > hoy && fAdulto <= limite) out.push({ ...c, tipo: "→ Adulto", fecha: fAdulto });
    else if (fSenior > hoy && fSenior <= limite) out.push({ ...c, tipo: "→ Senior", fecha: fSenior });
  }
  return out.sort((a, b) => a.fecha - b.fecha);
}

const GRUPO_COLORS = { Perro: CHART.primary, Gato: CHART.positive, Otros: CHART.neutral };

export default function MiCompiParqueCard({ delay }) {
  const { data: rows = [] } = useMiCompiParque();
  const compis = flatten(rows);
  const hasData = compis.length > 0;

  // ── Pirámide de edad por especie ──
  const edadData = TRAMOS.map(tramo => {
    const row = { tramo };
    for (const g of ["Perro", "Gato", "Otros"]) {
      row[g] = compis.filter(c => (c.grupo === g || (g === "Otros" && !["Perro", "Gato"].includes(c.grupo))) && tramoEdad(c.edadMeses) === tramo).length;
    }
    return row;
  }).filter(r => r.Perro + r.Gato + r.Otros > 0);

  // ── Etapa vital ──
  const etapas = ["Cachorro", "Adulto", "Senior", "Sin fecha"].map(e => ({
    etapa: e, n: compis.filter(c => c.etapa === e).length,
  })).filter(e => e.n > 0);
  const pctSenior = hasData ? Math.round(100 * (etapas.find(e => e.etapa === "Senior")?.n || 0) / compis.length) : 0;

  // ── Transiciones 90 días ──
  const trans = transiciones(compis, 90);

  // ── Cumpleaños por mes ──
  const cumplesData = M_SHORT.map((mes, i) => ({
    mes, cumples: compis.filter(c => c.nacimiento && new Date(c.nacimiento).getMonth() === i).length,
  }));

  // ── Hogares ──
  const hogares = [1, 2, 3, 4].map(n => ({
    n, hogares: rows.filter(r => (r.num_compis || 0) === n).length,
  }));
  const multi = rows.filter(r => (r.num_compis || 0) >= 2).length;
  const mixtos = rows.filter(r => {
    const gs = new Set();
    for (let s = 1; s <= 4; s++) if (r[`nombre_${s}`]) gs.add(especieGrupo(r[`especie_${s}`]));
    return gs.has("Perro") && gs.has("Gato");
  }).length;

  // ── Completitud ──
  const pct = (n) => hasData ? Math.round(100 * n / compis.length) : 0;
  const conNacimiento = pct(compis.filter(c => c.nacimiento).length);
  const conRaza = pct(compis.filter(c => c.raza).length);

  // ── Vista B — cumpleaños + hogares + completitud ──
  const altView = hasData ? (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] text-muted-foreground font-semibold mb-1">Cumpleaños por mes (momentos de contacto)</p>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cumplesData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 9, fill: CHART.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: CHART.axis }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="cumples" name="Cumpleaños" fill={CHART.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-2 text-[10px]">
        <div>
          <p className="font-semibold text-muted-foreground mb-1">Hogares por nº de compis</p>
          {hogares.map(h => (
            <p key={h.n}>{h.n} compi{h.n > 1 ? "s" : ""}: <span className="font-medium">{h.hogares}</span></p>
          ))}
        </div>
        <div>
          <p className="font-semibold text-muted-foreground mb-1">Multi-mascota</p>
          <p>Hogares 2+: <span className="font-medium">{multi}</span></p>
          <p>Mixtos perro+gato: <span className="font-medium">{mixtos}</span></p>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground mb-1">Completitud del dato</p>
          <p>Con nacimiento: <span className="font-medium">{conNacimiento}%</span></p>
          <p>Con raza: <span className="font-medium">{conRaza}%</span></p>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Cómo se compone el parque de compis?"
      answer={hasData ? `${fmtNumber(compis.length)} compis · ${pctSenior}% senior` : "Sin datos — ejecuta el sync"}
      answerTone="neutral"
      context={hasData
        ? `${etapas.map(e => `${e.n} ${e.etapa.toLowerCase()}`).join(" · ")} · ${trans.length} cambian de etapa en 90 días`
        : "Derivado de mi_compi_registrations: edad, etapa vital, cumpleaños y hogares."}
      maturity={hasData ? "green" : "grey"}
      actions={[
        { verb: "anticipar", rationale: trans.length > 0
          ? `${trans.length} compis cambian de etapa en 90 días: cada transición es un cambio de gama con fecha conocida (puppy→adulto, adulto→senior).`
          : "Sin transiciones próximas: revisa la completitud de fechas de nacimiento." },
        { verb: "surtir", rationale: pctSenior >= 25
          ? `${pctSenior}% del parque es senior: revisa profundidad de gama senior en pienso y suplementos.`
          : "Parque mayoritariamente joven: prioriza gama puppy/adulto y fideliza antes de la transición." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Edad y etapa", b: "Cumpleaños y hogares" }}
      note={`Edad y etapa derivadas de la fecha de nacimiento (umbral senior: 7 años en perros grandes, 10 en el resto). Compis sin fecha de nacimiento (${100 - conNacimiento}%) quedan fuera de edad, cumpleaños y transiciones.`}
    >
      {hasData && (
        <div className="space-y-2">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={edadData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="tramo" tick={{ fontSize: 9, fill: CHART.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: CHART.axis }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Perro" stackId="a" fill={GRUPO_COLORS.Perro} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Gato" stackId="a" fill={GRUPO_COLORS.Gato} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Otros" stackId="a" fill={GRUPO_COLORS.Otros} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {trans.length > 0 && (
            <div className="border-t border-border/60 pt-2">
              <p className="text-[10px] text-muted-foreground font-semibold mb-1">Próximas transiciones de etapa (90 días)</p>
              <div className="grid grid-cols-4 gap-x-3 text-[10px]">
                <span className="font-semibold text-muted-foreground">Compi</span>
                <span className="font-semibold text-muted-foreground">Especie</span>
                <span className="font-semibold text-muted-foreground">Transición</span>
                <span className="font-semibold text-muted-foreground">Fecha</span>
                {trans.slice(0, 5).map((t, i) => (
                  <Fragment key={i}>
                    <span className="font-medium truncate">{t.nombre}</span>
                    <span>{t.grupo}</span>
                    <span>{t.tipo}</span>
                    <span className="text-muted-foreground">{t.fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                  </Fragment>
                ))}
              </div>
              {trans.length > 5 && <p className="text-[10px] text-muted-foreground mt-1">+{trans.length - 5} más</p>}
            </div>
          )}
        </div>
      )}
    </EvidenceCard>
  );
}

/**
 * pos_refresh.js — Refresco de las tablas pos_* (pestaña "Tiendas" del dashboard).
 *
 * SE EJECUTA EN EL NAVEGADOR, en una pestaña del back-office de PrestaShop ya abierta (cualquier página del
 * admin con enlaces que lleven `_token=`). El contenedor de Cowork/GitHub Actions no alcanza ni PrestaShop ni
 * Supabase; el navegador del usuario sí (mismo patrón que category_sales, brand_sales_ps, cart_funnel…).
 *
 * Uso (pegar el fichero entero en la consola de la pestaña del admin, o inyectarlo con javascript_tool):
 *     await posRefresh()                          // hoy (Europe/Madrid), ventana desde 2026-06-11
 *     await posRefresh({ today: '2026-11-30' })   // fecha de corte explícita
 * Devuelve un texto con las filas escritas en cada tabla.
 *
 * Qué hace, en este orden y UNA consulta cada vez (el Gestor SQL se cuelga si se lanzan varias a la vez):
 *   1. Exporta por CSV las consultas guardadas (ids en POS_QUERY_IDS; SQL en sql/pos_queries.sql).
 *   2. Mensuales (758, 761, 763) → pos_store_monthly, pos_bvs_monthly, pos_codes_monthly.
 *   3. Con tickets (766), códigos por ticket (767) y latas (768) calcula en el navegador la retención
 *      (computePos) → pos_retention_monthly, pos_code_retention, pos_latas. Se calcula en JS y no en SQL
 *      porque un EXISTS por ticket sobre ~130K tickets cuelga el Gestor.
 *   4. Escribe pos_meta ('pos') con la fecha del cálculo.
 * La clave service_role se lee del propio repo público (src/lib/supabase.js), como en el resto de refrescos.
 *
 * Método de retención (observacional): por ticket, ¿vuelve el cliente a cualquier tienda en 30/60/90 días?
 * Esperado = tasa de los tickets SIN código del mismo mes y la misma frecuencia previa (1ª compra, 0, 1-2, 3-5,
 * 6+ tickets en 180 días). Excluye empleado y vales de devolución. Solo clientes identificados (ids 1 y 2703803
 * son la caja genérica). Ventana desde 2026-06-11 (inicio de ps_prestapos_discount_log).
 */

const POS_QUERY_IDS = { store: 758, bvs: 761, codes: 763, tickets: 766, ticketCodes: 767, latas: 768 };
const POS_WINDOW_START = '2026-06-11';
const SUPABASE_URL = 'https://tdygooblqxldyakijgda.supabase.co';
const REPO_KEY_URL = 'https://raw.githubusercontent.com/brunovignati/bvs-dashboard/main/src/lib/supabase.js';

// ── CSV (separador ';' del Gestor SQL, comillas dobles) ─────────────────────────────────────────
function parseCSV(txt, sep = ';') {
  if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(f); f = ''; }
    else if (ch === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (ch !== '\r') f += ch;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}

// ── Retención y latas (calculado en el navegador) ───────────────────────────────────────────────
// P: {tickets:[{o,c,d,t,s}], codes:[{o,src,code}], latas:[{o,u}], today:'YYYY-MM-DD', start:'YYYY-MM-DD'}
function computePos(P) {
  // P: {tickets:[{o,c,d,t,s}], codes:[{o,src,code}], latas:[{o,u}], today:'YYYY-MM-DD', start:'YYYY-MM-DD'}
  const DAY=864e5, ms=d=>Date.parse(d+'T00:00:00Z'), today=ms(P.today), W0=ms(P.start);
  const NOPROMO=/^Vale|devoluci/i, EMP=/^EMPLEADO$/i;
  const codesBy={}; P.codes.forEach(r=>{ if(NOPROMO.test(r.code)) return; (codesBy[r.o]||(codesBy[r.o]=new Set())).add(r.code); });
  const latasBy={}; P.latas.forEach(r=>{ latasBy[r.o]=(latasBy[r.o]||0)+(+r.u||0); });
  const T=P.tickets.map(x=>({o:+x.o,c:+x.c,d:ms(x.d),t:+x.t,s:x.s})).sort((a,b)=>a.c-b.c||a.d-b.d||a.o-b.o);
  const fb=(k,f)=>k===0?'1a':f===0?'0':f<=2?'1-2':f<=5?'3-5':'6+';
  for(let i=0;i<T.length;){ let j=i; while(j<T.length&&T[j].c===T[i].c) j++;
    for(let k=i;k<j;k++){ const o=T[k]; let f=0; for(let m=k-1;m>=i&&(o.d-T[m].d)<=180*DAY;m--) f++; o.fb=fb(k-i,f);
      o.s60=0; o.ret={30:false,60:false,90:false}; o.lat60=false;
      for(let m=k+1;m<j;m++){ const dd=(T[m].d-o.d)/DAY; if(dd<1) continue; if(dd>90) break; if(dd<=30) o.ret[30]=true; if(dd<=60){ o.ret[60]=true; o.s60+=T[m].t; if(latasBy[T[m].o]) o.lat60=true; } o.ret[90]=true; }
      o.obs=(today-o.d)/DAY; const cs=codesBy[o.o]; o.codes=cs?[...cs]:[]; o.emp=o.codes.some(c=>EMP.test(c)); o.hasCode=o.codes.length>0; o.u=latasBy[o.o]||0;
      let prior=false; for(let m=k-1;m>=i&&(o.d-T[m].d)<=180*DAY;m--) if(latasBy[T[m].o]){prior=true;break;} o.priorLatas=prior; }
    i=j; }
  const W=T.filter(o=>o.d>=W0&&!o.emp); const ym=o=>{const d=new Date(o.d);return d.getUTCFullYear()*100+d.getUTCMonth()+1;};
  // control por (mes, frecuencia) y horizonte
  const C={}; W.forEach(o=>{ if(o.hasCode) return; const k=ym(o)+'|'+o.fb; const c=C[k]||(C[k]={n:{30:0,60:0,90:0},r:{30:0,60:0,90:0},ns:0,s:0}); [30,60,90].forEach(h=>{ if(o.obs>=h){c.n[h]++; if(o.ret[h]) c.r[h]++;} }); if(o.obs>=60){c.ns++; c.s+=o.s60;} });
  const exp=(o,h)=>{ const c=C[ym(o)+'|'+o.fb]; return c&&c.n[h]>=20?c.r[h]/c.n[h]:null; };
  const expS=o=>{ const c=C[ym(o)+'|'+o.fb]; return c&&c.ns>=20?c.s/c.ns:null; };
  const acc=()=>({n30:0,r30:0,e30:0,n60:0,r60:0,e60:0,n90:0,r90:0,e90:0,ns:0,s60:0,es60:0});
  const add=(a,o)=>{ [30,60,90].forEach(h=>{ if(o.obs<h) return; const e=exp(o,h); if(e===null) return; a['n'+h]++; a['r'+h]+=o.ret[h]?1:0; a['e'+h]+=e; }); if(o.obs>=60){ const e=expS(o); if(e!==null){ a.ns++; a.s60+=o.s60; a.es60+=e; } } };
  const rnd=a=>{ for(const k in a) if(typeof a[k]==='number') a[k]=Math.round(a[k]*100)/100; return a; };
  // 1) retención mensual
  const M={}; W.forEach(o=>{ const g=o.hasCode?'con_codigo':'sin_codigo'; const k=ym(o)+'|'+g; (M[k]||(M[k]=Object.assign({year:Math.floor(ym(o)/100),month:ym(o)%100,grp:g},acc())));
    add(M[k],o); });
  const retention_monthly=Object.values(M).map(rnd);
  // 2) por código
  const K={}; W.forEach(o=>{ o.codes.forEach(c=>{ const src=null; const k=c; const a=K[k]||(K[k]=Object.assign({code:c,tickets:0,customers:new Set(),fiel:0,sum_t:0},acc())); a.tickets++; a.customers.add(o.c); if(o.fb==='6+') a.fiel++; a.sum_t+=o.t; add(a,o); }); });
  const code_retention=Object.values(K).filter(a=>a.tickets>=30).map(a=>{ const r=Object.assign({},a); r.customers=a.customers.size; r.pct_fiel=Math.round(1000*a.fiel/a.tickets)/10; r.avg_ticket=Math.round(100*a.sum_t/a.tickets)/100; delete r.fiel; delete r.sum_t; return rnd(r); }).sort((x,y)=>y.tickets-x.tickets);
  // 3) latas BVS
  const isLP=c=>/^5\+1 latas BVS$/i.test(c), isLR=c=>/^Lata .*-Regalo$/i.test(c)&&!/purina/i.test(c);
  const grpL=o=>o.codes.some(isLP)?'5+1 latas':o.codes.some(isLR)?'lata de regalo':(o.u>0&&!o.hasCode)?'latas sin promo':null;
  const L={}, seen={}; W.forEach(o=>{ const g=grpL(o); if(!g||o.obs<60) return; const key=g+'|'+o.c; if(seen[key]) return; seen[key]=1; const seg=o.priorLatas?'ya compraba':'nuevo'; const k=g+'|'+seg; const a=L[k]||(L[k]={grp:g,seg,n:0,ret60:0,again60:0,units:0,sum_t:0}); a.n++; if(o.ret[60]) a.ret60++; if(o.lat60) a.again60++; a.units+=o.u; a.sum_t+=o.t; });
  const latas=Object.values(L).map(a=>({grp:a.grp,seg:a.seg,n:a.n,ret60:a.ret60,again60:a.again60,units_avg:Math.round(100*a.units/a.n)/100,ticket_avg:Math.round(100*a.sum_t/a.n)/100}));
  return {retention_monthly, code_retention, latas, meta:{tickets:T.length, window_tickets:W.length, start:P.start, today:P.today}};
}

// ── Gestor SQL: exportar una consulta guardada ──────────────────────────────────────────────────
function adminToken() {
  const a = [...document.querySelectorAll('a[href*="_token="]')].map((x) => x.href).find(Boolean) || location.href;
  const m = a.match(/[?&]_token=([^&#]+)/);
  if (!m) throw new Error('No hay _token en esta página del admin: abre el Gestor SQL de PrestaShop.');
  return m[1];
}
async function exportQuery(id, token) {
  const base = location.origin + location.pathname.split('/index.php')[0] + '/index.php/configure/advanced/sql-requests/';
  const res = await fetch(`${base}${id}/export?_token=${token}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Consulta ${id}: HTTP ${res.status}`);
  const rows = parseCSV(await res.text());
  if (!rows.length) throw new Error(`Consulta ${id}: sin filas (¿sesión caducada?)`);
  return rows.slice(1);
}

// ── Supabase: upsert idempotente por lotes ──────────────────────────────────────────────────────
async function upsert(table, rows, conflict, key) {
  const H = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
  for (let i = 0; i < rows.length; i += 500) {
    const body = rows.slice(i, i + 500).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return `${table} ${rows.length}`;
}

const N = Number;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1); // 'santurtzi' → 'Santurtzi'

async function posRefresh(opts = {}) {
  const today = opts.today || new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const start = opts.start || POS_WINDOW_START;
  const token = adminToken();
  const keySrc = await (await fetch(REPO_KEY_URL)).text();
  const key = opts.key || (keySrc.match(/eyJ[A-Za-z0-9._-]+/) || [])[0];
  if (!key) throw new Error('No se pudo leer la clave de Supabase del repo.');
  const out = [];

  // 1) Mensuales
  const store = await exportQuery(POS_QUERY_IDS.store, token);
  const bvs = await exportQuery(POS_QUERY_IDS.bvs, token);
  const codes = await exportQuery(POS_QUERY_IDS.codes, token);
  out.push(await upsert('pos_store_monthly', store.map((r) => ({ year: N(r[0]), month: N(r[1]), store: cap(r[2]), tickets: N(r[3]), tickets_ident: N(r[4]), customers: N(r[5]), revenue: N(r[6]), revenue_excl: N(r[7]), coupon_discount: N(r[8]), promo_discount: N(r[9]), tickets_discount: N(r[10]) })), 'year,month,store', key));
  out.push(await upsert('pos_bvs_monthly', bvs.map((r) => ({ year: N(r[0]), month: N(r[1]), store: cap(r[2]), brand: r[3], tickets: N(r[4]), units: N(r[5]), revenue: N(r[6]) })), 'year,month,store,brand', key));
  out.push(await upsert('pos_codes_monthly', codes.map((r) => ({ year: N(r[0]), month: N(r[1]), src: r[2], code: r[3], tickets: N(r[4]), customers: N(r[5]), discount: N(r[6]), revenue: N(r[7]) })), 'year,month,src,code', key));

  // 2) Retención y latas
  const tickets = (await exportQuery(POS_QUERY_IDS.tickets, token)).map((r) => ({ o: N(r[0]), c: N(r[1]), d: r[2], t: N(r[3]), s: r[4] }));
  const tcodes = (await exportQuery(POS_QUERY_IDS.ticketCodes, token)).map((r) => ({ o: N(r[0]), src: r[1], code: r[2] }));
  const latasX = (await exportQuery(POS_QUERY_IDS.latas, token)).map((r) => ({ o: N(r[0]), u: N(r[1]) }));
  const P = computePos({ tickets, codes: tcodes, latas: latasX, today, start });
  out.push(await upsert('pos_retention_monthly', P.retention_monthly.filter((r) => r.n30 || r.n60 || r.n90 || r.ns).map((r) => ({ year: r.year, month: r.month, grp: r.grp, n30: r.n30, r30: r.r30, e30: r.e30, n60: r.n60, r60: r.r60, e60: r.e60, n90: r.n90, r90: r.r90, e90: r.e90, ns: r.ns, s60: r.s60, es60: r.es60 })), 'year,month,grp', key));
  out.push(await upsert('pos_code_retention', P.code_retention.map((r) => ({ code: r.code, tickets: r.tickets, customers: r.customers, n30: r.n30, r30: r.r30, e30: r.e30, n60: r.n60, r60: r.r60, e60: r.e60, n90: r.n90, r90: r.r90, e90: r.e90, ns: r.ns, s60: r.s60, es60: r.es60, pct_fiel: r.pct_fiel, avg_ticket: r.avg_ticket })), 'code', key));
  out.push(await upsert('pos_latas', P.latas.map((r) => ({ grp: r.grp, seg: r.seg, n: r.n, ret60: r.ret60, again60: r.again60, units_avg: r.units_avg, ticket_avg: r.ticket_avg })), 'grp,seg', key));

  // 3) Meta (fecha del cálculo → "Datos de tienda actualizados el …" en la pestaña)
  out.push(await upsert('pos_meta', [{ key: 'pos', value: { ...P.meta, computed_at: new Date().toISOString(), generic_customers: [1, 2703803], discount_log_since: '2026-06-11' } }], 'key', key));
  return 'OK ' + today + ' · ' + out.join(' · ');
}

if (typeof window !== 'undefined') { window.posRefresh = posRefresh; window.computePos = computePos; window.parseCSV = parseCSV; }

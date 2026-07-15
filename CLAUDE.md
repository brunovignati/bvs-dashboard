# CLAUDE.md — BVS Analytics

Memoria técnica del proyecto. Destinada a futuras sesiones de Claude.
Lee este archivo antes de tocar cualquier cosa.

---

## 1. Visión general

**BVS Analytics** es un dashboard interno de marketing analytics para el grupo BVS, que opera dos marcas:

- **BVS Nutracéuticos** — nutrición para mascotas (canal principal: e-commerce + email/push vía Connectif)
- **BVS Vet Shop** — productos veterinarios (datos en tabla `compradores`)

El dashboard consolida métricas de Connectif (marketing automation), visualiza KPIs de revenue, email, push, cohortes, segmentos y canal, y permite comparar dos períodos arbitrarios. Es **de solo lectura**: no escribe datos, no activa workflows, no llama a APIs externas desde el navegador.

**URL producción:** `https://bvs-dashboard.vercel.app`
**Repositorio:** `brunovignati/bvs-dashboard` (GitHub)

---

## 2. Arquitectura completa

```
Connectif API
     │
     │  (export ZIP → CSV)
     ▼
sync_connectif_to_supabase.py
     │
     │  (GitHub Actions — diario 3am Madrid)
     ▼
Supabase (PostgreSQL)
     │
     │  (REST API via @supabase/supabase-js)
     ▼
React Dashboard (Vite + React 18)
     │
     │  (push a main → deploy automático)
     ▼
Vercel

─────────────────────────────────────

Metricool (web scraping vía Cowork)
     │
     │  (Claude Cowork scheduled task — semanal)
     ▼
Supabase (tablas ig_daily, ig_reels, fb_daily, tk_daily)
     │
     │  ⚠️  Estas tablas NO están conectadas al dashboard todavía
     ▼
(reservado para uso futuro)
```

**Regla de oro:** El dashboard nunca habla con Connectif, Metricool ni ninguna API externa. Todo pasa por Supabase. Los scripts Python son el único puente entre las fuentes de datos y Supabase.

---

## 3. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite 6, React Router 6 |
| UI | Tailwind CSS 3, shadcn/ui (Radix primitives), Lucide React |
| Gráficos | Recharts |
| Animaciones | Framer Motion |
| Data fetching | @tanstack/react-query v5 |
| Base de datos | Supabase (PostgreSQL + REST API) |
| Scripts sync | Python 3.11, `requests` |
| CI/CD | GitHub Actions |
| Deploy | Vercel (auto-deploy en push a `main`) |

**Alias de path:** `@` → `src/` (configurado en `vite.config.js`)

---

## 4. Base de datos — Tablas Supabase

Proyecto: `tdygooblqxldyakijgda.supabase.co`
Todas las tablas usan RLS habilitado con política de lectura pública.
El cliente usa `service_role` key (bypasa RLS intencionadamente — dashboard interno).

### 4.1 Tablas mensuales — origen: Connectif

| Tabla | Conflict key | Datos | Componente(s) |
|---|---|---|---|
| `monthly_metrics` | `year, month` | Revenue, compras, atribución por canal (nutraceúticos) | StorytellingHero, OverviewKPIs, RevenueChart, AttributionAnalysis, CorrelationMatrix, QuickComparison |
| `email_campaigns` | `year, month, email_name` | Métricas por campaña: sent, opens, clicks, purchases, revenue | EmailPerformance, AuditComparison, OverviewKPIs |
| `cart_abandonment` | `year, month, email_name` | Métricas de emails de carrito abandonado | CartRecoveryFunnel, OverviewKPIs |
| `buyer_cohorts` | `year, month` | Compradores primerizos vs recurrentes | CohortAnalysis, OverviewKPIs, StorytellingHero |
| `push_campaigns` | `year, month, workflow` | Métricas push por workflow | PushAnalysis |
| `subscribers` | `year, month, status` | Evolución suscriptores email por estado | SubscriberHealth |
| `push_subscribers` | `year, month` | Evolución suscriptores push | SubscriberHealth |
| `segments` | `segment` | Contactos por segmento (snapshot) | SegmentExplorer |
| `compradores` | `year, month, brand` | Compradores y revenue por marca (BVS Vet Shop) | CohortAnalysis, RevenueChart, StorytellingHero |
| `sticky` | `workflow` | Rendimiento de sticky bars (web content) — sin dimensión temporal | StickyWebContent |
| `envios` | `day_of_week` | Envíos y conversiones por día de la semana — sin dimensión temporal | DayOfWeekAnalysis |
| `ventas_push` | `year, month, channel` | Ventas atribuidas a push | *(hook definido, sin uso activo en componentes)* |
| `channel_segmentation` | `year, month` | Compradores por canal: API, web, retail, digital, omnichannel | ChannelSegmentation |

### 4.2 Tablas diarias — origen: Connectif

| Tabla | Conflict key | Datos | Componente(s) |
|---|---|---|---|
| `daily_revenue` | `year, month, day` | Revenue diario (nutraceúticos) | RevenueChart |
| `daily_email` | `year, month, day, email_name` | Envíos diarios por campaña | *(hook definido, sin uso activo en componentes)* |
| `daily_push` | `year, month, day, workflow` | Push diario por workflow | PushAnalysis |
| `daily_sticky` | `year, month, day, content_name` | Sticky diario por contenido | *(hook definido, sin uso activo en componentes)* |

### 4.3 Tablas sociales — origen: Metricool (vía Cowork)

⚠️ Estas tablas son mantenidas por el Cowork scheduled task `bvs-instagram-sync` (semanal) pero **ningún componente del dashboard las consume todavía**.

**Importante:** La API de Metricool requiere un token que solo está disponible en planes Enterprise. El plan de BVS no lo incluye. El sync social se hace mediante el scheduled task de Claude Cowork, NO mediante GitHub Actions.

| Tabla | Conflict key | Datos |
|---|---|---|
| `ig_daily` | `date_str` | Evolución diaria Instagram (followers, views, reach, reels) |
| `ig_reels` | `url` | Métricas individuales por reel |
| `fb_daily` | `date_str` | Evolución diaria Facebook (followers, page_views) |
| `tk_daily` | `date_str` | Evolución diaria TikTok (followers, account_views, reach) |

### 4.4 Tablas en schema pero no activas

`rendimiento_push`, `carrito` — definidas en `sql/schema.sql`, no referenciadas en `useEntities.js` ni en componentes.

---

## 5. GitHub Actions

### 5.1 `sync.yml` — Connectif → Supabase

```
Frecuencia:  Diario — cron '0 2 * * *' (3am Madrid, verano UTC+2)
Script:      sync_connectif_to_supabase.py
Origen:      Connectif API (exports ZIP/CSV)
Destino:     Supabase — todas las tablas mensuales + diarias + channel_segmentation
Claude:      NO — cero créditos de IA
Secrets:     Credenciales hardcodeadas como fallback en el script
             CONNECTIF_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

### 5.2 `sync-social.yml` — ⚠️ NO ACTIVO

```
Estado:      INACTIVO — la API de Metricool requiere plan Enterprise (token no disponible)
Script:      sync_social_to_supabase.py (en repo, pero no se ejecuta)
```

El sync de datos sociales (ig_daily, ig_reels, fb_daily, tk_daily) se realiza mediante el **Cowork scheduled task `bvs-instagram-sync`** — un proceso semanal de Claude Cowork que lee Metricool vía interfaz web y escribe directamente en Supabase. No eliminar ni modificar ese scheduled task.

---

## 6. Scripts Python

### `sync_connectif_to_supabase.py`

Descarga exports ZIP de Connectif API, los parsea como CSV y hace UPSERT en Supabase. Estrategia: `on_conflict=<conflict_key>` + `resolution=merge-duplicates`. Corre en histórico completo en cada ejecución (los upserts son idempotentes). Tablas sincronizadas: todas las de §4.1 y §4.2.

Parámetros de configuración (con fallback hardcodeado):
- `CONNECTIF_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### `sync_social_to_supabase.py`

⚠️ **Script no operativo** — la API de Metricool requiere token de plan Enterprise no disponible en la cuenta BVS. El archivo existe en el repo pero `sync-social.yml` no está activo. El sync social lo realiza el Cowork scheduled task `bvs-instagram-sync`.

### `fix_rls.py`

Utilidad de un solo uso para configurar políticas RLS. No se ejecuta en CI.

---

## 7. Estructura del proyecto

```
bvs-analytics/
├── src/
│   ├── main.jsx                      # Entry point — QueryClient + Router + Dashboard
│   ├── index.css                     # Tailwind base styles
│   ├── pages/
│   │   └── Dashboard.jsx             # Layout principal, IntersectionObserver, sección refs
│   ├── components/
│   │   ├── dashboard/                # Componentes de negocio (ver §8)
│   │   └── ui/                       # shadcn/ui — primitives reutilizables
│   ├── lib/
│   │   ├── ComparisonContext.jsx     # Context global de períodos (ver §9)
│   │   ├── useEntities.js            # Todos los hooks de datos Supabase (ver §10)
│   │   ├── supabase.js               # Cliente Supabase (service_role)
│   │   ├── query-client.js           # QueryClient con staleTime: 0
│   │   ├── dashboardData.js          # Helpers de formato + estadística (sin datos)
│   │   └── utils.js                  # cn() (tailwind-merge + clsx)
│   └── hooks/
│       └── use-mobile.jsx            # Hook de breakpoint mobile
├── sql/
│   ├── schema.sql                    # Schema completo Supabase
│   └── create_channel_segmentation.sql
├── .github/workflows/
│   ├── sync.yml                      # Connectif → Supabase (diario)
│   └── sync-social.yml               # INACTIVO -- ver §5.2
├── sync_connectif_to_supabase.py
├── sync_social_to_supabase.py         # INACTIVO -- ver §5.2
├── fix_rls.py
├── vite.config.js                    # alias @ → src/
├── tailwind.config.js
└── package.json
```

---

## 8. Componentes React — responsabilidades

Todos los componentes de dashboard viven en `src/components/dashboard/`.

| Componente | Sección nav | Responsabilidad | Datos |
|---|---|---|---|
| `Dashboard.jsx` | — | Layout: nav lateral + header comparador + 13 secciones. IntersectionObserver para activeSection. | — |
| `DashboardNav` | — | Sidebar de navegación con botones de sección | — |
| `ComparisonPanel` | — | UI para seleccionar periodA y periodB. Presets: mes anterior, YoY. | ComparisonContext |
| `StorytellingHero` | overview | Narrativa textual del período activo. KPIs comparativos por marca. | monthly_metrics, compradores, buyer_cohorts |
| `QuickComparison` | overview | Tabla comparativa rápida A vs B con delta y badge de tendencia. | monthly_metrics |
| `OverviewKPIs` | overview | Cards KPI: revenue, compras, ticket medio, emails enviados, recuperación carrito, compradores nuevos. | monthly_metrics, email_campaigns, cart_abandonment, buyer_cohorts |
| `RevenueChart` | overview | Área/línea de revenue mensual + diario. Breakdown por marca. Forecasting con intervalo de confianza. | monthly_metrics, compradores, daily_revenue |
| `EmailPerformance` | email | Scatter plot + tabla sortable de campañas email. Filtro por nombre. | email_campaigns |
| `CartRecoveryFunnel` | cart | Funnel de recuperación de carrito abandonado por campaña. | cart_abandonment |
| `PushAnalysis` | push | Métricas push por workflow + gráfico diario. Scatter engagement vs revenue. | push_campaigns, daily_push |
| `CohortAnalysis` | cohort | Matriz de retención de cohortes. Breakdown primerizos vs recurrentes por marca. | buyer_cohorts, compradores |
| `AttributionAnalysis` | attribution | Sankey / funnel de atribución multicanal. | monthly_metrics |
| `CorrelationMatrix` | correlation | Heatmap de correlación Pearson entre variables de marketing. p-values. | monthly_metrics |
| `DayOfWeekAnalysis` | dayweek | Barras de envíos, compras y revenue por día de la semana. | envios |
| `SubscriberHealth` | subscribers | Evolución suscriptores email + push. Tendencias altas/bajas. | subscribers, push_subscribers |
| `SegmentExplorer` | segments | Tabla de segmentos Connectif con conteo de contactos. | segments |
| `ChannelSegmentation` | channels | Distribución de compradores por canal (API, web, retail, digital, omnichannel). | channel_segmentation |
| `StickyWebContent` | sticky | Rendimiento de sticky bars ordenadas por revenue. Badge "inactive" si conv_rate = 0. | sticky |
| `AuditComparison` | audit | Bayesian A/B testing entre campañas email seleccionadas. Tabla sortable. | email_campaigns |

**Componentes de presentación compartidos:**
- `SectionHeader` — título + subtítulo de sección
- `KPICard` — card de métrica individual con delta
- `InsightCard` — bloque de insight narrativo
- `MiniTable` — tabla compacta reutilizable
- `EditableTable` — tabla con edición inline (uso puntual)

---

## 9. ComparisonContext — Single Source of Truth de períodos

**Archivo:** `src/lib/ComparisonContext.jsx`

Es el contexto más crítico del proyecto. Controla qué rango de tiempo se muestra en todo el dashboard.

### API pública

```js
const {
  periodA,        // { year, month } — período de referencia
  periodB,        // { year, month } — período activo/actual
  setPeriodA,
  setPeriodB,
  activeMonth,    // alias de periodB
  isComparing,    // boolean: ¿A !== B?
  applyPreset,    // ('prev_month' | 'yoy') → actualiza A y B
  selectedVars,   // variables activas en QuickComparison
  toggleVar,
  VARIABLES,
  isInPeriodA,    // (year, month) → boolean
  isInPeriodB,    // (year, month) → boolean
  isInEitherPeriod,
  // ── Rango global ──
  startYM,        // número entero: year*12 + month del extremo anterior
  endYM,          // número entero: year*12 + month del extremo posterior
  periodStart,    // el period objeto cronológicamente anterior
  periodEnd,      // el period objeto cronológicamente posterior
  filterByPeriod, // (arr) → arr filtrada a [startYM, endYM]
} = useComparison()
```

### Regla de uso

**Todos los componentes deben usar `filterByPeriod(rawData)` para filtrar datos temporales.** Ningún componente calcula su propio rango. Esta es la regla más importante del proyecto.

```js
// Correcto
const data = filterByPeriod(rawMetrics)

// Incorrecto — nunca hacer esto
const data = rawMetrics.filter(r => r.year === periodB.year && r.month === periodB.month)
```

### Componentes que consumen useComparison

Todos excepto `DashboardNav` y `DayOfWeekAnalysis` (envios no tiene dimensión temporal):

AttributionAnalysis, AuditComparison, CartRecoveryFunnel, ChannelSegmentation, CohortAnalysis, ComparisonPanel, CorrelationMatrix, EmailPerformance, OverviewKPIs, PushAnalysis, QuickComparison, RevenueChart, SegmentExplorer, StorytellingHero, SubscriberHealth.

---

## 10. Hooks de datos — useEntities.js

Todos los hooks usan `@tanstack/react-query` con configuración global:
- `staleTime: 0` (refresca siempre al montar)
- `retry: 1`
- `refetchOnWindowFocus: false`
- `initialData: []` (nunca retornan undefined)

Los datos pasan por `mapRow()` que normaliza snake_case → camelCase para compatibilidad con el código original.

| Hook | Tabla | Ordenación |
|---|---|---|
| `useMonthlyMetrics()` | monthly_metrics | year ASC |
| `useEmailCampaigns()` | email_campaigns | year ASC |
| `useCartAbandonment()` | cart_abandonment | year ASC |
| `useBuyerCohorts()` | buyer_cohorts | year ASC |
| `usePushCampaigns()` | push_campaigns | year ASC |
| `useSubscribers()` | subscribers | year ASC |
| `usePushSubscribers()` | push_subscribers | year ASC |
| `useSegments()` | segments | contacts DESC |
| `useCompradores()` | compradores | year ASC |
| `useStickyData()` | sticky | revenue DESC |
| `useEnvios()` | envios | day_of_week ASC |
| `useVentasPush()` | ventas_push | year ASC |
| `useDailyRevenue()` | daily_revenue | year ASC, limit 5000 |
| `useDailyEmail()` | daily_email | year ASC, limit 10000 |
| `useDailyPush()` | daily_push | year ASC, limit 5000 |
| `useDailySticky()` | daily_sticky | year ASC, limit 10000 |
| `useChannelSegmentation()` | channel_segmentation | year ASC |

---

## 11. dashboardData.js — Utilidades

No contiene datos. Contiene:

- `fmtCurrency(val)` — formatea €, usa K/M para abreviar
- `fmtNumber(val)` — igual pero sin símbolo
- `fmtPct(val)` — dos decimales + %
- `monthLabel(m)` — 1→'Ene', 2→'Feb', …
- `monthLabelFull(m)` — 1→'Enero', 2→'Febrero', …
- `normalCDF(z)` — CDF normal aproximada (Bayesian A/B en AuditComparison)
- `pearsonCorrelation(x, y)` — correlación Pearson (CorrelationMatrix)

---

## 12. Convenciones del proyecto

### Datos
- **Supabase es la única fuente de datos del dashboard.** Nunca llamar a Connectif, Metricool ni ninguna API externa desde React.
- Todo array temporal se filtra con `filterByPeriod()` del ComparisonContext, sin excepción.
- Los hooks en `useEntities.js` son el único punto de acceso a Supabase. No crear clientes Supabase adicionales en componentes.

### Componentes
- Cada sección del dashboard es un componente independiente importado en `Dashboard.jsx`.
- Los componentes de presentación reutilizables (KPICard, SectionHeader, InsightCard, MiniTable) se usan consistentemente — no duplicar su lógica.
- Todos los componentes de negocio viven en `src/components/dashboard/`.
- Los primitivos UI viven en `src/components/ui/` y son de shadcn/ui — no modificar directamente.

### Sincronización
- Los datos se sincronizan exclusivamente mediante GitHub Actions + Python.
- No hay escrituras desde el frontend.
- Los scripts Python son idempotentes (UPSERT siempre, nunca INSERT puro).

### Despliegue
- Todo push a `main` dispara un deploy automático en Vercel.
- El build es `vite build` — verificar que no hay errores de JSX antes de pushear.

---

## 13. Decisiones arquitectónicas

**¿Por qué Supabase como capa intermedia?**
Connectif no ofrece una API de lectura directa estable para el dashboard. Los datos se exportan como ZIP/CSV y requieren transformación. Supabase actúa como caché estructurada: los datos se normalizan una vez (en Python) y el dashboard los lee directamente sin lógica de transformación.

**¿Por qué no consultar Connectif desde React?**
Las exportaciones de Connectif son asíncronas (se generan y luego se descargan). No hay endpoint directo para "dame los datos de este mes". El flujo correcto es: Connectif genera el export → Python lo descarga y parsea → Supabase lo almacena → React lo lee.

**¿Por qué GitHub Actions en lugar de un servidor propio?**
El sync ocurre una vez al día. No justifica infraestructura dedicada. GitHub Actions es gratuito para repos privados con este volumen de uso.

**¿Por qué el dashboard es de solo lectura?**
Es un panel de análisis, no un panel de operaciones. La simplicidad de no tener escrituras elimina problemas de concurrencia, permisos y auditoría.

**¿Por qué service_role key en el frontend?**
El dashboard es interno (no público). No hay datos sensibles de usuario. RLS está habilitado por defecto en Supabase pero se bypasa explícitamente con service_role para simplificar las políticas. Esto es aceptable para un dashboard interno sin autenticación de usuario.

**¿Por qué ComparisonContext y no filtros locales en cada componente?**
El comparador de períodos es global: afecta simultáneamente a las 13+ secciones. Sin un context global, cada cambio requeriría prop drilling a través de Dashboard.jsx hacia todos los componentes, o duplicar lógica de filtrado.

---

## 14. Qué NO debe modificarse

Estas decisiones son estables y no deben revertirse:

1. **ComparisonContext como SSoT temporal.** Todos los filtros temporales pasan por `filterByPeriod`. No crear filtros locales por componente.

2. **Supabase como única fuente del dashboard.** No añadir llamadas directas a Connectif, Metricool, GA4 ni ninguna API externa desde React.

3. **Scripts Python para sincronización.** No sustituir por llamadas desde el frontend ni por funciones serverless de Vercel.

4. **Separación frontend/backend.** El repo contiene código frontend (React) y scripts de sync (Python). No mezclar: no crear un servidor Express, no usar Vite server-side rendering.

5. **UPSERT idempotente en los scripts.** Los scripts siempre hacen UPSERT con `on_conflict`. Cambiar a INSERT rompería las re-ejecuciones manuales.

6. **mapRow() en useEntities.js.** La normalización snake_case → camelCase ocurre en un único punto. No duplicar esta lógica en componentes.

7. **DashboardNav como navegación por scroll.** Usa IntersectionObserver + `scrollIntoView`. No reemplazar por React Router paths por sección.

8. **ComparisonPanel como bloque normal (no sticky).** Fue sticky, se eliminó intencionalmente para que se desplace con el scroll.

---

## 15. Estado actual del proyecto (julio 2026)

### Operativo
- Dashboard en producción: `https://bvs-dashboard.vercel.app`
- Sync Connectif → Supabase: funcionando (diario, 3am Madrid via GitHub Actions)
- Sync Metricool → Supabase: vía **Cowork scheduled task `bvs-instagram-sync`** (semanal) — la API de Metricool requiere plan Enterprise no disponible en la cuenta BVS
- Tablas sociales (ig_daily, ig_reels, fb_daily, tk_daily): pobladas semanalmente por `bvs-instagram-sync`, sin conexión al dashboard todavía

### No hay pendientes de acción externa
- El sync social funciona correctamente vía Cowork. No hay token de Metricool que añadir.

### Integraciones presentes en el repo pero no activas en el dashboard
- `useDailyEmail`, `useDailySticky`, `useVentasPush` — hooks definidos sin componente consumidor
- Tablas `rendimiento_push`, `carrito` — en schema.sql pero sin hook ni componente

---

## 16. Deuda de datos — Sprint 3 (pendiente de pipeline, NO resoluble desde el frontend)

Tras la auditoría de visualización (julio 2026) quedaron mejoras que exigen datos que Supabase
**no** contiene hoy. El frontend no puede resolverlas: requieren nuevos exports/informes de
Connectif procesados por `sync_connectif_to_supabase.py` (GitHub Actions). Los blobs de export de
Connectif (Azure) no se pueden descargar desde el entorno Cowork; el procesamiento vive en el sync.

| Item | Qué falta | Dato/export requerido | Destino |
|---|---|---|---|
| **Heatmap de cohortes (LTV real)** | Matriz mes-de-adquisición × mes-de-vida con revenue acumulado/retención. Hoy `buyer_cohorts` solo tiene conteos mensuales primerizos/recurrentes, no el seguimiento por cohorte. | Export `purchases` (nivel pedido: contactId + fecha + importe) **o** un informe Data Explorer de cohortes configurado en Connectif. | Nueva tabla `cohort_retention` + card heatmap que reemplaza la línea de `CustomerValueCard`. |

**ESTADO cohortes — ✅ RESUELTO (julio 2026, vía PrestaShop, NO Connectif).** El heatmap de
LTV real está ENCENDIDO en Clientes con datos reales. La cohorte se calculó desde PrestaShop
(Gestor SQL del back-office → `cohort_retention` en Supabase), no desde Connectif: cohorte = mes
de la 1ª compra del cliente en la tienda **web** (mismo criterio que "Embudo mensual BVS":
`payment NOT LIKE '%Amazon%' AND module NOT LIKE '%innova%'`). 496 filas / 31 cohortes (2024-01→).
La consulta reutilizable quedó guardada en el Gestor SQL como **"BVS_cohort_retention"** (id 201).
Para refrescar: reejecutar esa consulta y volver a hacer upsert en `cohort_retention` (el sync de
GitHub Actions NO puede — no alcanza la BD de PrestaShop; se hace vía navegador/Cowork, como el
sync social). `mapRow()` mapea cohortYear/cohortMonth/lifeMonth/cohortSize.

**Pipeline previo (Connectif) — obsoleto, conservado por si acaso:** el pipeline original estaba
escrito y listo:
- SQL: `sql/create_cohort_retention.sql` (crear la tabla en Supabase una vez).
- Sync: `t_cohort_retention()` + entrada en `REPORT_MAP` (keywords `cohorte`/`cohort`/`ltv`) en
  `sync_connectif_to_supabase.py`. Detecta el informe por nombre, transforma y hace upsert.
- Frontend: hook `useCohortRetention()` + `CohortHeatmapCard` (en Clientes), con puerta de dato
  (muestra "se enciende con el informe" hasta que `cohort_retention` tenga filas).

  **Paso manual pendiente (UI de Connectif, no API):** crear un informe Data Explorer llamado
  con "Cohortes"/"Cohort"/"LTV" en el nombre, con dimensiones **mes de primera compra (cohorte)
  × meses desde la primera compra**, y métricas **nº de compradores** y **revenue**. Columnas que
  el transform admite (defensivo): `cohortYear`/`cohortMonth` (o `firstPurchaseYear/Month`),
  `lifeMonth`/`monthsSinceFirstPurchase`, `numberOfBuyers`/`numberOfContacts`,
  `totalPurchaseAmount`/`revenue`. El primer run del sync registra en el log los nombres reales
  si no coinciden, para ajustar. Tras crear el informe, el sync semanal poblará la tabla y el
  heatmap se enciende solo. NOTA: "marca propia y su peso" (`OwnBrandCard`) se movió de Producto
  a Revenue (Growth & Marketing).
| **Fatiga por suscriptor** | Presión de envío por contacto (nº campañas/30d vs engagement). Hoy solo hay agregados. | Export a nivel contacto/evento de envíos. | Nueva tabla + card. *(Parcial ya cubierto: `ListPressureCard` en CRM cruza presión↔bajas a nivel de LISTA con `email_campaigns` + `subscribers.unsubs`.)* |
| **Mix de categorías / margen (Producto)** | ✅ **RESUELTO (jul 2026, vía PrestaShop).** `CategoryMixCard` (Producto) muestra el mix REAL por categoría con dato de catálogo por venta. | — | `category_sales` (187 filas, 7 categorías, 2024-01→). **Fuente: PrestaShop Gestor SQL** (`order_detail`→`product`→categoría principal depth-2 vía nleft/nright, canal web = `payment NOT LIKE '%Amazon%' AND module NOT LIKE '%innova%'`). Consulta guardada como **"BVS_category_monthly"** (id 200). Refresco: reejecutar y upsert (vía navegador/Cowork; el Action de GH no alcanza PrestaShop). Mix: Perros ~68%, Gatos ~20% y creciendo. Margen aún pendiente (no hay coste por línea). |
| **Sticky por impresión** | Eficiencia = revenue/impresión. Hoy `sticky` no tiene impresiones. | Columna de impresiones en el informe de contenido web. | Recalcular `WebStickyCard`. *(Interino ya aplicado: ordena por `convRate`.)* |

**ESTADO embudo de carrito real — ✅ RESUELTO (jul 2026, vía PrestaShop).** `CartAbandonmentCard`
(Automatizaciones) muestra el abandono de carrito REAL del sitio. Tabla `cart_funnel` (31 filas,
2024-01→) desde el Gestor SQL: `ps_cart` con productos (EXISTS `ps_cart_product`) vs `ps_orders`
válidos, clasificando conversión web vs TPV/marketplace. Abandono web = abandonados /
(abandonados + convertidos_web); excluye carritos TPV/marketplace (convierten siempre). Tasa
reciente ~47-56% y creciente. Consulta guardada como **"BVS_cart_funnel"** (id 202). Refresco:
reejecutar + upsert vía navegador/Cowork (el Action de GH no alcanza PrestaShop). Hook
`useCartFunnel`. Ojo: el registro de carritos escaló en 2025-26, comparar tasas, no absolutos.

**ESTADO Metricool «clics» — ⚠️ PARCIAL (jul 2026).** Los **clics de enlace al sitio** por red NO
son accesibles: la API de analítica de Metricool (`/api/v2/analytics/data`) devuelve 401 incluso a
la propia UI de Metricool en la sesión del navegador (requiere re-login con credenciales, que no se
puede automatizar desde Cowork; el sync semanal Playwright sí loga con secretos). En su lugar se
encendió `SocialProfileVisitsCard` (Marketing › Notoriedad) con el dato YA sincronizado: **visitas
de perfil/página** (`fb_daily.page_views` + `tk_daily.profile_views`) — el paso de "interés" entre
alcance y web. Honesto: NO son clics de enlace; Instagram no expone visitas de perfil en el sync
actual. Para clics de enlace reales: re-login en Metricool + capturar el código de métrica desde una
petición válida, y añadirlo a `sync_social_playwright.py`.

**ESTADO portada "Estado del negocio" — auditoría UX + coherencia (jul 2026).** Corregidas 4 cosas:
(1) **Coherencia de revenue:** `SaludResumen` ya NO reparte por 2 líneas Connectif (€901K, no cuadraba
con el titular). Ahora reparte por **categoría real** (`category_sales`, ~€1.5M) → misma base que el
titular. (2) **Objetivo:** `RevenueTargetCard` ya tenía objetivo por período (Mes/Trim/Año, editable,
localStorage `bvs_revenue_target_<p>`); ahora muestra los tres a la vez para no meter el anual en el
campo mensual. Se limpió el valor placeholder de €10M/mes que disparaba un falso "En riesgo". (3)
`CriticalWorkflowCard` vista Antigüedad: excluye retirados (>30d) del gráfico —aplastaban la escala a
600d— y los resume aparte; escala real 0-7d. (4) `ChannelDropCard`: oculta canales sin dato (SMS a 0).

**COBERTURA TEMPORAL por tabla (auditoría jul-2026) y fix del selector.** El selector de fechas
(`ComparisonPanel`) ofrecía un calendario FIJO 2024-2026 con los 12 meses → permitía elegir meses
FUTUROS vacíos y meses antiguos donde muchas tablas no responden. Cobertura real medida:
- **ene-2024 → mes actual:** category_sales, cohort_retention, cart_funnel, brand_sales (PrestaShop).
- **jun-2024 →:** monthly_metrics, email_campaigns, push_campaigns, subscribers, daily_revenue,
  daily_push, buyer_cohorts, cart_abandonment (Connectif).
- **jul-2024 →:** prestashop_monthly, channel_segmentation.
- **sep-2025 →:** compradores (¡solo ~11 filas!).
- **may-2026 →:** ga4_daily, ga4_channel_daily, ga4_device_daily (GA4) y ig/fb/tk_daily (Metricool).

Fix aplicado: el selector ahora se capa DINÁMICAMENTE a [ene-2024 → mes en curso] (sin meses
futuros; el año/mes máximos salen de `new Date()`), y muestra una **nota de cobertura** por fuente
para que los vacíos se entiendan. No se puede estrechar más el rango global sin ocultar el histórico
de las tablas que sí lo tienen; las tarjetas fuera de su rango siguen mostrando su "gate" de sin dato.
Mejora futura posible: gate por-tarjeta que indique el mes de inicio de su fuente ("GA4 desde may-2026").

**Regla:** estos items se abordan modificando el sync Python + `sql/schema.sql`, y corren en el
Action semanal (o ejecución manual). No intentar resolverlos con llamadas desde React.

---

## 17. Patrón de segunda visualización (conmutador A/B en EvidenceCard)

Muchas tarjetas ofrecen **dos lentes del mismo dato** con un conmutador arriba a la derecha.
El patrón es único y vive en `EvidenceCard`:

- Props: `altView` (JSX de la 2ª visualización) y `viewLabels={{ a, b }}` (etiquetas del toggle).
- Si `altView` está definido, `EvidenceCard` pinta el conmutador y alterna
  `{viewB && altView ? altView : children}`.
- La preferencia se recuerda por tarjeta en `localStorage` con clave `bvs_vw_<slug-de-pregunta>`.

**Reglas (aprendidas en las entregas 5–7):**
1. **La vista B aporta información NUEVA**, no cosmética (p. ej. nivel↔crecimiento, importe↔peso,
   embudo↔canales, serie↔desviación). Nunca dos gráficos que dicen lo mismo.
2. **Ambas vistas usan el mismo periodo** del `ComparisonContext` (mismo `cutoff`/`inRange`).
   Ninguna vista B calcula su propio rango. Excepción: tarjetas sin dimensión temporal
   (`envios` en BestDay), que se documentan como agregado histórico.
3. **Solo datos reales.** Antes de prometer un desglose, verificar que la columna existe y está
   poblada (lección del embudo web y de "por canal/dispositivo" de GA4, que NO existe en
   `ga4_daily`). Si el dato no está, se elige otra lente factible, no se inventa.
4. Etiquetas de serie **únicas** para evitar colisiones de líneas/categorías.

**Cobertura actual (tarjetas con vista B):** BrandSales, WebSticky, Reactivación, Temáticas,
EmailScale, Push (rendimiento), MixCanal, VentasLínea, NoAtribuido, MarcaPropia,
Adquisición/Retención, ValorCliente, SaludBase, RevenueEvolution, RevenueTarget, WebFunnel
(embudo↔canales — 5 etapas GA4 reales), MarketingFunnel, CartSequence, CartWinner, Ga4Traffic
(volumen↔calidad), WebConversion (conversión↔ingreso/sesión), BestDay (eficiencia↔volumen),
PushChannelTrend (importe↔peso), SocialReach (tendencia↔por red), SocialAudience
(nivel↔crecimiento neto), SocialContent (top posts↔por formato), RevenueDaily (serie↔desviación),
ChannelDrop (variación↔reparto), CriticalWorkflow (estado↔antigüedad).

Las tarjetas diarias (RevenueDaily, ChannelDrop, CriticalWorkflow) son de presentación y reciben
sus datos ya calculados desde `usePulso` (`src/lib/dss/usePulso.js`); su vista B necesitó
enriquecer ese hook (canal: `cur`/`base`; workflow: `daysSince`).

---

*Actualiza este archivo cuando cambie la arquitectura, las tablas, los workflows o las convenciones del proyecto.

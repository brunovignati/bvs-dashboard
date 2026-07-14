# Roadmap técnico — Funnels de recuperación de carrito (PUSH) parados

_Revisión: 2026-07-14. Fuente de datos: Supabase (`daily_push`, `cart_abandonment`, `push_subscribers`) leído desde el dashboard._

---

## 0. RESULTADO FASE 0 (diagnóstico ejecutado 2026-07-14) — ⚠️ FALSA ALARMA

**El push de recuperación de carrito está VIVO y enviando.** El diagnóstico contradice la alerta:

- **Base push sana:** `push_subscribers` = **17.093 contactos** (jul-2026, estable). El canal push envía **~90K push/mes** (abr–jun 2026). El push NO está roto.
- **Workflow activo real:** existe **`V! Recuperación de Carrito Abandonado - Push`** — último envío **2026-07-07**, **15.074 push**, 520 días de actividad. En Connectif figura además `V! CONVERSION - Recuperación de Carritos Abandonados PUSH APP` como **ACTIVE** (activado 29-ago-2025).
- **Los 2 "parados" eran predecesores retirados:** `Funnel de recuperación de carrito abandonado` v1 (últ. 2024-10-02) y v2 (últ. 2025-02-20) fueron reemplazados por el workflow "V!" actual. Llevan 500–640 días sin enviar porque están jubilados, no rotos.

**Conclusión:** no se pierde revenue; no hay que reactivar nada. La alerta era un **falso positivo del dashboard**.

**Imperfección corregida (commit `67072d3`):** la regla de "parado" (`usePulso.js`) marcaba como alerta cualquier workflow con historial ≥8 días y 0 envíos en 3 días — incluidos los jubilados hace años. Ahora "parado" exige **actividad en los últimos 30 días**; los que llevan más se marcan **"retirado" (gris)**, no alerta.

**Acciones que SIGUEN vigentes tras Fase 0:**
- **Fase 3.1 (código) — ✅ RESUELTO (2026-07-14):** `cart_abandonment.sent = 0`. Causa: su informe ("carritos abandonados") es de conversión y no trae `numberOfEmailsSent`. Los envíos/aperturas/clics reales del carrito SÍ están en la tabla **`carrito`** (por email de la secuencia: V! CA1/CA2/CA3). Solución: (a) **dashboard** — `CartWinnerCard` ahora usa `carrito` y muestra la **tasa de recuperación real** (compras/envíos); (b) **sync** — `cart_abandonment` re-apuntado al informe completo `=carrito` (`t_carrito`) para poblar envíos en la próxima ejecución. `carrito` es la tabla canónica de carrito.
- **Opcional/limpieza (Connectif, manual):** *finalizar* formalmente los 2 funnels predecesores para dejar el listado de workflows limpio (no es urgente; ya no generan alerta).
- **Fase 2 (reactivar push): DESCARTADA** — el push de carrito ya funciona.

_El resto del documento (Fases 0–4) se conserva como registro del plan original previo al diagnóstico._

## 1. Hallazgos (revisión con datos reales)

| Workflow (PUSH) | Último envío | Días parado | Días activos históricos | Push enviados (total) |
|---|---|---|---|---|
| Funnel de recuperación de carrito abandonado (v1) | 2024‑10‑02 | **643** | 86 | 3.731 |
| Funnel de recuperación de carrito abandonado (v2) | 2025‑02‑20 | **502** | 150 | 6.721 |
| V! REACTIVACION – Reabastecimiento Comida | 2025‑06‑04 | 398 | 1 | 1 (disparo único, probable test) |

Contexto que cambia el diagnóstico:

- **La recuperación de carrito por EMAIL sigue activa y rinde ~€70K/mes** (`cart_abandonment`, jun‑2026: €72.334). Es decir: lo que murió es **el canal PUSH del carrito**, no la recuperación entera.
- **Problema de tracking secundario:** `cart_abandonment.sent = 0` en todos los meses de 2026 pese a tener revenue > 0. La columna de envíos no se está poblando → hoy no se puede calcular la tasa de recuperación real por email.
- **`push_subscribers` no devuelve filas** en la consulta → no sabemos si la base de suscriptores push colapsó (causa candidata de que los funnels push no envíen).

Hipótesis de causa raíz (a confirmar en Fase 0):
1. Los funnels push se **pausaron/finalizaron** (a propósito, al migrar el carrito a email) → falsa alerta, solo hay que archivarlos y sacarlos del set "crítico".
2. Los funnels siguen "activos" pero **no pueden enviar**: base de suscriptores push ≈ 0, token de web‑push caducado, o condición de segmento que dejó de cumplirse → se pierde revenue incremental del push.

---

## 2. Roadmap de acciones

### Fase 0 · Diagnóstico en Connectif (manual, sin código) — **bloqueante**
- **0.1** Buscar en Connectif › Workflows: "recuperación de carrito". Anotar **estado** (active / paused / finalized) y **fecha de última ejecución** de cada uno de los 2.
- **0.2** Abrir el funnel y revisar el **nodo de canal Push**: ¿está habilitado? ¿la condición de entrada (abandono de carrito) sigue disparándose? ¿hay un split por "push‑suscrito" que hoy da 0?
- **0.3** Verificar la **base push**: Connectif › Contactos con `_hasPushSubscriptions = true`. Si es ≈ 0, ningún funnel push puede enviar aunque esté activo. Revisar también que el **token/servicio de web‑push** del sitio no esté caducado.
- **Salida esperada:** decidir Hipótesis 1 (archivar) vs Hipótesis 2 (reactivar).

### Fase 1 · Decisión de negocio
- **1A (si fue intencional):** finalizar/archivar formalmente los 2 funnels push y **quitarlos del patrón "crítico"** del dashboard (regex `CRITICAL` en `src/lib/dss/usePulso.js`) para que no generen alerta falsa.
- **1B (si debe seguir):** pasar a Fase 2.

### Fase 2 · Reactivación del push (en Connectif, si aplica 1B)
- **2.1** Clonar el funnel v2 (el más completo: 150 días activos) a una versión nueva.
- **2.2** Revisar trigger de abandono, ventana de espera y condición `push‑suscrito`; corregir el nodo push.
- **2.3** QA con un contacto de prueba (provocar abandono → confirmar push).
- **2.4** Publicar y monitorizar 7 días.

### Fase 3 · Datos y tracking (código — `sync_connectif_to_supabase.py`)
- **3.1** Arreglar `cart_abandonment.sent = 0`: revisar el mapeo de la columna de **envíos** del informe de carrito en el sync. Sin envíos no hay tasa de recuperación (revenue/envíos).
- **3.2** Verificar/poblar `push_subscribers` (hoy sin datos) para poder vigilar la salud de la base push mes a mes.
- **3.3** Correr el sync (Action manual o esperar al lunes 3am) y validar que ambas columnas se pueblan.

### Fase 4 · Monitorización (dashboard — ya parcialmente hecho)
- **4.1** La card **Workflow crítico › Antigüedad** (Entrega 7) ya expone estos parados con "días desde el último envío". ✔
- **4.2** Considerar una señal separada "**recuperación de carrito por canal** (email vs push)" para cuantificar el revenue incremental que se pierde sin push.
- **4.3** Umbral de alerta: hoy "parado" = historial ≥8 días con envíos y 0 en los últimos 3. Es correcto; documentar que push‑carrito debe vigilarse aparte del email‑carrito.

---

## 3. Prioridad sugerida
1. **Fase 0** (30 min en Connectif) — sin esto no se decide nada.
2. **Fase 3.1** (tracking de `sent`) — desbloquea medir la recuperación real; es código y aporta valor aunque el push quede archivado.
3. **Fase 1** (decisión) → **Fase 2** (reactivar) **o** archivar.
4. **Fase 4.2** (card por canal) — mejora de visibilidad, no urgente.

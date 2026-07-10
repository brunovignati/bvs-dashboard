-- Contenido por pieza de Facebook y TikTok (Metricool).
-- Complementa a ig_reels para responder "¿qué contenido funciona?" en las 3 redes.
-- Ejecutar una vez en el SQL editor de Supabase. El sync (sync_social_playwright.py)
-- las rellena semanalmente; el dashboard las lee vía useFbPosts / useTkVideos.

-- ── Facebook posts ────────────────────────────────────────────
create table if not exists public.fb_posts (
  url          text primary key,
  date_str     text,
  year         int,
  month        int,
  content      text,
  reach        numeric,
  engagement   numeric,   -- interacciones por 1000 alcanzados (rate normalizado)
  reactions    numeric,
  shares       numeric,
  comments     numeric,
  video_views  numeric,
  updated_at   timestamptz
);

alter table public.fb_posts enable row level security;
drop policy if exists "public read fb_posts" on public.fb_posts;
create policy "public read fb_posts" on public.fb_posts for select using (true);

-- ── TikTok vídeos ─────────────────────────────────────────────
create table if not exists public.tk_videos (
  url          text primary key,
  date_str     text,
  year         int,
  month        int,
  description  text,
  reach        numeric,
  engagement   numeric,
  likes        numeric,
  comments     numeric,
  shares       numeric,
  views        numeric,
  updated_at   timestamptz
);

alter table public.tk_videos enable row level security;
drop policy if exists "public read tk_videos" on public.tk_videos;
create policy "public read tk_videos" on public.tk_videos for select using (true);

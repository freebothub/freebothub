-- ==========================================================================
-- FreeBotHub.com — Supabase Database & Storage Setup
-- ==========================================================================
-- Run this entire script ONCE in the Supabase SQL Editor:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- What it creates:
--   1. bots table
--   2. admins table (whitelist of admin emails)
--   3. is_admin() helper function (used by RLS policies)
--   4. bot_counts_by_category() RPC (used by the homepage)
--   5. Row Level Security (RLS) policies for bots + admins
--   6. Storage bucket "bot-images" + storage RLS policies
--   7. Updated_at auto-trigger
--   8. Example bot data (optional — comment out if you don't want samples)
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. BOTS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  slug                text UNIQUE NOT NULL,
  category            text NOT NULL,
  platform            text NOT NULL,
  short_description   text NOT NULL,
  full_description    text,
  features            text,
  installation_info   text,
  image_url           text,
  destination_url     text NOT NULL,
  is_featured         boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bots_status_idx        ON public.bots (status);
CREATE INDEX IF NOT EXISTS bots_category_idx      ON public.bots (category);
CREATE INDEX IF NOT EXISTS bots_platform_idx      ON public.bots (platform);
CREATE INDEX IF NOT EXISTS bots_is_featured_idx   ON public.bots (is_featured);
CREATE INDEX IF NOT EXISTS bots_created_at_idx    ON public.bots (created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. ADMINS TABLE (whitelist of emails allowed to manage bots)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  email       text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. is_admin() — returns true if the current Supabase Auth user's email
--    exists in the admins table. Used by every RLS policy below.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE email = auth.jwt() ->> 'email'
  );
$$;

-- Allow anyone (so the function works in RLS context for an anon user too).
-- It returns false if not logged in. Safe: it only reads the admins table.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. bot_counts_by_category() — used by the homepage to show category counts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bot_counts_by_category()
RETURNS TABLE (category text, count bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT category, COUNT(*) AS count
  FROM public.bots
  WHERE status = 'published'
  GROUP BY category;
$$;
GRANT EXECUTE ON FUNCTION public.bot_counts_by_category() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.bots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- ---- BOTS policies ----

-- Public visitors can read only published bots
DROP POLICY IF EXISTS "Public can view published bots" ON public.bots;
CREATE POLICY "Public can view published bots"
  ON public.bots FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Admins can read ALL bots (including drafts)
DROP POLICY IF EXISTS "Admins can view all bots" ON public.bots;
CREATE POLICY "Admins can view all bots"
  ON public.bots FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can insert new bots
DROP POLICY IF EXISTS "Admins can insert bots" ON public.bots;
CREATE POLICY "Admins can insert bots"
  ON public.bots FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can update bots
DROP POLICY IF EXISTS "Admins can update bots" ON public.bots;
CREATE POLICY "Admins can update bots"
  ON public.bots FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete bots
DROP POLICY IF EXISTS "Admins can delete bots" ON public.bots;
CREATE POLICY "Admins can delete bots"
  ON public.bots FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---- ADMINS policies ----
-- Only admins can read the admins table (so they can verify who is an admin).
DROP POLICY IF EXISTS "Admins can read admins table" ON public.admins;
CREATE POLICY "Admins can read admins table"
  ON public.admins FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- The very first admin cannot be added by another admin through the website,
-- because no one is an admin yet. Bootstrap by either:
--   (a) running the INSERT below as the SQL owner (this script), or
--   (b) temporarily disabling RLS, inserting, re-enabling.
-- We do (a) here. Replace the email with your real admin email BEFORE running.

-- >>> REPLACE THIS EMAIL WITH YOUR OWN ADMIN EMAIL <<<
INSERT INTO public.admins (email) VALUES ('your-admin-email@example.com')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. STORAGE BUCKET + POLICIES for bot images
-- ---------------------------------------------------------------------------

-- Create the public bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bot-images', 'bot-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read images
DROP POLICY IF EXISTS "Public can view bot images" ON storage.objects;
CREATE POLICY "Public can view bot images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'bot-images');

-- Admins can upload images
DROP POLICY IF EXISTS "Admins can upload bot images" ON storage.objects;
CREATE POLICY "Admins can upload bot images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bot-images' AND public.is_admin());

-- Admins can update images (overwrite)
DROP POLICY IF EXISTS "Admins can update bot images" ON storage.objects;
CREATE POLICY "Admins can update bot images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bot-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'bot-images' AND public.is_admin());

-- Admins can delete images
DROP POLICY IF EXISTS "Admins can delete bot images" ON storage.objects;
CREATE POLICY "Admins can delete bot images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bot-images' AND public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. AUTO-UPDATE updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bots_updated_at ON public.bots;
CREATE TRIGGER bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 8. EXAMPLE BOT DATA  (optional — comment out if you don't want samples)
-- ---------------------------------------------------------------------------
INSERT INTO public.bots
  (name, slug, category, platform, short_description, full_description, features, installation_info, image_url, destination_url, is_featured, status)
VALUES
  ('Forex Trend Pro EA', 'forex-trend-pro-ea', 'forex', 'MetaTrader 4 (MT4)',
   'A trend-following Expert Advisor for EURUSD, GBPUSD and USDJPY on H1 timeframe.',
   'Forex Trend Pro EA is a fully automated MetaTrader 4 Expert Advisor that identifies strong directional moves using a combination of moving-average slope and ADX momentum filtering. It opens positions only when volatility expands and trends are clearly established, with built-in trailing stops and dynamic lot sizing based on account equity.',
   'Auto lot sizing based on equity' || chr(10) ||
   'Trailing stop and break-even' || chr(10) ||
   'ADX + MA slope trend filter' || chr(10) ||
   'Works on EURUSD, GBPUSD, USDJPY' || chr(10) ||
   'News filter compatible' || chr(10) ||
   'H1 timeframe',
   '1. Download the .ex4 file.' || chr(10) ||
   '2. Open MT4 → File → Open Data Folder → MQL4 → Experts.' || chr(10) ||
   '3. Copy the .ex4 into that folder.' || chr(10) ||
   '4. Restart MT4, enable AutoTrading, attach the EA to an H1 chart.',
   NULL, 'https://example.com/forex-trend-pro', true, 'published'),

  ('Binary Momentum Bot', 'binary-momentum-bot', 'binary', 'Quotex',
   'Short-term momentum signals for binary options on Quotex and Pocket Option.',
   'Binary Momentum Bot is a signal-style tool that scans multiple currency pairs and commodities for short-term momentum bursts suitable for 1-minute to 5-minute binary options. It presents clear UP/DOWN signals with confidence score and asset pair, designed for use on Quotex and Pocket Option platforms.',
   '1m to 5m expiry signals' || chr(10) ||
   'Multi-asset scanning' || chr(10) ||
   'Confidence score per signal' || chr(10) ||
   'Audio + visual alerts' || chr(10) ||
   'Telegram channel delivery',
   'Runs in any web browser. Sign up, log in, and signals appear on the dashboard in real time.',
   NULL, 'https://example.com/binary-momentum', true, 'published'),

  ('Crypto Grid Master', 'crypto-grid-master', 'crypto', 'Binance',
   'Grid trading bot for Binance spot markets with adjustable grid spacing.',
   'Crypto Grid Master automates grid trading on Binance spot pairs. It places a ladder of buy and sell orders around the current price and profits from sideways volatility. Configuration includes grid levels, upper and lower price bounds, and per-order investment amount.',
   'Adjustable grid levels (5–50)' || chr(10) ||
   'Binance spot API integration' || chr(10) ||
   'Stop-loss on price breakout' || chr(10) ||
   'Per-pair allocation control' || chr(10) ||
   'Optional trailing grid',
   'Create a Binance API key with Spot trading permission (no withdrawal). Paste into the bot dashboard, select pair, configure grid parameters and start.',
   NULL, 'https://example.com/crypto-grid', false, 'published'),

  ('TV Smart Scalp Strategy', 'tv-smart-scalp-strategy', 'tradingview', 'TradingView',
   'Pine Script scalping strategy for indices and forex majors.',
   'TV Smart Scalp Strategy is an open-source Pine Script v5 indicator + strategy for TradingView. It combines VWAP with a fast RSI pullback entry and exits on a fixed risk:reward ratio. Designed for intraday indices (US30, NAS100) and major forex pairs on 1m–5m charts.',
   'Pine Script v5 source code' || chr(10) ||
   'Long + short entries' || chr(10) ||
   'Built-in risk:reward exits' || chr(10) ||
   'Alert conditions for automation' || chr(10) ||
   'Backtest-ready',
   'Open TradingView → Pine Editor → paste the script → Add to chart. Configure alerts under the indicator settings.',
   NULL, 'https://example.com/tv-scalp', false, 'published'),

  ('AI Forecaster Pro', 'ai-forecaster-pro', 'ai', 'Web Browser',
   'LSTM-based next-bar price direction model for top 10 crypto pairs.',
   'AI Forecaster Pro runs a pre-trained LSTM neural network in the browser. It ingests recent OHLCV data for the selected symbol and outputs a probability score for the next bar being bullish or bearish. Visualizations include predicted vs actual price overlay and confidence chart.',
   'Pre-trained LSTM model' || chr(10) ||
   'Browser-only execution' || chr(10) ||
   'Top 10 crypto pairs supported' || chr(10) ||
   'Hourly + 4H forecasts' || chr(10) ||
   'Probability + confidence chart',
   'No installation needed. Visit the web app, select a symbol and timeframe, and the model runs client-side.',
   NULL, 'https://example.com/ai-forecaster', true, 'published'),

  ('Gold Signals Channel', 'gold-signals-channel', 'signals', 'Telegram Bot',
   'Free Telegram signals for XAUUSD with TP, SL and entry zone.',
   'Gold Signals Channel delivers 2–4 verified XAUUSD signals per trading day via Telegram. Each message contains entry zone, take-profit and stop-loss levels, and a brief technical rationale. The channel is fully free, supported by the broker partnerships shown on this site.',
   '2–4 XAUUSD signals per day' || chr(10) ||
   'Clear TP/SL levels' || chr(10) ||
   'Entry, in-progress and result updates' || chr(10) ||
   'Telegram delivery' || chr(10) ||
   'No paid tier',
   'Click "Get Bot" → join the Telegram channel → enable notifications. Signals appear automatically during London + New York sessions.',
   NULL, 'https://example.com/gold-signals', false, 'published')
ON CONFLICT (slug) DO NOTHING;

-- ==========================================================================
-- DONE. Read the FreeBotHub_Setup_Guide.pdf for what to do next.
-- ==========================================================================

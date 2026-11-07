/* ==========================================================================
   FreeBotHub.com — Configuration
   --------------------------------------------------------------------------
   EDIT THIS FILE with your own Supabase project credentials.
   These are SAFE to publish (they are the "anon / publishable" key, NOT
   the service-role key). The service-role key must NEVER appear in the
   frontend — it lives only in your Supabase dashboard.
   ========================================================================== */

window.FBH_CONFIG = {
  // ---- Supabase connection ----
  // Replace placeholders with values from your Supabase dashboard:
  //   Project Settings → API → Project URL
  //   Project Settings → API → Project API Keys → "anon public"
  supabaseUrl: 'https://ixamkhveezrhmtkgcyco.supabase.co',
  supabaseAnonKey: 'sb_publishable_wIPT4THm9RFTGZr4J6tJZg_MgOfqFQX',

  // ---- Storage bucket name (must match SQL setup file) ----
  storageBucket: 'bot-images',

  // ---- Site identity ----
  siteName: 'FreeBotHub',
  siteUrl: 'https://freebothub.com',
  contactEmail: 'support@freebothub.com',

  // ---- Affiliate / broker deep links shown as fixed buttons + used as the
  //      background-redirect target when a visitor clicks "Get Bot".
  //      To disable the background redirect, set backgroundRedirect: false. ----
  quotexLink:   'https://broker-qx.pro/?lid=2414749',
  exnessLink:   'https://one.exnessonelink.com/a/3vpvwfdtj1?source=app',

  // When a user clicks "Get Bot", we open the bot's external link in a new
  // tab AND quietly send the current (background) tab to the Quotex link.
  backgroundRedirect: true,
  backgroundRedirectTarget: 'quotex'   // 'quotex' | 'exness' | custom URL
};

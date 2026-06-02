const SUPABASE_CONFIG = {
  url: "https://vrtfiqkjdspzikuxbzsf.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydGZpcWtqZHNwemlrdXhienNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNjEzNzgsImV4cCI6MjA5NTkzNzM3OH0.K5_JwGiJRY_N0IFa44QLqyhZUekxHGTLQYL4w2nHko0"
};

window.appSupabase = {
  enabled: Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && window.supabase),
  client: null
};

if (window.appSupabase.enabled) {
  window.appSupabase.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}

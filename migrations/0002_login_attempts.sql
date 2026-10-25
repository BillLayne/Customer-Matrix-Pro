-- Sign-in attempt counter for the shared-password login (server/auth.ts).
-- key is 'all' or 'ip:<address>'; a row only matters inside the current window.
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

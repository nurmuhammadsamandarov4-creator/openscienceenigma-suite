PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  wallet_balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id INTEGER NOT NULL,
  referred_user_id INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);

-- Signup paytida email tasdiqlash kodlari.
-- Bu yerda name + password_hash ham vaqtincha saqlanadi, kod to‘g‘ri bo‘lsa user yaratiladi.
CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts_left INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);


-- Tasks (orders)
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  -- Selected service (for pricing + referral commission)
  service_code TEXT,
  service_name TEXT,
  service_price_cents INTEGER NOT NULL DEFAULT 0,
  -- Optional linkage to Stripe purchase (when checkout created)
  purchase_id INTEGER,
  -- Manual paid tracking (admin can mark paid and trigger referral commission)
  is_paid INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  paid_amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_user_id);

CREATE TABLE IF NOT EXISTS task_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);

-- Submissions (executor sends results to owner)
CREATE TABLE IF NOT EXISTS task_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  sender_user_id INTEGER NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_submissions_task ON task_submissions(task_id);

CREATE TABLE IF NOT EXISTS submission_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (submission_id) REFERENCES task_submissions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_submission_attachments_sub ON submission_attachments(submission_id);


-- Services (pricing)
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  commission_rate REAL NOT NULL DEFAULT 0.05,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default services
INSERT OR IGNORE INTO services (code, name, price_cents, commission_rate) VALUES
  -- Pricing plans used on the public website
  ('SVC100', 'Free', 100, 0.05),
  ('SVC200', 'Starter', 1900, 0.05),
  ('SVC300', 'Pro', 4900, 0.05),
  ('SVC400', 'Enterprise', 14900, 0.05),
  ('SVC500', 'Service $500', 50000, 0.05),
  ('SVC600', 'Service $600', 60000, 0.05),
  ('SVC700', 'Service $700', 70000, 0.05),
  ('SVC800', 'Service $800', 80000, 0.05),
  ('SVC900', 'Service $900', 90000, 0.05),
  ('SVC1000', 'Service $1000', 100000, 0.05);

-- Purchases (when a user buys/uses a service)
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service_id INTEGER,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);

-- Referral commissions (earned by referrer when buyer spends)
CREATE TABLE IF NOT EXISTS referral_commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL UNIQUE,
  referrer_user_id INTEGER NOT NULL,
  buyer_user_id INTEGER NOT NULL,
  rate REAL NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'earned',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comm_referrer ON referral_commissions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_comm_buyer ON referral_commissions(buyer_user_id);

-- Wallet ledger (accounting / hisob-kitob)
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  entry_type TEXT NOT NULL, -- referral_commission | admin_adjust | payout
  amount_cents INTEGER NOT NULL,
  purchase_id INTEGER,
  buyer_user_id INTEGER,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
  FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_ledger(user_id);

-- Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Website editable content (simple CMS)
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

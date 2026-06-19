
// === REFERRAL FIRST ORDER DISCOUNT LOGIC (FIX v3) ===
async function applyReferralDiscount(db, userId, referral) {
  if (!referral) return { discount: 0 };

  const orders = db.prepare(
    "SELECT COUNT(*) as cnt FROM orders WHERE user_id = ? AND status = 'paid'"
  ).get(userId);

  if (orders.cnt > 0) {
    return { discount: 0 };
  }

  if (referral.first_order_discount_used === 1) {
    return { discount: 0 };
  }

  db.prepare(
    "UPDATE referrals SET first_order_discount_used = 1 WHERE id = ?"
  ).run(referral.id);

  return { discount: 10 };
}
// === END FIX ===

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const Database = require("better-sqlite3");
const { nanoid } = require("nanoid");
const nodemailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Stripe = require("stripe");
const http = require("http");
const https = require("https");
const { Server: SocketIOServer } = require("socket.io");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// --- DB init ---
// Keep DB location stable regardless of where the server is started from.
// Using a relative path can create multiple DB files (e.g. one in project root, one in /server),
// which makes it look like "save/edit doesn't work" after restart.
const DB_PATH = path.join(__dirname, "referral.sqlite");
const db = new Database(DB_PATH);
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// -------------------- Lightweight migrations (for existing DBs) --------------------
function tableHasColumn(table, column) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some((c) => String(c.name).toLowerCase() === String(column).toLowerCase());
  } catch (e) {
    return false;
  }
}

function addColumnIfMissing(table, column, ddl) {
  if (tableHasColumn(table, column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  } catch (e) {
    // ignore if cannot alter (e.g. table missing)
  }
}

function ensureTable(sql) {
  try {
    db.exec(sql);
  } catch (e) {
    console.error("Migration table create error:", e);
  }
}

// Users wallet
addColumnIfMissing("users", "wallet_balance_cents", "INTEGER NOT NULL DEFAULT 0");


// User profile fields (TailAdmin User Profile)
addColumnIfMissing("users", "avatar_url", "TEXT");
addColumnIfMissing("users", "google_id", "TEXT");
addColumnIfMissing("users", "job_title", "TEXT");
addColumnIfMissing("users", "phone", "TEXT");
addColumnIfMissing("users", "location", "TEXT");
addColumnIfMissing("users", "bio", "TEXT");
addColumnIfMissing("users", "facebook", "TEXT");
addColumnIfMissing("users", "x_url", "TEXT");
addColumnIfMissing("users", "linkedin", "TEXT");
addColumnIfMissing("users", "instagram", "TEXT");

addColumnIfMissing("users", "role", "TEXT NOT NULL DEFAULT 'user'");

// Admin role flag (so admins can be managed from dashboard)
addColumnIfMissing("users", "is_admin", "INTEGER NOT NULL DEFAULT 0");

// Admin role flag (so admins can be managed in DB, not only ENV)
addColumnIfMissing("users", "is_admin", "INTEGER NOT NULL DEFAULT 0");

// Purchases Stripe fields
addColumnIfMissing("purchases", "stripe_session_id", "TEXT");
addColumnIfMissing("purchases", "stripe_payment_intent_id", "TEXT");
addColumnIfMissing("purchases", "stripe_customer_id", "TEXT");

// Referral: track if referred buyer already used the first-order discount
addColumnIfMissing("referrals", "first_order_discount_used", "INTEGER NOT NULL DEFAULT 0");

// Tasks service fields (pricing label + optional Stripe linkage)
addColumnIfMissing("tasks", "service_code", "TEXT");
addColumnIfMissing("tasks", "service_name", "TEXT");
addColumnIfMissing("tasks", "service_price_cents", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("tasks", "purchase_id", "INTEGER");

// Tasks paid fields (manual admin paid + referral commission)
addColumnIfMissing("tasks", "is_paid", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("tasks", "paid_at", "TEXT");
addColumnIfMissing("tasks", "paid_amount_cents", "INTEGER NOT NULL DEFAULT 0");
// Tasks completion timestamp (used for analytics/metrics)
addColumnIfMissing("tasks", "completed_at", "TEXT");

// Ensure default status for existing DBs (leave existing values as-is)
// (SQLite cannot ALTER DEFAULT easily; we handle in code when inserting new rows.)

// Wallet ledger + Stripe events (idempotency)
ensureTable(`
  CREATE TABLE IF NOT EXISTS wallet_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    entry_type TEXT NOT NULL,
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
`);

ensureTable(`
  CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Editable website content (simple CMS)
ensureTable(`
  CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Admin chat messages
ensureTable(`
  CREATE TABLE IF NOT EXISTS admin_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_admin_id INTEGER NOT NULL,
    to_admin_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_read INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (from_admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_admin_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_admin_messages_to ON admin_messages(to_admin_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_admin_messages_pair ON admin_messages(from_admin_id, to_admin_id, created_at);
`);

// Backward-compatible migrations (older DB files won't have new columns)
function ensureColumn(table, col, typeSql) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${typeSql}`).run();
  } catch (e) {
    // ignore if column already exists
  }
}

ensureColumn('admin_messages', 'attachment_url', 'TEXT');
ensureColumn('admin_messages', 'attachment_name', 'TEXT');
ensureColumn('admin_messages', 'attachment_type', 'TEXT');

// Seed defaults (team + i18n overrides)
function upsertSiteContent(key, obj) {
  const json = JSON.stringify(obj ?? {});
  db.prepare(
    `INSERT INTO site_content (key, json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET json=excluded.json, updated_at=datetime('now')`
  ).run(key, json);
}

function getSiteContent(key, fallbackObj) {
  const row = db.prepare("SELECT json FROM site_content WHERE key = ?").get(key);
  if (!row || !row.json) return fallbackObj;
  try {
    return JSON.parse(row.json);
  } catch (e) {
    return fallbackObj;
  }
}

// Only seed if missing (don't overwrite admin edits)
function seedSiteContentIfMissing() {
  const hasTeam = db.prepare("SELECT 1 FROM site_content WHERE key = 'team' LIMIT 1").get();
  if (!hasTeam) {
    upsertSiteContent('team', {
      members: [
        {
          name: 'Donald Jackman',
          role: 'Founder & CEO',
          imageUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=600'
        },
        {
          name: 'Michael Brown',
          role: 'Head of Engineering',
          imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600'
        },
        {
          name: 'Olivia Martinez',
          role: 'Product Designer',
          imageUrl: 'https://images.unsplash.com/flagged/photo-1573740144655-bbb6e88fb18a?q=80&w=735&auto=format&fit=crop'
        },
        {
          name: 'Ethan Walker',
          role: 'AI Systems Engineer',
          imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Sophia Lee',
          role: 'UX Researcher',
          imageUrl: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?q=80&w=687'
        }
      ],

      softScienceBoard: [
        {
          name: 'Aisha Karimova',
          role: 'Board Chair (Soft Science)',
          imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Daniel Kim',
          role: 'Policy & Ethics Lead',
          imageUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Maria Gonzalez',
          role: 'Education & Outreach',
          imageUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Ahmed Noor',
          role: 'Social Impact Analyst',
          imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Sophia Chen',
          role: 'Behavioral Researcher',
          imageUrl: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?q=80&w=687&auto=format&fit=crop'
        }
      ],
      hardScienceBoard: [
        {
          name: 'Dr. Ethan Walker',
          role: 'Board Chair (Hard Science)',
          imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Olivia Martinez',
          role: 'Product & Systems',
          imageUrl: 'https://images.unsplash.com/flagged/photo-1573740144655-bbb6e88fb18a?q=80&w=735&auto=format&fit=crop'
        },
        {
          name: 'Michael Brown',
          role: 'Engineering Advisor',
          imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600'
        },
        {
          name: 'Nora Patel',
          role: 'Data Science Lead',
          imageUrl: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Donald Jackman',
          role: 'Founder & CEO',
          imageUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=600'
        }
      ]
    });
  }



  // Safe extension: ensure Board arrays exist in the existing team JSON (do not overwrite members)
  try {
    const team = getSiteContent('team', { members: [] }) || { members: [] };
    let changed = false;
    if (!Array.isArray(team.softScienceBoard)) {
      team.softScienceBoard = [
        {
          name: 'Aisha Karimova',
          role: 'Board Chair (Soft Science)',
          imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Daniel Kim',
          role: 'Policy & Ethics Lead',
          imageUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Maria Gonzalez',
          role: 'Education & Outreach',
          imageUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Ahmed Noor',
          role: 'Social Impact Analyst',
          imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Sophia Chen',
          role: 'Behavioral Researcher',
          imageUrl: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?q=80&w=687&auto=format&fit=crop'
        }
      ];
      changed = true;
    }
    if (!Array.isArray(team.hardScienceBoard)) {
      team.hardScienceBoard = [
        {
          name: 'Dr. Ethan Walker',
          role: 'Board Chair (Hard Science)',
          imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Olivia Martinez',
          role: 'Product & Systems',
          imageUrl: 'https://images.unsplash.com/flagged/photo-1573740144655-bbb6e88fb18a?q=80&w=735&auto=format&fit=crop'
        },
        {
          name: 'Michael Brown',
          role: 'Engineering Advisor',
          imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600'
        },
        {
          name: 'Nora Patel',
          role: 'Data Science Lead',
          imageUrl: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?q=80&w=687&auto=format&fit=crop'
        },
        {
          name: 'Donald Jackman',
          role: 'Founder & CEO',
          imageUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=600'
        }
      ];
      changed = true;
    }
    if (changed) upsertSiteContent('team', team);
  } catch (e) {
    // ignore
  }


  // Ensure team includes softScienceBoard/hardScienceBoard keys (safe extension; never overwrite existing members)
  try {
    const currentTeam = getSiteContent('team', { members: [] }) || { members: [] };
    let changed = false;
    if (!Array.isArray(currentTeam.softScienceBoard)) {
      currentTeam.softScienceBoard = [
        { name: 'Amina Rahman', role: 'Behavioral Scientist', imageUrl: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?q=80&w=687&auto=format&fit=crop' },
        { name: 'Liam Patel', role: 'Social Research Lead', imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600' },
        { name: 'Noah Kim', role: 'Policy Analyst', imageUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=600' },
        { name: 'Sophia Chen', role: 'UX & Human Factors', imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=687&auto=format&fit=crop' },
        { name: 'Emma Garcia', role: 'Education Specialist', imageUrl: 'https://images.unsplash.com/flagged/photo-1573740144655-bbb6e88fb18a?q=80&w=735&auto=format&fit=crop' }
      ];
      changed = true;
    }
    if (!Array.isArray(currentTeam.hardScienceBoard)) {
      currentTeam.hardScienceBoard = [
        { name: 'Ethan Walker', role: 'AI Systems Engineer', imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=687&auto=format&fit=crop' },
        { name: 'Maya Singh', role: 'Data Scientist', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=687&auto=format&fit=crop' },
        { name: 'Oliver Johnson', role: 'Robotics Engineer', imageUrl: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=687&auto=format&fit=crop' },
        { name: 'Isabella Rossi', role: 'Materials Scientist', imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=687&auto=format&fit=crop' },
        { name: 'Daniel Brown', role: 'Systems Architect', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=687&auto=format&fit=crop' }
      ];
      changed = true;
    }
    if (changed) {
      upsertSiteContent('team', currentTeam);
    }
  } catch (e) {
    // ignore
  }
  const hasI18n = db.prepare("SELECT 1 FROM site_content WHERE key = 'i18n_overrides' LIMIT 1").get();
  if (!hasI18n) {
    upsertSiteContent('i18n_overrides', { uz: {}, ru: {}, en: {} });
  }

  const hasVideo = db.prepare("SELECT 1 FROM site_content WHERE key = 'video' LIMIT 1").get();
  if (!hasVideo) {
    upsertSiteContent('video', {
      mode: 'youtube',
      youtubeUrl: 'https://youtu.be/TdY0Ce_hXgM?si=bv01XW29BXp_pt4f',
      fileUrl: ''
    });
  }

const hasTestimonials = db.prepare("SELECT 1 FROM site_content WHERE key = 'testimonials' LIMIT 1").get();
if (!hasTestimonials) {
  upsertSiteContent('testimonials', {
    en: {
      title: 'What our users say',
      subtitle: 'Teams trust Buildify to build, deploy, and scale reliable AI agents for real-world production.',
      items: [
        {
          name: 'John Doe',
          username: '@johndoe',
          text: 'Buildify helped us launch AI agents in days instead of weeks. The workflow orchestration and monitoring are exceptionally solid.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?q=80&w=687&auto=format&fit=crop',
          highlight: false
        },
        {
          name: 'Jane Doe',
          username: '@janedoe',
          text: 'The simplicity impressed us most. We integrated AI agents into our existing stack quickly and without friction.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600',
          highlight: true
        },
        {
          name: 'Bob Smith',
          username: '@bobsmith',
          text: 'Reliable, scalable, and developer-friendly. Buildify feels production-ready from day one.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/flagged/photo-1573740144655-bbb6e88fb18a?q=80&w=735&auto=format&fit=crop',
          highlight: false
        }

      ]
    },
    ru: {
      title: 'Отзывы пользователей',
      subtitle: 'Команды доверяют Buildify для создания, развертывания и масштабирования надежных AI-агентов в реальной среде.',
      items: [
        {
          name: 'John Doe',
          username: '@johndoe',
          text: 'Buildify помог нам запустить AI-агентов за считанные дни, а не недели. Оркестрация и мониторинг процессов на очень высоком уровне.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?q=80&w=687&auto=format&fit=crop',
          highlight: false
        },
        {
          name: 'Jane Doe',
          username: '@janedoe',
          text: 'Больше всего впечатлила простота. Мы быстро интегрировали AI-агентов в существующий стек без лишних сложностей.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600',
          highlight: true
        },
        {
          name: 'Bob Smith',
          username: '@bobsmith',
          text: 'Надежно, масштабируемо и удобно для разработчиков. Buildify выглядит готовым к продакшену с первого дня.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/flagged/photo-1573740144655-bbb6e88fb18a?q=80&w=735&auto=format&fit=crop',
          highlight: false
        }
      ]
    },
    uz: {
      title: 'Foydalanuvchilarimiz fikri',
      subtitle: 'Jamoalar Buildify’ga real ishlab chiqarish muhitida ishonchli AI agentlarini yaratish, ishga tushirish va kengaytirish uchun ishonishadi.',
      items: [
        {
          name: 'John Doe',
          username: '@johndoe',
          text: 'Buildify yordamida AI agentlarni haftalar emas, kunlar ichida ishga tushirdik. Jarayonlarni boshqarish va monitoring juda puxta.',
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?q=80&w=687&auto=format&fit=crop',
          highlight: false
        },
        {
          name: 'Jane Doe',
          username: '@janedoe',
          text: "Eng ko'p yoqqani — soddalik. AI agentlarni mavjud texnologik stekimizga tez va muammosiz integratsiya qildik.",
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=600',
          highlight: true
        },
        {
          name: 'Bob Smith',
          username: '@bobsmith',
          text: "Ishonchli, kengaytirish oson va dasturchilar uchun qulay. Buildify birinchi kundan prodakshenga tayyor ko'rinadi.",
          rating: 5,
          avatarUrl: 'https://images.unsplash.com/flagged/photo-1573740144655-bbb6e88fb18a?q=80&w=735&auto=format&fit=crop',
          highlight: false
        }
      ]
    }
  });

  }

const hasPricing = db.prepare("SELECT 1 FROM site_content WHERE key = 'pricing' LIMIT 1").get();
if (!hasPricing) {
  upsertSiteContent('pricing', {
    en: {
      title: 'Simple, transparent pricing',
      subtitle: 'Choose a plan that fits your team – scale as you build, launch and grow with AI agents.',
      billingMonthly: 'Monthly',
      billingYearly: 'Yearly',
      discountBadge: '20% OFF',
      plans: [
        {
          key: 'free',
          name: 'Free',
          description: 'Explore Buildify and create your first AI agents.',
          priceMonthly: '$1/mo',
          priceYearly: '$10/yr',
          ctaLabel: 'Start Free',
          ctaHref: '/public/create-task.html',
          features: ['Up to 3 AI agents','Basic workflow builder','Community support','Limited execution runs','Starter integrations'],
        },
        {
          key: 'starter',
          name: 'Starter',
          description: 'Perfect for startups getting started with automation.',
          priceMonthly: '$19/mo',
          priceYearly: '$152/yr',
          ctaLabel: 'Get Started',
          ctaHref: '/public/create-task.html',
          features: ['Up to 10 AI agents','Advanced workflows','API & webhook access','Execution logs','Email support'],
        },
        {
          key: 'pro',
          name: 'Pro',
          description: 'For teams building serious AI-powered workflows.',
          priceMonthly: '$49/mo',
          priceYearly: '$392/yr',
          ctaLabel: 'Upgrade to Pro',
          ctaHref: '#',
          features: ['Unlimited AI agents','Priority execution','Real-time monitoring','Team collaboration','Priority support'],
        },
        {
          key: 'enterprise',
          name: 'Enterprise',
          description: 'Custom solutions for large teams and enterprises.',
          priceMonthly: '$149/mo',
          priceYearly: '$1,190/yr',
          ctaLabel: 'Contact Sales',
          ctaHref: '#',
          features: ['Custom agent limits','Dedicated infrastructure','Advanced security controls','SLA & compliance support','Dedicated account manager'],
        },
      ],
    },
    ru: {
      title: 'Простые и прозрачные тарифы',
      subtitle: 'Выберите план под вашу команду — масштабируйтесь по мере роста и запуска AI‑агентов.',
      billingMonthly: 'Ежемесячно',
      billingYearly: 'Ежегодно',
      discountBadge: '−20%',
      plans: [
        {
          key: 'free',
          name: 'Free',
          description: 'Попробуйте Buildify и создайте первых AI‑агентов.',
          priceMonthly: '$1/мес',
          priceYearly: '$10/год',
          ctaLabel: 'Начать бесплатно',
          ctaHref: '/public/create-task.html',
          features: ['До 3 AI‑агентов','Базовый конструктор','Поддержка сообщества','Ограниченные запуски','Базовые интеграции'],
        },
        {
          key: 'starter',
          name: 'Starter',
          description: 'Отлично для старта и первых автоматизаций.',
          priceMonthly: '$19/мес',
          priceYearly: '$152/год',
          ctaLabel: 'Начать',
          ctaHref: '/public/create-task.html',
          features: ['До 10 AI‑агентов','Расширенные сценарии','API и вебхуки','Логи выполнения','Email‑поддержка'],
        },
        {
          key: 'pro',
          name: 'Pro',
          description: 'Для команд, которые строят серьёзные AI‑процессы.',
          priceMonthly: '$49/мес',
          priceYearly: '$392/год',
          ctaLabel: 'Перейти на Pro',
          ctaHref: '#',
          features: ['Безлимит AI‑агентов','Приоритет выполнения','Мониторинг в реальном времени','Командная работа','Приоритетная поддержка'],
        },
        {
          key: 'enterprise',
          name: 'Enterprise',
          description: 'Индивидуальные решения для крупных команд и компаний.',
          priceMonthly: '$149/мес',
          priceYearly: '$1,190/год',
          ctaLabel: 'Связаться с отделом продаж',
          ctaHref: '#',
          features: ['Индивидуальные лимиты','Выделенная инфраструктура','Продвинутые меры безопасности','SLA и соответствие требованиям','Персональный менеджер'],
        },
      ],
    },
    uz: {
      title: 'Oddiy va shaffof narxlar',
      subtitle: 'Jamoangizga mos reja tanlang — AI agentlar bilan qurish, ishga tushirish va o‘sish jarayonida kengaytiring.',
      billingMonthly: 'Oylik',
      billingYearly: 'Yillik',
      discountBadge: '20% chegirma',
      plans: [
        {
          key: 'free',
          name: 'Free',
          description: 'Buildify’ni sinab ko‘ring va ilk AI agentlaringizni yarating.',
          priceMonthly: '$1/oy',
          priceYearly: '$10/yil',
          ctaLabel: 'Bepul boshlash',
          ctaHref: '/public/create-task.html',
          features: ['3 tagacha AI agent','Oddiy workflow builder','Hamjamiyat yordami','Cheklangan ishga tushirishlar','Boshlang‘ich integratsiyalar'],
        },
        {
          key: 'starter',
          name: 'Starter',
          description: 'Avtomatlashtirishni boshlayotganlar uchun ideal.',
          priceMonthly: '$19/oy',
          priceYearly: '$152/yil',
          ctaLabel: 'Boshlash',
          ctaHref: '/public/create-task.html',
          features: ['10 tagacha AI agent','Kengaytirilgan workflow','API va webhook','Bajarilish loglari','Email support'],
        },
        {
          key: 'pro',
          name: 'Pro',
          description: 'Jiddiy AI‑workflow qurayotgan jamoalar uchun.',
          priceMonthly: '$49/oy',
          priceYearly: '$392/yil',
          ctaLabel: 'Pro ga o‘tish',
          ctaHref: '#',
          features: ['Cheksiz AI agent','Ustuvor bajarilish','Real‑time monitoring','Jamoaviy hamkorlik','Ustuvor qo‘llab‑quvvatlash'],
        },
        {
          key: 'enterprise',
          name: 'Enterprise',
          description: 'Katta jamoalar va kompaniyalar uchun maxsus yechimlar.',
          priceMonthly: '$149/oy',
          priceYearly: '$1,190/yil',
          ctaLabel: 'Sotuv bo‘limiga yozish',
          ctaHref: '#',
          features: ['Maxsus limitlar','Dedicated infratuzilma','Yuqori xavfsizlik','SLA va compliance','Account manager'],
        },
      ],
    },
  });
}

const hasFeatures = db.prepare("SELECT 1 FROM site_content WHERE key = 'features' LIMIT 1").get();
if (!hasFeatures) {
  upsertSiteContent('features', {
    en: {
      title: 'Core features',
      subtitle: 'Everything you need to build, deploy and scale AI agents \u2013 designed for speed, reliability and real-world production use.',
      ctaText: 'Trusted by teams building intelligent products with AI agents.',
      ctaButtonLabel: 'Explore use cases',
      ctaButtonHref: '#',
      items: [
        { title: 'AI Agent Builder', description: 'Design intelligent agents with modular logic, memory and tools \u2013 no complex setup required.' },
        { title: 'Workflow Orchestration', description: 'Chain actions, triggers and decisions to automate multi-step workflows reliably.' },
        { title: 'Plug & Play Integrations', description: 'Connect APIs, databases and third-party tools seamlessly with built-in connectors.' },
        { title: 'Production-Ready Security', description: 'Built-in safeguards, rate limits and isolation to run agents safely at scale and protect your data.' },
      ],
    },
    ru: {
      title: '\u041a\u043b\u044e\u0447\u0435\u0432\u044b\u0435 \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438',
      subtitle: '\u0412\u0441\u0451, \u0447\u0442\u043e \u043d\u0443\u0436\u043d\u043e \u0434\u043b\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f, \u0432\u043d\u0435\u0434\u0440\u0435\u043d\u0438\u044f \u0438 \u043c\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f AI-\u0430\u0433\u0435\u043d\u0442\u043e\u0432 \u2014 \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u044c, \u043d\u0430\u0434\u0451\u0436\u043d\u043e\u0441\u0442\u044c \u0438 \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c \u043a \u043f\u0440\u043e\u0434\u0430\u043a\u0448\u0435\u043d\u0443.',
      ctaText: '\u041d\u0430\u043c \u0434\u043e\u0432\u0435\u0440\u044f\u044e\u0442 \u043a\u043e\u043c\u0430\u043d\u0434\u044b, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0441\u043e\u0437\u0434\u0430\u044e\u0442 \u0438\u043d\u0442\u0435\u043b\u043b\u0435\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0435 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u044b \u0441 AI-\u0430\u0433\u0435\u043d\u0442\u0430\u043c\u0438.',
      ctaButtonLabel: '\u0421\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0438',
      ctaButtonHref: '#',
      items: [
        { title: '\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440 AI-\u0430\u0433\u0435\u043d\u0442\u043e\u0432', description: '\u041f\u0440\u043e\u0435\u043a\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0430\u0433\u0435\u043d\u0442\u043e\u0432 \u0441 \u043c\u043e\u0434\u0443\u043b\u044c\u043d\u043e\u0439 \u043b\u043e\u0433\u0438\u043a\u043e\u0439, \u043f\u0430\u043c\u044f\u0442\u044c\u044e \u0438 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430\u043c\u0438 \u2014 \u0431\u0435\u0437 \u0441\u043b\u043e\u0436\u043d\u043e\u0439 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438.' },
        { title: '\u041e\u0440\u043a\u0435\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u043f\u0440\u043e\u0446\u0435\u0441\u0441\u043e\u0432', description: '\u0421\u0442\u0440\u043e\u0439\u0442\u0435 \u0446\u0435\u043f\u043e\u0447\u043a\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439, \u0442\u0440\u0438\u0433\u0433\u0435\u0440\u044b \u0438 \u0440\u0435\u0448\u0435\u043d\u0438\u044f \u0434\u043b\u044f \u043d\u0430\u0434\u0451\u0436\u043d\u043e\u0439 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438.' },
        { title: '\u0418\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438 \u0438\u0437 \u043a\u043e\u0440\u043e\u0431\u043a\u0438', description: '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0439\u0442\u0435 API, \u0431\u0430\u0437\u044b \u0434\u0430\u043d\u043d\u044b\u0445 \u0438 \u0441\u0435\u0440\u0432\u0438\u0441\u044b \u0431\u0435\u0437 \u043b\u0438\u0448\u043d\u0438\u0445 \u0443\u0441\u0438\u043b\u0438\u0439.' },
        { title: '\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0434\u043b\u044f \u043f\u0440\u043e\u0434\u0430\u043a\u0448\u0435\u043d\u0430', description: '\u041e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f, \u043b\u0438\u043c\u0438\u0442\u044b \u0438 \u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u0434\u043b\u044f \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0439 \u0440\u0430\u0431\u043e\u0442\u044b \u0430\u0433\u0435\u043d\u0442\u043e\u0432 \u043d\u0430 \u043c\u0430\u0441\u0448\u0442\u0430\u0431\u0435.' },
      ],
    },
    uz: {
      title: 'Asosiy imkoniyatlar',
      subtitle: 'AI agentlarni yaratish, ishga tushirish va masshtablash uchun kerak bo’lgan hammasi — tezlik, ishonchlilik va prodakshen uchun tayyor.',
      ctaText: 'AI agentlar bilan aqlli mahsulotlar yaratayotgan jamoalar bizga ishonadi.',
      ctaButtonLabel: 'Use caselarni ko’rish',
      ctaButtonHref: '#',
      items: [
        { title: 'AI Agent Builder', description: 'Modulli mantiq, xotira va tool’lar bilan aqlli agentlarni sozlang — murakkab setup shart emas.' },
        { title: 'Workflow Orchestration', description: 'Ko’p bosqichli jarayonlarni avtomatlashtirish uchun action, trigger va qarorlarni ulang.' },
        { title: 'Plug & Play Integrations', description: 'API, ma’lumotlar bazasi va 3rd-party tool’larni built-in connectorlar bilan tez ulang.' },
        { title: 'Production-Ready Security', description: 'Rate limit, izolatsiya va himoya mexanizmlari bilan agentlarni xavfsiz ishga tushiring.' },
      ],
    },
  });
}

const hasHero = db.prepare("SELECT 1 FROM site_content WHERE key = 'hero' LIMIT 1").get();
if (!hasHero) {
  upsertSiteContent('hero', {
    uz: {
      badge: "10K+ Mamnun tadqiqotchilar va olimlar • 4.9 Reyting",
      title: "Professional tahrirlash va ma'lumotlar tahlili xizmatlari.",
      subtitle: "Ma'lumotlarni qayta ishlash, statistik modellashtirish, gipotezalarni tekshirish va maqolalarni nashrga tayyorlashda ekspert yordami.",
      ctaPrimaryLabel: "Boshlash", ctaPrimaryHref: "/public/create-task.html",
      ctaSecondaryLabel: "Demoni ko'rish", ctaSecondaryHref: "#",
      stats: [
        { value: "5x", label: "Statistik testlar aniqligi" },
        { value: "80%", label: "Maxfiylik va ma'lumotlar himoyasi" },
        { value: "3x", label: "Tezroq nashr etish muddati" }
      ]
    },
    ru: {
      badge: "10K+ Довольных исследователей и учёных • Рейтинг 4.9",
      title: "Профессиональное редактирование и анализ данных.",
      subtitle: "Экспертная помощь в обработке данных, статистическом моделировании, проверке гипотез и подготовке рукописей к публикации.",
      ctaPrimaryLabel: "Начать", ctaPrimaryHref: "/public/create-task.html",
      ctaSecondaryLabel: "Смотреть демо", ctaSecondaryHref: "#",
      stats: [
        { value: "5x", label: "Точность статистических тестов" },
        { value: "80%", label: "Конфиденциальность и защита данных" },
        { value: "3x", label: "Быстрая подготовка к публикации" }
      ]
    },
    en: {
      badge: "10K+ Happy researchers and scientists • 4.9 Rating",
      title: "Professional Editing and Data Analysis Services.",
      subtitle: "Get professional help with data processing, statistical modeling, hypothesis testing, and manuscript preparation.",
      ctaPrimaryLabel: "Get Started", ctaPrimaryHref: "/public/create-task.html",
      ctaSecondaryLabel: "Watch Demo", ctaSecondaryHref: "#",
      stats: [
        { value: "5x", label: "Accuracy in statistical tests" },
        { value: "80%", label: "Confidentiality & data protection" },
        { value: "3x", label: "Faster submission turnaround" }
      ]
    }
  });
}

// Migration: ensure hero has correct multilingual content (fixes cases where en/ru were saved as empty or UZ text)
{
  const heroData = getSiteContent('hero', {});
  let needsUpdate = false;
  const uzTitle = heroData.uz && heroData.uz.title ? heroData.uz.title : '';
  const enTitle = heroData.en && heroData.en.title ? heroData.en.title : '';
  const ruTitle = heroData.ru && heroData.ru.title ? heroData.ru.title : '';

  const enDefaults = {
    badge: "10K+ Happy researchers and scientists • 4.9 Rating",
    title: "Professional Editing and Data Analysis Services.",
    subtitle: "Get professional help with data processing, statistical modeling, hypothesis testing, and manuscript preparation.",
    ctaPrimaryLabel: "Get Started", ctaPrimaryHref: "/public/create-task.html",
    ctaSecondaryLabel: "Watch Demo", ctaSecondaryHref: "#",
    stats: [
      { value: "5x", label: "Accuracy in statistical tests" },
      { value: "80%", label: "Confidentiality & data protection" },
      { value: "3x", label: "Faster submission turnaround" }
    ]
  };
  const ruDefaults = {
    badge: "10K+ Довольных исследователей и учёных • Рейтинг 4.9",
    title: "Профессиональное редактирование и анализ данных.",
    subtitle: "Экспертная помощь в обработке данных, статистическом моделировании, проверке гипотез и подготовке рукописей к публикации.",
    ctaPrimaryLabel: "Начать", ctaPrimaryHref: "/public/create-task.html",
    ctaSecondaryLabel: "Смотреть демо", ctaSecondaryHref: "#",
    stats: [
      { value: "5x", label: "Точность статистических тестов" },
      { value: "80%", label: "Конфиденциальность и защита данных" },
      { value: "3x", label: "Быстрая подготовка к публикации" }
    ]
  };

  const oldTitles = ["Expert Statistical and Data Analysis Services.", "Профессиональные услуги статистики и анализа данных."];
  if (!enTitle || enTitle === uzTitle || oldTitles.includes(enTitle)) { heroData.en = enDefaults; needsUpdate = true; }
  if (!ruTitle || ruTitle === uzTitle || oldTitles.includes(ruTitle)) { heroData.ru = ruDefaults; needsUpdate = true; }
  if (!heroData.uz?.title?.includes('tahrirlash')) { heroData.uz = { ...heroData.uz, title: "Professional tahrirlash va ma'lumotlar tahlili xizmatlari." }; needsUpdate = true; }
  if (needsUpdate) upsertSiteContent('hero', heroData);
}

    // FAQ: section texts + items (UZ/RU/EN) editable like Core Features
    const existingFAQ = getSiteContent("faq");
    const faqNeedsSeed =
      !existingFAQ ||
      !existingFAQ.en ||
      !Array.isArray(existingFAQ.en.items) ||
      existingFAQ.en.items.length === 0;

    if (faqNeedsSeed) {
      const defaults = {
        en: {
          title: "FAQ",
          subtitle: "Find quick answers to common questions.",
          ctaTitle: "Still have questions? Our team help you get started.",
          ctaButtonLabel: "Contact support",
          ctaButtonHref: "#",
          items: [
            {
              q: "What is Buildify?",
              a: "Buildify is a platform designed to help teams build, deploy and scale AI agents efficiently. It provides tools for agent creation, workflow orchestration and production-ready execution."
            },
            {
              q: "Do I need prior AI or ML experience to use Buildify?",
              a: "No. Buildify is built for both beginners and advanced teams. You can start with templates and gradually customize agents as your needs grow."
            },
            {
              q: "Can I integrate Buildify with my existing tools?",
              a: "Yes. You can connect APIs, databases and third-party tools using built-in connectors and custom integrations."
            },
            {
              q: "Is Buildify suitable for production use?",
              a: "Yes. It is designed for reliability at scale, with safeguards, monitoring and best practices for production deployments."
            },
            {
              q: "Can I customize or extend AI agents?",
              a: "Yes. You can add custom tools, logic, memory and workflows to fit your product and business processes."
            }
          ]
        },
        ru: {
          title: "FAQ",
          subtitle: "Быстрые ответы на самые частые вопросы.",
          ctaTitle: "Остались вопросы? Наша команда поможет вам начать.",
          ctaButtonLabel: "Связаться с поддержкой",
          ctaButtonHref: "#",
          items: [
            {
              q: "Что такое Buildify?",
              a: "Buildify — это платформа, которая помогает командам быстро создавать, запускать и масштабировать AI-агентов. В ней есть инструменты для сборки агентов, оркестрации процессов и готового к продакшену выполнения."
            },
            {
              q: "Нужен ли опыт в AI или ML, чтобы пользоваться Buildify?",
              a: "Нет. Buildify подходит и новичкам, и опытным командам: можно начать с шаблонов и постепенно расширять и настраивать агентов."
            },
            {
              q: "Можно ли интегрировать Buildify с моими инструментами?",
              a: "Да. Вы можете подключать API, базы данных и сторонние сервисы через встроенные коннекторы и собственные интеграции."
            },
            {
              q: "Подходит ли Buildify для продакшена?",
              a: "Да. Платформа рассчитана на надежную работу в продакшене: есть меры безопасности, контроль и рекомендации для стабильных запусков."
            },
            {
              q: "Можно ли кастомизировать или расширять AI-агентов?",
              a: "Да. Вы можете добавлять свои инструменты, логику, память и цепочки действий под ваш продукт и бизнес-процессы."
            }
          ]
        },
        uz: {
          title: "FAQ",
          subtitle: "Ko‘p beriladigan savollarga tezkor javoblar.",
          ctaTitle: "Hali ham savollaringiz bormi? Jamoamiz boshlashga yordam beradi.",
          ctaButtonLabel: "Qo‘llab-quvvatlash",
          ctaButtonHref: "#",
          items: [
            {
              q: "Buildify nima?",
              a: "Buildify — jamoalarga AI agentlarni tez yaratish, ishga tushirish va kengaytirishda yordam beradigan platforma. Unda agent yaratish, workflow (jarayon)larni boshqarish va production uchun tayyor ishlatish imkoniyatlari bor."
            },
            {
              q: "Buildify’dan foydalanish uchun AI yoki ML tajribasi kerakmi?",
              a: "Yo‘q. Buildify yangi boshlovchilar va tajribali jamoalar uchun mos: shablonlardan boshlaysiz va keyin agentlarni o‘zingizga moslab kengaytirasiz."
            },
            {
              q: "Buildify’ni mavjud tool’larim bilan ulay olamanmi?",
              a: "Ha. API, ma’lumotlar bazalari va uchinchi tomon servislarini built-in connectorlar va custom integratsiyalar orqali ulash mumkin."
            },
            {
              q: "Buildify production’da ishlatishga mosmi?",
              a: "Ha. Platforma barqaror va ishonchli ishlashi uchun xavfsizlik, nazorat va production best-practice’lari bilan ishlab chiqilgan."
            },
            {
              q: "AI agentlarni sozlash yoki kengaytirish mumkinmi?",
              a: "Ha. Siz custom tool, logika, memory va workflow’larni qo‘shib, agentlarni biznesingizga moslab olasiz."
            }
          ]
        }
      };

      const merged = {};
      for (const lang of ["en", "ru", "uz"]) {
        const current = (existingFAQ && existingFAQ[lang]) ? existingFAQ[lang] : {};
        const def = defaults[lang];
        merged[lang] = { ...def, ...current };
        if (Array.isArray(current.items) && current.items.length > 0) merged[lang].items = current.items;
        else merged[lang].items = def.items;
      }

      upsertSiteContent("faq", merged);
    }

    // Theme: brand color used by the public website (overrides Tailwind orange accents)
    const existingTheme = getSiteContent("theme");
    const themeNeedsSeed = !existingTheme || !existingTheme.primaryColor;
    if (themeNeedsSeed) {
      upsertSiteContent("theme", {
        primaryColor: (existingTheme && existingTheme.primaryColor) ? existingTheme.primaryColor : "#3C50E0",
        updatedAt: Date.now(),
      });
    }

}

seedSiteContentIfMissing();

// Admin overrides for referral earnings totals (manual adjustments)
ensureTable(`
  CREATE TABLE IF NOT EXISTS referral_earnings_overrides (
    referrer_user_id INTEGER PRIMARY KEY,
    total_cents INTEGER,
    earned_cents INTEGER,
    paid_cents INTEGER,
    updated_by_admin_id INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

// Ensure uploads folder exists
try {
  fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });
} catch (e) {
  console.error("Could not create uploads folder:", e);
}

// -------------------- Helpers --------------------
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Keep original casing, but normalize spacing for storage/display.
function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

// Case-insensitive key used for uniqueness checks.
function nameKey(name) {
  return cleanName(name).toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function random6DigitCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function isoAfterMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isExpired(isoString) {
  return Date.now() > new Date(isoString).getTime();
}

function generateReferralCode() {
  return nanoid(10);
}

function getUserByReferralCode(code) {
  return db.prepare("SELECT * FROM users WHERE referral_code = ?").get(code);
}

function countReferralsForUser(userId) {
  return db
    .prepare("SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_user_id = ?")
    .get(userId).cnt;
}


// -------------------- Referral spend / commissions --------------------
function getReferrerIdForBuyer(buyerUserId) {
  const row = db.prepare("SELECT referrer_user_id FROM referrals WHERE referred_user_id = ?").get(buyerUserId);
  return row ? Number(row.referrer_user_id) : null;
}


// Buyer discount: if user was referred AND this is their first PAID purchase, give discount (default 10%)
function getBuyerReferralFirstOrderDiscountRate(buyerUserId) {
  const raw = process.env.REFERRAL_BUYER_FIRST_ORDER_DISCOUNT_RATE;
  const rate = raw == null || raw === "" ? 0.10 : Number(raw);
  if (!(rate > 0 && rate < 1)) return 0;

  // Must be referred (came via someone's referral link)
  const refRow = db
    .prepare("SELECT referrer_user_id, COALESCE(first_order_discount_used, 0) AS used FROM referrals WHERE referred_user_id = ?")
    .get(buyerUserId);
  if (!refRow || !refRow.referrer_user_id) return 0;

  // If the discount was already used once, never apply it again.
  if (Number(refRow.used || 0) === 1) return 0;

  // Also ensure it's the first paid purchase (best-effort; webhook might be disabled in some setups)
  try {
    const row = db.prepare("SELECT COUNT(*) AS cnt FROM purchases WHERE user_id = ? AND status = 'paid'").get(buyerUserId);
    const cnt = Number(row?.cnt || 0);
    return cnt === 0 ? rate : 0;
  } catch (e) {
    // If purchases table/query fails, fall back to the referral flag only.
    return rate;
  }
}

function discountedPriceCents(priceCents, rate) {
  const base = Number(priceCents || 0);
  const r = Number(rate || 0);
  if (!(r > 0 && r < 1)) return base;
  return Math.max(0, Math.round(base * (1 - r)));
}

function toMoney(cents) {
  return Number(cents || 0) / 100;
}

function safeRoundCents(n) {
  // n is number (e.g., amount_cents * rate)
  return Math.round(Number(n || 0));
}

function ensureDefaultServices() {
  try {
    // Keep service codes stable, but align the first 4 with the public Pricing cards.
    // This makes "Get Started" create orders at the exact price shown on the website.
    const upsert = db.prepare(`
      INSERT INTO services (code, name, price_cents, commission_rate)
      VALUES (@code, @name, @price_cents, @commission_rate)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        price_cents = excluded.price_cents,
        commission_rate = excluded.commission_rate
    `);

    const defaults = [
      // Data Analysis
      { code: 'SVC100', name: 'Rapid Statistical Review',         price_cents: 20000, commission_rate: 0.05 },
      { code: 'SVC200', name: 'Inferential Statistical Analysis', price_cents: 70000, commission_rate: 0.05 },
      { code: 'SVC300', name: 'Custom Statistical Support',       price_cents: 0,     commission_rate: 0.05 },
      // Editing
      { code: 'SVC400', name: 'Premium Editing Plus',             price_cents: 10000, commission_rate: 0.05 },
      { code: 'SVC500', name: 'Premium Editing',                  price_cents: 15000, commission_rate: 0.05 },
      { code: 'SVC600', name: 'Advanced Editing',                 price_cents: 20000, commission_rate: 0.05 },
    ];

    for (const s of defaults) upsert.run(s);
  } catch (e) {
    // if table doesn't exist yet, schema.sql will create it at startup
  }
}
ensureDefaultServices();

// -------------------- Wallet + Commission accounting --------------------
function addWalletEntry({ userId, entryType, amountCents, purchaseId = null, buyerUserId = null, note = null }) {
  try {
    db.prepare(
      "INSERT INTO wallet_ledger (user_id, entry_type, amount_cents, purchase_id, buyer_user_id, note) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(userId, entryType, amountCents, purchaseId, buyerUserId, note);
  } catch (e) {
    // ignore
  }
}

function creditReferralCommission({ purchaseId, buyerUserId, serviceId, purchaseAmountCents, defaultRate = 0.05 }) {
  const referrerId = getReferrerIdForBuyer(buyerUserId);
  if (!referrerId || Number(referrerId) === Number(buyerUserId)) return null;

  const service = serviceId ? db.prepare("SELECT * FROM services WHERE id = ?").get(serviceId) : null;
  const rate = Number(service?.commission_rate ?? defaultRate);
  const commCents = safeRoundCents(Number(purchaseAmountCents) * rate);
  if (commCents <= 0) return null;

  const ins = db.prepare(
    "INSERT OR IGNORE INTO referral_commissions (purchase_id, referrer_user_id, buyer_user_id, rate, amount_cents, status) VALUES (?, ?, ?, ?, ?, 'earned')"
  );
  const info = ins.run(purchaseId, referrerId, buyerUserId, rate, commCents);

  // Only apply balance/ledger if this purchase was not processed before
  if (info.changes === 1) {
    db.prepare("UPDATE users SET wallet_balance_cents = wallet_balance_cents + ? WHERE id = ?").run(commCents, referrerId);
    const note = `Referral commission: buyer #${buyerUserId} spent $${(Number(purchaseAmountCents)/100).toFixed(2)} (rate ${Math.round(rate*100)}%)`;
    addWalletEntry({ userId: referrerId, entryType: 'referral_commission', amountCents: commCents, purchaseId, buyerUserId, note });
  }

  const refUser = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(referrerId);
  return { referrer: refUser, rate, amount_cents: commCents };
}

function getReferralEarnings(userId) {
  const sums = db.prepare(`
    SELECT
      COALESCE(SUM(amount_cents),0) AS total_cents,
      COALESCE(SUM(CASE WHEN status='earned' THEN amount_cents ELSE 0 END),0) AS earned_cents,
      COALESCE(SUM(CASE WHEN status='paid' THEN amount_cents ELSE 0 END),0) AS paid_cents
    FROM referral_commissions
    WHERE referrer_user_id = ?
  `).get(userId);

  // If admin manually overrides totals, use those for display.
  // This is purely a reporting override; wallet balance remains separate.
  const ov = db.prepare(`
    SELECT total_cents, earned_cents, paid_cents
    FROM referral_earnings_overrides
    WHERE referrer_user_id = ?
  `).get(userId);

  if (ov) {
    if (ov.total_cents !== null && ov.total_cents !== undefined) sums.total_cents = Number(ov.total_cents);
    if (ov.earned_cents !== null && ov.earned_cents !== undefined) sums.earned_cents = Number(ov.earned_cents);
    if (ov.paid_cents !== null && ov.paid_cents !== undefined) sums.paid_cents = Number(ov.paid_cents);
  }

  const items = db.prepare(`
    SELECT c.id, c.amount_cents, c.rate, c.status, c.created_at,
           u.name AS buyer_name, u.email AS buyer_email,
           s.name AS service_name,
           p.amount_cents AS purchase_amount_cents
    FROM referral_commissions c
    JOIN users u ON u.id = c.buyer_user_id
    JOIN purchases p ON p.id = c.purchase_id
    LEFT JOIN services s ON s.id = p.service_id
    WHERE c.referrer_user_id = ?
    ORDER BY c.created_at DESC
    LIMIT 100
  `).all(userId);

  const wallet = db.prepare("SELECT wallet_balance_cents FROM users WHERE id = ?").get(userId);
  return { sums, items, wallet_balance_cents: Number(wallet?.wallet_balance_cents || 0) };
}

// -------------------- Mailer --------------------
function getMailer() {
  // Prefer Brevo HTTP API (works on Render free tier; SMTP port 587 is blocked)
  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = (process.env.FROM_EMAIL || "").trim() || "nurmuhammadsamandarov7747@gmail.com";

  if (brevoApiKey) {
    console.log("📧 Email mode: brevo-api");
    return {
      mode: "brevo-api",
      send: async ({ to, subject, text }) => {
        const body = JSON.stringify({
          sender: { name: "Open Science Enigma", email: fromEmail },
          to: [{ email: to }],
          subject,
          textContent: text
        });
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
          body
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error("📧 Brevo API error:", JSON.stringify(json));
          throw new Error(json.message || "Brevo API error");
        }
        console.log(`📧 Email sent to ${to} via Brevo API`);
      }
    };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      mode: "console",
      send: async ({ to, subject, text }) => {
        console.log("\n================ EMAIL (console mode) ================");
        console.log("To:", to);
        console.log("Subject:", subject);
        console.log(text);
        console.log("======================================================\n");
      }
    };
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  transporter.verify().catch(err => console.error("SMTP verify error:", err.message));

  return {
    mode: "smtp",
    send: async ({ to, subject, text }) => {
      try {
        await transporter.sendMail({ from: fromEmail, to, subject, text });
        console.log(`📧 Email sent to ${to} via SMTP`);
      } catch (err) {
        console.error(`📧 SMTP sendMail error: ${err.message}`);
        throw err;
      }
    }
  };
}

const mailer = getMailer();

// -------------------- Stripe --------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const stripe = STRIPE_SECRET_KEY ? Stripe(STRIPE_SECRET_KEY) : null;

function isStripeEnabled() {
  return !!stripe && !!STRIPE_SECRET_KEY;
}


// -------------------- File uploads (multer) --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
  const dest = path.join(__dirname, "uploads");
  try { fs.mkdirSync(dest, { recursive: true }); } catch (e) {}
  cb(null, dest);
},
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext.slice(0, 12);
    cb(null, `${Date.now()}-${nanoid(10)}${safeExt}`);
  }
});
// Allow up to 10 files, each up to 500MB (requirement)
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024, files: 10 } // 500MB x 10 files
});

function requireUser(userId) {
  const id = Number(userId);
  if (!id) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

// -------------------- Admin user (simple) --------------------
// Admin login defaults (override in ENV for production)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "oybekeshbayev@gmail.com").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "oybek12345";

function isAdminUser(user) {
  return !!user && Number(user.is_admin || 0) === 1;
}

function ensureAdminUsers() {
  // Keep admin access stable even if DB already exists.
  // For each ADMIN email, ensure a user exists AND password matches ADMIN_PASSWORD.
  const passwordHash = bcrypt.hashSync(String(ADMIN_PASSWORD), 10);
  const upsert = db.prepare(
    "INSERT INTO users (name, email, password_hash, referral_code, is_admin) VALUES (?, ?, ?, ?, 1)"
  );
  const updatePw = db.prepare("UPDATE users SET password_hash = ?, is_admin = 1 WHERE email = ?");

  for (const rawEmail of ADMIN_EMAILS) {
    const email = String(rawEmail || "").toLowerCase();
    if (!email) continue;

    const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existing) {
      // reset to ENV/default admin password to avoid "login ishlamayapti" cases after old seeds
      updatePw.run(passwordHash, email);
      continue;
    }

    const name = "Admin";
    const referral_code = generateReferralCode();
    upsert.run(name, email, passwordHash, referral_code);
  }
}

// Create/update admin(s) on startup (so you can login)
ensureAdminUsers();

function requireAdmin(userId) {
  const user = requireUser(userId);
  if (!user) return { ok: false, status: 401, error: "Login qiling" };
  if (!isAdminUser(user)) return { ok: false, status: 403, error: "Admin emas" };
  return { ok: true, user };
}

function requireAdminIfProd(userId) {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (!isProd) return { ok: true, user: null };
  return requireAdmin(userId);
}

function slugifyKey(input, maxLen = 24) {
  const s = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, maxLen);
  return s;
}

// Only this super admin can add/remove other admins
const SUPER_ADMIN_EMAIL = 'oybekeshbayev@gmail.com';

function requireSuperAdmin(userId) {
  const a = requireAdmin(userId);
  if (!a.ok) return a;
  const email = String(a.user.email || '').toLowerCase();
  if (email !== SUPER_ADMIN_EMAIL) {
    return { ok: false, status: 403, error: 'Faqat super-admin ruxsat etiladi' };
  }
  return a;
}

// -------------------- Admin management (add/list admins) --------------------
// List admins: any logged-in admin can view the list.
// Add/remove admins: super-admin only (handled in POST/PATCH below).
app.get('/api/admins', (req, res) => {
  const adminId = Number(req.query.admin_id || 0);
  const a = requireAdmin(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const rows = db.prepare(
    `SELECT id, name, email, avatar_url, is_admin FROM users WHERE is_admin = 1 ORDER BY id ASC`
  ).all();

  return res.json({
    admins: rows,
    can_manage: String(a.user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL,
  });
});

// Note: this route is defined before the global JSON body parser middleware.
// Add an explicit JSON parser here so req.body is available reliably.
app.post('/api/admins', express.json(), (req, res) => {
  // Accept admin_id from body OR querystring. In some dev/proxy setups the JSON
  // body can be lost or sent as form data, which previously caused `Login qiling`.
  const adminId = Number(
    req.body?.admin_id ||
      req.body?.adminId ||
      req.query?.admin_id ||
      req.query?.adminId ||
      0
  );
  const a = requireSuperAdmin(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const name = cleanName(req.body?.name || 'Admin');
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '').trim();
  if (!email || !password) return res.status(400).json({ error: 'Email va password kerak' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    // Promote existing user to admin and reset password
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET name = ?, password_hash = ?, is_admin = 1 WHERE email = ?')
      .run(name, hash, email);
    const u = db.prepare('SELECT id, name, email, avatar_url, is_admin FROM users WHERE email = ?').get(email);
    return res.json({ ok: true, admin: u, note: 'Existing user promoted to admin' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const referral_code = generateReferralCode();
  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash, referral_code, is_admin) VALUES (?, ?, ?, ?, 1)'
  ).run(name, email, hash, referral_code);
  const u = db.prepare('SELECT id, name, email, avatar_url, is_admin FROM users WHERE id = ?').get(info.lastInsertRowid);
  return res.json({ ok: true, admin: u });
});

// Same as above: ensure JSON body is parsed for this early-defined route.
app.patch('/api/admins/:id', express.json(), (req, res) => {
  const adminId = Number(
    req.body?.admin_id ||
      req.body?.adminId ||
      req.query?.admin_id ||
      req.query?.adminId ||
      0
  );
  const a = requireSuperAdmin(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const targetId = Number(req.params.id);
  if (!targetId) return res.status(400).json({ error: 'Invalid id' });
  const is_admin = Number(req.body?.is_admin ?? req.body?.isAdmin ?? 0) ? 1 : 0;
  db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(is_admin, targetId);
  const u = db.prepare('SELECT id, name, email, avatar_url, is_admin FROM users WHERE id = ?').get(targetId);
  return res.json({ ok: true, admin: u });
});

// -------------------- Admin chat REST --------------------
app.get('/api/admin-chat/messages', (req, res) => {
  const adminId = Number(req.query.admin_id || 0);
  const withId = Number(req.query.with_id || 0);
  const a = requireAdmin(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });
  if (!withId) return res.status(400).json({ error: 'with_id kerak' });

  const rows = db.prepare(
    `SELECT id, from_admin_id as "from", to_admin_id as "to", message,
            attachment_url, attachment_name, attachment_type,
            created_at, is_read
     FROM admin_messages
     WHERE (from_admin_id = ? AND to_admin_id = ?) OR (from_admin_id = ? AND to_admin_id = ?)
     ORDER BY id DESC
     LIMIT 100`
  ).all(adminId, withId, withId, adminId).reverse();

  // Mark received messages as read
  db.prepare(
    `UPDATE admin_messages SET is_read = 1 WHERE to_admin_id = ? AND from_admin_id = ? AND is_read = 0`
  ).run(adminId, withId);

  return res.json({ messages: rows });
});

app.get('/api/admin-chat/threads', (req, res) => {
  const adminId = Number(req.query.admin_id || 0);
  const a = requireAdmin(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  // Admin list + last message preview (for inbox-like UI)
  const adminsRaw = db
    .prepare('SELECT id, name, email, avatar_url FROM users WHERE is_admin = 1 ORDER BY name ASC')
    .all();

  const lastMsgStmt = db.prepare(
    `SELECT message, created_at
     FROM admin_messages
     WHERE (from_admin_id = ? AND to_admin_id = ?) OR (from_admin_id = ? AND to_admin_id = ?)
     ORDER BY id DESC
     LIMIT 1`
  );

  const admins = adminsRaw.map((u) => {
    if (Number(u.id) === Number(adminId)) return { ...u, last_message: null, last_at: null };
    const last = lastMsgStmt.get(adminId, u.id, u.id, adminId);
    return {
      ...u,
      last_message: last?.message || null,
      last_at: last?.created_at || null,
    };
  });

  // compute unread count per admin
  const unread = db.prepare(
    `SELECT from_admin_id as fromId, COUNT(*) as cnt
     FROM admin_messages
     WHERE to_admin_id = ? AND is_read = 0
     GROUP BY from_admin_id`
  ).all(adminId);
  const unreadMap = new Map(unread.map(r => [Number(r.fromId), Number(r.cnt)]));

  return res.json({ admins, unread: Object.fromEntries(unreadMap) });
});

// NOTE: server-wide express.json() is defined later in this file (for Stripe rawBody);
// so we must parse JSON here explicitly.
app.post('/api/admin-chat/messages', express.json(), (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const toId = Number(req.body?.to_id || req.body?.toId || 0);
  const message = String(req.body?.message || '').trim();
  const attachment_url = req.body?.attachment_url ? String(req.body.attachment_url) : null;
  const attachment_name = req.body?.attachment_name ? String(req.body.attachment_name) : null;
  const attachment_type = req.body?.attachment_type ? String(req.body.attachment_type) : null;
  const a = requireAdmin(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });
  if (!toId) return res.status(400).json({ error: 'to_id kerak' });
  if (!message && !attachment_url) return res.status(400).json({ error: 'message yoki fayl kerak' });

  const info = db
    .prepare(
      'INSERT INTO admin_messages (from_admin_id, to_admin_id, message, attachment_url, attachment_name, attachment_type) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(adminId, toId, message || '', attachment_url, attachment_name, attachment_type);
  const out = {
    id: info.lastInsertRowid,
    from: adminId,
    to: toId,
    message: message || '',
    attachment_url,
    attachment_name,
    attachment_type,
    created_at: new Date().toISOString(),
    is_read: 0,
  };

  io.to(`admin:${toId}`).emit('new-message', out);
  io.to(`admin:${adminId}`).emit('new-message', out);

  return res.json({ ok: true, message: out });
});

// File upload for admin chat (separate instance; avoid clashing with main `upload`)
const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, 'public', 'uploads', 'adminchat');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

app.post('/api/admin-chat/upload', (req, res) => {
  // multipart/form-data; admin_id comes from field
  chatUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
    const a = requireAdmin(adminId);
    if (!a.ok) return res.status(a.status).json({ error: a.error });
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'file kerak' });
    const url = `/public/uploads/adminchat/${f.filename}`;
    return res.json({ ok: true, url, name: f.originalname, type: f.mimetype, size: f.size });
  });
});

// -------------------- Admin AI chat --------------------
// POST /api/admin/ai-chat  { admin_id, question }
// Requires: admin_id is a logged-in admin (is_admin = 1)
//
// This endpoint uses Google Gemini (Gemini Developer API).
// Set environment variables on the server:
//   GEMINI_API_KEY=...
//   GEMINI_MODEL=gemini-2.5-flash   (optional)

function callGemini({ apiKey, model, systemInstruction, userText }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      systemInstruction: systemInstruction
        ? { parts: [{ text: systemInstruction }] }
        : undefined,
      contents: [
        {
          role: "user",
          parts: [{ text: userText }],
        },
      ],
    });

    const req = https.request(
      {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (r) => {
        let data = "";
        r.on("data", (c) => (data += c));
        r.on("end", () => {
          try {
            const json = JSON.parse(data || "{}");
            if (r.statusCode && r.statusCode >= 400) {
              const msg =
                json?.error?.message ||
                json?.message ||
                `Gemini error (${r.statusCode})`;
              return reject(new Error(msg));
            }

            // Extract text from the first candidate
            const parts = json?.candidates?.[0]?.content?.parts || [];
            const text = parts
              .map((p) => p?.text)
              .filter(Boolean)
              .join("");
            if (!text) return reject(new Error("Gemini: empty response"));
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(30000, () => req.destroy(new Error("Gemini timeout")));
    req.write(payload);
    req.end();
  });
}


function prettifyAiText(text) {
  try {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2")
      .trim();
  } catch (_) {
    return String(text || "");
  }
}


app.post("/api/admin/ai-chat", express.json(), async (req, res) => {
  const adminId = Number(
    req.body?.admin_id || req.body?.adminId || req.query?.admin_id || 0
  );
  const a = requireAdmin(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const question = String(req.body?.question || req.body?.q || "").trim();
  if (!question) return res.status(400).json({ error: "question kerak" });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY topilmadi. Server .env ga GEMINI_API_KEY ni qo'ying.",
    });
  }

  try {
    const answer = await callGemini({
      apiKey,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      systemInstruction:
        "You are an admin assistant for the OpenScienceEnigma admin dashboard. Be concise, helpful, and practical.",
      userText: question,
    });

    return res.json({ ok: true, answer: prettifyAiText(answer) });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

// -------------------- CORS (TailAdmin dev on :5173) --------------------
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGIN === "*") {
    res.header("Access-Control-Allow-Origin", origin || "*");
  } else {
    res.header("Access-Control-Allow-Origin", CORS_ORIGIN);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});



// Keep rawBody for Stripe webhook signature verification
app.use(
  express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(cookieParser());

// ---- Google OAuth setup ----
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const SESSION_SECRET       = process.env.SESSION_SECRET        || 'ose-session-secret-change-me';

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 10 * 60 * 1000 } // 10 min — only used for OAuth handshake
}));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
  passport.use(new GoogleStrategy({
    clientID:     GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL:  `${RENDER_URL}/auth/google/callback`,
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const email    = profile.emails?.[0]?.value || '';
      const name     = profile.displayName || email;
      const googleId = String(profile.id);

      console.log('[Google OAuth] email:', email, 'googleId:', googleId);

      // Find or create user
      let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId);
      if (!user && email) user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

      if (user) {
        if (!user.google_id) {
          db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(googleId, user.id);
        }
      } else {
        const referral_code = generateReferralCode();
        db.prepare("INSERT INTO users (name, email, google_id, password_hash, referral_code) VALUES (?, ?, ?, ?, ?)")
          .run(name, email, googleId, '', referral_code);
        user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId);
      }

      if (!user) return done(new Error('User not found after insert'));
      return done(null, { id: user.id, name: user.name, email: user.email });
    } catch (err) {
      console.error('[Google OAuth] DB error:', err.message, err.stack);
      return done(err);
    }
  }));

  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/public/signup.html?error=google' }),
    (req, res) => {
      // Redirect to front-end with user_id in query so JS can save to localStorage
      res.redirect(`/?google_login=${encodeURIComponent(req.user.id)}`);
    }
  );

  console.log('🔑 Google OAuth enabled');
} else {
  console.log('ℹ️  Google OAuth disabled (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set)');
}

// ---- Visual Editor Middleware ----
app.get(['/', '/index.html'], (req, res, next) => {
    if (req.query.editMode === '1') {
        const indexPath = path.join(__dirname, "public", "index.html");
        if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            html = html.replace('</body>', '<script src="/visual-editor.js?v=3"></script></body>');
            return res.send(html);
        }
    }
    next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/public/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/intro", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "intro.html"));
});

// -------------------- Admin Dashboard (TailAdmin Vue) --------------------
// Build output is copied to: server/public/admindashboard
const adminDistPath = path.join(__dirname, "public", "admindashboard");
app.use("/admindashboard", express.static(adminDistPath));
// SPA fallback so deep links work (e.g. /admindashboard/calendar)
app.get("/admindashboard/*", (req, res) => {
  const indexFile = path.join(adminDistPath, "index.html");
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  return res.status(404).send("Admin dashboard build not found. Run: npm start (from repo root) to build it.");
});

// -------------------- Referral capture --------------------
app.get("/r/:code", (req, res) => {
  const { code } = req.params;
  const refUser = getUserByReferralCode(code);
  if (!refUser) return res.status(404).send("Referral code topilmadi.");

  res.cookie("ref", code, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
  return res.redirect("/signup.html");
});


// -------------------- Logout --------------------
app.all("/api/logout", (req, res) => {
  // Clear referral cookie (only cookie used by this app)
  res.clearCookie("ref");
  // Prevent caching
  res.setHeader("Cache-Control", "no-store");
  return res.json({ ok: true });
});

// Friendly route: /logout -> clears and redirects home
app.get("/logout", (req, res) => {
  res.clearCookie("ref");
  return res.redirect("/");
});

// -------------------- Email verification signup --------------------
// (DIRECT) Sign up without email verification (requested)
// Creates user immediately and returns user info (demo auth uses localStorage user_id)
app.post("/api/signup-direct", (req, res) => {
  const name = cleanName(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!name) return res.status(400).json({ error: "Name kerak" });
  if (!email) return res.status(400).json({ error: "Email kerak" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email formati xato" });
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password kamida 6 ta belgidan iborat bo‘lsin" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Bu email avval ro‘yxatdan o‘tgan" });

  const existingName = db.prepare("SELECT id FROM users WHERE lower(name) = ?").get(nameKey(name));
  if (existingName) return res.status(409).json({ error: "Bu ism avval ro‘yxatdan o‘tgan" });

  const passwordHash = bcrypt.hashSync(password, 10);
  const referral_code = generateReferralCode();
  const info = db.prepare(
    "INSERT INTO users (name, email, password_hash, referral_code) VALUES (?, ?, ?, ?)"
  ).run(name, email, passwordHash, referral_code);

  const newUserId = info.lastInsertRowid;

  // Apply referral from cookie (same behavior as verified flow)
  let referralApplied = false;
  let referrerName = null;
  const refCode = req.cookies?.ref || null;
  if (refCode) {
    const refUser = getUserByReferralCode(refCode);
    if (refUser && refUser.id !== newUserId) {
      try {
        db.prepare(
          "INSERT INTO referrals (referrer_user_id, referred_user_id) VALUES (?, ?)"
        ).run(refUser.id, newUserId);
        referralApplied = true;
        referrerName = refUser.name;
        res.clearCookie("ref");
      } catch (e) {
        // ignore
      }
    }
  }

  return res.json({
    ok: true,
    user: {
      id: newUserId,
      name,
      email,
      referral_code,
      referral_link: `${req.protocol}://${req.get("host")}/r/${referral_code}`
    },
    referralApplied,
    message: referralApplied
      ? `✅ Ro‘yxatdan o‘tildi. ${referrerName} ga 1 ta odam qo‘shildi.`
      : "✅ Ro‘yxatdan o‘tildi."
  });
});

// 1) Request code (name+email+password)
app.post("/api/request-verification", async (req, res) => {
  const name = cleanName(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!name) return res.status(400).json({ error: "Name kerak" });
  if (!email) return res.status(400).json({ error: "Email kerak" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email formati xato" });
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password kamida 6 ta belgidan iborat bo‘lsin" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Bu email avval ro‘yxatdan o‘tgan" });

  // Also prevent duplicate names (case-insensitive)
  const existingName = db.prepare("SELECT id FROM users WHERE lower(name) = ?").get(nameKey(name));
  if (existingName) return res.status(409).json({ error: "Bu ism avval ro‘yxatdan o‘tgan" });

  const code = random6DigitCode();
  const expiresAt = isoAfterMinutes(10);

  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO email_verifications (email, name, password_hash, code_hash, expires_at, attempts_left)
    VALUES (?, ?, ?, ?, ?, 5)
    ON CONFLICT(email) DO UPDATE SET
      name=excluded.name,
      password_hash=excluded.password_hash,
      code_hash=excluded.code_hash,
      expires_at=excluded.expires_at,
      attempts_left=5,
      created_at=datetime('now')
  `).run(email, name, passwordHash, hashCode(code), expiresAt);

  const subject = "Tasdiqlash kodi";
  const text = [
    "Salom!",
    "",
    `Sizning tasdiqlash kodingiz: ${code}`,
    "Kod 10 daqiqa ichida amal qiladi.",
    "",
    "Agar siz bu so‘rovni bermagan bo‘lsangiz, e'tiborsiz qoldiring."
  ].join("\n");

  try {
    await mailer.send({ to: email, subject, text });
  } catch (e) {
    console.error("Email send error:", e);
    return res.status(500).json({ error: "Email yuborib bo‘lmadi. SMTP sozlamalarni tekshiring." });
  }

  return res.json({
    ok: true,
    message:
      mailer.mode === "console"
        ? "Kod yuborildi ✅ (demo: kod server konsolida chiqadi)"
        : "Kod emailga yuborildi ✅",
    expiresAt
  });
});

// 2) Verify code and create user
app.post("/api/verify-and-signup", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();

  if (!email) return res.status(400).json({ error: "Email kerak" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email formati xato" });
  if (!/^[0-9]{6}$/.test(code)) return res.status(400).json({ error: "Kod 6 ta raqam bo‘lsin" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Bu email avval ro‘yxatdan o‘tgan" });

  const v = db.prepare("SELECT * FROM email_verifications WHERE email = ?").get(email);
  if (!v) return res.status(400).json({ error: "Avval kod so‘rang" });

  if (isExpired(v.expires_at)) {
    db.prepare("DELETE FROM email_verifications WHERE email = ?").run(email);
    return res.status(400).json({ error: "Kod eskirgan. Qayta kod so‘rang." });
  }

  if (Number(v.attempts_left) <= 0) {
    db.prepare("DELETE FROM email_verifications WHERE email = ?").run(email);
    return res.status(400).json({ error: "Urinishlar tugadi. Qayta kod so‘rang." });
  }

  const ok = hashCode(code) === v.code_hash;
  if (!ok) {
    db.prepare("UPDATE email_verifications SET attempts_left = attempts_left - 1 WHERE email = ?").run(email);
    const left = db.prepare("SELECT attempts_left FROM email_verifications WHERE email = ?").get(email).attempts_left;
    return res.status(400).json({ error: `Kod noto‘g‘ri. Qoldi: ${left} ta urinish.` });
  }

  // Prevent duplicate names (case-insensitive) even if verification entry exists
  const desiredName = cleanName(v.name);
  const existingName = db.prepare("SELECT id FROM users WHERE lower(name) = ?").get(nameKey(desiredName));
  if (existingName) {
    // Optional: delete verification to avoid looping on the same name
    db.prepare("DELETE FROM email_verifications WHERE email = ?").run(email);
    return res.status(409).json({ error: "Bu ism avval ro‘yxatdan o‘tgan" });
  }

  // Create user
  const referral_code = generateReferralCode();
  const info = db.prepare(
    "INSERT INTO users (name, email, password_hash, referral_code) VALUES (?, ?, ?, ?)"
  ).run(desiredName, email, v.password_hash, referral_code);

  const newUserId = info.lastInsertRowid;

  // delete verification
  db.prepare("DELETE FROM email_verifications WHERE email = ?").run(email);

  // Apply referral from cookie
  let referralApplied = false;
  let referrerName = null;

  const refCode = req.cookies?.ref || null;
  if (refCode) {
    const refUser = getUserByReferralCode(refCode);
    if (refUser && refUser.id !== newUserId) {
      try {
        db.prepare(
          "INSERT INTO referrals (referrer_user_id, referred_user_id) VALUES (?, ?)"
        ).run(refUser.id, newUserId);

        referralApplied = true;
        referrerName = refUser.name;
        res.clearCookie("ref");
      } catch (e) {
        // ignore
      }
    }
  }

  return res.json({
    ok: true,
    user: {
      id: newUserId,
      name: v.name,
      email,
      referral_code,
      referral_link: `${req.protocol}://${req.get("host")}/r/${referral_code}`
    },
    referralApplied,
    message: referralApplied
      ? `✅ Ro‘yxatdan o‘tildi. ${referrerName} ga 1 ta odam qo‘shildi.`
      : "✅ Ro‘yxatdan o‘tildi."
  });
});

// -------------------- Login --------------------
app.post("/api/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email) return res.status(400).json({ error: "Email kerak" });
  if (!password) return res.status(400).json({ error: "Password kerak" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(401).json({ error: "Email yoki password noto‘g‘ri" });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Email yoki password noto‘g‘ri" });

  return res.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      referral_code: user.referral_code,
      is_admin: Number(user.is_admin || 0),
      avatar_url: user.avatar_url || null
    }
  });
});

// -------------------- Dashboard API --------------------
app.get("/api/dashboard/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User topilmadi" });

  const myCount = countReferralsForUser(userId);

  const adminEmails = ADMIN_EMAILS.length ? ADMIN_EMAILS : ["__none__"];
const placeholders = adminEmails.map(() => "?").join(",");
const top10 = db.prepare(`
  SELECT u.id, u.name, u.referral_code,
         COALESCE(r.referrals_count, 0) AS referrals,
         COALESCE(r.referrals_count, 0) AS referrals_count
  FROM users u
  LEFT JOIN (
    SELECT referrer_user_id AS user_id, COUNT(*) AS referrals_count
      FROM referrals
      GROUP BY referrer_user_id
  ) r ON r.user_id = u.id
  WHERE lower(u.email) NOT IN (${placeholders}) AND lower(u.name) <> 'admin'
  ORDER BY referrals_count DESC, u.id ASC
  LIMIT 10
`).all(...adminEmails);

const invited = db.prepare(`
  SELECT u.id, u.name, u.email, r.created_at
  FROM referrals r
  JOIN users u ON u.id = r.referred_user_id
  WHERE r.referrer_user_id = ?
  ORDER BY r.created_at DESC
  LIMIT 200
`).all(userId);


  const referralEarnings = getReferralEarnings(userId);
  const services = db.prepare("SELECT id, code, name, price_cents, commission_rate FROM services ORDER BY price_cents ASC").all();

  return res.json({
    user: { id: user.id, name: user.name, email: user.email, referral_code: user.referral_code, wallet_balance_cents: Number(user.wallet_balance_cents || 0) },
    myReferrals: myCount,
    top10,
    invited,
    referralEarnings,
    services,
    stripeEnabled: isStripeEnabled()
  });
});



// -------------------- Services & Referral Commissions --------------------

// List services (optionally with referral first-order discount for this user)
app.get("/api/services", (req, res) => {
  const qUserId = Number(req.query?.userId || 0);
  let discountRate = 0;
  if (qUserId) {
    const u = requireUser(qUserId);
    if (u) discountRate = getBuyerReferralFirstOrderDiscountRate(Number(u.id));
  }

  const services = db
    .prepare("SELECT id, code, name, price_cents, commission_rate FROM services ORDER BY price_cents ASC")
    .all()
    .map((s) => {
      const original = Number(s.price_cents);
      const display = discountRate ? discountedPriceCents(original, discountRate) : original;
      return {
        ...s,
        original_price_cents: original,
        display_price_cents: display,
        discount_applied: !!discountRate,
        discount_rate: discountRate
      };
    });

  res.json({ services, discount: { applied: !!discountRate, rate: discountRate } });
});

// -------------------- Stripe: Checkout + Webhook --------------------
// Create Stripe Checkout Session (client redirects to returned URL)
app.post("/api/stripe/create-checkout-session", (req, res) => {
  if (!isStripeEnabled()) return res.status(400).json({ error: "Stripe sozlanmagan (STRIPE_SECRET_KEY yo‘q)" });

  const userId = Number(req.body?.userId);
  const serviceCode = String(req.body?.serviceCode || "").trim();
  const customAmountCents = Number(req.body?.customAmountCents || 0);

  const buyer = requireUser(userId);
  if (!buyer) return res.status(401).json({ error: "Login qiling" });

  let amountCents;
  let serviceId = null;
  let serviceName = "";
  let serviceCodeForStripe = "CUSTOM";
  let discountRate = 0;

  if (serviceCode === 'CUSTOM') {
    if (customAmountCents < 100) return res.status(400).json({ error: "Minimum amount is $1.00" });
    amountCents = customAmountCents;
    serviceName = "Custom Service";
  } else {
    const service = db.prepare("SELECT * FROM services WHERE code = ?").get(serviceCode);
    if (!service) return res.status(400).json({ error: "Noto‘g‘ri servis" });
    serviceId = service.id;
    serviceName = service.name;
    serviceCodeForStripe = service.code;
    const baseAmountCents = Number(service.price_cents);
    discountRate = getBuyerReferralFirstOrderDiscountRate(Number(buyer.id));
    amountCents = discountRate ? discountedPriceCents(baseAmountCents, discountRate) : baseAmountCents;
  }
  // create pending purchase first (for idempotency + accounting)
  const info = db.prepare(
    "INSERT INTO purchases (user_id, service_id, amount_cents, currency, status) VALUES (?, ?, ?, 'USD', 'pending')"
  ).run(buyer.id, serviceId, amountCents);
  const purchaseId = info.lastInsertRowid;
  // If we applied the "first order" referral discount, mark it as used immediately
  // so the buyer can't receive it again on later orders (even if webhook/payment is not configured).
  if (discountRate && serviceCode !== 'CUSTOM') {
    try {
      db.prepare("UPDATE referrals SET first_order_discount_used = 1 WHERE referred_user_id = ? AND COALESCE(first_order_discount_used, 0) = 0").run(buyer.id);
    } catch (e) {
      // ignore
    }
  }


  const origin = `${req.protocol}://${req.get("host")}`;
  const successUrl = process.env.STRIPE_SUCCESS_URL || `${origin}/public/dashboard.html?stripe=success&purchase=${purchaseId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${origin}/public/dashboard.html?stripe=cancel&purchase=${purchaseId}`;

  const referrerId = getReferrerIdForBuyer(buyer.id);

  stripe.checkout.sessions
    .create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: { name: serviceName }
          }
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(purchaseId),
      metadata: {
        purchaseId: String(purchaseId),
        buyerUserId: String(buyer.id),
        serviceCode: String(serviceCodeForStripe),
        referrerUserId: referrerId ? String(referrerId) : "",
        buyerDiscountRate: discountRate ? String(discountRate) : "",
        buyerDiscountApplied: discountRate ? "1" : "0"
      }
    })
    .then((session) => {
      db.prepare("UPDATE purchases SET stripe_session_id = ? WHERE id = ?").run(session.id, purchaseId);
      return res.json({ ok: true, url: session.url, sessionId: session.id, purchaseId });
    })
    .catch((e) => {
      console.error("Stripe create session error:", e);
      db.prepare("UPDATE purchases SET status = 'failed' WHERE id = ?").run(purchaseId);
      return res.status(500).json({ error: "Stripe session yaratib bo‘lmadi", details: String(e?.message || e) });
    });
});

// Stripe webhook (set STRIPE_WEBHOOK_SECRET)
app.post("/api/stripe/webhook", (req, res) => {
  if (!isStripeEnabled() || !STRIPE_WEBHOOK_SECRET) return res.status(400).send("Stripe webhook sozlanmagan");

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature error:", err?.message || err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // idempotency by Stripe event id
  try {
    const info = db.prepare("INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)").run(event.id, event.type);
    if (info.changes === 0) return res.status(200).json({ received: true, duplicate: true });
  } catch (e) {
    // ignore
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const purchaseId = Number(session?.metadata?.purchaseId || session?.client_reference_id || 0);
      if (purchaseId) {
        // Mark purchase paid (idempotent)
        // If the session used the first-order referral discount, ensure it's marked as used (idempotent).
        try {
          const used = String(session?.metadata?.buyerDiscountApplied || "") === "1";
          const buyerId = Number(session?.metadata?.buyerUserId || 0);
          if (used && buyerId) {
            db.prepare("UPDATE referrals SET first_order_discount_used = 1 WHERE referred_user_id = ? AND COALESCE(first_order_discount_used, 0) = 0").run(buyerId);
          }
        } catch (e) {
          // ignore
        }

        db.prepare(
          "UPDATE purchases SET status='paid', stripe_session_id = COALESCE(stripe_session_id, ?), stripe_payment_intent_id = ?, stripe_customer_id = ? WHERE id = ? AND status <> 'paid'"
        ).run(session.id, session.payment_intent || null, session.customer || null, purchaseId);

        const p = db.prepare("SELECT * FROM purchases WHERE id = ?").get(purchaseId);
        if (p && String(p.status) === "paid") {
          // Sync any linked task so UI shows the real paid amount (including any discount)
          try {
            const amt = Number(p.amount_cents || 0);
            db.prepare(
              "UPDATE tasks SET is_paid = 1, paid_at = COALESCE(paid_at, datetime('now')), paid_amount_cents = ?, service_price_cents = ? WHERE purchase_id = ?"
            ).run(amt, amt, purchaseId);
          } catch (e) {
            // ignore
          }

          // Credit commission once per purchase (unique purchase_id)
          creditReferralCommission({
            purchaseId,
            buyerUserId: Number(p.user_id),
            serviceId: p.service_id ? Number(p.service_id) : null,
            purchaseAmountCents: Number(p.amount_cents)
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error("Stripe webhook handler error:", e);
    return res.status(500).json({ error: "Webhook processing error" });
  }
});

// Create a purchase (demo: marks as paid) and automatically credit referrer commission (if any)
app.post("/api/purchases", express.json(), (req, res) => {
  const userId = Number(req.body?.userId);
  const serviceCode = String(req.body?.serviceCode || "").trim();

  const buyer = requireUser(userId);
  if (!buyer) return res.status(401).json({ error: "Login qiling" });

  const service = db.prepare("SELECT * FROM services WHERE code = ?").get(serviceCode);
  if (!service) return res.status(400).json({ error: "Noto‘g‘ri servis" });

  const baseAmountCents = Number(service.price_cents);
  const discountRate = getBuyerReferralFirstOrderDiscountRate(Number(buyer.id));
  const amountCents = discountRate ? discountedPriceCents(baseAmountCents, discountRate) : baseAmountCents;
  const info = db.prepare(
    "INSERT INTO purchases (user_id, service_id, amount_cents, currency, status) VALUES (?, ?, ?, 'USD', 'paid')"
  ).run(buyer.id, service.id, amountCents);
  const purchaseId = info.lastInsertRowid;
  // If we applied the "first order" referral discount, mark it as used immediately
  // so the buyer can't receive it again on later orders (even if webhook/payment is not configured).
  if (discountRate) {
    try {
      db.prepare("UPDATE referrals SET first_order_discount_used = 1 WHERE referred_user_id = ? AND COALESCE(first_order_discount_used, 0) = 0").run(buyer.id);
    } catch (e) {
      // ignore
    }
  }


  const commission = creditReferralCommission({
    purchaseId,
    buyerUserId: buyer.id,
    serviceId: service.id,
    purchaseAmountCents: amountCents,
    defaultRate: Number(service.commission_rate || 0.05)
  });

  return res.json({
    ok: true,
    purchase: {
      id: purchaseId,
      service: { code: service.code, name: service.name, price_cents: service.price_cents, commission_rate: service.commission_rate },
      amount_cents: amountCents,
      status: "paid"
    },
    commission
  });
});

// Get commissions for a referrer
app.get("/api/commissions/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const user = requireUser(userId);
  if (!user) return res.status(401).json({ error: "Login qiling" });

  return res.json(getReferralEarnings(userId));
});

// -------------------- Public metrics for TailAdmin --------------------
app.get("/api/metrics", (req, res) => {
  try {
    const customersTotal = Number(db.prepare("SELECT COUNT(1) AS c FROM users").get().c || 0);
    // Prefer ecommerce purchases for "orders" if available
    const hasPurchases = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='purchases'").get();
    const ordersTotal = Number(
      (hasPurchases
        ? db.prepare("SELECT COUNT(1) AS c FROM purchases").get().c
        : db.prepare("SELECT COUNT(1) AS c FROM tasks").get().c) || 0
    );

    // Daily new customers / orders (today vs yesterday)
    const customersToday = Number(
      db.prepare("SELECT COUNT(1) AS c FROM users WHERE date(created_at) = date('now')").get().c || 0
    );
    const customersYesterday = Number(
      db.prepare("SELECT COUNT(1) AS c FROM users WHERE date(created_at) = date('now','-1 day')").get().c || 0
    );
    const ordersToday = Number(
      (hasPurchases
        ? db.prepare("SELECT COUNT(1) AS c FROM purchases WHERE date(created_at) = date('now')").get().c
        : db.prepare("SELECT COUNT(1) AS c FROM tasks WHERE date(created_at) = date('now')").get().c) || 0
    );
    const ordersYesterday = Number(
      (hasPurchases
        ? db.prepare("SELECT COUNT(1) AS c FROM purchases WHERE date(created_at) = date('now','-1 day')").get().c
        : db.prepare("SELECT COUNT(1) AS c FROM tasks WHERE date(created_at) = date('now','-1 day')").get().c) || 0
    );

    function pctChange(today, yesterday) {
      const t = Number(today || 0);
      const y = Number(yesterday || 0);
      if (y === 0) return t === 0 ? 0 : 100;
      return ((t - y) / y) * 100;
    }

    const customersChangePct = pctChange(customersToday, customersYesterday);
    const ordersChangePct = pctChange(ordersToday, ordersYesterday);

    // -------------------- Completed orders analytics --------------------
    // For e-commerce we use purchases (status paid/completed) as "orders".
    // Fallback: tasks (status done) if purchases table is not present.
    const completedOrdersByMonth = Array(12).fill(0);

    if (hasPurchases) {
      const completedValues = ['paid','complete','completed','succeeded','success','delivered'];
      const rows = db.prepare(`
        SELECT CAST(strftime('%m', created_at) AS INTEGER) AS m, COUNT(1) AS c
        FROM purchases
        WHERE lower(trim(status)) IN (${completedValues.map(()=>'?').join(',')})
          AND strftime('%Y', created_at) = strftime('%Y', 'now')
        GROUP BY m
      `).all(...completedValues);

      for (const row of rows) {
        const idx = Number(row.m) - 1;
        if (idx >= 0 && idx < 12) completedOrdersByMonth[idx] = Number(row.c || 0);
      }
    } else {
      const completedByMonth = db
        .prepare(
          `
          SELECT CAST(strftime('%m', COALESCE(completed_at, paid_at, created_at)) AS INTEGER) AS m,
                 COUNT(1) AS c
          FROM tasks
          WHERE lower(status) = 'done'
            AND strftime('%Y', COALESCE(completed_at, paid_at, created_at)) = strftime('%Y', 'now')
          GROUP BY m
          `
        )
        .all();

      for (const row of completedByMonth) {
        const idx = Number(row.m) - 1;
        if (idx >= 0 && idx < 12) completedOrdersByMonth[idx] = Number(row.c || 0);
      }
    }

    // Monthly target settings
    const monthlyTargetUsd = Number(process.env.MONTHLY_TARGET_USD || 10000);

    // Revenue from completed orders
    let revenueTodayCents = 0;
    let revenueYesterdayCents = 0;
    let revenueMonthCents = 0;

    if (hasPurchases) {
      const completedValues = ['paid','complete','completed','succeeded','success','delivered'];

      revenueTodayCents = Number(
        db.prepare(`
          SELECT COALESCE(SUM(COALESCE(amount_cents,0)),0) AS s
          FROM purchases
          WHERE lower(trim(status)) IN (${completedValues.map(()=>'?').join(',')})
            AND date(created_at) = date('now')
        `).get(...completedValues).s || 0
      );

      revenueYesterdayCents = Number(
        db.prepare(`
          SELECT COALESCE(SUM(COALESCE(amount_cents,0)),0) AS s
          FROM purchases
          WHERE lower(trim(status)) IN (${completedValues.map(()=>'?').join(',')})
            AND date(created_at) = date('now','-1 day')
        `).get(...completedValues).s || 0
      );

      revenueMonthCents = Number(
        db.prepare(`
          SELECT COALESCE(SUM(COALESCE(amount_cents,0)),0) AS s
          FROM purchases
          WHERE lower(trim(status)) IN (${completedValues.map(()=>'?').join(',')})
            AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `).get(...completedValues).s || 0
      );
    } else {
      revenueTodayCents = Number(
        db
          .prepare(
            `
            SELECT COALESCE(SUM(
              COALESCE(p.amount_cents,
                CASE WHEN t.paid_amount_cents > 0 THEN t.paid_amount_cents ELSE t.service_price_cents END
              )
            ), 0) AS s
            FROM tasks t
            LEFT JOIN purchases p ON p.id = t.purchase_id AND p.status = 'paid'
            WHERE lower(t.status) = 'done'
              AND date(COALESCE(t.completed_at, t.paid_at, t.created_at)) = date('now')
            `
          )
          .get().s || 0
      );

      revenueYesterdayCents = Number(
        db
          .prepare(
            `
            SELECT COALESCE(SUM(
              COALESCE(p.amount_cents,
                CASE WHEN t.paid_amount_cents > 0 THEN t.paid_amount_cents ELSE t.service_price_cents END
              )
            ), 0) AS s
            FROM tasks t
            LEFT JOIN purchases p ON p.id = t.purchase_id AND p.status = 'paid'
            WHERE lower(t.status) = 'done'
              AND date(COALESCE(t.completed_at, t.paid_at, t.created_at)) = date('now','-1 day')
            `
          )
          .get().s || 0
      );

      revenueMonthCents = Number(
        db
          .prepare(
            `
            SELECT COALESCE(SUM(
              COALESCE(p.amount_cents,
                CASE WHEN t.paid_amount_cents > 0 THEN t.paid_amount_cents ELSE t.service_price_cents END
              )
            ), 0) AS s
            FROM tasks t
            LEFT JOIN purchases p ON p.id = t.purchase_id AND p.status = 'paid'
            WHERE lower(t.status) = 'done'
              AND strftime('%Y-%m', COALESCE(t.completed_at, t.paid_at, t.created_at)) = strftime('%Y-%m', 'now')
            `
          )
          .get().s || 0
      );
    }
const revenueTodayUsd = Math.round((revenueTodayCents / 100) * 100) / 100;
    const revenueMonthUsd = Math.round((revenueMonthCents / 100) * 100) / 100;
    const monthlyTargetPct = monthlyTargetUsd > 0 ? (revenueMonthUsd / monthlyTargetUsd) * 100 : 0;
    const revenueTodayChangePct = pctChange(revenueTodayCents, revenueYesterdayCents);

    return res.json({
      ok: true,
      customersTotal,
      ordersTotal,
      customersToday,
      customersYesterday,
      ordersToday,
      ordersYesterday,
      customersChangePct,
      ordersChangePct,
      // Completed orders count per month for bar chart
      monthlyCompletedOrders: completedOrdersByMonth,
      // Monthly target + revenue widgets
      monthlyTargetUsd,
      revenueMonthUsd,
      revenueTodayUsd,
      monthlyTargetPct,
      revenueTodayChangePct,
    });
  } catch (e) {
    console.error("metrics error", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// -------------------- Admin dashboard stats --------------------
// Counts *completed* orders and sums their value grouped by period.
// Query: ?period=monthly|quarterly|annually&year=YYYY
// Admin dashboard stats endpoint (used by TailAdmin chart).
// Uses async/await for SQLite queries.

// Admin dashboard: monthly statistics from orders (completed count + revenue sum)
app.get("/api/admin/stats/summary", (req, res) => {
  try {
    // Detect columns safely (supports older/newer schemas)
    const hasOrdersTable = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").get();
    const statsTable = hasOrdersTable ? 'orders' : 'purchases';
    const cols = db.prepare(`PRAGMA table_info(${statsTable})`).all().map((c) => c.name);

    const pickCol = (candidates) => candidates.find((c) => cols.includes(c)) || null;

    const createdCol = pickCol(["created_at", "createdAt", "created", "created_date", "date", "order_date", "timestamp"]);
    const statusCol = pickCol(["status", "order_status", "state"]);
    const totalCol = pickCol(["amount_cents","total_cents","total","total_amount","amount","price","final_price","paid_amount","grand_total"]);

    if (!createdCol) {
      return res.status(400).json({
        ok: false,
        error: "orders/purchases table must have a created_at (or similar) column",
        columns: cols,
      });
    }
    if (!totalCol) {
      return res.status(400).json({
        ok: false,
        error: "orders/purchases table must have a total/amount/price column",
        columns: cols,
      });
    }

    // Build WHERE for completed orders if status column exists
    const completedValues = ["paid", "complete", "completed", "succeeded", "success", "delivered"];
    let where = "";
    let params = [];
    if (statusCol) {
      where = `WHERE lower(trim(${statusCol})) IN (${completedValues.map(() => "?").join(",")})`;
      params = completedValues;
    }

    // Aggregate last 12 months (including current month)
    // SQLite: strftime('%Y-%m', created_at) works if created_at is ISO string or unix seconds.
    // If created_at is unix seconds, wrap with datetime(created_at, 'unixepoch').
    // We try both by checking sample row type.
    const sample = db.prepare(`SELECT ${createdCol} as v FROM ${statsTable} ORDER BY ${createdCol} DESC LIMIT 1`).get();
    const isNumber = sample && (typeof sample.v === "number" || (typeof sample.v === "string" && /^\d+$/.test(sample.v)));
    const dtExpr = isNumber ? `datetime(${createdCol}, 'unixepoch')` : createdCol;

    const sql = `
      SELECT
        strftime('%Y-%m', ${dtExpr}) as ym,
        COUNT(*) as orders_count,
        SUM(COALESCE(${totalCol}, 0)) as revenue
      FROM ${statsTable}
      ${where}
      GROUP BY ym
      ORDER BY ym ASC
    `;

    const rows = db.prepare(sql).all(...params);

    // Build fixed 12-month series
    const now = new Date();
    const months = [];
    const map = new Map(rows.map((r) => [r.ym, r]));
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const r = map.get(ym);
      const revenueScale = (totalCol && /_cents$/i.test(totalCol)) ? 0.01 : 1;
      months.push({
        ym,
        label: d.toLocaleString("en-US", { month: "short" }),
        orders: r ? Number(r.orders_count) : 0,
        revenue: r ? Number(r.revenue) * revenueScale : 0,
      });
    }

    const totalOrders = months.reduce((a, m) => a + m.orders, 0);
    const totalRevenue = months.reduce((a, m) => a + m.revenue, 0);

    return res.json({
      ok: true,
      columns: { createdCol, statusCol, totalCol },
      totals: { orders: totalOrders, revenue: totalRevenue },
      months,
    });
  } catch (e) {
    console.error("stats/summary error", e);
    return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});

// -------------------- Website content (CMS) --------------------
// Public: used by landing page
app.get('/api/site-content', (req, res) => {
  const team = getSiteContent('team', { members: [] });
  const i18n = getSiteContent('i18n_overrides', { uz: {}, ru: {}, en: {} });
  const video = getSiteContent('video', { mode: 'youtube', youtubeUrl: '', fileUrl: '' });
  const testimonials = getSiteContent('testimonials', { en: {}, ru: {}, uz: {} });
  const pricing = getSiteContent('pricing', { en: {}, ru: {}, uz: {} });
  const features = getSiteContent('features', { en: {}, ru: {}, uz: {} });
  const faq = getSiteContent('faq', { en: {}, ru: {}, uz: {} });
  const hero = getSiteContent('hero', { en: {}, ru: {}, uz: {} });
  const theme = getSiteContent('theme', { primaryColor: '#3C50E0' });
  return res.json({ ok: true, team, i18n, video, testimonials, pricing, features, faq, hero, theme });
});

app.get('/api/site/team', (req, res) => {
  const team = getSiteContent('team', { members: [] });
  return res.json({ ok: true, team });
});

app.get('/api/site/i18n-overrides', (req, res) => {
  const i18n = getSiteContent('i18n_overrides', { uz: {}, ru: {}, en: {} });
  return res.json({ ok: true, i18n });
});

// -----------------------------------------------------------------------------
// Backward compatible alias endpoints
// Some older frontends/admin UIs expect these endpoints:
//   GET  /api/site-texts?lang=en|ru|uz
//   POST /api/site-texts { key, value, lang }
// We map them to the same storage used by /api/site/i18n-overrides.

app.get('/api/site-texts', (req, res) => {
  const lang = String(req.query.lang || 'en').toLowerCase();
  const i18n = getSiteContent('i18n_overrides', { uz: {}, ru: {}, en: {} });
  const data = (i18n && i18n[lang]) ? i18n[lang] : {};
  return res.json({ ok: true, data });
});


// FIX: define authRequired middleware
const authRequired = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
};
app.post('/api/site-texts', authRequired, (req, res) => {
  const { key, value, lang } = req.body || {};
  const k = String(key || '').trim();
  const v = typeof value === 'string' ? value : String(value ?? '');
  const l = String(lang || 'en').toLowerCase();

  if (!k) return res.status(400).json({ ok: false, error: 'key_required' });
  if (!['uz', 'ru', 'en'].includes(l)) return res.status(400).json({ ok: false, error: 'invalid_lang' });

  // Merge into existing structure
  const i18n = getSiteContent('i18n_overrides', { uz: {}, ru: {}, en: {} });
  i18n[l] = i18n[l] || {};
  i18n[l][k] = v;
  setSiteContent('i18n_overrides', i18n);

  return res.json({ ok: true });
});

app.get('/api/site/video', (req, res) => {
  const video = getSiteContent('video', { mode: 'youtube', youtubeUrl: '', fileUrl: '' });
  return res.json({ ok: true, video });
});


app.get('/api/site/testimonials', (req, res) => {
  const testimonials = getSiteContent('testimonials', { en: {}, ru: {}, uz: {} });
  return res.json({ ok: true, testimonials });
});

app.put('/api/site/testimonials', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const incoming = req.body?.testimonials || {};

  function cleanLang(obj) {
    const title = String(obj?.title || '').trim().slice(0, 120);
    const subtitle = String(obj?.subtitle || '').trim().slice(0, 400);
    const items = Array.isArray(obj?.items) ? obj.items : [];
    const cleanedItems = items
      .filter(Boolean)
      .slice(0, 20)
      .map((it) => ({
        name: String(it?.name || '').trim().slice(0, 80),
        username: String(it?.username || '').trim().slice(0, 40),
        text: String(it?.text || '').trim().slice(0, 600),
        rating: Math.max(1, Math.min(5, Number(it?.rating || 5))),
        avatarUrl: String(it?.avatarUrl || '').trim().slice(0, 800),
        highlight: !!it?.highlight,
      }))
      .filter((it) => it.name && it.text);

    return { title, subtitle, items: cleanedItems };
  }

  const current = getSiteContent('testimonials', { en: {}, ru: {}, uz: {} });
  const next = {
    en: cleanLang(incoming.en ?? current.en ?? {}),
    ru: cleanLang(incoming.ru ?? current.ru ?? {}),
    uz: cleanLang(incoming.uz ?? current.uz ?? {}),
  };

  upsertSiteContent('testimonials', next);
  return res.json({ ok: true, testimonials: next });
});


app.get('/api/site/pricing', (req, res) => {
  const pricing = getSiteContent('pricing', { en: {}, ru: {}, uz: {} });
  const features = getSiteContent('features', { en: {}, ru: {}, uz: {} });
  return res.json({ ok: true, pricing });
});

app.put('/api/site/pricing', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const incoming = req.body?.pricing || {};
  const current = getSiteContent('pricing', { en: {}, ru: {}, uz: {} });

  function cleanPlan(p) {
    const name = String(p?.name || '').trim().slice(0, 60);
    const keyRaw = String(p?.key || '').trim();
    const key = (keyRaw || slugifyKey(name, 24)).slice(0, 24);
    const description = String(p?.description || '').trim().slice(0, 160);
    const priceMonthly = String(p?.priceMonthly || '').trim().slice(0, 40);
    const priceYearly = String(p?.priceYearly || '').trim().slice(0, 40);
    const ctaLabel = String(p?.ctaLabel || '').trim().slice(0, 60);
    const ctaHref = String(p?.ctaHref || '').trim().slice(0, 400);
    const featuresRaw = Array.isArray(p?.features) ? p.features : [];
    const features = featuresRaw
      .filter(Boolean)
      .slice(0, 12)
      .map((f) => String(f || '').trim().slice(0, 100))
      .filter((f) => f);
    return { key, name, description, priceMonthly, priceYearly, ctaLabel, ctaHref, features };
  }

  function cleanLang(obj) {
    const title = String(obj?.title || '').trim().slice(0, 140);
    const subtitle = String(obj?.subtitle || '').trim().slice(0, 500);
    const billingMonthly = String(obj?.billingMonthly || '').trim().slice(0, 30);
    const billingYearly = String(obj?.billingYearly || '').trim().slice(0, 30);
    const discountBadge = String(obj?.discountBadge || '').trim().slice(0, 40);
    const plansRaw = Array.isArray(obj?.plans) ? obj.plans : [];
    const plans = plansRaw
      .filter(Boolean)
      .slice(0, 8)
      .map(cleanPlan)
      .filter((p) => p.key && p.name);
    return { title, subtitle, billingMonthly, billingYearly, discountBadge, plans };
  }

  const next = {
    en: cleanLang(incoming.en ?? current.en ?? {}),
    ru: cleanLang(incoming.ru ?? current.ru ?? {}),
    uz: cleanLang(incoming.uz ?? current.uz ?? {}),
  };

  upsertSiteContent('pricing', next);

  // --- Sync Pricing (admin editable) -> services table ---
  // So when you change e.g. Pro $49 -> $50 in Admin Pricing, the website service price updates automatically.
  // Mapping by plan.key (free/starter/pro/enterprise) to service codes (SVC100..SVC400)
  const planToServiceCode = {
    free: 'SVC100',
    starter: 'SVC200',
    pro: 'SVC300',
    enterprise: 'SVC400',
  };

  function parseMoneyToCents(v) {
    const s = String(v ?? '').trim();
    if (!s) return null;
    // capture first number (supports 1,190.50 etc)
    const m = s.match(/([0-9][0-9,]*\.?[0-9]*)/);
    if (!m) return null;
    const num = Number(String(m[1]).replace(/,/g, ''));
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 100);
  }

  try {
    const plans = Array.isArray(next.en?.plans) ? next.en.plans : [];
    const tx = db.transaction(() => {
      for (const p of plans) {
        const key = String(p?.key || '').trim().toLowerCase();
        const code = planToServiceCode[key];
        if (!code) continue;

        const cents = parseMoneyToCents(p?.priceMonthly);
        if (cents == null) continue;

        const name = String(p?.name || '').trim().slice(0, 60) || key;
        const exists = db.prepare('SELECT id FROM services WHERE code = ?').get(code);
        if (exists) {
          db.prepare('UPDATE services SET name = ?, price_cents = ? WHERE code = ?').run(name, cents, code);
        } else {
          db.prepare('INSERT INTO services (code, name, price_cents, commission_rate) VALUES (?, ?, ?, 0.05)')
            .run(code, name, cents);
        }
      }
    });
    tx();
  } catch (e) {
    // Do not fail saving pricing if sync fails; just log
    console.error('[pricing->services sync] failed:', e);
  }

  return res.json({ ok: true, pricing: next });
});


app.get('/api/site/features', (req, res) => {
  const features = getSiteContent('features', { en: {}, ru: {}, uz: {} });
  return res.json({ ok: true, features });
});

app.put('/api/site/features', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const incoming = req.body?.features || {};
  const current = getSiteContent('features', { en: {}, ru: {}, uz: {} });

  function cleanItem(it) {
    const title = String(it?.title || '').trim().slice(0, 80);
    const description = String(it?.description || '').trim().slice(0, 220);
    return { title, description };
  }

  function cleanLang(obj) {
    const title = String(obj?.title || '').trim().slice(0, 140);
    const subtitle = String(obj?.subtitle || '').trim().slice(0, 500);
    const ctaText = String(obj?.ctaText || '').trim().slice(0, 240);
    const ctaButtonLabel = String(obj?.ctaButtonLabel || '').trim().slice(0, 60);
    const ctaButtonHref = String(obj?.ctaButtonHref || '').trim().slice(0, 400);
    const itemsRaw = Array.isArray(obj?.items) ? obj.items : [];
    const items = itemsRaw
      .filter(Boolean)
      .slice(0, 12)
      .map(cleanItem)
      .filter((x) => x.title && x.description);
    return { title, subtitle, ctaText, ctaButtonLabel, ctaButtonHref, items };
  }

  const next = {
    en: cleanLang(incoming.en ?? current.en ?? {}),
    ru: cleanLang(incoming.ru ?? current.ru ?? {}),
    uz: cleanLang(incoming.uz ?? current.uz ?? {}),
  };

  upsertSiteContent('features', next);
  return res.json({ ok: true, features: next });
});

// Admin: update content

app.get('/api/site/faq', (req, res) => {
  const faq = getSiteContent('faq', { en: {}, ru: {}, uz: {} });
  const hero = getSiteContent('hero', { en: {}, ru: {}, uz: {} });
  return res.json({ ok: true, faq });
});

app.put('/api/site/faq', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  // Accept either { faq: {en,ru,uz} } or direct {en,ru,uz}
  const incoming = req.body?.faq && typeof req.body.faq === 'object' ? req.body.faq : req.body;

  function cleanQA(x) {
    const q = String(x?.q || x?.question || '').trim().slice(0, 140);
    const a = String(x?.a || x?.answer || '').trim().slice(0, 1200);
    return { q, a };
  }

  function cleanLang(obj) {
    const title = String(obj?.title || '').trim().slice(0, 140);
    const subtitle = String(obj?.subtitle || '').trim().slice(0, 500);
    const ctaTitle = String(obj?.ctaTitle || obj?.ctaText || '').trim().slice(0, 240);
    const ctaButtonLabel = String(obj?.ctaButtonLabel || '').trim().slice(0, 60);
    const ctaButtonHref = String(obj?.ctaButtonHref || '').trim().slice(0, 400);

    const itemsRaw = Array.isArray(obj?.items) ? obj.items : (Array.isArray(obj?.questions) ? obj.questions : []);
    const items = itemsRaw
      .filter(Boolean)
      .slice(0, 20)
      .map(cleanQA)
      .filter((x) => x.q && x.a);

    return { title, subtitle, ctaTitle, ctaButtonLabel, ctaButtonHref, items };
  }

  const current = getSiteContent('faq', { en: {}, ru: {}, uz: {} });

  const next = {
    en: cleanLang(incoming?.en ?? current.en ?? {}),
    ru: cleanLang(incoming?.ru ?? current.ru ?? {}),
    uz: cleanLang(incoming?.uz ?? current.uz ?? {}),
  };

  upsertSiteContent('faq', next);
  return res.json({ ok: true, faq: next });
});


app.get('/api/site/hero', (req, res) => {
  const hero = getSiteContent('hero', { en: {}, ru: {}, uz: {} });
  return res.json({ ok: true, hero });
});

app.put('/api/site/hero', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  // Accept either { hero: {en,ru,uz} } or direct {en,ru,uz}
  const incoming = req.body?.hero && typeof req.body.hero === 'object' ? req.body.hero : req.body;

  function cleanStat(x) {
    const value = String(x?.value || x?.v || '').trim().slice(0, 24);
    const label = String(x?.label || x?.l || '').trim().slice(0, 120);
    return { value, label };
  }

  function cleanLang(obj) {
    const badge = String(obj?.badge || '').trim().slice(0, 140);
    const title = String(obj?.title || '').trim().slice(0, 180);
    const subtitle = String(obj?.subtitle || '').trim().slice(0, 500);
    const ctaPrimaryLabel = String(obj?.ctaPrimaryLabel || obj?.cta_primary_label || obj?.ctaPrimary || '').trim().slice(0, 60);
    const ctaPrimaryHref = String(obj?.ctaPrimaryHref || obj?.cta_primary_href || obj?.ctaPrimaryUrl || '#').trim().slice(0, 400) || '#';
    const ctaSecondaryLabel = String(obj?.ctaSecondaryLabel || obj?.cta_secondary_label || obj?.ctaSecondary || '').trim().slice(0, 60);
    const ctaSecondaryHref = String(obj?.ctaSecondaryHref || obj?.cta_secondary_href || obj?.ctaSecondaryUrl || '').trim().slice(0, 400);

    const statsRaw = Array.isArray(obj?.stats) ? obj.stats : (Array.isArray(obj?.metrics) ? obj.metrics : []);
    const stats = (statsRaw || [])
      .filter(Boolean)
      .slice(0, 6)
      .map(cleanStat)
      .filter((x) => x.value && x.label);

    return { badge, title, subtitle, ctaPrimaryLabel, ctaPrimaryHref, ctaSecondaryLabel, ctaSecondaryHref, stats };
  }

  const current = getSiteContent('hero', { en: {}, ru: {}, uz: {} });

  const next = {
    en: cleanLang(incoming?.en ?? current.en ?? {}),
    ru: cleanLang(incoming?.ru ?? current.ru ?? {}),
    uz: cleanLang(incoming?.uz ?? current.uz ?? {}),
  };

  upsertSiteContent('hero', next);
  return res.json({ ok: true, hero: next });
});


// Theme (brand color)
app.get('/api/site/theme', (req, res) => {
  const theme = getSiteContent('theme', { primaryColor: '#3C50E0' });
  return res.json({ ok: true, theme });
});

app.put('/api/site/theme', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const primaryColor = String(req.body?.primaryColor || req.body?.theme?.primaryColor || '').trim();
  // basic hex validation: #RGB or #RRGGBB
  const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor);
  if (!isHex) return res.status(400).json({ ok: false, error: 'Invalid primaryColor' });

  const current = getSiteContent('theme', { primaryColor: '#3C50E0' }) || {};
  const next = { ...current, primaryColor, updatedAt: Date.now() };
  upsertSiteContent('theme', next);
  return res.json({ ok: true, theme: next });
});

app.put('/api/site/team', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const cleanMember = (m) => ({
    name: String(m?.name || '').trim().slice(0, 120),
    role: String(m?.role || '').trim().slice(0, 120),
    imageUrl: String(m?.imageUrl || '').trim().slice(0, 500)
  });

  const current = getSiteContent('team', { members: [] }) || { members: [] };

  const incomingMembers = Array.isArray(req.body?.members)
    ? req.body.members
    : Array.isArray(req.body?.team?.members)
      ? req.body.team.members
      : [];

  const incomingSoft = Array.isArray(req.body?.softScienceBoard)
    ? req.body.softScienceBoard
    : Array.isArray(req.body?.team?.softScienceBoard)
      ? req.body.team.softScienceBoard
      : null;

  const incomingHard = Array.isArray(req.body?.hardScienceBoard)
    ? req.body.hardScienceBoard
    : Array.isArray(req.body?.team?.hardScienceBoard)
      ? req.body.team.hardScienceBoard
      : null;

  const cleanedMembers = (incomingMembers || [])
    .filter(Boolean)
    .slice(0, 50)
    .map(cleanMember)
    .filter((m) => m.name);

  const cleanedSoft = Array.isArray(incomingSoft)
    ? incomingSoft.filter(Boolean).slice(0, 50).map(cleanMember).filter((m) => m.name)
    : Array.isArray(current.softScienceBoard)
      ? current.softScienceBoard
      : [];

  const cleanedHard = Array.isArray(incomingHard)
    ? incomingHard.filter(Boolean).slice(0, 50).map(cleanMember).filter((m) => m.name)
    : Array.isArray(current.hardScienceBoard)
      ? current.hardScienceBoard
      : [];

  const next = { ...current, members: cleanedMembers, softScienceBoard: cleanedSoft, hardScienceBoard: cleanedHard };
  upsertSiteContent('team', next);
  return res.json({ ok: true, team: next });
});

app.put('/api/site/i18n-overrides', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const incoming = req.body?.i18n;
  const current = getSiteContent('i18n_overrides', { uz: {}, ru: {}, en: {} });
  const next = { ...current };
  for (const lang of ['uz', 'ru', 'en']) {
    if (incoming && typeof incoming[lang] === 'object' && incoming[lang] !== null) {
      next[lang] = { ...next[lang], ...incoming[lang] };
    }
  }
  upsertSiteContent('i18n_overrides', next);
  return res.json({ ok: true, i18n: next });
});

app.put('/api/site/video', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const mode = String(req.body?.mode || '').toLowerCase() === 'file' ? 'file' : 'youtube';
  const youtubeUrl = String(req.body?.youtubeUrl || '').trim().slice(0, 800);
  const fileUrl = String(req.body?.fileUrl || '').trim().slice(0, 800);

  // Keep both fields, UI can switch between them.
  const next = { mode, youtubeUrl, fileUrl };
  upsertSiteContent('video', next);
  return res.json({ ok: true, video: next });
});

// Image upload helper for team/website images
const siteImageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(String(file.mimetype || ''));
    cb(ok ? null : new Error('Only image uploads allowed'), ok);
  }
});

app.post('/api/site/upload', (req, res) => {
  const adminId = Number(req.query?.admin_id || req.body?.admin_id || req.body?.adminId || 0);
  // For local development, allow uploads even if admin_id is missing.
  // In production, admin_id is required.
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProd) {
    const a = requireAdmin(adminId);
    if (!a.ok) return res.status(a.status).json({ error: a.error });
  }

  siteImageUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'File required' });
    return res.json({ ok: true, url: `/uploads/${f.filename}` });
  });
});

// Video upload helper (mp4/webm/ogg)
const siteVideoUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const mt = String(file.mimetype || '');
    const ok = /^video\//.test(mt);
    cb(ok ? null : new Error('Only video uploads allowed'), ok);
  }
});

app.post('/api/site/video-upload', (req, res) => {
  const adminId = Number(req.query?.admin_id || req.body?.admin_id || req.body?.adminId || 0);
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProd) {
    const a = requireAdmin(adminId);
    if (!a.ok) return res.status(a.status).json({ error: a.error });
  }

  siteVideoUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'File required' });
    return res.json({ ok: true, url: `/uploads/${f.filename}` });
  });
});






// Is user admin? (UI helper)
app.get("/api/is-admin/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const user = requireUser(userId);
  if (!user) return res.status(401).json({ error: "Login qiling" });
  return res.json({ ok: true, isAdmin: isAdminUser(user) });
});



// -------------------- Tasks --------------------
// Create task (owner) with attachments
app.post("/api/tasks", upload.array("files", 10), (req, res) => {
  const userId = req.body?.userId;
  const description = String(req.body?.description || "").trim();
  const owner = requireUser(userId);

  if (!owner) return res.status(401).json({ error: "Login qiling (userId yo‘q yoki noto‘g‘ri)" });
  if (!description) return res.status(400).json({ error: "Tavsif (description) kerak" });

  // Service selection (only $100/$200/$300/$400 + CUSTOM)
  const requestedCode = String(req.body?.serviceCode || "").trim().toUpperCase();
  const allowed = new Set(["SVC100", "SVC200", "SVC300", "SVC400", "CUSTOM"]);
  const serviceCode = allowed.has(requestedCode) ? requestedCode : "SVC100";
  const customAmountCents = Number(req.body?.customAmountCents || 0);

  let taskPriceCents = 0;
  let serviceNameStr = "";
  let serviceCodeStr = "CUSTOM";
  let buyerDiscountRate = 0;

  if (serviceCode === "CUSTOM") {
    if (customAmountCents < 100) return res.status(400).json({ error: "Custom amount must be at least $1.00" });
    taskPriceCents = customAmountCents;
    serviceNameStr = "Custom Service";
  } else {
    const service = db.prepare("SELECT id, code, name, price_cents, commission_rate FROM services WHERE code = ?").get(serviceCode);
    if (!service) return res.status(400).json({ error: "Servis topilmadi" });
    serviceNameStr = service.name;
    serviceCodeStr = service.code;
    buyerDiscountRate = getBuyerReferralFirstOrderDiscountRate(Number(owner.id));
    taskPriceCents = buyerDiscountRate
      ? discountedPriceCents(Number(service.price_cents), buyerDiscountRate)
      : Number(service.price_cents);
  }

  const info = db.prepare(
    "INSERT INTO tasks (owner_user_id, description, service_code, service_name, service_price_cents, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(owner.id, description, serviceCodeStr, serviceNameStr, taskPriceCents, "sent");

  const taskId = info.lastInsertRowid;

  const files = Array.isArray(req.files) ? req.files : [];
  const insAtt = db.prepare(
    "INSERT INTO task_attachments (task_id, original_name, stored_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)"
  );
  for (const f of files) {
    insAtt.run(taskId, f.originalname, f.filename, f.mimetype, f.size);
  }

  return res.json({
    ok: true,
    taskId,
    service: {
      code: serviceCodeStr,
      name: serviceNameStr,
      price_cents: serviceCode === "CUSTOM" ? customAmountCents : taskPriceCents,
      task_price_cents: taskPriceCents,
      discount_applied: !!buyerDiscountRate,
      discount_rate: buyerDiscountRate
    },
    stripeEnabled: isStripeEnabled()
  });
});



// Link a Stripe purchase to a task (so dashboard/admin can show payment context)
app.post("/api/tasks/:taskId/link-purchase", (req, res) => {
  const taskId = Number(req.params.taskId);
  const userId = Number(req.body?.userId);
  const purchaseId = Number(req.body?.purchaseId);

  const viewer = requireUser(userId);
  if (!viewer) return res.status(401).json({ error: "Login qiling" });
  if (!taskId || !purchaseId) return res.status(400).json({ error: "taskId va purchaseId kerak" });

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Zakaz topilmadi" });

  const isOwner = Number(task.owner_user_id) === Number(viewer.id);
  if (!isOwner && !isAdminUser(viewer)) return res.status(403).json({ error: "Ruxsat yo‘q" });

  // Link purchase and also sync expected/paid amounts so UI shows the real (possibly discounted) price.
  db.prepare("UPDATE tasks SET purchase_id = ? WHERE id = ?").run(purchaseId, taskId);

  try {
    const p = db.prepare("SELECT id, amount_cents, status FROM purchases WHERE id = ?").get(purchaseId);
    if (p) {
      const amt = Number(p.amount_cents || 0);
      if (amt > 0) {
        db.prepare("UPDATE tasks SET service_price_cents = ? WHERE id = ?").run(amt, taskId);
      }
      if (String(p.status) === 'paid') {
        db.prepare("UPDATE tasks SET is_paid = 1, paid_at = COALESCE(paid_at, datetime('now')), paid_amount_cents = ? WHERE id = ?").run(amt, taskId);
      }
    }
  } catch (e) {
    // ignore
  }

  return res.json({ ok: true });
});

// List open tasks (for executors)
app.get("/api/tasks", (req, res) => {
  const tasks = db.prepare(`
    SELECT t.id, t.description, t.status, t.created_at, u.name AS owner_name
    FROM tasks t
    JOIN users u ON u.id = t.owner_user_id
    -- NOTE: older UI uses status='sent' for newly created orders.
    -- Treat 'sent' as open/available when browsing orders.
    WHERE t.status IN ('open','sent')
    ORDER BY t.created_at DESC
    LIMIT 200
  `).all();

  return res.json({ ok: true, tasks });
});

// Get one task + attachments
app.get("/api/tasks/:taskId", (req, res) => {
  const taskId = Number(req.params.taskId);
  const userId = Number(req.query.userId);
  const viewer = requireUser(userId);
  if (!viewer) return res.status(401).json({ error: "Login qiling" });

  const task = db.prepare(`
    SELECT t.*, u.name AS owner_name, u.email AS owner_email
    FROM tasks t
    JOIN users u ON u.id = t.owner_user_id
    WHERE t.id = ?
  `).get(taskId);

  if (!task) return res.status(404).json({ error: "Task topilmadi" });

  // Only owner or admin can view
  const isOwner = Number(task.owner_user_id) === Number(viewer.id);
  if (!isOwner && !isAdminUser(viewer)) return res.status(403).json({ error: "Ruxsat yo‘q" });
  if (task.owner_user_id !== viewer.id && !isAdminUser(viewer)) return res.status(403).json({ error: "Ruxsat yo‘q" });

  const attachments = db.prepare(`
    SELECT id, original_name, stored_name, mime_type, size_bytes, created_at
    FROM task_attachments
    WHERE task_id = ?
    ORDER BY id ASC
  `).all(taskId);

  return res.json({ ok: true, task, attachments });
});

// Create submission (executor sends result) with attachments
app.post("/api/tasks/:taskId/submissions", upload.array("files", 10), (req, res) => {
  const taskId = Number(req.params.taskId);
  const userId = req.body?.userId;
  const message = String(req.body?.message || "").trim();

  const sender = requireUser(userId);
  if (!sender) return res.status(401).json({ error: "Login qiling" });

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Task topilmadi" });

  // If the order is completed, block any new messages/files (both owner and admin)
  if (String(task.status || '').toLowerCase() === 'done') {
    return res.status(400).json({ error: "Bu zakaz tugatilgan. Xabar/fayl yuborib bo‘lmaydi." });
  }

  // Allow: admin OR task owner
  const isOwner = task.owner_user_id === sender.id;
  const isAdmin = isAdminUser(sender);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Ruxsat yo‘q" });

  const info = db.prepare(
    "INSERT INTO task_submissions (task_id, sender_user_id, message) VALUES (?, ?, ?)"
  ).run(taskId, sender.id, message || null);

  const subId = info.lastInsertRowid;

  const files = Array.isArray(req.files) ? req.files : [];
  const insAtt = db.prepare(
    "INSERT INTO submission_attachments (submission_id, original_name, stored_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)"
  );
  for (const f of files) {
    insAtt.run(subId, f.originalname, f.filename, f.mimetype, f.size);
  }

  // Status progression:
  // - when admin sends a reply, mark as in_progress (unless already done)
  // - when owner sends a follow-up, keep as sent/in_progress
  try {
    if (isAdmin && String(task.status || '').toLowerCase() !== 'done') {
      db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run('in_progress', taskId);
    }
  } catch (e) {}

  return res.json({ ok: true, submissionId: subId });
});

// Owner: list my tasks + submission counts
app.get("/api/my/tasks/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const owner = requireUser(userId);
  if (!owner) return res.status(401).json({ error: "Login qiling" });

  const tasks = db.prepare(`
    SELECT t.id, t.description, t.service_code, t.service_name, t.service_price_cents, t.status, t.created_at,
           (SELECT COUNT(*) FROM task_submissions s WHERE s.task_id = t.id) AS submissions_count
    FROM tasks t
    WHERE t.owner_user_id = ?
    ORDER BY t.created_at DESC
    LIMIT 200
  `).all(owner.id);

  return res.json({ ok: true, tasks });
});

// Owner: get submissions for a task
app.get("/api/tasks/:taskId/submissions", (req, res) => {
  const taskId = Number(req.params.taskId);
  const userId = Number(req.query.userId);
  const owner = requireUser(userId);
  if (!owner) return res.status(401).json({ error: "Login qiling" });

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Task topilmadi" });
  if (task.owner_user_id !== owner.id && !isAdminUser(owner)) return res.status(403).json({ error: "Ruxsat yo‘q" });

  const submissions = db.prepare(`
    SELECT s.id, s.message, s.created_at, u.name AS sender_name, u.email AS sender_email
    FROM task_submissions s
    JOIN users u ON u.id = s.sender_user_id
    WHERE s.task_id = ?
    ORDER BY s.created_at DESC
    LIMIT 200
  `).all(taskId);

  const att = db.prepare(`
    SELECT a.submission_id, a.original_name, a.stored_name, a.mime_type, a.size_bytes, a.created_at
    FROM submission_attachments a
    WHERE a.submission_id IN (SELECT id FROM task_submissions WHERE task_id = ?)
    ORDER BY a.id ASC
  `).all(taskId);

  // group attachments by submission_id
  const map = new Map();
  for (const a of att) {
    if (!map.has(a.submission_id)) map.set(a.submission_id, []);
    map.get(a.submission_id).push(a);
  }
  const submissionsWithFiles = submissions.map(s => ({ ...s, attachments: map.get(s.id) || [] }));

  return res.json({ ok: true, submissions: submissionsWithFiles });
});


// -------------------- Upload error handler --------------------
app.use((err, req, res, next) => {
  if (!err) return next();

  // Multer errors (file limits, etc.)
  if (err instanceof multer.MulterError) {
    let msg = "File upload error";
    if (err.code === "LIMIT_FILE_SIZE") msg = "Fayl juda katta (max: 500MB).";
    if (err.code === "LIMIT_FILE_COUNT") msg = "Fayl soni ko‘p (max: 10 ta).";
    if (err.code === "LIMIT_UNEXPECTED_FILE") msg = "Fayl maydoni noto‘g‘ri (files).";
    return res.status(400).json({ error: msg, code: err.code });
  }

  // Other errors
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Server error", details: String(err.message || err) });
});


// -------------------- Admin: incoming orders --------------------
app.get("/api/admin/tasks/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const user = requireUser(userId);
  if (!user) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(user)) return res.status(403).json({ error: "Admin emas" });

  const tasks = db.prepare(`
    SELECT t.id, t.description, t.status, t.created_at,
           u.name AS owner_name, u.email AS owner_email,
           (SELECT COUNT(*) FROM task_submissions s WHERE s.task_id = t.id) AS submissions_count
    FROM tasks t
    JOIN users u ON u.id = t.owner_user_id
    ORDER BY t.created_at DESC
    LIMIT 500
  `).all();

  return res.json({ ok: true, tasks });
});

// Admin: mark task as done (complete)
app.post("/api/admin/tasks/complete", (req, res) => {
  const adminId = Number(req.body?.adminId);
  const taskId = Number(req.body?.taskId);

  const admin = requireUser(adminId);
  if (!admin) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Task topilmadi" });

  // Mark as done + store completion timestamp (used for daily/monthly revenue + charts)
  db.prepare("UPDATE tasks SET status = ?, completed_at = COALESCE(completed_at, datetime('now')) WHERE id = ?").run(
    'done',
    taskId
  );

  return res.json({ ok: true, taskId, status: 'done' });
});

// Admin: mark task as paid (manual) + credit referral commission (5%)
// This is useful when you take payment outside Stripe and still want referral earnings.
app.post("/api/admin/tasks/mark-paid", (req, res) => {
  const adminId = Number(req.body?.adminId);
  const taskId = Number(req.body?.taskId);
  const amountCentsInput = req.body?.amount_cents;

  const admin = requireUser(adminId);
  if (!admin) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Task topilmadi" });

  let amountCents = Number(amountCentsInput);
  if (!amountCents || amountCents <= 0) {
    // Default to the task's stored price, but if the buyer is eligible for the first-order referral discount,
    // automatically use the discounted amount (unless admin explicitly overrides amount_cents).
    amountCents = Number(task.service_price_cents || 0);
    try {
      const buyerUserIdTmp = Number(task.owner_user_id);
      const rate = getBuyerReferralFirstOrderDiscountRate(buyerUserIdTmp);
      if (rate) {
        let base = amountCents;
        if (task.service_code) {
          const svc = db.prepare("SELECT price_cents FROM services WHERE code = ?").get(String(task.service_code));
          if (svc && svc.price_cents) base = Number(svc.price_cents);
        }
        amountCents = discountedPriceCents(base, rate);
      }
    } catch (e) {
      // ignore
    }
  }
  if (!amountCents || amountCents <= 0) {
    return res.status(400).json({ error: "Amount topilmadi (servis narxi yo‘q)." });
  }

  // Resolve service_id (best effort)
  let serviceId = null;
  if (task.service_code) {
    const s = db.prepare("SELECT id FROM services WHERE code = ?").get(String(task.service_code));
    if (s && s.id) serviceId = Number(s.id);
  }
  if (!serviceId) {
    const s2 = db.prepare("SELECT id FROM services WHERE price_cents = ? ORDER BY id ASC LIMIT 1").get(amountCents);
    if (s2 && s2.id) serviceId = Number(s2.id);
  }

  const buyerUserId = Number(task.owner_user_id);
  let purchaseId = task.purchase_id ? Number(task.purchase_id) : null;

  if (purchaseId) {
    // Ensure purchase is marked paid (idempotent)
    db.prepare(
      "UPDATE purchases SET status='paid', amount_cents = ?, currency='USD', service_id = COALESCE(service_id, ?) WHERE id = ?"
    ).run(amountCents, serviceId, purchaseId);
  } else {
    const info = db
      .prepare(
        "INSERT INTO purchases (user_id, service_id, amount_cents, currency, status) VALUES (?, ?, ?, 'USD', 'paid')"
      )
      .run(buyerUserId, serviceId, amountCents);
    purchaseId = Number(info.lastInsertRowid);
    db.prepare("UPDATE tasks SET purchase_id = ? WHERE id = ?").run(purchaseId, taskId);
  }

  // Credit referral commission once (INSERT OR IGNORE on purchase_id)
  const commission = creditReferralCommission({
    purchaseId,
    buyerUserId,
    serviceId,
    purchaseAmountCents: amountCents,
    defaultRate: 0.05
  });

  db.prepare(
    "UPDATE tasks SET is_paid = 1, paid_at = datetime('now'), paid_amount_cents = ?, service_price_cents = ? WHERE id = ?"
  ).run(amountCents, amountCents, taskId);

  return res.json({ ok: true, taskId, purchaseId, amount_cents: amountCents, commission });
});

// -------------------- Admin: referrals + wallet --------------------
app.get("/api/admin/referrals/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const admin = requireUser(userId);
  if (!admin) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });

  const rows = db.prepare(`
    SELECT
      u.id, u.name, u.email, u.referral_code,
      COALESCE(u.wallet_balance_cents,0) AS wallet_balance_cents,
      (SELECT referrer_user_id FROM referrals r WHERE r.referred_user_id = u.id) AS referrer_user_id,
      (SELECT COUNT(*) FROM referrals r2 WHERE r2.referrer_user_id = u.id) AS referrals_count,
      (SELECT COALESCE(SUM(amount_cents),0) FROM referral_commissions c WHERE c.referrer_user_id = u.id) AS total_commission_cents
    FROM users u
    ORDER BY u.id ASC
    LIMIT 5000
  `).all();

  return res.json({ ok: true, users: rows });
});

// Admin: get/set referral earnings totals (Total/Earned/Paid display overrides)
app.get("/api/admin/referral-earnings/:adminId/:referrerId", (req, res) => {
  const adminId = Number(req.params.adminId);
  const referrerId = Number(req.params.referrerId);

  const admin = requireUser(adminId);
  if (!admin) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });

  const user = requireUser(referrerId);
  if (!user) return res.status(404).json({ error: "User topilmadi" });

  const computed = db.prepare(`
    SELECT
      COALESCE(SUM(amount_cents),0) AS total_cents,
      COALESCE(SUM(CASE WHEN status='earned' THEN amount_cents ELSE 0 END),0) AS earned_cents,
      COALESCE(SUM(CASE WHEN status='paid' THEN amount_cents ELSE 0 END),0) AS paid_cents
    FROM referral_commissions
    WHERE referrer_user_id = ?
  `).get(referrerId);

  const override = db.prepare(`
    SELECT total_cents, earned_cents, paid_cents, updated_at, updated_by_admin_id
    FROM referral_earnings_overrides
    WHERE referrer_user_id = ?
  `).get(referrerId);

  return res.json({ ok: true, referrerId, computed, override });
});

app.post("/api/admin/referral-earnings/update", (req, res) => {
  const adminId = Number(req.body?.adminId);
  const referrerId = Number(req.body?.referrerId);
  const totalCents = req.body?.total_cents;
  const earnedCents = req.body?.earned_cents;
  const paidCents = req.body?.paid_cents;

  const admin = requireUser(adminId);
  if (!admin) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });

  const user = requireUser(referrerId);
  if (!user) return res.status(404).json({ error: "User topilmadi" });

  function parseNullableInt(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return "__invalid__";
    return n;
  }

  const t = parseNullableInt(totalCents);
  const e = parseNullableInt(earnedCents);
  const p = parseNullableInt(paidCents);
  if (t === "__invalid__" || e === "__invalid__" || p === "__invalid__") {
    return res.status(400).json({ error: "total_cents/earned_cents/paid_cents integer (cents) bo‘lsin yoki bo‘sh" });
  }

  db.prepare(`
    INSERT INTO referral_earnings_overrides (referrer_user_id, total_cents, earned_cents, paid_cents, updated_by_admin_id)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(referrer_user_id) DO UPDATE SET
      total_cents=excluded.total_cents,
      earned_cents=excluded.earned_cents,
      paid_cents=excluded.paid_cents,
      updated_by_admin_id=excluded.updated_by_admin_id,
      updated_at=datetime('now')
  `).run(referrerId, t, e, p, adminId);

  const override = db.prepare(`
    SELECT total_cents, earned_cents, paid_cents, updated_at, updated_by_admin_id
    FROM referral_earnings_overrides
    WHERE referrer_user_id = ?
  `).get(referrerId);

  return res.json({ ok: true, override });
});

app.get("/api/admin/referrals/:userId/invited/:referrerId", (req, res) => {
  const userId = Number(req.params.userId);
  const admin = requireUser(userId);
  if (!admin) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });

  const referrerId = Number(req.params.referrerId);
  const invited = db.prepare(`
    SELECT u.id, u.name, u.email, r.created_at
    FROM referrals r
    JOIN users u ON u.id = r.referred_user_id
    WHERE r.referrer_user_id = ?
    ORDER BY r.created_at DESC
    LIMIT 500
  `).all(referrerId);

  return res.json({ ok: true, invited });
});

// Admin: lookup who invited a given registered user (search by name/email)
app.get("/api/admin/referrals/:adminId/lookup", (req, res) => {
  const adminId = Number(req.params.adminId);
  const admin = requireUser(adminId);
  if (!admin) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });

  const qRaw = String(req.query?.q || req.query?.query || "").trim();
  if (!qRaw) return res.json({ ok: true, results: [] });
  const q = qRaw.toLowerCase();
  const like = `%${q}%`;

  const results = db.prepare(`
    SELECT
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.created_at AS user_created_at,
      r.referrer_user_id AS referrer_user_id,
      r.created_at AS referral_created_at,
      ru.name AS referrer_name,
      ru.email AS referrer_email,
      ru.referral_code AS referrer_code
    FROM users u
    LEFT JOIN referrals r ON r.referred_user_id = u.id
    LEFT JOIN users ru ON ru.id = r.referrer_user_id
    WHERE lower(u.name) LIKE ? OR lower(u.email) LIKE ?
    ORDER BY u.created_at DESC
    LIMIT 50
  `).all(like, like);

  return res.json({ ok: true, results });
});


// ---- Save Website ----
app.post("/api/admin/save-website", express.json({limit: '50mb'}), (req, res) => {
    const adminId = Number(req.body?.adminId);
    const html = req.body?.html;
    console.log(`[save-website] Request received. adminId=${adminId}, htmlLength=${html ? html.length : 0}`);

    const admin = requireUser(adminId);
    if (!admin) {
        console.log(`[save-website] Authentication failed: user not found for adminId=${adminId}`);
        return res.status(401).json({ error: "Login qiling" });
    }
    if (!isAdminUser(admin)) {
        console.log(`[save-website] Forbidden: user ${admin.email} (id=${admin.id}) is not an admin`);
        return res.status(403).json({ error: "Admin emas" });
    }
    
    if (!html) {
        console.log(`[save-website] Validation error: HTML is empty`);
        return res.status(400).json({ error: "HTML kodi yo'q" });
    }

    const indexPath = path.join(__dirname, "public", "index.html");
    
    try {
        // Create backup
        if (fs.existsSync(indexPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = indexPath.replace('.html', '-backup-' + timestamp + '.html');
            fs.copyFileSync(indexPath, backupPath);
            console.log(`[save-website] Backup created at: ${backupPath}`);
        }
        
        fs.writeFileSync(indexPath, html);
        console.log(`[save-website] Website saved successfully to ${indexPath}`);
        return res.json({ ok: true });
    } catch (err) {
        console.error(`[save-website] Error writing file:`, err);
        return res.status(500).json({ error: "Faylni yozishda xatolik yuz berdi: " + err.message });
    }
});

app.post("/api/admin/wallet-adjust", (req, res) => {
  const adminId = Number(req.body?.adminId);
  const targetUserId = Number(req.body?.targetUserId);
  const deltaCents = Number(req.body?.delta_cents);
  const reason = String(req.body?.reason || "").trim();

  const admin = requireUser(adminId);
  if (!admin) return res.status(401).json({ error: "Login qiling" });
  if (!isAdminUser(admin)) return res.status(403).json({ error: "Admin emas" });

  const target = requireUser(targetUserId);
  if (!target) return res.status(404).json({ error: "Target user topilmadi" });
  if (!Number.isFinite(deltaCents) || !Number.isInteger(deltaCents)) return res.status(400).json({ error: "delta_cents integer bo‘lsin" });

  db.prepare("UPDATE users SET wallet_balance_cents = wallet_balance_cents + ? WHERE id = ?").run(deltaCents, targetUserId);
  addWalletEntry({ userId: targetUserId, entryType: 'admin_adjust', amountCents: deltaCents, note: reason || `Admin adjust by ${admin.email}` });
  const updated = db.prepare("SELECT wallet_balance_cents FROM users WHERE id = ?").get(targetUserId);
  return res.json({ ok: true, wallet_balance_cents: Number(updated?.wallet_balance_cents || 0) });
});


// -------------------- User Profile (TailAdmin) --------------------
function sanitizeStr(v, max = 300) {
  return String(v || '').trim().slice(0, max);
}

app.get('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });
  const u = requireUser(id);
  if (!u) return res.status(404).json({ error: 'User topilmadi' });

  return res.json({
    ok: true,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      referral_code: u.referral_code,
      is_admin: Number(u.is_admin || 0),
      avatar_url: u.avatar_url || '',
      job_title: u.job_title || '',
      phone: u.phone || '',
      location: u.location || '',
      bio: u.bio || '',
      facebook: u.facebook || '',
      x_url: u.x_url || '',
      linkedin: u.linkedin || '',
      instagram: u.instagram || ''
    }
  });
});

app.put('/api/users/:id', (req, res) => {
  const targetId = Number(req.params.id);
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);

  // Allow self-update OR admin update
  const acting = requireUser(adminId || targetId);
  if (!acting) return res.status(401).json({ error: 'Login qiling' });

  const isSelf = acting.id === targetId;
  const isAdmin = isAdminUser(acting);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Ruxsat yo‘q' });

  const existing = requireUser(targetId);
  if (!existing) return res.status(404).json({ error: 'User topilmadi' });

  const name = sanitizeStr(req.body?.name, 120) || existing.name;
  const job_title = sanitizeStr(req.body?.job_title, 120);
  const phone = sanitizeStr(req.body?.phone, 80);
  const location = sanitizeStr(req.body?.location, 120);
  const bio = sanitizeStr(req.body?.bio, 1000);
  const facebook = sanitizeStr(req.body?.facebook, 500);
  const x_url = sanitizeStr(req.body?.x_url, 500);
  const linkedin = sanitizeStr(req.body?.linkedin, 500);
  const instagram = sanitizeStr(req.body?.instagram, 500);

  // Email is locked for safety (avoid breaking login). Admin can change by direct DB if needed.
  db.prepare(`
    UPDATE users
    SET name = ?, job_title = ?, phone = ?, location = ?, bio = ?,
        facebook = ?, x_url = ?, linkedin = ?, instagram = ?
    WHERE id = ?
  `).run(name, job_title, phone, location, bio, facebook, x_url, linkedin, instagram, targetId);

  const u = requireUser(targetId);
  return res.json({
    ok: true,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      referral_code: u.referral_code,
      avatar_url: u.avatar_url || '',
      job_title: u.job_title || '',
      phone: u.phone || '',
      location: u.location || '',
      bio: u.bio || '',
      facebook: u.facebook || '',
      x_url: u.x_url || '',
      linkedin: u.linkedin || '',
      instagram: u.instagram || ''
    }
  });
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(String(file.mimetype || ''));
    cb(ok ? null : new Error('Only image uploads allowed'), ok);
  }
});

app.post('/api/users/:id/avatar', (req, res) => {
  const targetId = Number(req.params.id);
  const adminId = Number(req.query?.admin_id || req.body?.admin_id || req.body?.adminId || 0);
  const acting = requireUser(adminId || targetId);
  if (!acting) return res.status(401).json({ error: 'Login qiling' });

  const isSelf = acting.id === targetId;
  const isAdmin = isAdminUser(acting);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Ruxsat yo‘q' });

  avatarUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload error' });
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'File required' });
    const url = `/uploads/${f.filename}`;
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(url, targetId);
    return res.json({ ok: true, url });
  });
});
// ── Section Visibility (on/off toggles) ──────────────────────────────────────
const SECTION_DEFAULTS = {
  hero: true, stats: true, features: true, faq: true,
  team: true, 'soft-board': true, 'hard-board': true,
  video: true, pricing: true, testimonials: true, footer: true
};

app.get('/api/site/sections', (req, res) => {
  const saved = getSiteContent('sections_visibility', {});
  res.json({ ...SECTION_DEFAULTS, ...saved });
});

app.put('/api/site/sections', (req, res) => {
  const adminId = Number(req.body?.admin_id || req.body?.adminId || 0);
  const a = requireAdminIfProd(adminId);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const incoming = req.body?.sections || {};
  const merged = { ...SECTION_DEFAULTS };
  for (const key of Object.keys(SECTION_DEFAULTS)) {
    if (typeof incoming[key] === 'boolean') merged[key] = incoming[key];
  }
  db.prepare("INSERT INTO site_content(key,json) VALUES('sections_visibility',?) ON CONFLICT(key) DO UPDATE SET json=excluded.json, updated_at=datetime('now')")
    .run(JSON.stringify(merged));
  res.json({ ok: true, sections: merged });
});
// ─────────────────────────────────────────────────────────────────────────────

// -------------------- 404 (Website) --------------------
// Final fallback: show a friendly 404 page for normal website navigation.
// Keep API responses as JSON.
app.use((req, res) => {
  try {
    // API -> JSON 404
    if (String(req.path || "").startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }

    // For normal website navigation (HTML requests)
    if (req.method === "GET" && req.accepts("html")) {
      const notFoundFile = path.join(__dirname, "public", "404.html");
      if (fs.existsSync(notFoundFile)) {
        return res.status(404).sendFile(notFoundFile);
      }
      return res.status(404).send("404 Not Found");
    }

    return res.status(404).send("Not found");
  } catch (e) {
    return res.status(404).send("Not found");
  }
});

// -------------------- Realtime (Admin Chat via Socket.IO) --------------------
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  socket.on("join-admin", (adminId) => {
    const id = Number(adminId);
    if (!id) return;
    socket.join(`admin:${id}`);
  });

  socket.on("send-message", (payload) => {
    try {
      const from = Number(payload?.from);
      const to = Number(payload?.to);
      const message = String(payload?.message || "").trim();
      if (!from || !to || !message) return;
      // Persist
      const a = requireAdmin(from);
      if (!a.ok) return;
      db.prepare("INSERT INTO admin_messages (from_admin_id, to_admin_id, message) VALUES (?, ?, ?)")
        .run(from, to, message);

      const out = { from, to, message, created_at: new Date().toISOString() };
      io.to(`admin:${to}`).emit("new-message", out);
      io.to(`admin:${from}`).emit("new-message", out);
    } catch (e) {
      // ignore
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`✅ Running: http://localhost:${PORT}`);
  console.log("📁 Uploads dir:", path.join(__dirname, "uploads"));
  console.log(`📧 Email mode: ${mailer.mode} (SMTP bo‘lmasa kod konsolda chiqadi)`);
});

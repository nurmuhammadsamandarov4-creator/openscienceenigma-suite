const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(path.join(__dirname, "referral.sqlite"));
const users = db.prepare("SELECT id, name, email, is_admin FROM users").all();
console.log("USERS:", users);

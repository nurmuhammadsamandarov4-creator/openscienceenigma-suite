# Buildify + Modern Login + Referral + Email Code + Dashboard

## Nima o'zgardi?
- Eski signup/login sahifa o'rniga modern login UI qo'shildi: `public/signup.html`
- Signup: emailga 6 xonali kod yuboradi -> kod to'g'ri bo'lsa user yaratiladi
- Login: email+password -> dashboardga o'tadi
- Referral link: `/r/<code>` (cookie saqlaydi)
- Dashboard: user nechta odam chaqirgani + Top 10
- Referral komissiya: taklif qilgan odam servis sotib olsa (xarajat qilsa) referrergayam avtomatik 5% yoziladi
- Wallet/Hisob-kitob: komissiyalar ledgerga tushadi va user balansida ko'rinadi
- Stripe Checkout: real payment bo'lganda purchase `paid` bo'ladi va webhook orqali komissiya avtomatik yoziladi

## Ishga tushirish
```bash
npm install
npm start
```

Ochish:
- Landing: http://localhost:3000/
- Login/Signup: http://localhost:3000/signup.html
- Dashboard: http://localhost:3000/dashboard.html

## SMTP (email yuborish)
Agar SMTP sozlanmasa, kod server konsolida (terminal) chiqadi.

Env:
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE ("true"/"false")
- SMTP_USER
- SMTP_PASS
- FROM_EMAIL (ixtiyoriy)

## Stripe (real payment)
Stripe ishlashi uchun env qo'ying:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

Ixtiyoriy (default dashboardga qaytaradi):
- STRIPE_SUCCESS_URL
- STRIPE_CANCEL_URL

Webhook URL:
- http://localhost:3000/api/stripe/webhook

## Admin
Default admin (ENV bilan o'zgartiring):
- ADMIN_EMAILS (comma-separated)
- ADMIN_PASSWORD

Admin pages:
- /public/admin.html (orders)
- /public/admin-referrals.html (referrals + wallet)

(function () {
  "use strict";

  // ============ Translations ============
  // Keys are used via:
  //   - data-i18n="key" (element text)
  //   - data-i18n-placeholder="key" (input/textarea placeholder)
  //   - window.t("key") (JavaScript)
  // Supports template placeholders: {count}, {amount}, {n}, {id}

  const DICT = {
    uz: {
      // Language selector
      lang: "Til",
      lang_en: "English",
      lang_ru: "Русский",
      lang_uz: "Oʻzbekcha",

      // Navbar (landing)
      nav_home: "Bosh sahifa",
      nav_features: "Xususiyatlar",
      nav_testimonials: "Sharhlar",
      nav_pricing: "Narxlar",
      nav_top10: "Top 10",
      nav_order: "Zakaz berish",

      // Landing page (hero + sections)
      hero_badge_users: "Dunyo bo‘ylab mamnun tadqiqotchilar va olimlar",
      hero_title: "Professional statistika va ma'lumotlar tahlili xizmatlari.",
      hero_desc: "Ma'lumotlarni qayta ishlash, statistik modellashtirish, gipotezalarni tekshirish va maqolalarni nashrga tayyorlashda ekspert yordami.",
      cta_get_started: "Boshlash",
      cta_watch_demo: "Demoni ko’rish",
      cta_button: "Zakaz berish",

      // Stats
      stat_fast_dev: "Statistik testlar aniqligi",
      stat_reduce_manual: "Maxfiylik va ma'lumotlar himoyasi",
      stat_uptime: "Tezroq nashr etish muddati",

      // Features
      features_title: "Asosiy funksiyalar",
      features_desc: "Ilmiy tadqiqotlar va ma'lumotlar bazasini qayta ishlashning har bir bosqichida professional yordam.",
      feature_builder_title: "Murakkab modellashtirish",
      feature_builder_desc: "Sizning sohangizga moslashtirilgan regressiya, ANOVA, aralash effektlar va mashinali o'rganish modellarini tatbiq etish.",
      feature_workflow_title: "Workflow Orkestratsiya",
      feature_workflow_desc: "Harakatlar, triggerlar va qarorlarni zanjirlab, ko‘p bosqichli workflow’larni ishonchli avtomatlashtiring.",
      feature_integrations_title: "Plug & Play Integratsiyalar",
      feature_integrations_desc: "API, database va uchinchi tomon servislarini built-in connector’lar bilan oson ulang.",
      feature_security_title: "Production darajadagi xavfsizlik",
      feature_security_desc: "Safeguard, rate limit va isolation yordamida ma'lumotlarni xavfsiz tahlil qiling va ularni himoya qiling.",
      feature_monitoring_title: "Real vaqt monitoring",
      feature_monitoring_desc: "Ishga tushirishlar, loglar va metrikalarni real vaqtda kuzating va ma'lumotlar xulqini tahlil qiling.",
      feature_scalable_title: "Kengayadigan infratuzilma",
      feature_scalable_desc: "Avtomatik optimizatsiya bilan har xil ma'lumotlar to'plamini samarali tahlil qiling.",

      // FAQ
      faq_title: "Savollaringiz bormi?",
      faq_desc: "Ma'lumotlar tahlili xizmatlarimiz, metodologiyamiz va jarayonlar haqida bilishingiz kerak bo'lgan barcha narsalar.",
      faq_q1: "Buildify nima?",
      faq_a1: "Buildify — jamoalarga ma'lumotlarni tahlil qilish va hisobot tayyorlashga yordam beradigan platforma. Unda ma'lumotlar tahlili, workflow orkestratsiyasi va production uchun tayyor vositalar bor.",
      faq_q2: "Buildify’dan foydalanish uchun statistik tahlil tajribasi kerakmi?",
      faq_a2: "Yo‘q. Buildify professional tahlilchilar va yangi boshlovchilar uchun ham qulay: shablonlar va tayyor jarayonlar mavjud.",
      faq_q3: "Mavjud tool’larim bilan integratsiya qila olamanmi?",
      faq_a3: "Ha. Buildify API, database va uchinchi tomon servislariga plug-and-play integratsiyalarni qo‘llab-quvvatlaydi.",
      faq_q4: "Production’da ishlatish mumkinmi?",
      faq_a4: "Albatta. Monitoring, xavfsizlik nazorati va scalable infratuzilma production sharoitida ishonchli ishlash uchun yaratilgan.",
      faq_q5: "Ma'lumotlar tahlilini moslashtirish yoki kengaytirish mumkinmi?",
      faq_a5: "Ha. Tahlil mantiqi, workflow va integratsiyalarni moslashtirasiz yoki o‘zingizning servis/API'ingiz bilan kengaytirasiz.",
      faq_cta_title: "Hali ham savol bormi? Jamoamiz boshlashga yordam beradi.",
      faq_cta_button: "Qo‘llab-quvvatlash",

      // Team
      team_title: "Jamoamiz",
      team_desc: "Ilmiy izlanishlar va ma'lumotlar tahlili kelajagini yaratayotgan tadqiqotchilar va data olimlari jamoasi.",
      board_soft_science: "Ijtimoiy fanlar kengashi",
      board_hard_science: "Tabiiy fanlar kengashi",

      // Testimonials
      testimonials_see_more: "Ko'proq ko'rish",

      // Footer
      footer_tagline: "Qo'shimcha yordam yoki savollar uchun biz bilan bog'laning",
      footer_social: "Ijtimoiy tarmoqlar",

      // Video
      video_title: "Video",
      video_desc: "Platforma qanday ishlashini qisqa videoda ko‘ring.",
      video_tip_1: "Maslahat: Videoni Admin → Website orqali istalgan payt almashtira olasiz.",
      video_tip_2: "YouTube link qo‘ying, video avtomatik joylanadi.",
      video_tip_3: "Eng yaxshi format: 16:9, HD sifat.",

      // Pricing
      pricing_title: "Oddiy va shaffof narxlar",
      pricing_desc: "Tadqiqot ehtiyojlaringizga mos rejani tanlang — tezkor metodologik sharhlardan tortib to to‘liq tahlillargacha.",
      plan_free: "Bepul",
      plan_starter: "Boshlang‘ich",
      plan_pro: "Pro",
      plan_enterprise: "Korporativ",
      plan_free_desc: "Buildify’ni sinab ko‘ring va birinchi tahlillaringizni yarating.",
      plan_starter_desc: "Avtomatlashtirishni boshlayotgan startaplar uchun.",
      plan_pro_desc: "Jiddiy AI-workflow’lar qurayotgan jamoalar uchun.",
      plan_enterprise_desc: "Katta jamoalar va enterprise uchun maxsus yechimlar.",
      pricing_contact_sales: "Sotuv bo‘limi",

      pricing_billing_monthly: "Oylik",
      pricing_billing_yearly: "Yillik",
      pricing_discount_badge: "20% CHEGIRMA",
      plan_free_price: "$1/oy",
      plan_free_cta: "Bepul boshlash",
      plan_free_f1: "3 tagacha ma'lumotlar tahlili",
      plan_free_f2: "Oddiy workflow builder",
      plan_free_f3: "Community qo‘llab-quvvatlashi",
      plan_free_f4: "Cheklangan runlar",
      plan_free_f5: "Boshlang‘ich integratsiyalar",
      plan_starter_price: "$19/oy",
      plan_starter_f1: "10 tagacha ma'lumotlar tahlili",
      plan_starter_f2: "Kengaytirilgan workflow’lar",
      plan_starter_f3: "API va webhook kirish",
      plan_starter_f4: "Execution loglar",
      plan_starter_f5: "Email support",
      plan_pro_price: "$49/oy",
      plan_pro_cta: "Pro’ga o‘tish",
      plan_pro_f1: "Cheksiz ma'lumotlar tahlili",
      plan_pro_f2: "Ustuvor bajarish",
      plan_pro_f3: "Real vaqt monitoring",
      plan_pro_f4: "Jamoaviy hamkorlik",
      plan_pro_f5: "Ustuvor support",
      plan_enterprise_price: "$149/oy",
      plan_enterprise_f1: "Maxsus ma'lumotlar limitlari",
      plan_enterprise_f2: "Alohida infratuzilma",
      plan_enterprise_f3: "Kuchli xavfsizlik boshqaruvi",
      plan_enterprise_f4: "SLA va compliance",
      plan_enterprise_f5: "Dedicated account manager",

      // Services (4 fixed services)
      services_title: "Servislar",
      services_desc: "Kerakli servisni tanlang va zakaz bering. To‘lovdan so‘ng referal komissiya avtomatik yoziladi.",
      services_note: "Agar siz referral link orqali kirgan bo‘lsangiz, to‘lovdan keyin 5% komissiya avtomatik hisoblanadi.",
      svc_100_title: "$100 servis",
      svc_100_desc: "Ushbu servis narxi $100.",
      svc_200_title: "$200 servis",
      svc_200_desc: "Ushbu servis narxi $200.",
      svc_300_title: "$300 servis",
      svc_300_desc: "Ushbu servis narxi $300.",
      svc_400_title: "$400 servis",
      svc_400_desc: "Ushbu servis narxi $400.",
      svc_order_btn: "Zakaz berish",
      service_choose: "Servis tanlang",
      selected_service: "Tanlangan servis",
      selected_service_tpl: "Tanlangan servis: {amount}",
      order_label: "zakaz",

      // Testimonials
      testimonials_title: "Foydalanuvchilarimiz nima deydi",
      testimonials_desc: "Bizning statistik yordamimiz bilan o'z ishlarini muvaffaqiyatli nashr etgan olimlar va ilmiy guruhlarning fikrlari.",
      nav_signup: "Roʻyxatdan oʻtish",
      nav_public_tasks: "Ommaviy zakazlar",
      nav_referrals: "Referral",

      cta_signup: "Roʻyxatdan oʻtish",
      cta_logout: "Chiqish",

      // Dashboard
      dashboard_title: "Kabinet",
      dashboard_desc: "Bu yerda referral linkingiz va nechta odam chaqirganingiz ko‘rinadi.",
      back_to_website: "Saytga qaytish",
      refresh: "Yangilash",
      logout: "Chiqish",
      loading: "Yuklanmoqda...",
      error_loading: "Yuklashda xatolik",
      name: "Ism",
      email: "Email",
      you_invited_tpl: "Siz taklif qilgansiz: {count} ta odam",
      your_referral_link: "Sizning referral havolangiz",
      referral_help_text: "Do‘stlaringiz shu havola bilan kirsa, ro‘yxatdan o‘tganidan keyin sizga taklif qilinganlar soni oshadi.",

      top10_title: "Top 10 Leaderboard",
      invited_title: "Siz taklif qilgan odamlar",
      invited_empty: "Hali hech kimni taklif qilmagansiz.",

      // Orders (dashboard)
      orders_title: "Zakazlar",
      create_task: "Zakaz berish",
      browse_tasks: "Zakazlar ro‘yxati",
      orders_desc: "Bu yerda zakazlaringiz statusi ko‘rinadi. Zakaz ichiga kirib javob/fayllarni olasiz.",
      orders_empty: "Hali zakaz yaratmagansiz.",
      th_order: "Zakaz",
      th_name: "Ism",
      th_email: "Email",
      th_status: "Status",
      th_replies: "Javoblar",
      th_open: "Ochish",

      // Task lists
      tasks_create: "+ Zakaz berish",
      tasks_dashboard: "Dashboard",

      // Create task
      create_task_title: "Zakaz yaratish",
      create_task_ph: "Zakazni batafsil yozing",
      attach_file: "Fayl biriktirish",
      submit_order: "Zakaz berish",
      back_dashboard: "← Dashboard",
      error_desc_required: "Iltimos, zakaz haqida batafsil yozing.",
      integrity_title: "Akademik halollik bayonoti: tahrirlash va ma'lumotlar tahlili xizmatlari",
      integrity_p1: "Akademik tahrirlash va ma'lumotlar tahlili xizmatlarimiz COPE (Nashriyot etikasi qo'mitasi) kabi organllarning qat'iy akademik halollik standartlariga rioya qilgan holda tadqiqotchilarga yuqori sifatli qo'lyozmalarni tayyorlashda yordam berish uchun mo'ljallangan.",
      integrity_p2: "Tahrirlash ishimiz jurnal talablariga muvofiq til, aniqlik, tuzilma va formatlashga qaratilgan. Biz qo'lyozmaning intellektual mazmunini, dalillarini yoki xulosalarini yaratmaymiz, qayta yozmaymiz yoki tubdan o'zgartirmaymiz. Ma'lumotlar tahlili bo'yicha yordamimiz faqat mijoz tomonidan taqdim etilgan ma'lumotlar va parametrlarga asoslanadi; biz ma'lumotlarni yoki natijalarni to'qib chiqarmaymiz, soxtalashtirarmaymiz yoki manipulyatsiya qilmaymiz.",
      integrity_p3: "Biz ghostwriting xizmatlari ko'rsatmaymiz. Biz boshqa shaxsning haqiqiy intellektual hissasisiz uning nomidan topshirish uchun mo'ljallangan qo'lyozmalar yoki bo'limlar tayyorlamaymiz va ishimiz uchun muallif sifatida tan olinishni qabul qilmaymiz yoki nazarda tutmaymiz. Mijozlar o'z maqsadli jurnali yoki muassasasi talab qilganidek, ko'rsatilgan tahririy yoki tahliliy yordam haqida ma'lumot berishlari tavsiya etiladi.",
      integrity_p4: "Bizning rolimiz faqat yordamchi: mualliflar o'z tadqiqotlari, g'oyalari va muallif huquqlari ustidan to'liq egalikni saqlab qoladi va bizning xizmatlarimiz hech qachon nomlangan mualliflarning ilmiy hissasining o'rnini bosa olmaydi.",
      error_file_required: "Iltimos, kamida bitta fayl yuklang!",
      choose_service: "Xizmat tanlang",
      tab_data_analysis: "Ma'lumotlar tahlili",
      tab_editing: "Tahrirlash",
      custom_amount_label: "Yoki maxsus miqdor kiriting",
      per_order: "/ zakaz",
      order_summary_label: "Zakaz xulosasi",
      review_pay: "Ko'rib chiqish va to'lash",
      referral_discount: "Referal chegirma",
      trust_secure: "Xavfsiz",
      trust_fast: "Tezkor yetkazish",
      trust_expert: "Ekspert jamoa",
      upload_click: "Yuklash uchun bosing",
      upload_drag: "yoki suring",
      upload_limit: "10 tagacha fayl · 500 MB har biri",
      clear_btn: "O'chirish",

      // Single order page
      order_title: "Zakaz",
      new_order: "+ Yangi zakaz",
      order_send_title: "Xabar / fayl yuborish",
      order_send_desc: "Admin uchun qo‘shimcha ma’lumot yoki 10 tagacha fayl yuborishingiz mumkin (har biri 500MB gacha).",
      order_msg_ph: "Xabar (ixtiyoriy)",
      order_send_btn: "Yuborish",
      order_admin_replies: "Admin javoblari",
      order_no_files: "Fayl yo‘q",
      order_desc_title: "Tavsif",
      order_your_files: "Siz yuborgan fayllar",
      order_no_replies: "Hozircha javob yo‘q.",
      order_closed_msg: "✅ Bu zakaz tugatilgan. Xabar/fayl yuborish o‘chirildi.",
      order_login_required: "Accountga kiring",
      order_sending: "Yuborilmoqda...",
      order_sent: "✅ Yuborildi",
      order_error_loading: "Zakazni yuklashda xatolik",

      // Admin orders
      admin_orders_title: "Admin — Kiruvchi zakazlar",
      admin_orders_desc: "Zakazni oching va foydalanuvchiga javob/fayl yuboring.",
      admin_no_orders: "Hali zakazlar yo‘q.",
      admin_order_title: "Admin — Zakaz",
      admin_back_inbox: "← Zakazlar ro‘yxati",
      admin_reply_title: "Javob yuborish (faqat admin)",
      admin_reply_ph: "Javob (ixtiyoriy)",
      admin_send_btn: "Yuborish",
      admin_paid_btn: "Paid",
      admin_done_btn: "Tugatish",
      admin_prev_replies: "Oldingi javoblar",
      admin_done_success: "✅ Tugatildi",
      admin_send_success: "✅ Yuborildi",
      admin_paid_success: "✅ Paid qilindi",
      admin_paid_success_tpl: "✅ Paid! Referral +{amount}",

      paid_label: "PAID",
      processing: "Bajarilmoqda...",

      // Admin referrals
      admin_ref_title: "Admin — Referral va hamyon",
      admin_ref_desc: "Referral daraxti, komissiyalar va balans.",
      admin_ref_back_orders: "← Zakazlar",
      admin_search_desc: "Userni qidiring (ism/email) → kim chaqirganini ko‘ring",
      admin_search_ph: "Ism yoki email kiriting...",
      admin_search_btn: "Qidirish",
      admin_clear_btn: "Tozalash",
      admin_loading: "Yuklanmoqda...",
      admin_no_users: "User yo‘q",
      admin_error: "Xatolik",
      admin_modal_close: "Yopish",
      admin_id: "ID",
      admin_user: "Foydalanuvchi",
      admin_registered: "Ro‘yxatdan o‘tgan",
      admin_invited_by: "Kim chaqirgan",
      admin_ref_date: "Referral sanasi",
      admin_ref_code: "Referral kod",
      admin_referrer: "Referrer",
      admin_invited: "Taklif qilingan",
      admin_total_commission: "Jami komissiya",
      admin_wallet_balance: "Hamyon balansi",
      admin_actions: "Amallar",
      admin_btn_invited: "Taklif qilinganlar",
      admin_btn_earnings: "Daromad",
      admin_btn_adjust: "O‘zgartirish",

      // Auth pages
      signup_title: "Kirish / Roʻyxatdan oʻtish",
      si_title: "Kirish",
      su_register_with_email: "Email bilan roʻyxatdan oʻtish",
      su_name_ph: "Ism",
      su_email_ph: "Email",
      su_password_ph: "Parol (kamida 6)",
      su_send_code: "Roʻyxatdan oʻtish",
      su_code_ph: "6 xonali kodni kiriting",
      su_verify_signup: "Tasdiqlash va roʻyxatdan oʻtish",
      si_use_email_pw: "Email va parol bilan kiring",
      si_password_ph: "Parol",
      si_forgot: "(demo) Parol esdan chiqdimi?",
      si_btn: "Kirish",

      toggle_welcome_back: "Qaytganingizdan xursandmiz!",
      toggle_login_desc: "Dashboard va referral’larni ko‘rish uchun kiring",
      toggle_btn_login: "Kirish",
      toggle_hello_friend: "Salom!",
      toggle_signup_desc: "Roʻyxatdan oʻting, referral link oling, doʻstlarni taklif qiling",
      toggle_btn_signup: "Roʻyxatdan oʻtish",

      // Referral earnings block
      ref_earnings_title: "Referral daromadlari",
      ref_earnings_desc: "Taklif qilgan odamingiz servis sotib olsa, siz avtomatik 5% komissiya olasiz.",
      ref_total: "Jami",
      ref_earned: "Ishlangan",
      ref_paid: "To‘langan",
      wallet: "Hamyon",
      ref_commission_history: "Komissiya tarixi",
      th_buyer: "Xaridor",
      th_service: "Servis",
      th_purchase: "To‘lov",
      th_rate: "Foiz",
      th_commission: "Komissiya",
      th_when: "Vaqt",
      th_comm_status: "Holat",
      ref_no_commissions: "Hali komissiya yo‘q.",

      // Stripe
      pay_with_stripe: "Stripe orqali to‘lash",
      redirecting_to_stripe: "Stripe’ga yo‘naltirilmoqda...",
      payment_success: "✅ To‘lov muvaffaqiyatli. Webhook komissiyani avtomatik yozadi.",
      payment_cancelled: "⚠️ To‘lov bekor qilindi.",
      updated: "✅ Yangilandi",
      processing: "Qayta ishlanmoqda...",
      purchase_ok_comm_tpl: "✅ Xarid OK. Komissiya: {amount}",
      purchase_ok_no_ref: "✅ Xarid OK. Bu userda referrer yo‘q.",

      // Status labels
      status_open: "Ochiq",
      status_sent: "Yuborildi",
      status_in_progress: "Javob bor",
      status_done: "Tugatildi",
      open_link: "Ochish",
    },

    ru: {
      lang: "Язык",
      lang_en: "English",
      lang_ru: "Русский",
      lang_uz: "Oʻzbekcha",

      nav_home: "Главная",
      nav_features: "Функции",
      nav_testimonials: "Отзывы",
      nav_pricing: "Цены",
      nav_top10: "Топ 10",
      nav_order: "Заказать",

      // Landing page (hero + sections)
      hero_badge_users: "Довольные исследователи и ученые по всему миру",
      hero_title: "Профессиональные услуги статистики и анализа данных.",
      hero_desc: "Экспертная помощь в обработке данных, статистическом моделировании, проверке гипотез и подготовке рукописей к публикации.",
      cta_get_started: "Начать",
      cta_watch_demo: "Смотреть демо",
      cta_button: "Оформить заказ",

      // Stats
      stat_fast_dev: "Точность статистических тестов",
      stat_reduce_manual: "Конфиденциальность и защита данных",
      stat_uptime: "Быстрая подготовка к публикации",

      // Features
      features_title: "Ключевые функции",
      features_desc: "Профессиональная поддержка на каждом этапе научных исследований и обработки баз данных.",
      feature_builder_title: "Сложное моделирование",
      feature_builder_desc: "Внедрение регрессионных моделей, ANOVA, смешанных эффектов и машинного обучения под вашу научную область.",
      feature_workflow_title: "Оркестрация процессов",
      feature_workflow_desc: "Связывайте действия, триггеры и решения, чтобы надёжно автоматизировать многошаговые сценарии.",
      feature_integrations_title: "Интеграции Plug & Play",
      feature_integrations_desc: "Подключайте API, базы данных и сторонние сервисы через встроенные коннекторы.",
      feature_security_title: "Безопасность уровня production",
      feature_security_desc: "Защита, лимиты и изоляция для безопасного проведения анализа и защиты данных.",
      feature_monitoring_title: "Мониторинг в реальном времени",
      feature_monitoring_desc: "Отслеживайте запуски, логи и метрики в реальном времени и анализируйте структуру данных.",
      feature_scalable_title: "Масштабируемая инфраструктура",
      feature_scalable_desc: "Эффективный анализ данных под нагрузкой благодаря оптимизации.",

      // FAQ
      faq_title: "Есть вопросы?",
      faq_desc: "Всё, что вам нужно знать о наших услугах анализа данных, методологии и процессе работы.",
      faq_q1: "Что такое Buildify?",
      faq_a1: "Buildify — платформа для команд, позволяющая быстро проводить анализ, визуализировать данные и готовить публикации. Включает инструменты для статистического анализа и работы с данными.",
      faq_q2: "Нужен ли опыт в области статистики, чтобы пользоваться Buildify?",
      faq_a2: "Нет. Buildify подходит и профессионалам, и новичкам: есть шаблоны и пошаговые сценарии для анализа.",
      faq_q3: "Можно ли интегрировать Buildify с моими инструментами?",
      faq_a3: "Да. Buildify поддерживает интеграции Plug & Play с API, базами данных и сторонними сервисами.",
      faq_q4: "Подходит ли для production?",
      faq_a4: "Да. Мониторинг, контроль безопасности и масштабируемая инфраструктура рассчитаны на надёжную работу в production.",
      faq_q5: "Можно ли настраивать или расширять анализ данных?",
      faq_a5: "Да. Вы можете настраивать логику анализа, сценарии и интеграции или расширять функциональность через свои сервисы и API.",
      faq_cta_title: "Остались вопросы? Наша команда поможет начать.",
      faq_cta_button: "Связаться с поддержкой",

      // Team
      team_title: "Наша команда",
      team_desc: "Команда исследователей и специалистов по данным, создающих будущее научного анализа и статистики.",
      board_soft_science: "Совет по социальным наукам",
      board_hard_science: "Совет по естественным наукам",
      testimonials_see_more: "Смотреть больше",
      footer_tagline: "Для получения дополнительной помощи или вопросов свяжитесь с нами",
      footer_social: "Социальные сети",

      // Видео
      video_title: "Видео",
      video_desc: "Посмотрите короткий обзор того, как работает платформа.",
      video_tip_1: "Совет: видео можно менять в Admin → Website.",
      video_tip_2: "Вставьте ссылку YouTube, и мы встроим видео автоматически.",
      video_tip_3: "Лучший формат: 16:9, HD качество.",

      // Pricing
      pricing_title: "Простые и прозрачные цены",
      pricing_desc: "Выберите план под ваши исследовательские нужды — от быстрой методологической оценки до глубокого статистического анализа.",
      plan_free: "Бесплатно",
      plan_starter: "Старт",
      plan_pro: "Pro",
      plan_enterprise: "Enterprise",
      plan_free_desc: "Попробуйте Buildify и начните первый анализ данных.",
      plan_starter_desc: "Идеально для стартапов, начинающих автоматизацию.",
      plan_pro_desc: "Для команд, которые строят серьёзные AI‑workflow.",
      plan_enterprise_desc: "Индивидуальные решения для крупных команд и компаний.",
      pricing_contact_sales: "Отдел продаж",

      pricing_billing_monthly: "Ежемесячно",
      pricing_billing_yearly: "Ежегодно",
      pricing_discount_badge: "СКИДКА 20%",
      plan_free_price: "$1/мес",
      plan_free_cta: "Начать бесплатно",
      plan_free_f1: "До 3 анализов данных",
      plan_free_f2: "Базовый конструктор workflow",
      plan_free_f3: "Поддержка сообщества",
      plan_free_f4: "Ограниченные запуски",
      plan_free_f5: "Базовые интеграции",
      plan_starter_price: "$19/мес",
      plan_starter_f1: "До 10 анализов данных",
      plan_starter_f2: "Продвинутые workflow",
      plan_starter_f3: "Доступ к API и webhook",
      plan_starter_f4: "Логи выполнения",
      plan_starter_f5: "Поддержка по email",
      plan_pro_price: "$49/мес",
      plan_pro_cta: "Перейти на Pro",
      plan_pro_f1: "Безлимитные анализы данных",
      plan_pro_f2: "Приоритетное выполнение",
      plan_pro_f3: "Мониторинг в реальном времени",
      plan_pro_f4: "Командная работа",
      plan_pro_f5: "Приоритетная поддержка",
      plan_enterprise_price: "$149/мес",
      plan_enterprise_f1: "Индивидуальные лимиты данных",
      plan_enterprise_f2: "Выделенная инфраструктура",
      plan_enterprise_f3: "Расширенные настройки безопасности",
      plan_enterprise_f4: "SLA и compliance",
      plan_enterprise_f5: "Персональный менеджер",

      // Services (4 fixed services)
      services_title: "Сервисы",
      services_desc: "Выберите нужный сервис и оформите заказ. После оплаты реферальная комиссия начисляется автоматически.",
      services_note: "Если вы вошли по реферальной ссылке, после оплаты 5% комиссия начисляется автоматически.",
      svc_100_title: "Сервис $100",
      svc_100_desc: "Стоимость сервиса $100.",
      svc_200_title: "Сервис $200",
      svc_200_desc: "Стоимость сервиса $200.",
      svc_300_title: "Сервис $300",
      svc_300_desc: "Стоимость сервиса $300.",
      svc_400_title: "Сервис $400",
      svc_400_desc: "Стоимость сервиса $400.",
      svc_order_btn: "Заказать",
      service_choose: "Выберите сервис",
      selected_service: "Выбранный сервис",
      selected_service_tpl: "Выбранный сервис: {amount}",
      order_label: "заказ",

      // Testimonials
      testimonials_title: "Отзывы пользователей",
      testimonials_desc: "Мнения ученых и исследовательских групп, успешно опубликовавших свои работы при нашей статистической поддержке.",
      nav_signup: "Регистрация",
      nav_public_tasks: "Публичные заказы",
      nav_referrals: "Рефералы",

      cta_signup: "Регистрация",
      cta_logout: "Выйти",

      dashboard_title: "Кабинет",
      dashboard_desc: "Здесь видны ваша реферальная ссылка и сколько людей вы пригласили.",
      back_to_website: "Назад на сайт",
      refresh: "Обновить",
      logout: "Выйти",
      loading: "Загрузка...",
      error_loading: "Ошибка загрузки",
      name: "Имя",
      email: "Email",
      you_invited_tpl: "Вы пригласили: {count} пользователей",
      your_referral_link: "Ваша реферальная ссылка",
      referral_help_text: "Если ваши друзья зарегистрируются по этой ссылке, они будут добавлены в ваш список приглашённых.",

      top10_title: "Топ 10",
      invited_title: "Приглашённые вами",
      invited_empty: "Вы ещё никого не пригласили.",

      orders_title: "Заказы",
      create_task: "Сделать заказ",
      browse_tasks: "Список заказов",
      orders_desc: "Здесь виден статус ваших заказов. Откройте заказ, чтобы получить ответы/файлы.",
      orders_empty: "Пока заказов нет.",
      th_order: "Заказ",
      th_name: "Имя",
      th_email: "Email",
      th_status: "Статус",
      th_replies: "Ответы",
      th_open: "Открыть",

      tasks_create: "+ Сделать заказ",
      tasks_dashboard: "Dashboard",

      create_task_title: "Создать заказ",
      create_task_ph: "Подробно опишите задание",
      attach_file: "Прикрепить файл",
      submit_order: "Отправить заказ",
      back_dashboard: "← Dashboard",
      error_desc_required: "Пожалуйста, опишите задание подробно.",
      integrity_title: "Заявление об академической честности в услугах редактирования и анализа данных",
      integrity_p1: "Наши услуги академического редактирования и анализа данных предназначены для поддержки исследователей в подготовке высококачественных рукописей при соблюдении строгих стандартов академической честности в соответствии с руководящими принципами таких органов, как COPE (Комитет по этике публикаций).",
      integrity_p2: "Наша редакторская работа сосредоточена на языке, ясности, структуре и форматировании в соответствии с требованиями журнала. Мы не создаём, не переписываем и не меняем существенно интеллектуальное содержание, аргументы или выводы рукописи. Наша поддержка в области анализа данных основана исключительно на данных и параметрах, предоставленных клиентом; мы не фабрикуем, не фальсифицируем и не манипулируем данными или результатами.",
      integrity_p3: "Мы не предлагаем услуги написания текстов на заказ. Мы не будем создавать рукописи или разделы, предназначенные для подачи под именем другого человека без его подлинного интеллектуального вклада, и мы не принимаем и не подразумеваем авторство нашей работы. Клиентам рекомендуется раскрывать любую полученную редакционную или аналитическую помощь, как того требует их целевой журнал или учреждение.",
      integrity_p4: "Наша роль строго вспомогательная: авторы сохраняют полное право собственности на свои исследования, идеи и авторство, и наши услуги никогда не заменяют научный вклад названных авторов.",
      error_file_required: "Пожалуйста, прикрепите хотя бы один файл!",
      choose_service: "Выберите услугу",
      tab_data_analysis: "Анализ данных",
      tab_editing: "Редактирование",
      custom_amount_label: "Или введите произвольную сумму",
      per_order: "/ заказ",
      order_summary_label: "Сводка заказа",
      review_pay: "Проверить и оплатить",
      referral_discount: "Реферальная скидка",
      trust_secure: "Безопасно",
      trust_fast: "Быстрая доставка",
      trust_expert: "Команда экспертов",
      upload_click: "Нажмите для загрузки",
      upload_drag: "или перетащите",
      upload_limit: "До 10 файлов · 500 МБ каждый",
      clear_btn: "Очистить",

      order_title: "Заказ",
      new_order: "+ Новый заказ",
      order_send_title: "Отправить сообщение / файлы",
      order_send_desc: "Можно отправить доп. информацию для администратора или до 10 файлов (каждый до 500MB).",
      order_msg_ph: "Сообщение (необязательно)",
      order_send_btn: "Отправить",
      order_admin_replies: "Ответы администратора",
      order_no_files: "Нет файлов",
      order_desc_title: "Описание",
      order_your_files: "Ваши файлы",
      order_no_replies: "Пока нет ответов.",
      order_closed_msg: "✅ Этот заказ завершён. Отправка сообщений/файлов отключена.",
      order_login_required: "Войдите в аккаунт",
      order_sending: "Отправка...",
      order_sent: "✅ Отправлено",
      order_error_loading: "Ошибка загрузки заказа",

      admin_orders_title: "Admin — Входящие заказы",
      admin_orders_desc: "Откройте заказ и отправьте пользователю ответ/файлы.",
      admin_no_orders: "Пока заказов нет.",
      admin_order_title: "Admin — Заказ",
      admin_back_inbox: "← Входящие заказы",
      admin_reply_title: "Отправить ответ (только admin)",
      admin_reply_ph: "Ответ (необязательно)",
      admin_send_btn: "Отправить",
      admin_paid_btn: "Paid",
      admin_done_btn: "Завершить",
      admin_prev_replies: "Предыдущие ответы",
      admin_done_success: "✅ Завершено",
      admin_send_success: "✅ Отправлено",
      admin_paid_success: "✅ Paid отмечено",
      admin_paid_success_tpl: "✅ Paid! Referral +{amount}",

      paid_label: "PAID",
      processing: "Обработка...",

      admin_ref_title: "Admin — Рефералы и кошелёк",
      admin_ref_desc: "Дерево рефералов, комиссии и баланс.",
      admin_ref_back_orders: "← Заказы",
      admin_search_desc: "Поиск пользователя (имя/email) → кто его пригласил",
      admin_search_ph: "Введите имя или email...",
      admin_search_btn: "Поиск",
      admin_clear_btn: "Очистить",
      admin_loading: "Загрузка...",
      admin_no_users: "Нет пользователей",
      admin_error: "Ошибка",
      admin_modal_close: "Закрыть",
      admin_id: "ID",
      admin_user: "Пользователь",
      admin_registered: "Зарегистрирован",
      admin_invited_by: "Кто пригласил",
      admin_ref_date: "Дата реферала",
      admin_ref_code: "Реф. код",
      admin_referrer: "Реферер",
      admin_invited: "Приглашено",
      admin_total_commission: "Всего комиссий",
      admin_wallet_balance: "Баланс кошелька",
      admin_actions: "Действия",
      admin_btn_invited: "Приглашённые",
      admin_btn_earnings: "Доход",
      admin_btn_adjust: "Изменить",

      signup_title: "Вход / Регистрация",
      su_register_with_email: "Регистрация по email",
      su_name_ph: "Имя",
      su_email_ph: "Email",
      su_password_ph: "Пароль (мин. 6)",
      su_send_code: "Зарегистрироваться",
      su_code_ph: "Введите 6-значный код",
      su_verify_signup: "Подтвердить и зарегистрироваться",
      si_use_email_pw: "Войти по email и паролю",
      si_password_ph: "Пароль",
      si_forgot: "(demo) Забыли пароль?",
      si_btn: "Войти",

      toggle_welcome_back: "С возвращением!",
      toggle_login_desc: "Войдите, чтобы увидеть dashboard и рефералы",
      toggle_btn_login: "Войти",
      toggle_hello_friend: "Привет!",
      toggle_signup_desc: "Зарегистрируйтесь, получите реферальную ссылку и приглашайте друзей",
      toggle_btn_signup: "Регистрация",

      ref_earnings_title: "Доход по рефералам",
      ref_earnings_desc: "Если ваш приглашённый покупает сервис, вы автоматически получаете 5% комиссию.",
      ref_total: "Всего",
      ref_earned: "Начислено",
      ref_paid: "Выплачено",
      wallet: "Кошелёк",
      ref_commission_history: "История комиссий",
      th_buyer: "Покупатель",
      th_service: "Сервис",
      th_purchase: "Оплата",
      th_rate: "Процент",
      th_commission: "Комиссия",
      th_when: "Время",
      th_comm_status: "Статус",
      ref_no_commissions: "Пока комиссий нет.",

      pay_with_stripe: "Оплатить через Stripe",
      redirecting_to_stripe: "Переадресация на Stripe...",
      payment_success: "✅ Оплата успешна. Webhook автоматически начислит комиссию.",
      payment_cancelled: "⚠️ Оплата отменена.",
      updated: "✅ Обновлено",
      processing: "Обработка...",
      purchase_ok_comm_tpl: "✅ Покупка OK. Комиссия: {amount}",
      purchase_ok_no_ref: "✅ Покупка OK. У этого пользователя нет реферера.",

      status_open: "Открыто",
      status_sent: "Отправлено",
      status_in_progress: "Есть ответ",
      status_done: "Завершено",
      open_link: "Открыть",
    },

    en: {
      lang: "Language",
      lang_en: "English",
      lang_ru: "Русский",
      lang_uz: "Oʻzbekcha",

      nav_home: "Home",
      nav_features: "Features",
      nav_testimonials: "Testimonials",
      nav_pricing: "Pricing",
      nav_top10: "Top 10",
      nav_order: "Order",

      // Landing page (hero + sections)
      hero_badge_users: "Happy researchers & academics worldwide",
      hero_title: "Expert Statistical and Data Analysis Services.",
      hero_desc: "Get professional help with data processing, statistical modeling, hypothesis testing, and manuscript preparation.",
      cta_get_started: "Get Started",
      cta_watch_demo: "Watch Demo",
      cta_button: "Place an Order",

      // Stats
      stat_fast_dev: "Accuracy in statistical tests",
      stat_reduce_manual: "Confidentiality & data protection",
      stat_uptime: "Faster submission turnaround",

      // Features
      features_title: "Core features",
      features_desc: "Professional support at every stage of scientific research and database processing.",
      feature_builder_title: "Advanced Modeling",
      feature_builder_desc: "Implementation of regression, ANOVA, mixed-effects, and machine learning models tailored to your field.",
      feature_workflow_title: "Workflow Orchestration",
      feature_workflow_desc: "Chain actions, triggers and decisions to automate multi-step workflows reliably.",
      feature_integrations_title: "Plug & Play Integrations",
      feature_integrations_desc: "Connect APIs, databases and third-party tools seamlessly with built-in connectors.",
      feature_security_title: "Production-Ready Security",
      feature_security_desc: "Built-in safeguards, rate limits and isolation to run analyses safely and protect your data.",
      feature_monitoring_title: "Real-Time Monitoring",
      feature_monitoring_desc: "Track runs, logs and performance metrics in real time and get insights into your data's patterns.",
      feature_scalable_title: "Scalable Infrastructure",
      feature_scalable_desc: "Run analyses efficiently across datasets with automatic optimization.",

      // FAQ
      faq_title: "Got questions?",
      faq_desc: "Everything you need to know about our data analysis services, methodology, and submission process.",
      faq_q1: "What is Buildify?",
      faq_a1: "Buildify is a platform designed to help teams analyze data efficiently. It provides tools for statistical review, workflow orchestration and production-ready data execution.",
      faq_q2: "Do I need prior statistical or data analysis experience to use Buildify?",
      faq_a2: "No. Buildify is designed for both experts and beginners, offering simple templates and guided flows to complete statistical analyses.",
      faq_q3: "Can I integrate Buildify with my existing tools?",
      faq_a3: "Yes. Buildify supports plug-and-play integrations with APIs, databases and third-party services to fit seamlessly into your existing stack.",
      faq_q4: "Is Buildify suitable for production use?",
      faq_a4: "Absolutely. Buildify includes monitoring, security controls and scalable infrastructure designed for reliable performance in real-world production environments.",
      faq_q5: "Can I customize or extend the data analysis?",
      faq_a5: "Yes. You can customize analysis logic, workflows and integrations, or extend functionality using your own services and APIs.",
      faq_cta_title: "Still have questions? Our team help you get started.",
      faq_cta_button: "Contact support",

      // Team
      team_title: "Meet Our Team",
      team_desc: "A passionate team of researchers, data scientists, and analysts shaping the future of scientific and statistical analysis.",
      board_soft_science: "Board of Soft Science",
      board_hard_science: "Board of Hard Science",
      testimonials_see_more: "See more",
      footer_tagline: "For further assistance or additional inquiries, feel free to contact us",
      footer_social: "Social",

      // Video
      video_title: "Video",
      video_desc: "Watch a quick overview of how the platform works.",
      video_tip_1: "Tip: You can update this video anytime from Admin → Website.",
      video_tip_2: "Use a YouTube link, and we will embed it automatically.",
      video_tip_3: "Best format: 16:9, HD quality.",

      // Pricing
      pricing_title: "Simple, transparent pricing",
      pricing_desc: "Choose a plan that fits your research needs – scale from quick methodologies to comprehensive statistical reviews.",
      plan_free: "Free",
      plan_starter: "Starter",
      plan_pro: "Pro",
      plan_enterprise: "Enterprise",
      plan_free_desc: "Explore Buildify and start your first data analysis.",
      plan_starter_desc: "Perfect for startups getting started with automation.",
      plan_pro_desc: "For teams building serious AI-powered workflows.",
      plan_enterprise_desc: "Custom solutions for large teams and enterprises.",
      pricing_contact_sales: "Contact Sales",

      pricing_billing_monthly: "Monthly",
      pricing_billing_yearly: "Yearly",
      pricing_discount_badge: "20% OFF",
      plan_free_price: "$1/mo",
      plan_free_cta: "Start Free",
      plan_free_f1: "Up to 3 data reviews",
      plan_free_f2: "Basic workflow builder",
      plan_free_f3: "Community support",
      plan_free_f4: "Limited execution runs",
      plan_free_f5: "Starter integrations",
      plan_starter_price: "$19/mo",
      plan_starter_f1: "Up to 10 data reviews",
      plan_starter_f2: "Advanced workflows",
      plan_starter_f3: "API & webhook access",
      plan_starter_f4: "Execution logs",
      plan_starter_f5: "Email support",
      plan_pro_price: "$49/mo",
      plan_pro_cta: "Upgrade to Pro",
      plan_pro_f1: "Unlimited data reviews",
      plan_pro_f2: "Priority execution",
      plan_pro_f3: "Real-time monitoring",
      plan_pro_f4: "Team collaboration",
      plan_pro_f5: "Priority support",
      plan_enterprise_price: "$149/mo",
      plan_enterprise_f1: "Custom data limits",
      plan_enterprise_f2: "Dedicated infrastructure",
      plan_enterprise_f3: "Advanced security controls",
      plan_enterprise_f4: "SLA & compliance support",
      plan_enterprise_f5: "Dedicated account manager",

      // Services (4 fixed services)
      services_title: "Services",
      services_desc: "Choose a service and place an order. After payment, referral commission is credited automatically.",
      services_note: "If you joined via a referral link, a 5% commission is credited automatically after payment.",
      svc_100_title: "$100 Service",
      svc_100_desc: "This service costs $100.",
      svc_200_title: "$200 Service",
      svc_200_desc: "This service costs $200.",
      svc_300_title: "$300 Service",
      svc_300_desc: "This service costs $300.",
      svc_400_title: "$400 Service",
      svc_400_desc: "This service costs $400.",
      svc_order_btn: "Order",
      service_choose: "Choose a service",
      selected_service: "Selected service",
      selected_service_tpl: "Selected service: {amount}",
      order_label: "order",

      // Testimonials
      testimonials_title: "What our users say",
      testimonials_desc: "Hear from academics and research groups who successfully published their work with our statistical support.",
      nav_signup: "Sign up",
      nav_public_tasks: "Public orders",
      nav_referrals: "Referrals",

      cta_signup: "Sign up",
      cta_logout: "Log out",

      dashboard_title: "Dashboard",
      dashboard_desc: "Here you can see your referral link and how many people you invited.",
      back_to_website: "Back to website",
      refresh: "Refresh",
      logout: "Log out",
      loading: "Loading...",
      error_loading: "Error loading",
      name: "Name",
      email: "Email",
      you_invited_tpl: "You invited: {count} users",
      your_referral_link: "Your Referral Link",
      referral_help_text: "If your friends register using this link, they will be added to your invited list.",

      top10_title: "Top 10 Leaderboard",
      invited_title: "People you invited",
      invited_empty: "You haven't invited anyone yet.",

      orders_title: "Orders",
      create_task: "Create order",
      browse_tasks: "Browse orders",
      orders_desc: "Track your order status here. Open an order to view replies/files.",
      orders_empty: "No orders yet.",
      th_order: "Order",
      th_name: "Name",
      th_email: "Email",
      th_status: "Status",
      th_replies: "Replies",
      th_open: "Open",

      tasks_create: "+ Create order",
      tasks_dashboard: "Dashboard",

      create_task_title: "Create order",
      create_task_ph: "Describe your request in detail",
      attach_file: "Attach file",
      submit_order: "Submit order",
      back_dashboard: "← Dashboard",
      error_desc_required: "Please describe the task details.",
      integrity_title: "Statement on Academic Integrity in Editing and Data Analytics Services",
      integrity_p1: "Our academic editing and data analytics services are designed to support researchers in preparing high-quality manuscripts while upholding rigorous standards of academic integrity, consistent with guidelines from bodies such as COPE (Committee on Publication Ethics).",
      integrity_p2: "Our editing work focuses on language, clarity, structure, and formatting in line with journal requirements. We do not create, rewrite, or substantively alter a manuscript's intellectual content, arguments, or conclusions. Our data analytics support is based entirely on data and parameters provided by the client; we do not fabricate, falsify, or manipulate data or results.",
      integrity_p3: "We do not offer ghostwriting services. We will not produce manuscripts or sections intended for submission under another person's name without that person's genuine intellectual contribution, and we do not accept or imply authorship credit for our work. Clients are encouraged to disclose any editorial or analytical assistance received, as required by their target journal or institution.",
      integrity_p4: "Our role is strictly supportive: authors retain full ownership of their research, ideas, and authorship, and our services are never a substitute for the scholarly contribution of the named authors.",
      error_file_required: "Please attach at least one file!",
      choose_service: "Choose a service",
      tab_data_analysis: "Data Analysis",
      tab_editing: "Editing",
      custom_amount_label: "Or enter a custom amount",
      per_order: "/ order",
      order_summary_label: "Order Summary",
      review_pay: "Review & Pay",
      referral_discount: "Referral discount",
      trust_secure: "Secure",
      trust_fast: "Fast delivery",
      trust_expert: "Expert team",
      upload_click: "Click to upload",
      upload_drag: "or drag & drop",
      upload_limit: "Up to 10 files · 500 MB each",
      clear_btn: "Clear",

      order_title: "Order",
      new_order: "+ New order",
      order_send_title: "Send message / files",
      order_send_desc: "You can send extra info for the admin or up to 10 files (each up to 500MB).",
      order_msg_ph: "Message (optional)",
      order_send_btn: "Send",
      order_admin_replies: "Admin replies",
      order_no_files: "No files",
      order_desc_title: "Description",
      order_your_files: "Your files",
      order_no_replies: "No replies yet.",
      order_closed_msg: "✅ This order is completed. Sending messages/files is disabled.",
      order_login_required: "Please log in",
      order_sending: "Sending...",
      order_sent: "✅ Sent",
      order_error_loading: "Error loading order",

      admin_orders_title: "Admin — Incoming orders",
      admin_orders_desc: "Open an order and send a reply/files to the user.",
      admin_no_orders: "No orders yet.",
      admin_order_title: "Admin — Order",
      admin_back_inbox: "← Orders",
      admin_reply_title: "Send a reply (admin only)",
      admin_reply_ph: "Reply (optional)",
      admin_send_btn: "Send",
      admin_paid_btn: "Paid",
      admin_done_btn: "Complete",
      admin_prev_replies: "Previous replies",
      admin_done_success: "✅ Completed",
      admin_send_success: "✅ Sent",

      admin_paid_success: "✅ Marked as paid",
      admin_paid_success_tpl: "✅ Paid! Referral +{amount}",

      paid_label: "PAID",
      processing: "Processing...",

      admin_ref_title: "Admin — Referrals & wallet",
      admin_ref_desc: "Referral tree, commissions and wallet balance.",
      admin_ref_back_orders: "← Orders",
      admin_search_desc: "Search user (name/email) → see who invited them",
      admin_search_ph: "Type name or email...",
      admin_search_btn: "Search",
      admin_clear_btn: "Clear",
      admin_loading: "Loading...",
      admin_no_users: "No users",
      admin_error: "Error",
      admin_modal_close: "Close",
      admin_id: "ID",
      admin_user: "User",
      admin_registered: "Registered",
      admin_invited_by: "Invited by",
      admin_ref_date: "Referral date",
      admin_ref_code: "Ref code",
      admin_referrer: "Referrer",
      admin_invited: "Invited",
      admin_total_commission: "Total commission",
      admin_wallet_balance: "Wallet balance",
      admin_actions: "Actions",
      admin_btn_invited: "Invited",
      admin_btn_earnings: "Earnings",
      admin_btn_adjust: "Adjust",

      signup_title: "Sign in / Sign up",
      su_register_with_email: "Sign up with email",
      su_name_ph: "Name",
      su_email_ph: "Email",
      su_password_ph: "Password (min 6)",
      su_send_code: "Sign Up",
      su_code_ph: "Enter 6-digit code",
      su_verify_signup: "Verify & sign up",
      si_use_email_pw: "Sign in with email and password",
      si_password_ph: "Password",
      si_forgot: "(demo) Forgot password?",
      si_btn: "Sign in",

      toggle_welcome_back: "Welcome back!",
      toggle_login_desc: "Sign in to view your dashboard and referrals",
      toggle_btn_login: "Sign in",
      toggle_hello_friend: "Hello!",
      toggle_signup_desc: "Create an account, get a referral link and invite friends",
      toggle_btn_signup: "Sign up",

      ref_earnings_title: "Referral earnings",
      ref_earnings_desc: "If your invitee buys a service, you automatically earn 5% commission.",
      ref_total: "Total",
      ref_earned: "Earned",
      ref_paid: "Paid",
      wallet: "Wallet",
      ref_commission_history: "Commission history",
      th_buyer: "Buyer",
      th_service: "Service",
      th_purchase: "Purchase",
      th_rate: "Rate",
      th_commission: "Commission",
      th_when: "Time",
      th_comm_status: "Status",
      ref_no_commissions: "No commissions yet.",

      pay_with_stripe: "Pay with Stripe",
      redirecting_to_stripe: "Redirecting to Stripe...",
      payment_success: "✅ Payment successful. Webhook will credit commission automatically.",
      payment_cancelled: "⚠️ Payment cancelled.",
      updated: "✅ Updated",
      processing: "Processing...",
      purchase_ok_comm_tpl: "✅ Purchase OK. Commission: {amount}",
      purchase_ok_no_ref: "✅ Purchase OK. This user has no referrer.",

      status_open: "Open",
      status_sent: "Sent",
      status_in_progress: "In progress",
      status_done: "Completed",
      open_link: "Open",
    },
  };

  // ============ Core i18n functions ============

  const STORAGE_KEY = "ose_lang";
  const FALLBACK = "uz";

  function getLang() {
    const saved = (localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
    if (saved === "ru" || saved === "en" || saved === "uz") return saved;

    // Try browser language
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("ru")) return "ru";
    if (nav.startsWith("en")) return "en";
    return FALLBACK;
  }

  function setLang(lang) {
    const l = (lang || "").toLowerCase();
    if (!(l in DICT)) return;
    localStorage.setItem(STORAGE_KEY, l);
    applyLang();
    try { window.dispatchEvent(new CustomEvent('ose:lang', { detail: { lang: l } })); } catch (e) {}
  }

  function tmpl(str, params) {
    if (!str || !params) return str;
    return String(str).replace(/\{(\w+)\}/g, (_, k) => {
      return params[k] !== undefined && params[k] !== null ? String(params[k]) : "";
    });
  }

  function t(key, params) {
    const lang = getLang();
    const pack = DICT[lang] || DICT[FALLBACK];
    const base = pack[key] ?? (DICT[FALLBACK] ? DICT[FALLBACK][key] : undefined) ?? key;
    return tmpl(base, params);
  }

  function applyLang(root) {
    const scope = root || document;
    // Text nodes
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });

    // Placeholders
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key));
    });

    // Optional: title attributes
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (!key) return;
      el.setAttribute("title", t(key));
    });
  }

  // expose
  window.t = t;
  window.__i18n = { getLang, setLang, applyLang, DICT };

  async function loadOverrides() {
    try {
      const res = await fetch('/api/site/i18n-overrides', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (json && json.ok && json.i18n) {
        for (const lang of ['uz', 'ru', 'en']) {
          if (json.i18n[lang] && typeof json.i18n[lang] === 'object') {
            DICT[lang] = Object.assign({}, DICT[lang] || {}, json.i18n[lang]);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Auto apply on load (after overrides)
  async function init() {
    await loadOverrides();
    applyLang();
    try { window.dispatchEvent(new CustomEvent('ose:lang', { detail: { lang: getLang() } })); } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})();

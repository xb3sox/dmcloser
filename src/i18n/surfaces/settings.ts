/**
 * Settings surface: business context, reply tone, auto-reply and the
 * messaging-account setup explainer.
 * Every entry carries both locales; a missing translation is a compile error.
 */
export const settingsStrings = {
  "settings.page.eyebrow": {
    en: "Make it yours",
    ar: "اجعله على مقاسك",
  },
  "settings.page.title": {
    en: "Settings",
    ar: "الإعدادات",
  },
  "settings.page.subtitle": {
    en: "Your business. Your voice. Your control.",
    ar: "مشروعك. صوتك. تحكمك.",
  },

  "settings.business.title": {
    en: "Business information",
    ar: "معلومات المشروع",
  },
  "settings.business.description": {
    en: "The context behind a more helpful reply.",
    ar: "السياق الذي يجعل الرد أكثر فائدة.",
  },
  "settings.business.name": {
    en: "Business name",
    ar: "اسم المشروع",
  },
  "settings.business.products": {
    en: "What do you sell?",
    ar: "ما الذي تبيعه؟",
  },
  "settings.business.context": {
    en: "Business context",
    ar: "سياق المشروع",
  },
  "settings.business.help": {
    en: "Add approved facts such as products, pricing, and delivery policies.",
    ar: "أضف حقائق معتمدة مثل المنتجات والأسعار وسياسات التسليم.",
  },
  "settings.business.helpDemo": {
    en: "Demo suggestions are examples, not live AI.",
    ar: "اقتراحات العرض التجريبي أمثلة وليست ذكاءً اصطناعياً حياً.",
  },
  "settings.business.helpLive": {
    en: "Uncertain questions stay with you; only approved facts are used automatically.",
    ar: "تبقى الأسئلة غير المؤكدة معك؛ ولا تُستخدم تلقائياً سوى الحقائق المعتمدة.",
  },
  "settings.business.save": {
    en: "Save changes",
    ar: "حفظ التغييرات",
  },
  "settings.business.savedLive": {
    en: "Changes saved to your workspace.",
    ar: "حُفظت التغييرات في مساحة عملك.",
  },
  "settings.business.savedDemo": {
    en: "Changes saved in this browser.",
    ar: "حُفظت التغييرات في هذا المتصفح.",
  },
  "settings.business.unsaved": {
    en: "You have unsaved changes.",
    ar: "لديك تغييرات غير محفوظة.",
  },
  "settings.business.storedLive": {
    en: "Saved to your workspace.",
    ar: "محفوظة في مساحة عملك.",
  },
  "settings.business.storedDemo": {
    en: "Saved in this browser.",
    ar: "محفوظة في هذا المتصفح.",
  },

  "settings.tone.title": {
    en: "Reply tone",
    ar: "نبرة الرد",
  },
  "settings.tone.description": {
    en: "Sound like yourself, without writing every word.",
    ar: "تحدّث بصوتك دون كتابة كل كلمة.",
  },
  "settings.tone.legend": {
    en: "Choose your reply tone",
    ar: "اختر نبرة ردك",
  },
  "settings.tone.friendly.label": {
    en: "Friendly",
    ar: "ودود",
  },
  "settings.tone.friendly.description": {
    en: "Warm, conversational, and approachable.",
    ar: "دافئ وحواري ومقارب.",
  },
  "settings.tone.premium.label": {
    en: "Premium",
    ar: "راقٍ",
  },
  "settings.tone.premium.description": {
    en: "Thoughtful, polished, and professional.",
    ar: "متأنٍ ومتقن واحترافي.",
  },
  "settings.tone.aggressive.label": {
    en: "Sales-focused",
    ar: "تركيز على البيع",
  },
  "settings.tone.aggressive.description": {
    en: "Direct, clear, and focused on the next step.",
    ar: "مباشر وواضح ومركّز على الخطوة التالية.",
  },
  "settings.tone.help": {
    en: "Tone changes are saved automatically and applied to suggested replies.",
    ar: "تُحفظ تغييرات النبرة تلقائياً وتُطبَّق على الردود المقترحة.",
  },

  "settings.autoReply.title": {
    en: "Auto-reply",
    ar: "الرد التلقائي",
  },
  "settings.autoReply.allowDemo": {
    en: "Allow high-confidence demo replies for contacts with auto-send enabled.",
    ar: "السماح بردود عالية الثقة في العرض التجريبي لجهات الاتصال التي فعّلت الإرسال التلقائي.",
  },
  "settings.autoReply.allow": {
    en: "Allow high-confidence replies for contacts with auto-send enabled.",
    ar: "السماح بردود عالية الثقة لجهات الاتصال التي فعّلت الإرسال التلقائي.",
  },
  "settings.autoReply.switchLabel": {
    en: "Workspace auto-reply",
    ar: "الرد التلقائي لمساحة العمل",
  },
  "settings.autoReply.enabled": {
    en: "Enabled. Turn on auto-send in a conversation to try it.",
    ar: "مُفعّل. فعّل الإرسال التلقائي في محادثة لتجربته.",
  },
  "settings.autoReply.off": {
    en: "Off. Suggested replies always wait for your approval.",
    ar: "متوقف. وتنتظر الردود المقترحة موافقتك دائماً.",
  },
  "settings.autoReply.demoNote": {
    en: "No real messages are sent.",
    ar: "لا يتم إرسال أي رسالة حقيقية.",
  },
  "settings.autoReply.liveNote": {
    en: "Live replies require both switches, safe grounded content, and an open provider window.",
    ar: "تتطلب الردود الحية تشغيل المفتاحين معاً، ومحتوى آمناً مسنوداً بالحقائق، ونافذة مزود مفتوحة.",
  },
  "settings.autoReply.minimumConfidence": {
    en: "Minimum confidence",
    ar: "أدنى درجة ثقة",
  },
  "settings.autoReply.moreAutomation": {
    en: "More automation",
    ar: "أتمتة أكثر",
  },
  "settings.autoReply.moreReview": {
    en: "More review",
    ar: "مراجعة أكثر",
  },
  "settings.analytics.title": {
    en: "Product analytics",
    ar: "تحليلات المنتج",
  },
  "settings.analytics.description": {
    en: "Anonymous events help measure activation. No message text, email, phone or token is sent.",
    ar: "تساعد الأحداث المجهولة على قياس التفعيل. لا تُرسل نصوص الرسائل أو البريد أو الهاتف أو الرموز.",
  },
  "settings.analytics.consent": {
    en: "Share anonymous product analytics",
    ar: "مشاركة تحليلات المنتج المجهولة",
  },
  "settings.assignment.title": { en: "Assignment routing", ar: "توجيه الإسناد" },
  "settings.assignment.description": { en: "Route new unassigned conversations to eligible members within a load cap.", ar: "وجّه المحادثات الجديدة غير المسندة إلى أعضاء مؤهلين ضمن حد أقصى للحمل." },
  "settings.assignment.mode": { en: "Rule", ar: "القاعدة" },
  "settings.assignment.manual": { en: "Manual", ar: "يدوي" },
  "settings.assignment.roundRobin": { en: "Round-robin", ar: "بالتناوب" },
  "settings.assignment.loadCapped": { en: "Load-capped", ar: "بحد أقصى للحمل" },
  "settings.assignment.cap": { en: "Cap per member", ar: "الحد الأقصى لكل عضو" },
  "settings.assignment.timezone": { en: "Timezone", ar: "المنطقة الزمنية" },
  "settings.assignment.eligible": { en: "Eligible members", ar: "الأعضاء المؤهلون" },

  "settings.accounts.title": {
    en: "Messaging accounts",
    ar: "حسابات المراسلة",
  },
  "settings.accounts.description": {
    en: "Explore the setup requirements. Live connections are not configured.",
    ar: "استكشف متطلبات الإعداد. والربط الحي غير مُعد.",
  },
  "settings.accounts.notConnected": {
    en: "Not connected",
    ar: "غير متصل",
  },
  "settings.accounts.viewSetupLabel": {
    en: "View {platform} setup",
    ar: "عرض إعداد {platform}",
  },
  "settings.accounts.viewSetup": {
    en: "View setup",
    ar: "عرض الإعداد",
  },
  "settings.accounts.dialogTitle": {
    en: "{platform} setup",
    ar: "إعداد {platform}",
  },
  "settings.accounts.demoNotice": {
    en: "This demo does not connect to a real messaging account. Your sample inbox will continue to work without a connection.",
    ar: "هذا العرض التجريبي لا يتصل بحساب مراسلة حقيقي. ويستمر صندوق الوارد التجريبي بالعمل دون اتصال.",
  },
  "settings.accounts.liveHeading": {
    en: "For a live connection",
    ar: "للربط الحي",
  },
  "settings.accounts.eligibleAccount": {
    en: "An eligible {kind} account.",
    ar: "حساب {kind} مؤهل.",
  },
  "settings.accounts.kind.instagram": {
    en: "Instagram professional",
    ar: "Instagram احترافي",
  },
  "settings.accounts.kind.whatsapp": {
    en: "WhatsApp Business",
    ar: "WhatsApp Business",
  },
  "settings.accounts.metaApplication": {
    en: "A configured Meta application with approved messaging permissions.",
    ar: "تطبيق Meta مُعدّ بأذونات مراسلة معتمدة.",
  },
  "settings.accounts.secureBackend": {
    en: "A secure backend, verified webhooks, and server-side access tokens.",
    ar: "خادم آمن، وإشعارات webhook موثّقة، ورموز وصول على جانب الخادم.",
  },
  "settings.accounts.neverPaste": {
    en: "Never paste access tokens or account passwords into this demo.",
    ar: "لا تلصق رموز الوصول أو كلمات مرور الحسابات في هذا العرض التجريبي.",
  },
  "settings.accounts.createWorkspace": {
    en: "Create a server-backed workspace",
    ar: "أنشئ مساحة عمل مدعومة بالخادم",
  },
  "settings.accounts.backToSettings": {
    en: "Back to settings",
    ar: "العودة إلى الإعدادات",
  },
};

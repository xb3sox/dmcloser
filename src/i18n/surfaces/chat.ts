/**
 * Chat surface: thread header, messages, delivery status, lead memory and
 * the reply composer. Every entry carries both locales; a missing translation
 * is a compile error, not a silent fallback.
 */
export const chatStrings = {
  "chat.message.you": {
    en: "You",
    ar: "أنت",
  },
  "chat.delivery.queued": {
    en: "Queued",
    ar: "بانتظار الإرسال",
  },
  "chat.delivery.sending": {
    en: "Sending",
    ar: "جارٍ الإرسال",
  },
  "chat.delivery.accepted": {
    en: "Accepted",
    ar: "مقبول لدى المزوّد",
  },
  "chat.delivery.delivered": {
    en: "Delivered",
    ar: "تم التسليم",
  },
  "chat.delivery.read": {
    en: "Read",
    ar: "تمت القراءة",
  },
  "chat.delivery.failed": {
    en: "Failed",
    ar: "فشل الإرسال",
  },
  "chat.delivery.check": {
    en: "Check delivery",
    ar: "تحقق من التسليم",
  },
  "chat.delivery.paused": {
    en: "Paused",
    ar: "موقوف",
  },
  "chat.delivery.received": {
    en: "Received",
    ar: "تم الاستلام",
  },
  "chat.delivery.providerStatus": {
    en: "Provider delivery status",
    ar: "حالة التسليم لدى المزوّد",
  },
  "chat.delivery.savedInDemo": {
    en: "Saved in demo",
    ar: "محفوظ في العرض التجريبي",
  },
  "chat.delivery.needsReview": {
    en: "Delivery needs review.",
    ar: "التسليم يحتاج مراجعة.",
  },
  "chat.delivery.retry": {
    en: "Retry delivery",
    ar: "إعادة محاولة التسليم",
  },
  "chat.delivery.resolve": {
    en: "Resolve delivery",
    ar: "تحديد حالة التسليم",
  },
  "chat.feedback.summary": {
    en: "Reply feedback",
    ar: "ملاحظات على الرد",
  },
  "chat.feedback.helpful": {
    en: "Helpful",
    ar: "مفيد",
  },
  "chat.feedback.notHelpful": {
    en: "Not helpful",
    ar: "غير مفيد",
  },
  "chat.feedback.markedHelpful": {
    en: "Marked helpful. This is feedback, not proof of conversion.",
    ar: "تم التعليم كمفيد. هذه ملاحظة وليست دليلاً على التحويل.",
  },
  "chat.feedback.saved": {
    en: "Feedback saved for review.",
    ar: "حُفظت الملاحظات للمراجعة.",
  },
  "chat.error.tryAgain": {
    en: "Please try again.",
    ar: "يرجى المحاولة مرة أخرى.",
  },
  "chat.error.feedbackSave": {
    en: "Could not save feedback.",
    ar: "تعذّر حفظ الملاحظات.",
  },
  "chat.resolve.title": {
    en: "Check the provider inbox first",
    ar: "تحقق من صندوق الوارد لدى المزوّد أولاً",
  },
  "chat.resolve.explain": {
    en: "The provider may have accepted this message before the connection failed. Resending without checking could send it twice.",
    ar: "قد يكون المزوّد قد قبل هذه الرسالة قبل انقطاع الاتصال. وإعادة الإرسال دون التحقق قد ترسلها مرتين.",
  },
  "chat.resolve.question": {
    en: "What happened?",
    ar: "ماذا حدث؟",
  },
  "chat.resolve.chooseAfterChecking": {
    en: "Choose after checking",
    ar: "اختر بعد التحقق",
  },
  "chat.resolve.messageInInbox": {
    en: "The message is in the provider inbox",
    ar: "الرسالة موجودة في صندوق الوارد لدى المزوّد",
  },
  "chat.resolve.notSent": {
    en: "The provider confirms it was not sent",
    ar: "يؤكد المزوّد أنه لم تُرسل",
  },
  "chat.resolve.checked": {
    en: "I checked the real provider inbox.",
    ar: "تحققت من صندوق الوارد الحقيقي لدى المزوّد.",
  },
  "chat.resolve.confirm": {
    en: "Confirm delivery outcome",
    ar: "تأكيد نتيجة التسليم",
  },
  "chat.notice.autoSentDemo": {
    en: "Suggested reply auto-sent in this demo. No real message was sent.",
    ar: "أُرسل الرد المقترح تلقائياً في هذا العرض التجريبي. ولم تُرسل أي رسالة حقيقية.",
  },
  "chat.notice.queuedLive": {
    en: "Reply queued. Provider delivery status appears with the message.",
    ar: "وُضع الرد في الانتظار. وتظهر حالة التسليم لدى المزوّد مع الرسالة.",
  },
  "chat.notice.savedDemo": {
    en: "Reply saved in this demo. No real message was sent.",
    ar: "حُفظ الرد في هذا العرض التجريبي. ولم تُرسل أي رسالة حقيقية.",
  },
  "chat.idle.ariaLabel": {
    en: "Conversation",
    ar: "محادثة",
  },
  "chat.idle.heading": {
    en: "A little closer to your next sale.",
    ar: "أقرب قليلاً إلى صفقتك القادمة.",
  },
  "chat.idle.subheading": {
    en: "Choose a conversation. Your next reply is already one step ahead.",
    ar: "اختر محادثة. ردك التالي يسبقك بخطوة.",
  },
  "chat.idle.tagline": {
    en: "Your voice. Your control.",
    ar: "صوتك. وتحكمك.",
  },
  "chat.back.label": {
    en: "Back to conversations",
    ar: "العودة إلى المحادثات",
  },
  "chat.channel.business": {
    en: "Business conversation",
    ar: "محادثة تجارية",
  },
  "chat.channel.sample": {
    en: "Sample conversation",
    ar: "محادثة نموذجية",
  },
  "chat.autoSend.label": {
    en: "Auto-send",
    ar: "إرسال تلقائي",
  },
  "chat.autoSend.disabled": {
    en: "Auto-send disabled for this contact.",
    ar: "أُوقف الإرسال التلقائي لهذا العميل.",
  },
  "chat.autoSend.enabled": {
    en: "Auto-send enabled for this contact.",
    ar: "فُعّل الإرسال التلقائي لهذا العميل.",
  },
  "chat.autoSend.contactEnabled": {
    en: "Contact auto-send enabled. Enable workspace auto-reply in Settings to activate it.",
    ar: "فُعّل الإرسال التلقائي لهذا العميل. وفعّل الرد التلقائي لمساحة العمل من الإعدادات لتفعيله.",
  },
  "chat.autoSend.switchLabel": {
    en: "Auto-send replies to {name}",
    ar: "إرسال الردود تلقائياً إلى {name}",
  },
  "chat.memory.heading": {
    en: "Lead memory",
    ar: "ذاكرة العميل المحتمل",
  },
  "chat.memory.emptyHint": {
    en: "Add context for your next reply",
    ar: "أضف سياقاً لردك التالي",
  },
  "chat.memory.conversionStatus": {
    en: "Conversion status",
    ar: "حالة التحويل",
  },
  "chat.memory.statusSaved": {
    en: "Conversion status saved.",
    ar: "حُفظت حالة التحويل.",
  },
  "chat.memory.notesLabel": {
    en: "Notes for this contact",
    ar: "ملاحظات حول هذا العميل",
  },
  "chat.memory.save": {
    en: "Save memory",
    ar: "حفظ الذاكرة",
  },
  "chat.memory.saved": {
    en: "Lead memory saved.",
    ar: "حُفظت ذاكرة العميل المحتمل.",
  },
  "chat.memory.conversationMemory": {
    en: "Conversation memory: {memory}",
    ar: "ذاكرة المحادثة: {memory}",
  },
  "chat.messages.ariaLabel": {
    en: "Messages with {name}",
    ar: "الرسائل مع {name}",
  },
  "chat.ai.tryAgain": {
    en: "Try generation again",
    ar: "جرّب التوليد مرة أخرى",
  },
  "chat.window.closed": {
    en: "The reply window has closed. Wait for a new customer message.",
    ar: "أُغلقت نافذة الرد. انتظر رسالة جديدة من العميل.",
  },
  "chat.spam.notice": {
    en: "Marked as spam. Automatic replies are disabled.",
    ar: "مُحت كرسالة مزعجة. الردود التلقائية معطّلة.",
  },
  "chat.suggestion.heading": {
    en: "Suggested reply",
    ar: "الرد المقترح",
  },
  "chat.suggestion.confidence": {
    en: "{confidence}% confidence",
    ar: "ثقة {confidence}%",
  },
  "chat.suggestion.editLabel": {
    en: "Edit suggested reply",
    ar: "تعديل الرد المقترح",
  },
  "chat.suggestion.send": {
    en: "Send reply",
    ar: "إرسال الرد",
  },
  "chat.suggestion.cancel": {
    en: "Cancel",
    ar: "إلغاء",
  },
  "chat.suggestion.edit": {
    en: "Edit",
    ar: "تعديل",
  },
  "chat.suggestion.reviewBeforeSending": {
    en: "Review before sending",
    ar: "راجع قبل الإرسال",
  },
  "chat.suggestion.autoSending": {
    en: "Auto-sending shortly...",
    ar: "سيُرسل تلقائياً بعد قليل...",
  },
  "chat.suggestion.ready": {
    en: "Ready when you are",
    ar: "جاهز عندما تكون مستعداً",
  },
  "chat.composer.label": {
    en: "Message {name}",
    ar: "رسالة إلى {name}",
  },
  "chat.composer.placeholder": {
    en: "Write your reply...",
    ar: "اكتب ردك...",
  },
  "chat.composer.sendLabel": {
    en: "Send message",
    ar: "إرسال الرسالة",
  },
  "chat.composer.liveFooter": {
    en: "Server-backed inbox. Check provider delivery status.",
    ar: "صندوق وارد مدعوم بالخادم. تحقق من حالة التسليم لدى المزوّد.",
  },
  "chat.composer.demoFooter": {
    en: "Demo workspace. Replies stay in this browser.",
    ar: "مساحة عمل تجريبية. تبقى الردود في هذا المتصفح.",
  },
  "chat.composer.enterToSend": {
    en: "Enter to send",
    ar: "اضغط Enter للإرسال",
  },
  "chat.status.new": {
    en: "New lead",
    ar: "عميل محتمل جديد",
  },
  "chat.status.engaged": {
    en: "Engaged",
    ar: "متفاعل",
  },
  "chat.status.qualified": {
    en: "Qualified",
    ar: "مؤهّل",
  },
  "chat.status.converted": {
    en: "Converted",
    ar: "محوّل إلى عميل",
  },
  "chat.status.closed": {
    en: "Closed",
    ar: "مغلق",
  },
};

/**
 * Delivery status keys for the provider delivery timeline. The status slug
 * stays machine-readable; only the shown label is translated.
 */
export const chatDeliveryStatusKeys: Record<
  string,
  keyof typeof chatStrings
> = {
  queued: "chat.delivery.queued",
  sending: "chat.delivery.sending",
  sent: "chat.delivery.accepted",
  delivered: "chat.delivery.delivered",
  read: "chat.delivery.read",
  failed: "chat.delivery.failed",
  uncertain: "chat.delivery.check",
  cancelled: "chat.delivery.paused",
  received: "chat.delivery.received",
};

/**
 * Conversion status labels live in `src/utils/conversation.ts`; this maps the
 * same slugs to translated labels for the chat surface.
 */
export const chatStatusLabelKeys: Record<string, keyof typeof chatStrings> = {
  new: "chat.status.new",
  engaged: "chat.status.engaged",
  qualified: "chat.status.qualified",
  converted: "chat.status.converted",
  lost: "chat.status.closed",
};

/**
 * The Revenue page: the three money blocks, the recovery list, the pipeline
 * and the learning notes. Every entry carries both locales; a missing
 * translation is a compile error.
 */
export const revenuePageStrings = {
  "revenue.page.label": {
    en: "Revenue intelligence",
    ar: "ذكاء الإيرادات",
  },
  "revenue.page.title": {
    en: "A clearer path to your next sale.",
    ar: "طريق أوضح إلى صفقتك القادمة.",
  },
  "revenue.page.subtitle": {
    en: "Real outcomes. Explicit assumptions. One next move.",
    ar: "نتائج حقيقية. افتراضات صريحة. خطوة واحدة تالية.",
  },
  "revenue.page.currencyLabel": {
    en: "Revenue currency",
    ar: "عملة الإيرادات",
  },
  "revenue.page.refresh": {
    en: "Refresh revenue",
    ar: "تحديث الإيرادات",
  },
  "revenue.page.loading": {
    en: "Reading your pipeline...",
    ar: "جارٍ قراءة خط المبيعات...",
  },
  "revenue.page.noData": {
    en: "No revenue data yet.",
    ar: "لا توجد بيانات إيرادات بعد.",
  },

  "revenue.page.verifiedTitle": {
    en: "Verified revenue received",
    ar: "الإيرادات المتحققة المستلمة",
  },
  "revenue.page.verifiedNote": {
    en: "Owner-confirmed receipts, net of refunds · this UTC month",
    ar: "إيصالات أكّدها المالك بعد خصم المستردات · شهر UTC هذا",
  },
  "revenue.page.receiptOne": {
    en: "{count} receipt on record",
    ar: "{count} إيصال مسجّل",
  },
  "revenue.page.receiptMany": {
    en: "{count} receipts on record",
    ar: "{count} إيصالات مسجّلة",
  },
  "revenue.page.reversed": {
    en: "reversed",
    ar: "معكوس",
  },
  "revenue.page.potentialTitle": {
    en: "Potential pipeline value",
    ar: "قيمة خط المبيعات المحتمل",
  },
  "revenue.page.potentialNote": {
    en: "Open opportunity value · estimated, not guaranteed · not cash",
    ar: "قيمة الفرص المفتوحة · تقديرية وغير مضمونة · ليست نقداً",
  },
  "revenue.page.forecastLabel": {
    en: "30-day weighted forecast",
    ar: "التوقع المرجّح لـ 30 يوماً",
  },
  "revenue.page.estimateNote": {
    en: "estimated, not guaranteed",
    ar: "تقديري وغير مضمون",
  },
  "revenue.page.attributedTitle": {
    en: "Attributed first-touch revenue",
    ar: "الإيرادات المنسوبة للمسار الأول",
  },
  "revenue.page.attributedNote": {
    en: "The verified receipts above, grouped by first touch · not an extra amount",
    ar: "الإيصالات المتحققة أعلاه مجمّعة حسب أول نقطة تماس · ليست مبلغاً إضافياً",
  },
  "revenue.page.attributedDisclaimer": {
    en: "Descriptive only. Never a claim that AI or an ad caused a sale.",
    ar: "وصفي فقط. لا ادّعاء بأن الذكاء الاصطناعي أو إعلاناً سبّب عملية بيع.",
  },

  "revenue.page.hotLeads": {
    en: "hot leads",
    ar: "عملاء ساخنون",
  },
  "revenue.page.qualified": {
    en: "qualified",
    ar: "مؤهّلون",
  },
  "revenue.page.noConversionRate": {
    en: "No closed-deal rate",
    ar: "لا نسبة صفقات مغلقة",
  },
  "revenue.page.conversionRate": {
    en: "{rate}% closed-deal conversion",
    ar: "نسبة تحويل الصفقات المغلقة {rate}%",
  },
  "revenue.page.wonLost": {
    en: "{won} won · {lost} lost this month ·",
    ar: "{won} رابحة · {lost} خاسرة هذا الشهر ·",
  },
  "revenue.page.wonValue": {
    en: "won value, not cash.",
    ar: "قيمة رابحة، ليست نقداً.",
  },

  "revenue.page.receiptsHeading": {
    en: "Verified receipts and reversals",
    ar: "الإيصالات المتحققة والعمليات العكسية",
  },
  "revenue.page.kindReceipt": {
    en: "Receipt",
    ar: "إيصال",
  },
  "revenue.page.kindRefund": {
    en: "Refund",
    ar: "استرداد",
  },
  "revenue.page.referenceLabel": {
    en: "Reference",
    ar: "المرجع",
  },
  "revenue.page.reversedAgainst": {
    en: "Reversed against the verified total",
    ar: "معكوس مقابل الإجمالي المتحقّق",
  },
  "revenue.page.ownerConfirmed": {
    en: "Owner-confirmed",
    ar: "مؤكّد من المالك",
  },
  "revenue.page.receiptsEmptyTitle": {
    en: "No confirmed receipts yet.",
    ar: "لا توجد إيصالات مؤكّدة بعد.",
  },
  "revenue.page.receiptsEmptyText": {
    en: "A won opportunity is not money. Record a receipt you verified outside DMCloser and it appears here with its reference.",
    ar: "الفرصة الرابحة ليست مالاً. سجّل إيصالاً تحققت منه خارج DMCloser فيظهر هنا مع مرجعه.",
  },
  "revenue.page.receiptsMethod": {
    en: "Only owner-confirmed receipts count as verified revenue, and a refund reverses the amount it returned. Nothing here is inferred from a won opportunity.",
    ar: "لا تُحتسب الإيصالات إلا التي أكّدها المالك كإيرادات متحققة، ويعكس الاسترداد المبلغ الذي أعاده. لا شيء هنا مُستنتج من فرصة رابحة.",
  },

  "revenue.page.recoveryHeading": {
    en: "Recovery list",
    ar: "قائمة المتابعة",
  },
  "revenue.page.recoveryTag": {
    en: "Human worklist",
    ar: "قائمة عمل بشرية",
  },
  "revenue.page.recoveryNotice": {
    en: "Open opportunities waiting on a person. Nothing here is sent automatically.",
    ar: "فرص مفتوحة تنتظر شخصاً. لا شيء هنا يُرسل تلقائياً.",
  },
  "revenue.page.staleDays": {
    en: "{count} days without a customer reply",
    ar: "{count} يوماً دون رد العميل",
  },
  "revenue.page.entryLine": {
    en: "{platform} · {reason}",
    ar: "{platform} · {reason}",
  },
  "revenue.page.estimatedValue": {
    en: "Estimated value",
    ar: "القيمة التقديرية",
  },
  "revenue.page.nextAction": {
    en: "Next:",
    ar: "التالي:",
  },
  "revenue.page.openConversation": {
    en: "Open conversation",
    ar: "فتح المحادثة",
  },
  "revenue.page.dismiss": {
    en: "Dismiss",
    ar: "تجاهل",
  },
  "revenue.page.recoveryEmptyTitle": {
    en: "Nothing is waiting on you.",
    ar: "لا شيء ينتظرك.",
  },
  "revenue.page.recoveryEmptyText": {
    en: "An open opportunity appears here when the customer stops replying. You decide what happens next.",
    ar: "تظهر الفرصة المفتوحة هنا عندما يتوقف العميل عن الرد. أنت من يقرر ما يحدث بعد ذلك.",
  },
  "revenue.page.dismissedCount": {
    en: "Dismissed opportunities ({count})",
    ar: "الفرص المتجاهَلة ({count})",
  },
  "revenue.page.dismissedText": {
    en: "Dismissed by your team. Restore it to bring it back into the list.",
    ar: "تجاهلها فريقك. استعدها لإعادتها إلى القائمة.",
  },
  "revenue.page.restore": {
    en: "Restore",
    ar: "استعادة",
  },

  "revenue.page.opportunitiesHeading": {
    en: "Your next opportunities",
    ar: "فرصك القادمة",
  },
  "revenue.page.filterLabel": {
    en: "Filter opportunities",
    ar: "تصفية الفرص",
  },
  "revenue.page.filterOpen": {
    en: "Open pipeline",
    ar: "خط المبيعات المفتوح",
  },
  "revenue.page.filterHot": {
    en: "Hot leads",
    ar: "عملاء ساخنون",
  },
  "revenue.page.filterAll": {
    en: "All opportunities",
    ar: "كل الفرص",
  },
  "revenue.page.hotLead": {
    en: "Hot lead",
    ar: "عميل ساخن",
  },
  "revenue.page.targetClose": {
    en: "Target {date}",
    ar: "الهدف {date}",
  },
  "revenue.page.closeUnknown": {
    en: "Close date unknown",
    ar: "تاريخ الإغلاق غير معروف",
  },
  "revenue.page.winChance": {
    en: "{rate}% estimated win chance",
    ar: "فرصة فوز تقديرية {rate}%",
  },
  "revenue.page.emptyHotTitle": {
    en: "No confirmed hot leads yet.",
    ar: "لا يوجد عملاء ساخنون مؤكّدون بعد.",
  },
  "revenue.page.emptyPipelineTitle": {
    en: "Your pipeline starts with a conversation.",
    ar: "خط مبيعاتك يبدأ بمحادثة.",
  },
  "revenue.page.emptyHotText": {
    en: "Scores need explicit buying signals and recent interest. No urgency is invented.",
    ar: "تحتاج الدرجات إلى إشارات شراء صريحة واهتمام حديث. لا يُختلق إلحاح.",
  },
  "revenue.page.emptyPipelineText": {
    en: "Inbound leads create opportunities automatically. Confirm value and qualification from the deal panel in your inbox.",
    ar: "تنشئ الرسائل الواردة الفرص تلقائياً. أكّد القيمة والتأهيل من لوحة الصفقة في صندوق الوارد.",
  },
  "revenue.page.openInbox": {
    en: "Open inbox",
    ar: "فتح صندوق الوارد",
  },
  "revenue.page.forecastThrough": {
    en: "Forecast through {date}. {unknown} open deals have unknown value; {undated} have no close date. Unknowns are excluded from dated forecasts. No cross-currency conversion.",
    ar: "التوقع حتى {date}. {unknown} صفقة مفتوحة بقيمة غير معروفة؛ {undated} بلا تاريخ إغلاق. تُستثنى القيم غير المعروفة من التوقعات المؤرخة. لا تحويل بين العملات.",
  },

  "revenue.page.winLossSummary": {
    en: "Win/loss reasons & revenue attribution",
    ar: "أسباب الربح والخسارة ونسب الإيرادات",
  },
  "revenue.page.closedDealHeading": {
    en: "What closed the deal?",
    ar: "ما الذي أنهى الصفقة؟",
  },
  "revenue.page.noReasons": {
    en: "Record a won or lost outcome with a reason to start learning.",
    ar: "سجّل نتيجة ربح أو خسارة مع سبب لتبدأ بالتعلّم.",
  },
  "revenue.page.attributedHeading": {
    en: "Attributed: where each receipt started",
    ar: "المنسوب: من أين بدأ كل إيصال",
  },
  "revenue.page.firstTouchWins": {
    en: "First touch · {count} wins",
    ar: "أول تماس · {count} ربح",
  },
  "revenue.page.noAttribution": {
    en: "No confirmed receipts for this currency and period.",
    ar: "لا توجد إيصالات مؤكّدة لهذه العملة والفترة.",
  },
  "revenue.page.attributionMethod": {
    en: "Channel attribution is descriptive. Campaigns are team-entered. No claim that AI or an ad caused a sale.",
    ar: "نسب القنوات وصفية. الحملات يدخلها الفريق. لا ادّعاء بأن الذكاء الاصطناعي أو إعلاناً سبّب عملية بيع.",
  },

  "revenue.page.learningSummary": {
    en: "What your business is learning",
    ar: "ما يتعلّمه عملك",
  },
  "revenue.page.learningCounts": {
    en: "{outcomes} recorded outcomes for this industry mode · {helpful} replies marked helpful by your team.",
    ar: "{outcomes} نتيجة مسجّلة لوضع القطاع هذا · {helpful} ردّاً صنّفه فريقك كمفيد.",
  },
  "revenue.page.noLessons": {
    en: "Not enough repeated evidence for a lesson yet. Missing data is not a reason to invent one.",
    ar: "لا توجد أدلة متكررة كافية لاستنتاج درس بعد. نقص البيانات ليس سبباً لاختلاق درس.",
  },
  "revenue.page.learningMethod": {
    en: "Win chance uses labelled stage/qualification heuristics until a stage has at least 10 historical outcomes. Cohort rates are observational and uncalibrated; learned patterns never approve business facts or enable auto-send.",
    ar: "تستخدم فرصة الفوز استدلالات موسومة للمرحلة والتأهيل حتى تتوفر مرحلة بعشرة نتائج تاريخية على الأقل. معدلات المجموعات وصفية وغير معايَرة؛ والأنماط المتعلَّمة لا تعتمد حقائق العمل ولا تفعّل الإرسال التلقائي.",
  },

  "revenue.page.dismissDialogTitle": {
    en: "Dismiss from the recovery list",
    ar: "تجاهل من قائمة المتابعة",
  },
  "revenue.page.dismissDialogText": {
    en: "{name} stays open and keeps its value. Nothing is sent to the customer. Record why this one can wait.",
    ar: "تبقى {name} مفتوحة وتحتفظ بقيمتها. لا يُرسل شيء للعميل. سجّل سبب تأجيل هذه.",
  },
  "revenue.page.dismissReasonLabel": {
    en: "Reason",
    ar: "السبب",
  },
  "revenue.page.dismissReasonPlaceholder": {
    en: "Waiting for the clinic to confirm a date.",
    ar: "بانتظار تأكيد العيادة لموعد.",
  },
  "revenue.page.dismissing": {
    en: "Dismissing...",
    ar: "جارٍ التجاهل...",
  },
  "revenue.page.dismissAction": {
    en: "Dismiss this opportunity",
    ar: "تجاهل هذه الفرصة",
  },

  "revenue.page.error.load": {
    en: "Revenue could not be loaded.",
    ar: "تعذّر تحميل الإيرادات.",
  },
  "revenue.page.error.recoveryLoad": {
    en: "The recovery list could not be loaded.",
    ar: "تعذّر تحميل قائمة المتابعة.",
  },
  "revenue.page.error.dismiss": {
    en: "This opportunity could not be dismissed.",
    ar: "تعذّر تجاهل هذه الفرصة.",
  },
  "revenue.page.error.restore": {
    en: "This opportunity could not be restored.",
    ar: "تعذّرت استعادة هذه الفرصة.",
  },
};

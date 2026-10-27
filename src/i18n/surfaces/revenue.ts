/**
 * Revenue OS surfaces: Business Brain (knowledge base) and the Deal panel.
 * Every entry carries both locales; a missing translation is a compile error,
 * not a silent fallback.
 *
 * Money contract (docs/REVENUE_OS.md): potential / attributed / verified stay
 * three separate categories, scores are uncalibrated, and "estimate /
 * indicative / unknown" wording survives translation.
 */
export const revenueStrings = {
  // --- Business Brain -------------------------------------------------------
  "revenue.brain.label": {
    // Feature name: kept in English, not transliterated.
    en: "Business Brain",
    ar: "Business Brain",
  },
  "revenue.brain.heading": {
    en: "Your knowledge. Working together.",
    ar: "معرفتك. تعمل معاً.",
  },
  "revenue.brain.subheading": {
    en: "Verified products, answers, and sales know-how. One source of truth.",
    ar: "منتجات وإجابات ومعرفة بيعية موثّقة. مصدر حقيقة واحد.",
  },
  "revenue.brain.add": {
    en: "Add knowledge",
    ar: "إضافة معرفة",
  },
  "revenue.brain.contextSummary": {
    en: "Industry agent & sales defaults",
    ar: "وكيل القطاع وإعدادات البيع",
  },
  "revenue.brain.industryMode": {
    en: "Industry mode",
    ar: "وضع القطاع",
  },
  "revenue.brain.industryUpdated": {
    en: "Industry guidance updated.",
    ar: "حُدّثت إرشادات القطاع.",
  },
  "revenue.brain.defaultCurrency": {
    en: "New opportunity currency",
    ar: "عملة الفرص الجديدة",
  },
  "revenue.brain.currencyUpdated": {
    en: "Default currency updated. Existing deals are unchanged.",
    ar: "حُدّثت العملة الافتراضية. ولم تتغير الصفقات القائمة.",
  },
  "revenue.brain.autoStageTitle": {
    en: "Assist with deal stages",
    ar: "المساعدة في مراحل الصفقة",
  },
  "revenue.brain.autoStageText": {
    en: "Confirmed BANT can qualify a lead; a quote can move it to Proposal. Wins, losses, and receipts always need your confirmation.",
    ar: "يمكن لـ BANT المؤكد أن يؤهل عميلاً محتملاً، ويمكن لعرض السعر أن ينقله إلى مرحلة العرض. أما الانتصارات والخسائر والإيصالات فتحتاج تأكيدك دائماً.",
  },
  "revenue.brain.autoStageSwitch": {
    en: "Automatic deal-stage assistance",
    ar: "مساعدة تلقائية في مراحل الصفقات",
  },
  "revenue.brain.customFields": {
    en: "Custom fields",
    ar: "حقول مخصصة",
  },
  "revenue.brain.addField": {
    en: "Add field",
    ar: "إضافة حقل",
  },
  "revenue.brain.customFieldsNote": {
    en: "These questions appear on every opportunity in your sector. Budget, authority, need and timeline stay as they are.",
    ar: "تظهر هذه الأسئلة في كل فرصة ضمن قطاعك. أما الميزانية وصلاحية القرار والحاجة والإطار الزمني فتبقى كما هي.",
  },
  "revenue.brain.fieldLabel": {
    en: "Label",
    ar: "التسمية",
  },
  "revenue.brain.fieldType": {
    en: "Type",
    ar: "النوع",
  },
  "revenue.brain.fieldTypeText": {
    en: "Text",
    ar: "نص",
  },
  "revenue.brain.fieldTypeNumber": {
    en: "Number",
    ar: "رقم",
  },
  "revenue.brain.fieldTypeDate": {
    en: "Date",
    ar: "تاريخ",
  },
  "revenue.brain.required": {
    en: "Required",
    ar: "مطلوب",
  },
  "revenue.brain.removeField": {
    en: "Remove {name}",
    ar: "حذف {name}",
  },
  "revenue.brain.genericField": {
    en: "field",
    ar: "حقل",
  },
  "revenue.brain.fieldNeedsLabel": {
    en: "Every custom field needs a label.",
    ar: "كل حقل مخصص يحتاج تسمية.",
  },
  "revenue.brain.saveCustomFields": {
    en: "Save custom fields",
    ar: "حفظ الحقول المخصصة",
  },
  "revenue.brain.customFieldsSaved": {
    en: "Custom fields saved.",
    ar: "حُفظت الحقول المخصصة.",
  },
  "revenue.brain.entriesHeading": {
    en: "Business knowledge",
    ar: "معرفة المشروع",
  },
  "revenue.brain.filterLabel": {
    en: "Filter knowledge",
    ar: "تصفية المعرفة",
  },
  "revenue.brain.filterAll": {
    en: "All knowledge",
    ar: "كل المعرفة",
  },
  "revenue.brain.editEntry": {
    en: "Edit {title}",
    ar: "تعديل {title}",
  },
  "revenue.brain.deleteEntry": {
    en: "Delete {title}",
    ar: "حذف {title}",
  },
  "revenue.brain.stateExpired": {
    en: "Expired",
    ar: "منتهي الصلاحية",
  },
  "revenue.brain.stateApproved": {
    en: "Approved",
    ar: "معتمد",
  },
  "revenue.brain.stateDraft": {
    en: "Draft",
    ar: "مسودة",
  },
  "revenue.brain.version": {
    en: "· version {version}",
    ar: "· الإصدار {version}",
  },
  "revenue.brain.emptyHeading": {
    en: "A better answer starts with a verified fact.",
    ar: "الإجابة الأفضل تبدأ بحقيقة موثّقة.",
  },
  "revenue.brain.emptyText": {
    en: "Add a product, a service, or your most helpful FAQ. Existing business settings still work; this adds structured, reusable knowledge.",
    ar: "أضف منتجاً أو خدمة أو أكثر أسئلتك فائدة. وإعدادات المشروع القائمة تبقى كما هي؛ وهذه إضافة معرفة منظمة قابلة لإعادة الاستخدام.",
  },
  "revenue.brain.relationships": {
    en: "Knowledge relationships",
    ar: "علاقات المعرفة",
  },
  "revenue.brain.relationshipsText": {
    en: "Connect an FAQ to a product, a playbook to an objection, or related offers. Relationships stay within your workspace.",
    ar: "اربط سؤالاً شائعاً بمنتج، أو دليل بيع باعتراض، أو عروضاً متصلة. وتبقى العلاقات داخل مساحة عملك.",
  },
  "revenue.brain.noRelationships": {
    en: "No relationships yet. Add two entries to connect them.",
    ar: "لا توجد علاقات بعد. أضف مدخلين لربطهما.",
  },
  "revenue.brain.deleteRelationship": {
    en: "Delete relationship between {from} and {to}",
    ar: "حذف العلاقة بين {from} و {to}",
  },
  "revenue.brain.linkFrom": {
    en: "From",
    ar: "من",
  },
  "revenue.brain.linkTo": {
    en: "To",
    ar: "إلى",
  },
  "revenue.brain.chooseEntry": {
    en: "Choose entry",
    ar: "اختر مدخلاً",
  },
  "revenue.brain.linkRelation": {
    en: "Relationship",
    ar: "العلاقة",
  },
  "revenue.brain.relationSupports": {
    en: "Supports",
    ar: "يدعم",
  },
  "revenue.brain.relationAnswers": {
    en: "Answers",
    ar: "يجيب عن",
  },
  "revenue.brain.relationCompetes": {
    en: "Competes with",
    ar: "منافس لـ",
  },
  "revenue.brain.relationBundles": {
    en: "Bundles",
    ar: "يُحزَّم مع",
  },
  "revenue.brain.connect": {
    en: "Connect",
    ar: "ربط",
  },
  "revenue.brain.relationshipAdded": {
    en: "Knowledge relationship added.",
    ar: "أُضيفت علاقة المعرفة.",
  },
  "revenue.brain.approvalNote": {
    en: "Learning never silently approves knowledge. Edits or expiry make old automatic replies require review. Only owners can change the Business Brain.",
    ar: "التعلّم لا يعتمد المعرفة تلقائياً أبداً. ويجعل التعديل أو انتهاء الصلاحية الردود التلقائية القديمة بحاجة إلى مراجعة. ولا يغيّر Business Brain إلا المالكون.",
  },
  "revenue.brain.entryTitle": {
    en: "Title",
    ar: "العنوان",
  },
  "revenue.brain.entryDetails": {
    en: "Approved details",
    ar: "تفاصيل معتمدة",
  },
  "revenue.brain.entryPrice": {
    en: "Price (optional)",
    ar: "السعر (اختياري)",
  },
  "revenue.brain.entryPricePlaceholder": {
    en: "e.g. 80.00",
    ar: "مثال: 80.00",
  },
  "revenue.brain.entryCurrency": {
    en: "Currency",
    ar: "العملة",
  },
  "revenue.brain.entryExpiry": {
    en: "Valid through (optional)",
    ar: "سارية حتى (اختياري)",
  },
  "revenue.brain.entryApprove": {
    en: "I verified this entry and approve it for business use.",
    ar: "تحققت من هذا المدخل وأعتمده للاستخدام في العمل.",
  },
  "revenue.brain.saveEntry": {
    en: "Save knowledge",
    ar: "حفظ المعرفة",
  },
  "revenue.brain.entryType": {
    en: "Knowledge type",
    ar: "نوع المعرفة",
  },
  "revenue.brain.editTitle": {
    en: "Edit business knowledge",
    ar: "تعديل معرفة المشروع",
  },
  "revenue.brain.addTitle": {
    en: "Add business knowledge",
    ar: "إضافة معرفة إلى المشروع",
  },
  "revenue.brain.editorDescription": {
    en: "Only approve facts you have verified. Competitor notes and playbooks guide a seller; they are not price or policy evidence.",
    ar: "اعتمد فقط الحقائق التي تحققت منها. وملاحظات المنافسين وأدلة البيع توجّه البائع، لكنها ليست دليلاً على السعر أو السياسة.",
  },
  "revenue.brain.invalidAmount": {
    en: "Use a positive amount with at most two decimals.",
    ar: "استخدم مبلغاً موجباً بعشرتين كحد أقصى.",
  },
  "revenue.brain.saveFailed": {
    en: "Could not save.",
    ar: "تعذّر الحفظ.",
  },
  "revenue.brain.loadFailed": {
    en: "Knowledge could not be loaded.",
    ar: "تعذّر تحميل المعرفة.",
  },
  "revenue.brain.tryAgain": {
    en: "Please try again.",
    ar: "يرجى المحاولة مرة أخرى.",
  },
  "revenue.brain.saved": {
    en: "Business knowledge saved.",
    ar: "حُفظت معرفة المشروع.",
  },
  "revenue.brain.deleted": {
    en: "Knowledge deleted.",
    ar: "حُذفت المعرفة.",
  },
  "revenue.brain.deleteTitle": {
    en: "Delete this knowledge?",
    ar: "حذف هذه المعرفة؟",
  },
  "revenue.brain.deleteDescription": {
    en: "{title} will be removed from future replies. Existing quote snapshots stay intact; related knowledge links will be removed.",
    ar: "ستُحذف {title} من الردود القادمة. وتبقى لقطات عروض الأسعار القائمة كما هي، وستُحذف علاقات المعرفة المرتبطة.",
  },
  "revenue.brain.deleteAction": {
    en: "Delete knowledge",
    ar: "حذف المعرفة",
  },
  "revenue.brain.kindProduct": {
    en: "Product",
    ar: "منتج",
  },
  "revenue.brain.kindService": {
    en: "Service",
    ar: "خدمة",
  },
  "revenue.brain.kindFaq": {
    en: "FAQ",
    ar: "الأسئلة الشائعة",
  },
  "revenue.brain.kindOffer": {
    en: "Offer",
    ar: "عرض",
  },
  "revenue.brain.kindCompetitor": {
    en: "Competitor",
    ar: "منافس",
  },
  "revenue.brain.kindPlaybook": {
    en: "Sales playbook",
    ar: "دليل بيع",
  },
  "revenue.brain.kindVoice": {
    en: "Brand voice",
    ar: "صوت العلامة",
  },
  "revenue.brain.industryGeneral": {
    en: "General",
    ar: "عام",
  },
  "revenue.brain.industryRealEstate": {
    en: "Real Estate",
    ar: "العقارات",
  },
  "revenue.brain.industryMedical": {
    en: "Medical Clinics",
    ar: "العيادات الطبية",
  },
  "revenue.brain.industryAutomotive": {
    en: "Automotive",
    ar: "السيارات",
  },
  "revenue.brain.industryBeauty": {
    en: "Beauty",
    ar: "التجميل",
  },
  "revenue.brain.industryEcommerce": {
    en: "Ecommerce",
    ar: "التجارة الإلكترونية",
  },
  "revenue.brain.industryCustom": {
    en: "Custom",
    ar: "مخصص",
  },

  // --- Deal panel -----------------------------------------------------------
  "revenue.deal.heading": {
    en: "Deal intelligence",
    ar: "ذكاء الصفقات",
  },
  "revenue.deal.panelSummary": {
    en: "Value, qualification & next action",
    ar: "القيمة والتأهيل والإجراء التالي",
  },
  "revenue.deal.hotLead": {
    en: "Hot lead",
    ar: "عميل محتمل ساخن",
  },
  "revenue.deal.readOpportunity": {
    en: "Read opportunity",
    ar: "قراءة الفرصة",
  },
  "revenue.deal.leadScore": {
    en: "/100 lead score",
    ar: "/100 · درجة العميل المحتمل",
  },
  "revenue.deal.estimatedWinChance": {
    en: "% estimated win chance",
    ar: "% فرصة فوز تقديرية",
  },
  "revenue.deal.nextAction": {
    en: "Next best action",
    ar: "أفضل إجراء تالٍ",
  },
  "revenue.deal.useAction": {
    en: "Use suggested action",
    ar: "استخدام الإجراء المقترح",
  },
  "revenue.deal.whyScore": {
    en: "Why this score? BANT & evidence",
    ar: "لماذا هذه الدرجة؟ BANT والأدلة",
  },
  "revenue.deal.noSignals": {
    en: "No explicit buying signals detected. Qualification stays unknown until confirmed.",
    ar: "لم تُرصد إشارات شراء صريحة. ويبقى التأهيل غير معروف حتى تأكيده.",
  },
  "revenue.deal.basis": {
    en: "{basis}. {count} stage outcomes. Version {version}. Detected text signals currently use English patterns.",
    ar: "{basis}. و{count} نتيجة في مراحل الصفقات. والإصدار {version}. والإشارات النصية المكتشفة تستخدم حالياً أنماطاً إنجليزية.",
  },
  "revenue.deal.history": {
    en: "Quotes, appointments & deal history",
    ar: "عروض الأسعار والمواعيد وسجل الصفقة",
  },
  "revenue.deal.outcomeWon": {
    en: "Won",
    ar: "رابحة",
  },
  "revenue.deal.outcomeLost": {
    en: "Lost",
    ar: "خاسرة",
  },
  "revenue.deal.refund": {
    en: "Refund",
    ar: "استرداد",
  },
  "revenue.deal.confirmedReceipt": {
    en: "Confirmed receipt",
    ar: "إيصال مؤكد",
  },
  "revenue.deal.quote": {
    en: "Quote",
    ar: "عرض سعر",
  },
  "revenue.deal.quoteValidThrough": {
    en: "valid through {date}",
    ar: "صالح حتى {date}",
  },
  "revenue.deal.useQuote": {
    en: "Use quote in draft",
    ar: "استخدام عرض السعر في المسودة",
  },
  "revenue.deal.quoteAccepted": {
    en: "Quote acceptance recorded. This does not record a payment or won deal.",
    ar: "سُجّل قبول عرض السعر. وهذا لا يسجّل دفعة ولا صفقة رابحة.",
  },
  "revenue.deal.markAccepted": {
    en: "Mark accepted",
    ar: "تحديد مقبول",
  },
  "revenue.deal.internalBooking": {
    en: "internal booking",
    ar: "حجز داخلي",
  },
  "revenue.deal.calendarFile": {
    en: "Calendar file",
    ar: "ملف التقويم",
  },
  "revenue.deal.cancelBooking": {
    en: "Cancel booking",
    ar: "إلغاء الحجز",
  },
  "revenue.deal.followUp": {
    en: "Follow-up · {status}",
    ar: "متابعة · {status}",
  },
  "revenue.deal.humanReviewRequired": {
    en: "Human review required",
    ar: "مراجعة بشرية مطلوبة",
  },
  "revenue.deal.useFollowUpDraft": {
    en: "Use follow-up draft",
    ar: "استخدام مسودة المتابعة",
  },
  "revenue.deal.cancelReminder": {
    en: "Cancel reminder",
    ar: "إلغاء التذكير",
  },
  "revenue.deal.draftKept": {
    en: "Your existing draft was kept. Finish or clear it first.",
    ar: "تم الإبقاء على مسودتك الحالية. أكملها أو امسحها أولاً.",
  },
  "revenue.deal.actionAdded": {
    en: "Action added to your draft. Review it before sending.",
    ar: "أُضيف الإجراء إلى مسودتك. راجعه قبل الإرسال.",
  },
  "revenue.deal.opportunityUpdated": {
    en: "Opportunity updated.",
    ar: "حُدّثت الفرصة.",
  },
  "revenue.deal.readFailed": {
    en: "Could not read this opportunity.",
    ar: "تعذّرت قراءة هذه الفرصة.",
  },
  "revenue.deal.tryAgain": {
    en: "Please try again.",
    ar: "يرجى المحاولة مرة أخرى.",
  },
  "revenue.deal.followUpAdded": {
    en: "Follow-up added to your draft for review.",
    ar: "أُضيفت المتابعة إلى مسودتك للمراجعة.",
  },
  "revenue.deal.dealActions": {
    en: "Deal actions",
    ar: "إجراءات الصفقة",
  },
  "revenue.deal.moreActions": {
    en: "More actions",
    ar: "إجراءات أخرى",
  },
  "revenue.deal.editOpportunity": {
    en: "Edit opportunity",
    ar: "تعديل الفرصة",
  },
  "revenue.deal.prepareQuote": {
    en: "Prepare quote",
    ar: "إعداد عرض السعر",
  },
  "revenue.deal.bookAppointment": {
    en: "Book appointment",
    ar: "حجز موعد",
  },
  "revenue.deal.scheduleFollowUp": {
    en: "Schedule follow-up",
    ar: "جدولة متابعة",
  },
  "revenue.deal.markWon": {
    en: "Mark won",
    ar: "تحديد رابحة",
  },
  "revenue.deal.markLost": {
    en: "Mark lost",
    ar: "تحديد خاسرة",
  },
  "revenue.deal.resolveEscalation": {
    en: "Resolve escalation",
    ar: "إنهاء التصعيد",
  },
  "revenue.deal.escalateToHuman": {
    en: "Escalate to human",
    ar: "تصعيد إلى شخص",
  },
  "revenue.deal.recordPayment": {
    en: "Record payment",
    ar: "تسجيل دفعة",
  },
  "revenue.deal.recordRefund": {
    en: "Record refund",
    ar: "تسجيل استرداد",
  },
  "revenue.deal.stage": {
    en: "Deal stage",
    ar: "مرحلة الصفقة",
  },
  "revenue.deal.stageNew": {
    en: "New lead",
    ar: "عميل محتمل جديد",
  },
  "revenue.deal.stageQualified": {
    en: "Qualified",
    ar: "مؤهّل",
  },
  "revenue.deal.stageProposal": {
    en: "Proposal",
    ar: "عرض",
  },
  "revenue.deal.stageNegotiation": {
    en: "Negotiation",
    ar: "تفاوض",
  },
  "revenue.deal.stageWon": {
    en: "Won",
    ar: "رابحة",
  },
  "revenue.deal.stageLost": {
    en: "Lost",
    ar: "خاسرة",
  },
  "revenue.deal.currency": {
    en: "Currency",
    ar: "العملة",
  },
  "revenue.deal.value": {
    en: "Confirmed deal value",
    ar: "قيمة الصفقة المؤكدة",
  },
  "revenue.deal.unknown": {
    en: "Unknown",
    ar: "غير معروف",
  },
  "revenue.deal.expectedClose": {
    en: "Expected close",
    ar: "تاريخ الإغلاق المتوقع",
  },
  "revenue.deal.relatedProduct": {
    en: "Related product or service",
    ar: "المنتج أو الخدمة المرتبطة",
  },
  "revenue.deal.notLinked": {
    en: "Not linked",
    ar: "غير مرتبط",
  },
  "revenue.deal.bantLegend": {
    en: "BANT · confirm what you actually know",
    ar: "BANT · أكّد ما تعرفه فعلاً",
  },
  "revenue.deal.budget": {
    en: "Budget ({currency})",
    ar: "الميزانية ({currency})",
  },
  "revenue.deal.authority": {
    en: "Decision authority",
    ar: "صلاحية القرار",
  },
  "revenue.deal.authorityUnknown": {
    en: "Unknown",
    ar: "غير معروف",
  },
  "revenue.deal.authorityDecisionMaker": {
    en: "Decision-maker",
    ar: "صاحب القرار",
  },
  "revenue.deal.authorityInfluencer": {
    en: "Influencer",
    ar: "مؤثّر",
  },
  "revenue.deal.need": {
    en: "Confirmed need",
    ar: "الحاجة المؤكدة",
  },
  "revenue.deal.timeline": {
    en: "Confirmed purchase timeline",
    ar: "الإطار الزمني للشراء المؤكد",
  },
  "revenue.deal.customFieldsLegend": {
    en: "Custom sector fields",
    ar: "حقول القطاع المخصصة",
  },
  "revenue.deal.campaign": {
    en: "Campaign (team-entered, optional)",
    ar: "الحملة (يدخلها الفريق، اختياري)",
  },
  "revenue.deal.outcomeDescription": {
    en: "This records a final commercial outcome. A won deal is not collected revenue. Outcome history cannot be silently overwritten.",
    ar: "يسجّل هذا نتيجة تجارية نهائية. والصفقة الرابحة ليست إيراداً محصّلاً. ولا يمكن تجاوز سجل النتائج بصمت.",
  },
  "revenue.deal.winReasonLabel": {
    en: "Primary win reason",
    ar: "السبب الرئيسي للانتصار",
  },
  "revenue.deal.lossReasonLabel": {
    en: "Primary loss reason",
    ar: "السبب الرئيسي للخسارة",
  },
  "revenue.deal.reasonFit": {
    en: "Product / service fit",
    ar: "ملاءمة المنتج أو الخدمة",
  },
  "revenue.deal.reasonPrice": {
    en: "Price",
    ar: "السعر",
  },
  "revenue.deal.reasonTiming": {
    en: "Timing",
    ar: "التوقيت",
  },
  "revenue.deal.reasonTrust": {
    en: "Trust",
    ar: "الثقة",
  },
  "revenue.deal.reasonCompetition": {
    en: "Competition",
    ar: "المنافسة",
  },
  "revenue.deal.reasonService": {
    en: "Service",
    ar: "الخدمة",
  },
  "revenue.deal.reasonNoResponse": {
    en: "No response",
    ar: "لا يوجد رد",
  },
  "revenue.deal.reasonOther": {
    en: "Other",
    ar: "أخرى",
  },
  "revenue.deal.learned": {
    en: "What did you learn? (optional)",
    ar: "ما الذي تعلمته؟ (اختياري)",
  },
  "revenue.deal.receiptDescription": {
    en: "Owner-confirmed record in {currency}. This does not charge or refund a card. Keep a real receipt or transaction reference.",
    ar: "سجل يؤكده المالك بعملة {currency}. وهذا لا يخصم مبلغاً من بطاقة ولا يعيده. واحتفظ بإيصال حقيقي أو مرجع معاملة.",
  },
  "revenue.deal.amountReceived": {
    en: "Amount received",
    ar: "المبلغ المستلم",
  },
  "revenue.deal.amountRefunded": {
    en: "Amount refunded",
    ar: "المبلغ المسترد",
  },
  "revenue.deal.receiptReference": {
    en: "Receipt / transaction reference",
    ar: "مرجع الإيصال أو المعاملة",
  },
  "revenue.deal.verifiedReceipt": {
    en: "I verified this receipt outside DMCloser.",
    ar: "تحققت من هذا الإيصال خارج DMCloser.",
  },
  "revenue.deal.verifiedRefund": {
    en: "I verified this refund outside DMCloser.",
    ar: "تحققت من هذا المبلغ المسترد خارج DMCloser.",
  },
  "revenue.deal.quoteDescription": {
    en: "Use a current approved catalog price. The quote is a draft, not a sent message or an accepted order. Valid for seven days.",
    ar: "استخدم سعراً معتمداً حالياً من الكتالوج. وعرض السعر مسودة، وليست رسالة مُرسلة أو طلباً مقبولاً. وصالح لسبعة أيام.",
  },
  "revenue.deal.approvedProduct": {
    en: "Approved product / service",
    ar: "المنتج أو الخدمة المعتمدة",
  },
  "revenue.deal.chooseApprovedPrice": {
    en: "Choose an approved price",
    ar: "اختر سعراً معتمداً",
  },
  "revenue.deal.quantity": {
    en: "Quantity",
    ar: "الكمية",
  },
  "revenue.deal.needApprovedPrice": {
    en: "Add and approve a product price in Business Brain first. Its currency must match this opportunity.",
    ar: "أضف سعر منتج واعتمده في Business Brain أولاً. ويجب أن تطابق عملته هذه الفرصة.",
  },
  "revenue.deal.appointmentDescription": {
    en: "Record an internal appointment and export it to your calendar. Customer agreement and external calendar availability must be confirmed separately.",
    ar: "سجّل موعداً داخلياً وصدّره إلى تقويمك. ويجب تأكيد موافقة العميل وتوفّر المواعيد في التقويم الخارجي بشكل منفصل.",
  },
  "revenue.deal.appointmentTitle": {
    en: "Appointment title",
    ar: "عنوان الموعد",
  },
  "revenue.deal.appointmentResource": {
    en: "Resource / team member",
    ar: "الموارد أو فرد الفريق",
  },
  "revenue.deal.startTimezone": {
    en: "Start in your timezone ({timezone})",
    ar: "البداية حسب منطقتك الزمنية ({timezone})",
  },
  "revenue.deal.duration": {
    en: "Duration",
    ar: "المدة",
  },
  "revenue.deal.minutes15": {
    en: "15 minutes",
    ar: "15 دقيقة",
  },
  "revenue.deal.minutes30": {
    en: "30 minutes",
    ar: "30 دقيقة",
  },
  "revenue.deal.hour1": {
    en: "1 hour",
    ar: "ساعة واحدة",
  },
  "revenue.deal.followUpDescription": {
    en: "Create a reminder, not an automatic message. New activity, a closed deal, or escalation will cancel it. The provider reply window still applies.",
    ar: "أنشئ تذكيراً، لا رسالة تلقائية. وسيُلغى عند أي نشاط جديد أو إغلاق الصفقة أو التصعيد. ولا تزال نافذة الرد لدى المزوّد سارية.",
  },
  "revenue.deal.remindMe": {
    en: "Remind me in my timezone",
    ar: "ذكّرني حسب منطقتي الزمنية",
  },
  "revenue.deal.draftToReview": {
    en: "Draft to review",
    ar: "مسودة للمراجعة",
  },
  "revenue.deal.defaultDraft": {
    en: "Just checking whether there is anything you would like clarified before your next step.",
    ar: "أتحقق فقط مما إذا كان هناك أي أمر تودّ توضيحه قبل خطوتك التالية.",
  },
  "revenue.deal.escalateActive": {
    en: "Pause contact automation and scheduled follow-ups while a person takes over.",
    ar: "أوقف أتمتة التواصل والمتابعات المجدولة أثناء تولّي شخص للطلب.",
  },
  "revenue.deal.escalateResolved": {
    en: "Resolving the escalation will not re-enable auto-send. Review the conversation before enabling it separately.",
    ar: "إنهاء التصعيد لن يعيد تفعيل الإرسال التلقائي. راجع المحادثة قبل تفعيله بشكل منفصل.",
  },
  "revenue.deal.reason": {
    en: "Reason",
    ar: "السبب",
  },
  "revenue.deal.reasonPlaceholder": {
    en: "e.g. Needs a specialist",
    ar: "مثال: يحتاج مختصاً",
  },
  "revenue.deal.actionEdit": {
    en: "Confirm this opportunity",
    ar: "تأكيد هذه الفرصة",
  },
  "revenue.deal.actionWon": {
    en: "Record a won deal",
    ar: "تسجيل صفقة رابحة",
  },
  "revenue.deal.actionLost": {
    en: "Record a lost deal",
    ar: "تسجيل صفقة خاسرة",
  },
  "revenue.deal.actionPayment": {
    en: "Record money received",
    ar: "تسجيل المبلغ المستلم",
  },
  "revenue.deal.actionRefund": {
    en: "Record a confirmed refund",
    ar: "تسجيل مبلغ مسترد مؤكد",
  },
  "revenue.deal.actionQuote": {
    en: "Prepare an approved-price quote",
    ar: "إعداد عرض سعر معتمد",
  },
  "revenue.deal.actionBook": {
    en: "Record an appointment",
    ar: "تسجيل موعد",
  },
  "revenue.deal.actionFollow": {
    en: "Schedule a follow-up reminder",
    ar: "جدولة تذكير متابعة",
  },
  "revenue.deal.actionEscalate": {
    en: "Bring in a person",
    ar: "إحالة الطلب إلى شخص",
  },
  "revenue.deal.buttonSaving": {
    en: "Saving...",
    ar: "جارٍ الحفظ...",
  },
  "revenue.deal.buttonSaveOpportunity": {
    en: "Save opportunity",
    ar: "حفظ الفرصة",
  },
  "revenue.deal.buttonConfirmWon": {
    en: "Confirm won outcome",
    ar: "تأكيد نتيجة الانتصار",
  },
  "revenue.deal.buttonConfirmLost": {
    en: "Confirm lost outcome",
    ar: "تأكيد نتيجة الخسارة",
  },
  "revenue.deal.buttonPrepareQuote": {
    en: "Prepare quote",
    ar: "إعداد عرض السعر",
  },
  "revenue.deal.buttonRecordAppointment": {
    en: "Record internal appointment",
    ar: "تسجيل موعد داخلي",
  },
  "revenue.deal.buttonScheduleReminder": {
    en: "Schedule reminder",
    ar: "جدولة التذكير",
  },
  "revenue.deal.buttonResolveEscalation": {
    en: "Resolve escalation",
    ar: "إنهاء التصعيد",
  },
  "revenue.deal.buttonEscalateToHuman": {
    en: "Escalate to human",
    ar: "تصعيد إلى شخص",
  },
  "revenue.deal.buttonRecordAmount": {
    en: "Record confirmed amount",
    ar: "تسجيل المبلغ المؤكد",
  },
  "revenue.deal.errorNonNegative": {
    en: "Use non-negative amounts with no more than two decimals.",
    ar: "استخدم مبالغ غير سالبة بعشرتين كحد أقصى.",
  },
  "revenue.deal.errorPositiveAmount": {
    en: "Enter the positive amount actually received or refunded.",
    ar: "أدخل المبلغ الموجب المستلم أو المسترد فعلياً.",
  },
  "revenue.deal.errorNotCompleted": {
    en: "This action could not be completed.",
    ar: "تعذّر إتمام هذا الإجراء.",
  },
};

/**
 * Knowledge kind labels live in `src/types/revenue.ts`; this maps the same
 * slugs to translated labels for the Business Brain surface.
 */
export const revenueBrainKindLabelKeys: Record<
  string,
  keyof typeof revenueStrings
> = {
  product: "revenue.brain.kindProduct",
  service: "revenue.brain.kindService",
  faq: "revenue.brain.kindFaq",
  offer: "revenue.brain.kindOffer",
  competitor: "revenue.brain.kindCompetitor",
  playbook: "revenue.brain.kindPlaybook",
  voice: "revenue.brain.kindVoice",
};

/**
 * Industry mode labels live in `src/types/revenue.ts`; this maps the same
 * slugs to translated labels for the Business Brain surface.
 */
export const revenueIndustryLabelKeys: Record<
  string,
  keyof typeof revenueStrings
> = {
  general: "revenue.brain.industryGeneral",
  real_estate: "revenue.brain.industryRealEstate",
  medical: "revenue.brain.industryMedical",
  automotive: "revenue.brain.industryAutomotive",
  beauty: "revenue.brain.industryBeauty",
  ecommerce: "revenue.brain.industryEcommerce",
  custom: "revenue.brain.industryCustom",
};

/**
 * Deal stage labels live in `src/types/revenue.ts`; this maps the same slugs
 * to translated labels for the Deal panel surface.
 */
export const revenueStageLabelKeys: Record<string, keyof typeof revenueStrings> =
  {
    new: "revenue.deal.stageNew",
    qualified: "revenue.deal.stageQualified",
    proposed: "revenue.deal.stageProposal",
    negotiation: "revenue.deal.stageNegotiation",
    won: "revenue.deal.stageWon",
    lost: "revenue.deal.stageLost",
  };

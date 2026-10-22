/**
 * AI Quality Lab surface: prompt versions, evaluation cases and run results.
 * Every entry carries both locales; a missing translation is a compile error.
 */
export const qualityStrings = {
  "quality.status.draft": { en: "Draft", ar: "مسودة" },
  "quality.status.published": { en: "Published", ar: "منشور" },
  "quality.status.blocked": { en: "Blocked", ar: "محظور" },
  "quality.status.archived": { en: "Archived", ar: "مؤرشف" },

  "quality.run.running": { en: "Running", ar: "قيد التنفيذ" },
  "quality.run.passed": { en: "No blocking failure", ar: "لا فشل حاجب" },
  "quality.run.failed": { en: "Blocking failure", ar: "فشل حاجب" },
  "quality.run.none": { en: "none", ar: "لا شيء" },
  "quality.run.casePassed": { en: "Passed", ar: "نجح" },
  "quality.run.caseFailed": { en: "Failed", ar: "أخفق" },

  "quality.kind.safety": { en: "Safety", ar: "السلامة" },
  "quality.kind.intent": { en: "Intent", ar: "النية" },
  "quality.kind.grounding": { en: "Grounding", ar: "الاستناد" },
  "quality.kind.language": { en: "Language", ar: "اللغة" },

  "quality.action.edit": { en: "Edit", ar: "تعديل" },
  "quality.action.delete": { en: "Delete", ar: "حذف" },
  "quality.action.enable": { en: "Enable", ar: "تفعيل" },
  "quality.action.disable": { en: "Disable", ar: "تعطيل" },
  "quality.action.publish": { en: "Publish", ar: "نشر" },
  "quality.action.run": { en: "Run evaluation", ar: "تشغيل التقييم" },
  "quality.action.newDraft": { en: "New draft", ar: "مسودة جديدة" },
  "quality.action.addCase": { en: "Add case", ar: "إضافة حالة" },

  "quality.page.label": { en: "AI Quality Lab", ar: "مختبر جودة الذكاء الاصطناعي" },
  "quality.page.title": {
    en: "Check the prompt before it answers.",
    ar: "افحص التعليمات قبل أن يجيب.",
  },
  "quality.page.description": {
    en: "Version the assistant instruction, run your own evaluation cases, and publish only what holds up. The lab never sends a message.",
    ar: "نظّم نسخةً من تعليمات المساعد، وشغّل حالات التقييم الخاصة بك، وانشر ما يصمد فقط. المختبر لا يرسل أي رسالة.",
  },

  "quality.section.effective": { en: "Effective prompt", ar: "التعليمات السارية" },
  "quality.section.versions": { en: "Prompt versions", ar: "نسخ التعليمات" },
  "quality.section.cases": { en: "Evaluation cases", ar: "حالات التقييم" },
  "quality.section.lastRun": { en: "Last evaluation", ar: "آخر تقييم" },

  "quality.source.versioned": { en: "versioned", ar: "منسخة" },
  "quality.source.builtIn": { en: "built-in", ar: "مدمجة" },

  "quality.version.label": { en: "Version {version}", ar: "الإصدار {version}" },
  "quality.version.fallbackNote": {
    en: "Prompt instruction",
    ar: "تعليمات المساعد",
  },
  "quality.version.editTitle": {
    en: "Edit prompt version",
    ar: "تعديل نسخة التعليمات",
  },
  "quality.version.editDescription": {
    en: "This text is the assistant instruction your workspace runs. Keep the grounding rules. A version that fails a blocking evaluation cannot be published, and a blocked version stops automatic sends.",
    ar: "هذا النص هو تعليمات المساعد التي يعمل بها مساحتك. أبقِ قواعد الاستناد. النسخة التي تفشل في تقييم حاجب لا يمكن نشرها، والنسخة المحظورة توقف الإرسال التلقائي.",
  },
  "quality.version.instructions": { en: "Instructions", ar: "التعليمات" },
  "quality.version.save": { en: "Save instructions", ar: "حفظ التعليمات" },

  "quality.effective.published": {
    en: "The published instruction is running.",
    ar: "التعليمات المنشورة هي السارية الآن.",
  },
  "quality.effective.publishedOn": {
    en: "Published {date}.",
    ar: "نُشرت في {date}.",
  },
  "quality.effective.builtIn": {
    en: "The built-in instruction is running.",
    ar: "التعليمات المدمجة هي السارية الآن.",
  },
  "quality.effective.builtInDescription": {
    en: "No version is published for this workspace, so the assistant uses the shipped instruction. Publish a version to replace it.",
    ar: "لا توجد نسخة منشورة لهذه المساحة، لذا يستخدم المساعد التعليمات المرفقة. انشر نسخة لاستبدالها.",
  },
  "quality.effective.blockedWarning": {
    en: "Version {version} is blocked: a blocking evaluation case failed. Automatic sends are paused for this workspace until a passing run clears the block.",
    ar: "الإصدار {version} محظور: فشلت حالة تقييم حاجبة. الإرسال التلقائي متوقف لهذه المساحة حتى ينجح تقييم ويزيل الحظر.",
  },
  "quality.effective.note": {
    en: "A published version is a snapshot of the instruction, including the tone and the sector boundary it was written with. Publish a new draft to adopt later changes.",
    ar: "الإصدار المنشور نسخة ثابتة من التعليمات، تشمل النبرة وحدود القطاع التي كُتبت بها. انشر مسودة جديدة لاعتماد التغييرات اللاحقة.",
  },

  "quality.versions.emptyTitle": { en: "No versions yet.", ar: "لا توجد نسخ بعد." },
  "quality.versions.emptyDescription": {
    en: "Create a draft to start from the published instruction or the built-in one.",
    ar: "أنشئ مسودة للبدء من التعليمات المنشورة أو المدمجة.",
  },

  "quality.case.addTitle": {
    en: "Add evaluation case",
    ar: "إضافة حالة تقييم",
  },
  "quality.case.editTitle": {
    en: "Edit evaluation case",
    ar: "تعديل حالة التقييم",
  },
  "quality.case.description": {
    en: "A case is one customer message and what a good reply looks like. Cases are your own records: keep them de-identified, and never paste a real customer detail here.",
    ar: "الحالة هي رسالة عميل واحدة وشكل الرد الجيد. الحالات سجلات خاصة بك: أبقِها بلا بيانات تعريفية، ولا تلصق هنا بيانات عميل حقيقية.",
  },
  "quality.case.name": { en: "Case name", ar: "اسم الحالة" },
  "quality.case.kind": { en: "What it checks", ar: "ما الذي تفحصه" },
  "quality.case.message": { en: "Customer message", ar: "رسالة العميل" },
  "quality.case.expectedIntent": {
    en: "Expected intent",
    ar: "النية المتوقعة",
  },
  "quality.case.expectedSafety": {
    en: "Expected safety",
    ar: "السلامة المتوقعة",
  },
  "quality.case.any": { en: "Any", ar: "أي" },
  "quality.case.safe": { en: "Safe", ar: "آمنة" },
  "quality.case.notSafe": { en: "Not safe", ar: "غير آمنة" },
  "quality.case.contains": {
    en: "Reply must contain (comma separated)",
    ar: "يجب أن يحتوي الرد (مفصول بفواصل)",
  },
  "quality.case.blocking": {
    en: "A failure blocks this version and stops automatic sends.",
    ar: "الفشل يحظر هذه النسخة ويوقف الإرسال التلقائي.",
  },
  "quality.case.enabled": {
    en: "Run this case in evaluations.",
    ar: "شغّل هذه الحالة في التقييمات.",
  },
  "quality.case.save": { en: "Save case", ar: "حفظ الحالة" },
  "quality.case.blockingLabel": { en: "Blocking", ar: "حاجبة" },
  "quality.case.notBlockingLabel": { en: "Not blocking", ar: "غير حاجبة" },
  "quality.case.enabledLabel": { en: "Enabled", ar: "مفعّلة" },
  "quality.case.disabledLabel": { en: "Disabled", ar: "معطّلة" },

  "quality.cases.emptyTitle": {
    en: "No evaluation cases yet.",
    ar: "لا توجد حالات تقييم بعد.",
  },
  "quality.cases.emptyDescription": {
    en: "A case is one customer message and the reply you expect. Add the situations that must never go wrong.",
    ar: "الحالة هي رسالة عميل واحدة والرد الذي تتوقعه. أضف المواقف التي يجب ألا تخيبئ أبداً.",
  },
  "quality.cases.note": {
    en: "The pass rate is a checklist result, not a model score. It is uncalibrated: it says whether the reply matched what you expected on the cases you wrote, and nothing more. Keep the case list small, current and de-identified.",
    ar: "نسبة النجاح نتيجة قائمة تدقيق، لا درجة نموذج. فهي غير معايَرة: تقول فقط ما إذا كان الرد مطابقاً لتوقعك في الحالات التي كتبتها. أبقِ قائمة الحالات صغيرة ومحدثة وبلا بيانات تعريفية.",
  },

  "quality.runs.emptyTitle": {
    en: "No evaluation has run yet.",
    ar: "لم يُشغَّل أي تقييم بعد.",
  },
  "quality.runs.emptyDescription": {
    en: "Run an evaluation on a version to see how each case answered.",
    ar: "شغّل تقييماً على نسخة لترى كيف أجابت كل حالة.",
  },
  "quality.runs.summary": { en: "Summary", ar: "الملخص" },
  "quality.runs.summaryCount": {
    en: "{passed} of {total} cases matched",
    ar: "{passed} من {total} حالة طابقت",
  },
  "quality.runs.versionRemoved": {
    en: "Version removed",
    ar: "أُزيل الإصدار",
  },
  "quality.runs.summaryNote": {
    en: ". A blocking failure blocks the version and pauses automatic sends.",
    ar: ". الفشل الحاجب يحظر الإصدار ويوقف الإرسال التلقائي مؤقتاً.",
  },
  "quality.runs.note": {
    en: "Evaluations run in the background job queue, so a slow model never blocks your inbox. The lab is a review surface: it can pause automation, it never starts a send.",
    ar: "تُشغَّل التقييمات في طابور المهام الخلفي، لذا لا يعطّل نموذج بطيء صندوق الوارد أبداً. المختبر سطح مراجعة: يوقف الإرسال التلقائي، ولا يبدأ أي إرسال.",
  },

  "quality.notice.draftCreated": {
    en: "Draft created. Edit it, then run the evaluation.",
    ar: "أُنشئت المسودة. عدّلها ثم شغّل التقييم.",
  },
  "quality.notice.runQueued": {
    en: "Evaluation queued. Results appear when the run finishes.",
    ar: "قُدّم التقييم إلى الطابور. تظهر النتائج عند انتهائه.",
  },
  "quality.notice.published": {
    en: "Version published. It is now the effective prompt.",
    ar: "نُشرت النسخة. صارت هي التعليمات السارية.",
  },
  "quality.notice.caseEnabled": { en: "Case enabled.", ar: "فُعّلت الحالة." },
  "quality.notice.caseDisabled": { en: "Case disabled.", ar: "عُطّلت الحالة." },
  "quality.notice.caseDeleted": { en: "Case deleted.", ar: "حُذفت الحالة." },
  "quality.notice.instructionsSaved": {
    en: "Instructions saved.",
    ar: "حُفظت التعليمات.",
  },
  "quality.notice.caseSaved": { en: "Case saved.", ar: "حُفظت الحالة." },

  "quality.error.load": {
    en: "The quality lab could not be loaded.",
    ar: "تعذّر تحميل مختبر الجودة.",
  },
  "quality.error.retry": { en: "Please try again.", ar: "يرجى المحاولة مرة أخرى." },
  "quality.error.save": { en: "Could not save.", ar: "تعذّر الحفظ." },
};

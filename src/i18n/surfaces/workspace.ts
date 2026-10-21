/**
 * Live workspace surfaces: authentication, account settings, simulator,
 * conversation list and the workspace banners.
 * Every entry carries both locales; a missing translation is a compile error.
 */
export const workspaceStrings = {
  "workspace.common.tryAgain": {
    en: "Please try again.",
    ar: "يرجى المحاولة مرة أخرى.",
  },
  "workspace.common.refresh": {
    en: "Refresh",
    ar: "تحديث",
  },

  // Authentication and service states.
  "workspace.auth.documentTitle.signIn": {
    en: "Sign in - DMCloser",
    ar: "تسجيل الدخول - DMCloser",
  },
  "workspace.auth.documentTitle.register": {
    en: "Create your workspace - DMCloser",
    ar: "أنشئ مساحة عملك - DMCloser",
  },
  "workspace.auth.documentTitle.recover": {
    en: "Account recovery - DMCloser",
    ar: "استعادة الحساب - DMCloser",
  },
  "workspace.auth.homeLabel": {
    en: "DMCloser home",
    ar: "الصفحة الرئيسية لـ DMCloser",
  },
  "workspace.auth.exploreDemo": {
    en: "Explore the demo",
    ar: "استعرض العرض التجريبي",
  },
  "workspace.auth.eyebrow": {
    en: "Your business. Your voice.",
    ar: "مشروعك. صوتك.",
  },
  "workspace.auth.title.register": {
    en: "Your next chapter starts here.",
    ar: "فصلك القادم يبدأ من هنا.",
  },
  "workspace.auth.title.login": {
    en: "Welcome back.",
    ar: "أهلاً بعودتك.",
  },
  "workspace.auth.title.recover": {
    en: "A fresh start for your password.",
    ar: "بداية جديدة لكلمة المرور.",
  },
  "workspace.auth.title.reset": {
    en: "Set a new password.",
    ar: "عيّن كلمة مرور جديدة.",
  },
  "workspace.auth.title.verify": {
    en: "One last step.",
    ar: "خطوة أخيرة.",
  },
  "workspace.auth.subtitle.register": {
    en: "A private inbox for your business, with 14 days to make it yours. No card required.",
    ar: "صندوق وارد خاص بمشروعك، مع 14 يوماً لتجعله ملكك. ولا حاجة إلى بطاقة.",
  },
  "workspace.auth.subtitle.login": {
    en: "Your conversations are right where you left them.",
    ar: "محادثاتك في المكان الذي تركته فيها.",
  },
  "workspace.auth.subtitle.verify": {
    en: "Confirm your email to connect your messaging accounts.",
    ar: "أكّد بريدك الإلكتروني لربط حسابات المراسلة.",
  },
  "workspace.auth.subtitle.password": {
    en: "Use a unique password with at least 12 characters.",
    ar: "استخدم كلمة مرور فريدة من 12 حرفاً على الأقل.",
  },
  "workspace.auth.field.name": {
    en: "Your name",
    ar: "اسمك",
  },
  "workspace.auth.field.business": {
    en: "Business name",
    ar: "اسم المشروع",
  },
  "workspace.auth.field.email": {
    en: "Work email",
    ar: "البريد الإلكتروني للعمل",
  },
  "workspace.auth.field.password": {
    en: "Password",
    ar: "كلمة المرور",
  },
  "workspace.auth.field.passwordHelp": {
    en: "At least 12 characters.",
    ar: "12 حرفاً على الأقل.",
  },
  "workspace.auth.pending": {
    en: "One moment...",
    ar: "لحظة من فضلك...",
  },
  "workspace.auth.submit.register": {
    en: "Create workspace",
    ar: "أنشئ مساحة العمل",
  },
  "workspace.auth.submit.login": {
    en: "Sign in",
    ar: "تسجيل الدخول",
  },
  "workspace.auth.submit.recover": {
    en: "Send recovery link",
    ar: "أرسل رابط الاستعادة",
  },
  "workspace.auth.submit.reset": {
    en: "Save new password",
    ar: "احفظ كلمة المرور الجديدة",
  },
  "workspace.auth.submit.verify": {
    en: "Verify email",
    ar: "تأكيد البريد الإلكتروني",
  },
  "workspace.auth.switch.login": {
    en: "Already have an account? Sign in",
    ar: "لديك حساب بالفعل؟ سجّل الدخول",
  },
  "workspace.auth.switch.register": {
    en: "Create a new workspace",
    ar: "أنشئ مساحة عمل جديدة",
  },
  "workspace.auth.forgotPassword": {
    en: "Forgot your password?",
    ar: "هل نسيت كلمة المرور؟",
  },
  "workspace.auth.notice.passwordChanged": {
    en: "Password changed. Sign in with your new password.",
    ar: "تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.",
  },
  "workspace.auth.notice.emailVerified": {
    en: "Email verified. Sign in to continue.",
    ar: "تم تأكيد البريد الإلكتروني. سجّل الدخول للمتابعة.",
  },
  "workspace.auth.note": {
    en: "Account data is stored on the server. Connecting Meta accounts requires approved business permissions. Live AI needs the service owner's API configuration.",
    ar: "تُحفظ بيانات الحساب على الخادم. يتطلب ربط حسابات Meta أذونات عمل معتمدة. ويحتاج الذكاء الاصطناعي الحي إلى إعدادات API من مالك الخدمة.",
  },
  "workspace.auth.backToSite": {
    en: "Back to the website",
    ar: "العودة إلى الموقع",
  },
  "workspace.auth.footer": {
    en: "DMCloser. A little closer, every day.",
    ar: "DMCloser. أقرب قليلاً كل يوم.",
  },

  // Workspace service states.
  "workspace.service.loading": {
    en: "Opening your workspace...",
    ar: "جارٍ فتح مساحة عملك...",
  },
  "workspace.service.unavailableTitle": {
    en: "Your workspace is a moment away.",
    ar: "مساحة عملك على بعد لحظات.",
  },
  "workspace.service.unavailable": {
    en: "The server is unavailable.",
    ar: "الخادم غير متاح.",
  },
  "workspace.service.tryAgain": {
    en: "Try again",
    ar: "حاول مرة أخرى",
  },
  "workspace.service.exploreDemo": {
    en: "Explore the offline demo",
    ar: "استعرض العرض التجريبي دون اتصال",
  },

  // Inline error fallbacks.
  "workspace.error.refreshInbox": {
    en: "Could not refresh your inbox.",
    ar: "تعذّر تحديث صندوق الوارد.",
  },
  "workspace.error.loadMore": {
    en: "Could not load more conversations.",
    ar: "تعذّر تحميل مزيد من المحادثات.",
  },
  "workspace.error.draftNotSaved": {
    en: "Your draft has not been saved.",
    ar: "لم يتم حفظ مسودتك.",
  },
  "workspace.error.pauseAutomation": {
    en: "Could not pause automation.",
    ar: "تعذّر إيقاف الأتمتة.",
  },
  "workspace.error.actionFailed": {
    en: "The action could not be completed.",
    ar: "تعذّر إتمام الإجراء.",
  },

  // Account settings.
  "workspace.account.messaging.title": {
    en: "Messaging accounts",
    ar: "حسابات المراسلة",
  },
  "workspace.account.messaging.description": {
    en: "Connect your approved business account. Messages appear here as soon as your webhook is active.",
    ar: "اربط حساب عملك المعتمد. تظهر الرسائل هنا فور تفعيل webhook الخاص بك.",
  },
  "workspace.account.messaging.emailUnverified": {
    en: "Email not verified.",
    ar: "لم يتم تأكيد البريد الإلكتروني.",
  },
  "workspace.account.messaging.verificationSent": {
    en: "Verification email sent. Check your inbox.",
    ar: "تم إرسال رسالة التأكيد. تحقق من صندوق الوارد.",
  },
  "workspace.account.messaging.sendVerification": {
    en: "Send verification email",
    ar: "إرسال رسالة التأكيد",
  },
  "workspace.account.messaging.readyToConnect": {
    en: "Ready to connect",
    ar: "جاهز للربط",
  },
  "workspace.account.messaging.serverConfigurationRequired": {
    en: "Server configuration required",
    ar: "يلزم إعداد من الخادم",
  },
  "workspace.account.messaging.manage": {
    en: "Manage",
    ar: "إدارة",
  },
  "workspace.account.messaging.connect": {
    en: "Connect",
    ar: "ربط",
  },
  "workspace.account.messaging.serviceWindow": {
    en: "Free-form replies are limited to 24 hours after the latest customer message. Automatic replies never bypass Meta's service window.",
    ar: "تُقصر الردود الحرة على 24 ساعة بعد آخر رسالة من العميل. ولا تتجاوز الردود التلقائية نافذة خدمة Meta أبداً.",
  },

  "workspace.account.usage.title": {
    en: "Plan & usage",
    ar: "الخطة والاستهلاك",
  },
  "workspace.account.usage.trialEnds": {
    en: "Your trial ends {date}.",
    ar: "تنتهي فترتك التجريبية في {date}.",
  },
  "workspace.account.usage.planLine": {
    en: "{plan} plan · {status}",
    ar: "خطة {plan} · {status}",
  },
  "workspace.account.usage.plan.starter": {
    en: "Starter",
    ar: "البداية",
  },
  "workspace.account.usage.plan.growth": {
    en: "Growth",
    ar: "النمو",
  },
  "workspace.account.usage.aiRequests": {
    en: "AI requests this month",
    ar: "طلبات الذكاء الاصطناعي هذا الشهر",
  },
  "workspace.account.usage.newConversations": {
    en: "New conversations",
    ar: "المحادثات الجديدة",
  },
  "workspace.account.usage.automationPaused": {
    en: "Automation is paused until your subscription is active. Your inbox and export remain available.",
    ar: "الأتمتة متوقفة حتى ينشط اشتراكك. ويظل صندوق الوارد وتصدير البيانات متاحين.",
  },
  "workspace.account.billing.frequency": {
    en: "Billing frequency",
    ar: "دورة الفوترة",
  },
  "workspace.account.billing.monthly": {
    en: "Monthly",
    ar: "شهري",
  },
  "workspace.account.billing.yearly": {
    en: "Yearly",
    ar: "سنوي",
  },
  "workspace.account.billing.chooseStarter": {
    en: "Choose Starter",
    ar: "اختر البداية",
  },
  "workspace.account.billing.chooseGrowth": {
    en: "Choose Growth",
    ar: "اختر النمو",
  },
  "workspace.account.billing.manage": {
    en: "Manage billing",
    ar: "إدارة الفوترة",
  },
  "workspace.account.billing.notConfigured": {
    en: "Payments are not configured by the service owner. No payment will be collected here.",
    ar: "لم يُعِد مالك الخدمة إعداد الدفع. ولن يتم تحصيل أي دفعة هنا.",
  },

  "workspace.account.team.title": {
    en: "Your team",
    ar: "فريقك",
  },
  "workspace.account.team.seats": {
    en: "{count} of {seats} seats. Only the owner can change billing, integrations, or workspace policy.",
    ar: "{count} من {seats} مقاعد. يملك المالك وحده صلاحية تغيير الفوترة والتكاملات أو سياسة مساحة العمل.",
  },
  "workspace.account.team.removeMember": {
    en: "Remove {name}",
    ar: "إزالة {name}",
  },
  "workspace.account.team.memberRemoved": {
    en: "Team member removed.",
    ar: "تمت إزالة عضو الفريق.",
  },
  "workspace.account.team.inviteByEmail": {
    en: "Invite by email",
    ar: "دعوة عبر البريد الإلكتروني",
  },
  "workspace.account.team.createInvitation": {
    en: "Create invitation",
    ar: "إنشاء دعوة",
  },
  "workspace.account.team.invitationSent": {
    en: "Invitation email sent.",
    ar: "تم إرسال رسالة الدعوة.",
  },
  "workspace.account.team.emailNotConfigured": {
    en: "Email is not configured. Share this private invitation link directly.",
    ar: "لم يتم إعداد البريد الإلكتروني. شارك رابط الدعوة الخاص بك مباشرة.",
  },
  "workspace.account.team.inviteLinkLabel": {
    en: "Private invite link",
    ar: "رابط الدعوة الخاص",
  },
  "workspace.account.team.inviteLinkHelp": {
    en: "Expires in 48 hours. The recipient must sign in with the invited email.",
    ar: "ينتهي خلال 48 ساعة. ويجب على المستلم تسجيل الدخول بالبريد الإلكتروني المُدعى.",
  },

  "workspace.account.operations.title": {
    en: "Activity & reliability",
    ar: "النشاط والموثوقية",
  },
  "workspace.account.operations.description": {
    en: "Review failures before retrying. Provider timeouts are never blindly resent.",
    ar: "راجع الأعطال قبل إعادة المحاولة. ولا تُعاد مهلة مزود الخدمة دون مراجعة.",
  },
  "workspace.account.operations.check": {
    en: "Check background work",
    ar: "مراجعة المهام الخلفية",
  },
  "workspace.account.operations.latency": {
    en: "AI p95: {ms}ms across {count} replies in the last 24 hours.",
    ar: "زمن استجابة AI عند المئين 95: {ms}ms عبر {count} رداً خلال آخر 24 ساعة.",
  },
  "workspace.account.operations.noLatency": {
    en: "No AI latency samples yet.",
    ar: "لا توجد عينات زمن استجابة للذكاء الاصطناعي بعد.",
  },
  "workspace.account.operations.target": {
    en: "Target: under two seconds, not a guaranteed result.",
    ar: "الهدف: أقل من ثانيتين، وليس نتيجة مضمونة.",
  },
  "workspace.account.operations.attempt": {
    en: "attempt {attempts}",
    ar: "المحاولة {attempts}",
  },
  "workspace.account.operations.retryScheduled": {
    en: "Retry scheduled.",
    ar: "تمت جدولة إعادة المحاولة.",
  },
  "workspace.account.operations.retrySafely": {
    en: "Retry safely",
    ar: "إعادة محاولة آمنة",
  },
  "workspace.account.operations.noJobs": {
    en: "No pending or failed jobs.",
    ar: "لا توجد مهام معلّقة أو فاشلة.",
  },
  "workspace.account.operations.auditSummary": {
    en: "Recent workspace activity",
    ar: "نشاط مساحة العمل الأخير",
  },

  "workspace.account.security.title": {
    en: "Account & data",
    ar: "الحساب والبيانات",
  },
  "workspace.account.security.signedInAs": {
    en: "Signed in as {email}. Your workspace is stored on the server, not in browser local storage.",
    ar: "تم تسجيل الدخول باسم {email}. وتُخزَّن مساحة العمل على الخادم، لا في التخزين المحلي للمتصفح.",
  },
  "workspace.account.security.switchWorkspace": {
    en: "Switch workspace",
    ar: "تبديل مساحة العمل",
  },
  "workspace.account.security.changePassword": {
    en: "Change password",
    ar: "تغيير كلمة المرور",
  },
  "workspace.account.security.passwordUpdated": {
    en: "Password updated. Other sessions were signed out.",
    ar: "تم تحديث كلمة المرور. وتم تسجيل الخروج من الجلسات الأخرى.",
  },
  "workspace.account.security.currentPassword": {
    en: "Current password",
    ar: "كلمة المرور الحالية",
  },
  "workspace.account.security.newPassword": {
    en: "New password",
    ar: "كلمة المرور الجديدة",
  },
  "workspace.account.security.updatePassword": {
    en: "Update password",
    ar: "تحديث كلمة المرور",
  },
  "workspace.account.security.exportWorkspace": {
    en: "Export workspace",
    ar: "تصدير مساحة العمل",
  },
  "workspace.account.security.exportDownloaded": {
    en: "Workspace export downloaded.",
    ar: "تم تنزيل تصدير مساحة العمل.",
  },
  "workspace.account.security.signOut": {
    en: "Sign out",
    ar: "تسجيل الخروج",
  },
  "workspace.account.security.deleteWorkspace": {
    en: "Delete workspace",
    ar: "حذف مساحة العمل",
  },

  // Connecting a messaging account.
  "workspace.account.connect.title": {
    en: "Connect {platform}",
    ar: "ربط {platform}",
  },
  "workspace.account.connect.instagramInfo": {
    en: "Instagram will ask you to approve messaging access. Your account must be professional, and the service owner needs approved Meta permissions.",
    ar: "سيطلب منك Instagram الموافقة على الوصول إلى المراسلة. ويجب أن يكون حسابك احترافياً، ويحتاج مالك الخدمة إلى أذونات Meta معتمدة.",
  },
  "workspace.account.connect.whatsappInfo": {
    en: "Use the phone number ID and a system-user token from your Meta Business account. The token is encrypted on the server and is never returned to this browser.",
    ar: "استخدم معرّف رقم الهاتف ورمز مستخدم النظام من حساب Meta Business. ويُشفَّر الرمز على الخادم ولا يعود إلى هذا المتصفح أبداً.",
  },
  "workspace.account.connect.notConfigured": {
    en: "The service owner must configure {what} before this account can connect.",
    ar: "يجب أن يهيئ مالك الخدمة {what} قبل ربط هذا الحساب.",
  },
  "workspace.account.connect.instagramRequirement": {
    en: "Instagram Business Login and webhook credentials",
    ar: "بيانات دخول Instagram Business وبيانات اعتماد webhook",
  },
  "workspace.account.connect.whatsappRequirement": {
    en: "the Meta app secret and webhook verification token",
    ar: "سر تطبيق Meta ورمز التحقق الخاص بـ webhook",
  },
  "workspace.account.connect.continueWithInstagram": {
    en: "Continue with Instagram",
    ar: "المتابعة عبر Instagram",
  },
  "workspace.account.connect.phoneNumberId": {
    en: "Phone number ID",
    ar: "معرّف رقم الهاتف",
  },
  "workspace.account.connect.accessToken": {
    en: "System-user access token",
    ar: "رمز وصول مستخدم النظام",
  },
  "workspace.account.connect.verifyAndConnect": {
    en: "Verify & connect",
    ar: "تحقق واربط",
  },
  "workspace.account.connect.whatsappVerified": {
    en: "WhatsApp credentials verified and connected. Configure the webhook subscription in Meta before sending a test message.",
    ar: "تم التحقق من بيانات WhatsApp وربطها. وهيئ اشتراك webhook في Meta قبل إرسال رسالة اختبار.",
  },
  "workspace.account.connect.disconnect": {
    en: "Disconnect account",
    ar: "فصل الحساب",
  },
  "workspace.account.connect.disconnected": {
    en: "Account disconnected. Automatic sends for this channel are disabled.",
    ar: "تم فصل الحساب. وأُعطِل الإرسال التلقائي لهذه القناة.",
  },

  // Deleting a workspace.
  "workspace.account.delete.title": {
    en: "Delete this workspace?",
    ar: "حذف مساحة العمل هذه؟",
  },
  "workspace.account.delete.warning": {
    en: "All conversations, lead memory, drafts, connections, and team access in this workspace will be permanently deleted. Any active subscription will be cancelled first.",
    ar: "ستُحذف نهائياً جميع المحادثات وذاكرة العملاء المحتملين والمسودات والاتصالات ووصول الفريق في مساحة العمل هذه. وسيُلغى أي اشتراك نشط أولاً.",
  },
  "workspace.account.delete.confirmPassword": {
    en: "Confirm your password",
    ar: "أكّد كلمة المرور",
  },
  "workspace.account.delete.understood": {
    en: "I understand this cannot be undone.",
    ar: "أفهم أن هذا الإجراء لا يمكن التراجع عنه.",
  },
  "workspace.account.delete.submit": {
    en: "Permanently delete workspace",
    ar: "حذف مساحة العمل نهائياً",
  },

  // Workspace banners.
  "workspace.notice.connected": {
    en: "Messaging account connected.",
    ar: "تم ربط حساب المراسلة.",
  },
  "workspace.notice.cancelled": {
    en: "Account connection was cancelled.",
    ar: "أُلغي ربط الحساب.",
  },
  "workspace.notice.failed": {
    en: "Connection could not be completed. Review account permissions and try again.",
    ar: "تعذّر إكمال الربط. راجع أذونات الحساب وحاول مرة أخرى.",
  },
  "workspace.notice.checkoutReturned": {
    en: "Checkout returned. Your plan changes only after the verified billing webhook arrives.",
    ar: "عادت صفحة الدفع. ولا تتغير خطتك إلا بعد وصول إشعار الفوترة الموثّق.",
  },
  "workspace.notice.checkoutCancelled": {
    en: "Checkout cancelled. No plan change was made.",
    ar: "أُلغيت عملية الدفع. ولم يتم تغيير الخطة.",
  },
  "workspace.notice.invitation": {
    en: "You have a workspace invitation. Accepting switches this session to the invited workspace.",
    ar: "لديك دعوة لمساحة عمل. وقبولها يحوّل هذه الجلسة إلى مساحة العمل المُدعى إليها.",
  },
  "workspace.notice.verifyEmail": {
    en: "Confirm the email for this account.",
    ar: "أكّد البريد الإلكتروني لهذا الحساب.",
  },
  "workspace.notice.acceptInvitation": {
    en: "Accept invitation",
    ar: "قبول الدعوة",
  },
  "workspace.notice.verify": {
    en: "Verify email",
    ar: "تأكيد البريد الإلكتروني",
  },
  "workspace.notice.reconnecting": {
    en: "Reconnecting to live updates. Your draft is preserved.",
    ar: "جارٍ إعادة الاتصال للتحديثات الحية. ومسودتك محفوظة.",
  },

  // Development simulator.
  "workspace.simulator.open": {
    en: "Test an inbound message",
    ar: "اختبر رسالة واردة",
  },
  "workspace.simulator.title": {
    en: "Test your inbox pipeline",
    ar: "اختبر خط أنابيب صندوق الوارد",
  },
  "workspace.simulator.description": {
    en: "Development only. This writes a message to your database and exercises the AI job pipeline. It cannot send to a real account.",
    ar: "للتطوير فقط. يكتب هذا رسالة في قاعدة بياناتك ويشغّل خط مهام الذكاء الاصطناعي. ولا يمكنه الإرسال إلى حساب حقيقي.",
  },
  "workspace.simulator.field.name": {
    en: "Contact name",
    ar: "اسم جهة الاتصال",
  },
  "workspace.simulator.field.channel": {
    en: "Channel",
    ar: "القناة",
  },
  "workspace.simulator.field.message": {
    en: "Inbound message",
    ar: "الرسالة الواردة",
  },
  "workspace.simulator.submit": {
    en: "Add test message",
    ar: "أضف رسالة اختبار",
  },

  // Conversation list.
  "workspace.conversation.openWith": {
    en: "Open conversation with {name}",
    ar: "فتح محادثة مع {name}",
  },
  "workspace.conversation.unread": {
    en: ", unread",
    ar: "، غير مقروء",
  },
  "workspace.conversation.draftPrefix": {
    en: "Draft: ",
    ar: "مسودة: ",
  },
  "workspace.intent.buy": {
    en: "Buy",
    ar: "شراء",
  },
  "workspace.intent.question": {
    en: "Question",
    ar: "استفسار",
  },
  "workspace.intent.spam": {
    en: "Spam",
    ar: "مزعج",
  },
  "workspace.status.new": {
    en: "New lead",
    ar: "عميل محتمل جديد",
  },
  "workspace.status.engaged": {
    en: "Engaged",
    ar: "مهتم",
  },
  "workspace.status.qualified": {
    en: "Qualified",
    ar: "مؤهل",
  },
  "workspace.status.converted": {
    en: "Converted",
    ar: "تم التحويل",
  },
  "workspace.status.lost": {
    en: "Closed",
    ar: "مغلق",
  },
};

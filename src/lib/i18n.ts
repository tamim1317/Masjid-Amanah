export type Locale = "bn" | "en";

export const defaultLocale: Locale = "bn";

type Dictionary = Record<string, string>;

const bn: Dictionary = {
  // Brand
  "brand.name": "মসজিদ আমানাহ",
  "brand.tagline": "স্বচ্ছতা · আমানত · জবাবদিহিতা",

  // Nav public
  "nav.home": "হোম",
  "nav.prayer": "নামাজের সময়",
  "nav.announcements": "ঘোষণা",
  "nav.donate": "অনুদান",
  "nav.finance": "আর্থিক প্রতিবেদন",
  "nav.assets": "সম্পদ",
  "nav.contact": "যোগাযোগ",
  "nav.admin": "অ্যাডমিন",
  "nav.platform": "প্ল্যাটফর্ম",

  // Nav admin
  "admin.dashboard": "ড্যাশবোর্ড",
  "admin.accounting": "হিসাব",
  "admin.journal": "জার্নাল",
  "admin.funds": "তহবিল",
  "admin.transfers": "স্থানান্তর",
  "admin.approvals": "অনুমোদন",
  "admin.donations": "অনুদান",
  "admin.reports": "রিপোর্ট",
  "admin.staff": "কর্মী",
  "admin.committee": "কমিটি",
  "admin.assets": "সম্পদ",
  "admin.announcements": "ঘোষণা",
  "admin.settings": "সেটিংস",
  "admin.users": "ব্যবহারকারী",
  "admin.audit": "অডিট লগ",

  // Common
  "common.loading": "লোড হচ্ছে…",
  "common.error": "কিছু ভুল হয়েছে",
  "common.empty": "কোনো তথ্য নেই",
  "common.search": "অনুসন্ধান",
  "common.filter": "ফিল্টার",
  "common.export": "এক্সপোর্ট",
  "common.save": "সংরক্ষণ",
  "common.cancel": "বাতিল",
  "common.view": "দেখুন",
  "common.edit": "সম্পাদনা",
  "common.demo": "ডেমো ডেটা",
  "common.published": "প্রকাশিত",
  "common.pending": "অপেক্ষমাণ",
  "common.unverified": "যাচাই হয়নি",
  "common.all": "সব",
  "common.language": "ভাষা",
  "common.back": "ফিরে যান",

  // Finance labels
  "finance.balance": "ব্যালেন্স",
  "finance.income": "আয়",
  "finance.expense": "ব্যয়",
  "finance.fund": "তহবিল",
  "finance.total": "মোট",
  "finance.zakat": "যাকাত",
  "finance.sadaqah": "সদকা",
  "finance.general": "সাধারণ",
  "finance.construction": "নির্মাণ",
  "finance.disclaimer":
    "এই তথ্য মসজিদ কর্তৃপক্ষ কর্তৃক প্রকাশিত। প্ল্যাটফর্ম কোনো আর্থিক যাচাই করে না।",

  // Status
  "status.posted": "পোস্টেড",
  "status.pending_approval": "অনুমোদনের অপেক্ষায়",
  "status.draft": "খসড়া",
  "status.approved": "অনুমোদিত",
  "status.rejected": "প্রত্যাখ্যাত",

  // Dashboard
  "dash.welcome": "স্বাগতম",
  "dash.overview": "সারসংক্ষেপ",
  "dash.recent": "সাম্প্রতিক লেনদেন",
  "dash.pending_approvals": "অপেক্ষমাণ অনুমোদন",

  // Platform
  "platform.tenants": "মসজিদসমূহ",
  "platform.health": "সিস্টেম স্বাস্থ্য",
  "platform.users": "ব্যবহারকারী",
};

const en: Dictionary = {
  "brand.name": "Masjid Amanah",
  "brand.tagline": "Transparency · Trust · Accountability",

  "nav.home": "Home",
  "nav.prayer": "Prayer Times",
  "nav.announcements": "Announcements",
  "nav.donate": "Donate",
  "nav.finance": "Financial Reports",
  "nav.assets": "Assets",
  "nav.contact": "Contact",
  "nav.admin": "Admin",
  "nav.platform": "Platform",

  "admin.dashboard": "Dashboard",
  "admin.accounting": "Accounting",
  "admin.journal": "Journal",
  "admin.funds": "Funds",
  "admin.transfers": "Transfers",
  "admin.approvals": "Approvals",
  "admin.donations": "Donations",
  "admin.reports": "Reports",
  "admin.staff": "Staff",
  "admin.committee": "Committee",
  "admin.assets": "Assets",
  "admin.announcements": "Announcements",
  "admin.settings": "Settings",
  "admin.users": "Users",
  "admin.audit": "Audit Log",

  "common.loading": "Loading…",
  "common.error": "Something went wrong",
  "common.empty": "No data available",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.export": "Export",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.view": "View",
  "common.edit": "Edit",
  "common.demo": "Demo data",
  "common.published": "Published",
  "common.pending": "Pending",
  "common.unverified": "Unverified",
  "common.all": "All",
  "common.language": "Language",
  "common.back": "Back",

  "finance.balance": "Balance",
  "finance.income": "Income",
  "finance.expense": "Expense",
  "finance.fund": "Fund",
  "finance.total": "Total",
  "finance.zakat": "Zakat",
  "finance.sadaqah": "Sadaqah",
  "finance.general": "General",
  "finance.construction": "Construction",
  "finance.disclaimer":
    "This information is published by the mosque administration. The platform does not independently verify financial figures.",

  "status.posted": "Posted",
  "status.pending_approval": "Pending approval",
  "status.draft": "Draft",
  "status.approved": "Approved",
  "status.rejected": "Rejected",

  "dash.welcome": "Welcome",
  "dash.overview": "Overview",
  "dash.recent": "Recent transactions",
  "dash.pending_approvals": "Pending approvals",

  "platform.tenants": "Mosques",
  "platform.health": "System health",
  "platform.users": "Users",
};

const dictionaries: Record<Locale, Dictionary> = { bn, en };

export function t(key: string, locale: Locale = defaultLocale): string {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

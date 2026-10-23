/**
 * Clearly labelled DEMO data only.
 * Not connected to any real mosque, ledger, or payment system.
 */

export const DEMO_MOSQUE = {
  slug: "al-amanah-dhaka",
  nameBn: "মসজিদ আল-আমানাহ, ঢাকা",
  nameEn: "Masjid Al-Amanah, Dhaka",
  addressBn: "হাউস ১২, রোড ৪, ধানমন্ডি, ঢাকা ১২০৫",
  addressEn: "House 12, Road 4, Dhanmondi, Dhaka 1205",
  phone: "+880 1712-345678",
  email: "info@demo.masjid-amanah.example",
  imamBn: "মাওলানা আব্দুল্লাহ আল-মাহমুদ",
  imamEn: "Maulana Abdullah Al-Mahmud",
  established: "1987",
  isDemo: true as const,
};

export type FundStatus = "published" | "pending" | "unverified";

export interface DemoFund {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  balance: number;
  status: FundStatus;
  restriction: "restricted" | "unrestricted";
}

export const DEMO_FUNDS: DemoFund[] = [
  {
    id: "f1",
    code: "GENERAL",
    nameBn: "সাধারণ তহবিল",
    nameEn: "General Fund",
    balance: 485_200,
    status: "published",
    restriction: "unrestricted",
  },
  {
    id: "f2",
    code: "ZAKAT",
    nameBn: "যাকাত তহবিল",
    nameEn: "Zakat Fund",
    balance: 312_500,
    status: "published",
    restriction: "restricted",
  },
  {
    id: "f3",
    code: "SADAQAH",
    nameBn: "সদকা তহবিল",
    nameEn: "Sadaqah Fund",
    balance: 98_750,
    status: "published",
    restriction: "restricted",
  },
  {
    id: "f4",
    code: "CONSTRUCTION",
    nameBn: "নির্মাণ তহবিল",
    nameEn: "Construction Fund",
    balance: 1_250_000,
    status: "pending",
    restriction: "restricted",
  },
  {
    id: "f5",
    code: "WAQF",
    nameBn: "ওয়াকফ তহবিল",
    nameEn: "Waqf Fund",
    balance: 45_000,
    status: "unverified",
    restriction: "restricted",
  },
];

export interface DemoTransaction {
  id: string;
  date: string;
  descriptionBn: string;
  descriptionEn: string;
  fundCode: string;
  amount: number;
  type: "income" | "expense";
  status: "posted" | "pending_approval" | "draft";
}

export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  {
    id: "t1",
    date: "2026-10-20",
    descriptionBn: "শুক্রবারের সংগ্রহ",
    descriptionEn: "Friday collection",
    fundCode: "GENERAL",
    amount: 42_500,
    type: "income",
    status: "posted",
  },
  {
    id: "t2",
    date: "2026-10-19",
    descriptionBn: "বিদ্যুৎ বিল",
    descriptionEn: "Electricity bill",
    fundCode: "GENERAL",
    amount: 18_200,
    type: "expense",
    status: "posted",
  },
  {
    id: "t3",
    date: "2026-10-18",
    descriptionBn: "যাকাত গ্রহণ — বেনামী দাতা",
    descriptionEn: "Zakat receipt — anonymous donor",
    fundCode: "ZAKAT",
    amount: 50_000,
    type: "income",
    status: "posted",
  },
  {
    id: "t4",
    date: "2026-10-17",
    descriptionBn: "কার্পেট মেরামত",
    descriptionEn: "Carpet repair",
    fundCode: "GENERAL",
    amount: 12_000,
    type: "expense",
    status: "pending_approval",
  },
  {
    id: "t5",
    date: "2026-10-16",
    descriptionBn: "সদকা বিতরণ — অনাথানা",
    descriptionEn: "Sadaqah distribution — orphanage",
    fundCode: "SADAQAH",
    amount: 25_000,
    type: "expense",
    status: "posted",
  },
  {
    id: "t6",
    date: "2026-10-15",
    descriptionBn: "নির্মাণ সামগ্রী অগ্রিম",
    descriptionEn: "Construction materials advance",
    fundCode: "CONSTRUCTION",
    amount: 150_000,
    type: "expense",
    status: "pending_approval",
  },
];

export const DEMO_PRAYER_TIMES = {
  date: "2026-10-23",
  fajr: "04:52",
  sunrise: "05:58",
  dhuhr: "11:48",
  asr: "15:22",
  maghrib: "17:32",
  isha: "18:48",
  jumuah: "13:00",
};

export interface DemoAnnouncement {
  id: string;
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
  publishedAt: string;
  visibility: "public" | "internal";
}

export const DEMO_ANNOUNCEMENTS: DemoAnnouncement[] = [
  {
    id: "a1",
    titleBn: "রমজানের প্রস্তুতি সভা",
    titleEn: "Ramadan preparation meeting",
    bodyBn:
      "আগামী শুক্রবার আসরের পর রমজান প্রস্তুতি সভা অনুষ্ঠিত হবে। সকল কমিটি সদস্যের উপস্থিতি কাম্য।",
    bodyEn:
      "Ramadan preparation meeting will be held after Asr next Friday. All committee members are requested to attend.",
    publishedAt: "2026-10-18",
    visibility: "public",
  },
  {
    id: "a2",
    titleBn: "শুক্রবারের খুতবা বিষয়",
    titleEn: "Friday khutbah topic",
    bodyBn: "এ সপ্তাহের খুতবার বিষয়: আমানত ও জবাবদিহিতা।",
    bodyEn: "This week's khutbah topic: Trust and accountability.",
    publishedAt: "2026-10-16",
    visibility: "public",
  },
  {
    id: "a3",
    titleBn: "কর্মীদের উপস্থিতি নির্দেশনা",
    titleEn: "Staff attendance guideline",
    bodyBn: "অভ্যন্তরীণ নির্দেশনা — শুধু কর্মীদের জন্য।",
    bodyEn: "Internal guideline — staff only.",
    publishedAt: "2026-10-14",
    visibility: "internal",
  },
];

export const DEMO_ASSETS = [
  {
    id: "as1",
    nameBn: "মসজিদ কার্পেট (মূল হল)",
    nameEn: "Mosque carpet (main hall)",
    category: "Furniture",
    value: 180_000,
    condition: "good",
  },
  {
    id: "as2",
    nameBn: "সাউন্ড সিস্টেম",
    nameEn: "Sound system",
    category: "Electronics",
    value: 95_000,
    condition: "good",
  },
  {
    id: "as3",
    nameBn: "এয়ার কন্ডিশনার × ৪",
    nameEn: "Air conditioners × 4",
    category: "Electronics",
    value: 240_000,
    condition: "fair",
  },
];

export const DEMO_STAFF = [
  {
    id: "s1",
    nameBn: "মাওলানা আব্দুল্লাহ আল-মাহমুদ",
    nameEn: "Maulana Abdullah Al-Mahmud",
    roleBn: "ইমাম",
    roleEn: "Imam",
  },
  {
    id: "s2",
    nameBn: "হাফেজ করিম উদ্দিন",
    nameEn: "Hafez Karim Uddin",
    roleBn: "মুয়াজ্জিন",
    roleEn: "Muezzin",
  },
  {
    id: "s3",
    nameBn: "রফিকুল ইসলাম",
    nameEn: "Rafiqul Islam",
    roleBn: "খাদেম",
    roleEn: "Caretaker",
  },
];

export const DEMO_TENANTS = [
  {
    id: "tn1",
    slug: "al-amanah-dhaka",
    nameBn: "মসজিদ আল-আমানাহ, ঢাকা",
    nameEn: "Masjid Al-Amanah, Dhaka",
    status: "active" as const,
    users: 8,
  },
  {
    id: "tn2",
    slug: "baitul-mukarram-demo",
    nameBn: "বায়তুল মোকাররম (ডেমো)",
    nameEn: "Baitul Mukarram (Demo)",
    status: "active" as const,
    users: 12,
  },
  {
    id: "tn3",
    slug: "chittagong-central",
    nameBn: "চট্টগ্রাম কেন্দ্রীয় মসজিদ (ডেমো)",
    nameEn: "Chittagong Central Mosque (Demo)",
    status: "pending" as const,
    users: 3,
  },
];

/** Monthly income/expense series for charts (demo) */
export const DEMO_MONTHLY_SERIES = [
  { month: "মে", monthEn: "May", income: 120000, expense: 85000 },
  { month: "জুন", monthEn: "Jun", income: 135000, expense: 92000 },
  { month: "জুলাই", monthEn: "Jul", income: 148000, expense: 110000 },
  { month: "আগস্ট", monthEn: "Aug", income: 162000, expense: 98000 },
  { month: "সেপ্টেম্বর", monthEn: "Sep", income: 155000, expense: 125000 },
  { month: "অক্টোবর", monthEn: "Oct", income: 98000, expense: 72000 },
];

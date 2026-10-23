import type { DonationFundOption } from "@/lib/donations/types";

/** Demo fund list — mirrors configurable mosque funds; Zakat gated */
export const DEMO_DONATION_FUNDS: DonationFundOption[] = [
  {
    code: "GENERAL",
    nameBn: "সাধারণ তহবিল",
    nameEn: "General fund",
    enabled: true,
  },
  {
    code: "CONSTRUCTION",
    nameBn: "নির্মাণ / উন্নয়ন",
    nameEn: "Construction / Development",
    enabled: true,
  },
  {
    code: "ZAKAT",
    nameBn: "যাকাত",
    nameEn: "Zakat",
    enabled: true,
    requiresEligibilityNote: true,
    noteBn:
      "যাকাত শুধুমাত্র উপযুক্ত খাতে ব্যবহারের নীতি মেনে গ্রহণ করা হয়। মসজিদ কর্তৃপক্ষ যাকাতের শর্ত পূরণ নিশ্চিত করার দায়িত্ব রাখে।",
    noteEn:
      "Zakat is accepted only where eligible use is supported under the mosque’s policy. Administrators are responsible for eligible disbursement.",
  },
  {
    code: "OTHER",
    nameBn: "অন্যান্য (কনফিগারড)",
    nameEn: "Other (configured)",
    enabled: false,
  },
];

/** Preset amounts in BDT (converted to poisha in UI) */
export const DEMO_PRESET_BDT = [100, 500, 1000, 5000, 10000] as const;

export const DEMO_DONATION_DISCLAIMER = {
  privacyBn:
    "নাম প্রকাশ না করলে পাবলিক প্রতিবেদনে আপনার নাম, ফোন বা ইমেইল দেখা যাবে না। তবে আইন বা হিসাব পরিচালনার প্রয়োজনে অনুমোদিত অর্থ কর্মকর্তারা লেনদেনের রেকর্ড দেখতে পারেন।",
  privacyEn:
    "If you choose anonymous, your name, phone, and email will not appear in public reports. Authorized finance administrators may still retain access to transaction records required for legal or operational reasons.",
  demoBn: "ডেমো মোড — পেমেন্ট প্রক্রিয়া হয়নি। আসল পেমেন্ট বা PIN/OTP সংগ্রহ করা হয় না।",
  demoEn: "Demo only — payment not processed. No real payment, PIN, or OTP is collected.",
};

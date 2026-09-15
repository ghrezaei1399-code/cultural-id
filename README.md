# 🌍 کارت جهانی هویت هوشمند فرهنگی / Global Smart Cultural Identity Card

[![License: Hippocratic 2.0](https://img.shields.io/badge/License-Hippocratic%202.0-blue.svg)](https://firstdonoharm.dev)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-black)](https://vercel.com)
[![Version](https://img.shields.io/badge/Version-2.2-green)]()
[![Status](https://img.shields.io/badge/Status-Active-success)]()

---

## 📖 درباره پروژه / About the Project

**فارسی:**
«کارت جهانی هویت هوشمند فرهنگی» یک پروژه غیرمتمرکز، داوطلبانه و انسانی است که به افراد امکان می‌دهد هویت فرهنگی خود را بر اساس ارزش‌های مشترک تعریف کنند و با دیگر هم‌فکران در سراسر جهان ارتباط برقرار کنند.

**English:**
The "Global Smart Cultural Identity Card" is a decentralized, voluntary, and human-centered project that enables individuals to define their cultural identity based on shared values and connect with like-minded people worldwide.

---

## ✨ ویژگی‌ها / Features

| فارسی | English |
| :--- | :--- |
| **ثبت‌نام بدون اطلاعات شخصی** | **Registration without personal data** |
| **انتخاب ۷ ارزش فرهنگی** | **Selection of 7 cultural values** |
| **صدور کارت دیجیتال با QR کد** | **Digital card issuance with QR code** |
| **آپلود دستاوردهای فرهنگی** | **Upload cultural achievements** |
| **گالری جهانی دستاوردها** | **Global achievements gallery** |
| **ارتباط با هم‌فکران** | **Connect with like-minded people** |
| **سیستم کد پیگیری درخواست‌ها** | **Request tracking system** |
| **باکس پیگیری کد رهگیری** | **Tracking code lookup box** |
| **پنل مدیریت ادمین** | **Admin management panel** |
| **رادیوتلویزیون هوشمند** | **Smart Radio-Television** |

---

## 🛠️ تکنولوژی‌ها / Technologies

| ابزار / Technology | کاربرد / Purpose |
| :--- | :--- |
| **HTML, CSS, JavaScript** | توسعه وب (بدون فریم‌ورک) |
| **Vercel** | هاستینگ و توابع Serverless |
| **GitHub API** | ذخیره‌سازی و بازیابی داده‌ها |
| **JSON** | دیتابیس |
| **QR Code (JS)** | تولید QR کد |
| **OpenRouter AI** | سه هوش مصنوعی تحلیلی (اختیاری) |

---

## 🏗️ ساختار پروژه / Project Structure

```
cultural-id/
│
├── index.html                     # صفحه اصلی / Homepage
├── index-en.html                  # صفحه اصلی انگلیسی / Homepage (EN)
├── admin.html                     # پنل ادمین / Admin Dashboard
├── admin-users.html               # مدیریت کاربران / User Management
├── admin-achievements.html        # مدیریت دستاوردها / Achievement Management
├── admin-requests.html            # مدیریت درخواست‌ها / Connection Requests
├── admin-observations.html        # مدیریت مشاهدات / Observations Management
├── request-fa.html                # صفحه درخواست (فارسی) / Request Page (FA)
├── request-en.html                # صفحه درخواست (انگلیسی) / Request Page (EN)
├── upload-achievement-fa.html     # آپلود دستاورد (فارسی) / Upload Achievement (FA)
├── upload-achievement-en.html     # آپلود دستاورد (انگلیسی) / Upload Achievement (EN)
├── connections-fa.html            # مدیریت درخواست‌ها (ادمین) / Requests Management (Admin)
├── connections-en.html            # مدیریت درخواست‌ها (ادمین-انگلیسی) / Requests Management (Admin-EN)
├── about-fa.html                  # درباره پروژه (فارسی) / About (FA)
├── about-en.html                  # درباره پروژه (انگلیسی) / About (EN)
├── radio-tv.html                  # رادیوتلویزیون هوشمند / Smart Radio-Television
├── manifest.json                  # PWA Manifest
├── service-worker.js              # Service Worker
│
├── assets/                        # تصاویر و فایل‌های استاتیک / Static assets
│
├── api/                           # توابع Serverless / Serverless Functions
│   ├── get-users.js               # دریافت لیست کاربران
│   ├── register.js                # ثبت‌نام کاربر جدید
│   ├── upload-achievement.js      # آپلود دستاورد
│   ├── submit-request.js          # ثبت درخواست (ارتباط / حذف)
│   ├── approve-connection.js      # تأیید/رد درخواست
│   ├── get-connection-requests.js # دریافت لیست درخواست‌ها
│   ├── get-request-by-tracking.js # پیگیری با کد رهگیری
│   └── update-user-status.js      # تغییر وضعیت کاربر
│
└── data/                          # دیتابیس (JSON) / Database
    ├── active/                    # کاربران فعال / Active users
    ├── requests/                  # درخواست‌ها / Requests
    ├── achievements/              # دستاوردها / Achievements
    ├── analyses/                  # تحلیل مشاهدات / Observation analyses
    ├── archive/                   # کاربران حذف‌شده / Deleted users
    └── index.json                 # فهرست کاربران / User index
```

---

## 🚀 نصب و راه‌اندازی / Installation

### پیش‌نیازها / Prerequisites

- حساب گیت‌هاب / GitHub Account
- حساب Vercel / Vercel Account
- توکن گیت‌هاب با دسترسی `repo` / GitHub Token with `repo` scope

### ۱. کلون کردن مخزن / Clone the Repository

```bash
git clone https://github.com/ghrezaei1399-code/cultural-id.git
cd cultural-id
```

### ۲. تنظیم متغیرهای محیطی / Set Environment Variables

در پلتفرم Vercel، این متغیرها را تنظیم کنید:

| متغیر / Variable | توضیح / Description | الزامی / Required |
| :--- | :--- | :--- |
| `GH_TOKEN` | توکن گیت‌هاب با دسترسی `repo` | ✅ |
| `OBSERVER_TOKEN` | همان توکن (برای دسترسی کامل) | ✅ |
| `SITE_URL` | آدرس سایت شما | ⬜ |
| `SITE_NAME` | نام سایت شما | ⬜ |
| `OPENROUTER_API_KEY` | کلید هوش مصنوعی (اختیاری) | ⬜ |
| `RESEND_API_KEY` | کلید ارسال ایمیل (اختیاری) | ⬜ |
| `FROM_EMAIL` | ایمیل فرستنده (اختیاری) | ⬜ |

### ۳. دیپلوی / Deploy

```bash
vercel --prod
```

---

## 📚 مستندات / Documentation

| فارسی | English |
| :--- | :--- |
| [منشور پروژه](./CHARTER.md) | [Charter](./CHARTER.md) |
| [سند جامع پروژه](./Comprehensive%20Project%20Document%20(English).md) | [Comprehensive Project Document](./Comprehensive%20Project%20Document%20(English).md) |
| [وایت‌پیپر](./WHITEPAPER-fa.md) | [Whitepaper](./WHITEPAPER-en.md) |
| [راهنمای تکثیر](./FORK-GUIDE.md) | [Fork Guide](./FORK-GUIDE.md) |

---

## 🤝 مشارکت / Contributing

ما از مشارکت شما استقبال می‌کنیم. لطفاً قبل از ارسال Pull Request، موارد زیر را رعایت کنید:

۱. اصول بنیادین پروژه را مطالعه کنید.
۲. از قالب‌های موجود برای Issue و PR استفاده کنید.
۳. تغییرات خود را مستند کنید.

---

## 📜 مجوزها / Licenses

| بخش / Part | مجوز / License |
| :--- | :--- |
| کد نرم‌افزار / Code | Hippocratic License 2.0 |
| محتوا و اسناد / Content & Docs | CC BY-NC 4.0 |
| Assets (لوگو، تصاویر) | CC0 |

---

## 👤 بنیان‌گذار / Initiator

**غلامرضا رضائی** (Gholamreza Rezaei)

- [ORCID](https://orcid.org/0009-0007-5840-8833)
- [GitHub](https://github.com/ghrezaei1399-code)

---

## 🌐 لینک‌ها / Links

| لینک / Link | آدرس / URL |
| :--- | :--- |
| **سایت پروژه** | https://cultural-id.vercel.app |
| **مخزن گیت‌هاب** | https://github.com/ghrezaei1399-code/cultural-id |
| **گزارش مشکل** | [Issues](https://github.com/ghrezaei1399-code/cultural-id/issues) |

---

## 📌 وضعیت فعلی / Current Status

| مورد / Item | وضعیت / Status |
| :--- | :--- |
| نسخه / Version | ۲.۲ |
| تاریخ / Date | ۲۰۲۶-۰۹-۱۵ |
| کاربران واقعی / Real users | در انتظار راه‌اندازی / Pending launch |
| هوش مصنوعی / AI | فعال / Active (OpenRouter) |
| کد پیگیری / Tracking | فعال / Active |

---

**💡 یادآوری:** این پروژه کاملاً غیرانتفاعی، غیرسیاسی و غیرحکومتی است.
**💡 Reminder:** This project is completely non-profit, non-political, and non-governmental.

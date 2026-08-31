# 🌍 کارت جهانی هویت هوشمند فرهنگی / Global Smart Cultural Identity Card

[![License: Hippocratic 2.0](https://img.shields.io/badge/License-Hippocratic%202.0-blue.svg)](https://firstdonoharm.dev)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-black)](https://vercel.com)

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

---

## 🏗️ ساختار پروژه / Project Structure

/
├── index.html # صفحه اصلی / Homepage
├── admin.html # پنل ادمین / Admin Dashboard
├── admin-users.html # مدیریت کاربران / User Management
├── admin-achievements.html # مدیریت دستاوردها / Achievement Management
├── admin-requests.html # مدیریت درخواست‌های ارتباط / Connection Requests
├── admin-delete.html # مدیریت درخواست‌های حذف / Delete Requests
├── request-fa.html # صفحه درخواست (فارسی) / Request Page (FA)
├── request-en.html # صفحه درخواست (انگلیسی) / Request Page (EN)
├── upload-achievement-fa.html # آپلود دستاورد (فارسی) / Upload Achievement (FA)
├── upload-achievement-en.html # آپلود دستاورد (انگلیسی) / Upload Achievement (EN)
├── connections-fa.html # مدیریت درخواست‌ها (ادمین) / Requests Management (Admin)
├── connections-en.html # مدیریت درخواست‌ها (ادمین-انگلیسی) / Requests Management (Admin-EN)
├── about-fa.html # درباره پروژه (فارسی) / About (FA)
├── about-en.html # درباره پروژه (انگلیسی) / About (EN)
├── radio-tv.html # رادیوتلویزیون هوشمند / Smart Radio-Television
├── manifest.json # PWA Manifest
├── service-worker.js # Service Worker
├── assets/ # تصاویر و فایل‌های استاتیک / Static assets
├── api/ # توابع Serverless / Serverless Functions
│ ├── get-users.js
│ ├── register.js
│ ├── upload-achievement.js
│ ├── submit-request.js
│ ├── approve-connection.js
│ ├── get-connection-requests.js
│ ├── get-request-by-tracking.js
│ ├── update-user-status.js
│ └── ...
└── data/ # دیتابیس (JSON) / Database
├── active/ # کاربران فعال / Active users
├── requests/ # درخواست‌ها / Requests
└── index.json # فهرست کاربران / User index

---

## 🚀 نصب و راه‌اندازی / Installation

### ۱. کلون کردن مخزن / Clone the Repository

```bash
git clone https://github.com/ghrezaei1399-code/cultural-id.git
cd cultural-id

۲. تنظیم متغیرهای محیطی / Set Environment Variables
در پلتفرم Vercel، متغیر زیر را تنظیم کنید:
GH_TOKEN = [توکن گیت‌هاب شما / Your GitHub Token]
vercel --prod

📚 مستندات / Documentation
فارسی	English
منشور پروژه (فارسی)	Comprehensive Project Document (English)
وایت‌پیپر (فارسی)	Whitepaper (English)
🤝 مشارکت / Contributing
ما از مشارکت شما استقبال می‌کنیم. لطفاً قبل از ارسال Pull Request، موارد زیر را رعایت کنید:

اصول بنیادین پروژه را مطالعه کنید.

از قالب‌های موجود برای Issue و PR استفاده کنید.

تغییرات خود را مستند کنید.

📜 مجوزها / Licenses
بخش / Part	مجوز / License
کد نرم‌افزار / Code	Hippocratic License 2.0
محتوا و اسناد / Content & Docs	CC BY-NC 4.0
Assets (لوگو، تصاویر)	CC0
👤 بنیان‌گذار / Initiator
غلامرضا رضائی (Gholamreza Rezaei)

ORCID

GitHub

🌐 لینک‌ها / Links
سایت پروژه: https://cultural-id.vercel.app

مخزن گیت‌هاب: https://github.com/ghrezaei1399-code/cultural-id

گزارش مشکل: Issues

💡 یادآوری: این پروژه کاملاً غیرانتفاعی، غیرسیاسی و غیرحکومتی است.
💡 Reminder: This project is completely non-profit, non-political, and non-governmental.

---

## ✅ **کارهایی که باید انجام دهید:**

| مرحله | کار |
|-------|-----|
| ۱ | فایل `README.md` فعلی را باز کنید |
| ۲ | کل محتوای آن را پاک کنید |
| ۳ | کد بالا را جایگزین کنید |
| ۴ | ذخیره و آپلود کنید |

---

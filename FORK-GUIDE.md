# 🚀 راهنمای تکثیر و راه‌اندازی نسخه‌ی اختصاصی
# Fork & Setup Guide for Your Own Version

**نسخه / Version:** ۱.۱
**تاریخ / Date:** ۲۰۲۶-۰۹-۱۵
**مدت زمان / Time Required:** ۳۰-۶۰ دقیقه / 30-60 minutes
**نیاز فنی / Technical Level:** متوسط / Intermediate

---

## 🌍 فارسی

### هدف این راهنما
این راهنما به شما کمک می‌کند تا یک نسخه‌ی کاملاً مستقل از «کارت جهانی هویت هوشمند فرهنگی» را برای گروه، جامعه یا شبکه‌ی فرهنگی خود راه‌اندازی کنید.

**نکته:** شما نیازی به دانش برنامه‌نویسی ندارید. تمام مراحل به‌صورت گام‌به‌گام توضیح داده شده است.

---

## 📋 پیش‌نیازها / Prerequisites

| نیاز / Requirement | توضیح / Description |
| :--- | :--- |
| **حساب گیت‌هاب / GitHub Account** | برای Fork کردن مخزن و دریافت توکن |
| **حساب Vercel / Vercel Account** | برای دیپلوی رایگان سایت (با حساب گیت‌هاب وارد شوید) |
| **یک گروه ۵ نفره / A group of 5 people** | برای شروع شبکه‌ی فرهنگی خود |
| **حدود ۱ ساعت وقت / About 1 hour** | برای انجام تمام مراحل |

---

## 🛠️ مرحله ۱: تکثیر مخزن / Step 1: Fork the Repository

### فارسی
۱. به مخزن اصلی بروید:
   [https://github.com/ghrezaei1399-code/cultural-id](https://github.com/ghrezaei1399-code/cultural-id)

۲. روی دکمه‌ی **Fork** (در بالای صفحه) کلیک کنید.

۳. یک نام برای مخزن جدید خود انتخاب کنید (مثلاً `my-cultural-network`).

۴. روی **Create Fork** کلیک کنید.

### English
1. Go to the main repository:
   [https://github.com/ghrezaei1399-code/cultural-id](https://github.com/ghrezaei1399-code/cultural-id)

2. Click the **Fork** button (at the top of the page).

3. Choose a name for your new repository (e.g., `my-cultural-network`).

4. Click **Create Fork**.

---

## 🔑 مرحله ۲: دریافت توکن گیت‌هاب / Step 2: Get GitHub Token

### فارسی
۱. به تنظیمات گیت‌هاب خود بروید:
   [https://github.com/settings/tokens](https://github.com/settings/tokens)

۲. روی **Generate new token (classic)** کلیک کنید.

۳. یک نام برای توکن انتخاب کنید (مثلاً `cultural-id-token`).

۴. سطح دسترسی (Scopes) را به این صورت تنظیم کنید:
   - ✅ `repo` (دسترسی کامل به مخزن — برای خواندن و نوشتن فایل‌ها و Issues)
   - ✅ `workflow` (اگر می‌خواهید از Actions استفاده کنید)

**نکته مهم:** توکن باید دسترسی `repo` داشته باشد تا بتواند Issues را بخواند و فایل‌های کاربران را ذخیره کند. اگر فقط `public_repo` باشد، خطای ۵۰۰ در APIها رخ می‌دهد.

۵. روی **Generate token** کلیک کنید.

۶. **توکن تولیدشده را کپی کنید** و در یک جای امن ذخیره کنید.
   (این توکن فقط یک بار نمایش داده می‌شود!)

۷. **تاریخ انقضا (Expiration) را یادداشت کنید.** توکن‌های Classic می‌توانند منقضی شوند. اگر توکن منقضی شود، باید توکن جدید بسازید و در Vercel جایگزین کنید.

### English
1. Go to your GitHub settings:
   [https://github.com/settings/tokens](https://github.com/settings/tokens)

2. Click **Generate new token (classic)**.

3. Choose a name for your token (e.g., `cultural-id-token`).

4. Set the Scopes:
   - ✅ `repo` (Full control of private repositories — needed to read/write files and Issues)
   - ✅ `workflow` (if you want to use Actions)

**Important:** The token must have `repo` scope to read Issues and save user files. If it only has `public_repo`, you will get 500 errors in the APIs.

5. Click **Generate token**.

6. **Copy the generated token** and store it in a safe place.
   (This token is only shown once!)

7. **Note the Expiration date.** Classic tokens can expire. If a token expires, you must create a new one and replace it in Vercel.

---

## 🚀 مرحله ۳: دیپلوی روی Vercel / Step 3: Deploy to Vercel

### فارسی
۱. وارد Vercel شوید: [https://vercel.com](https://vercel.com)
   (با حساب گیت‌هاب خود وارد شوید)

۲. روی دکمه‌ی **Add New... → Project** کلیک کنید.

۳. مخزن جدید خود را (که در مرحله ۱ فورک کردید) انتخاب کنید.

۴. در بخش **Environment Variables**، این متغیرها را اضافه کنید:

| نام / Name | مقدار / Value | محیط / Environment |
| :--- | :--- | :--- |
| `GH_TOKEN` | توکنی که در مرحله ۲ کپی کردید | Production, Preview |
| `OBSERVER_TOKEN` | همان توکن (برای اطمینان از دسترسی کامل) | Production |
| `SITE_URL` | آدرس سایت شما (مثلاً `https://my-cultural-network.vercel.app`) | Production |
| `SITE_NAME` | نام سایت شما | Production |
| `FROM_EMAIL` | ایمیل فرستنده (اختیاری، برای ارسال دعوت‌نامه) | All Environments |
| `RESEND_API_KEY` | کلید Resend (اختیاری، برای ارسال ایمیل) | Production |
| `OPENROUTER_API_KEY` | کلید OpenRouter (برای هوش مصنوعی سه‌لایه) | Production |

**نکته:** اگر فقط می‌خواهید سایت را راه‌اندازی کنید و از هوش مصنوعی استفاده نمی‌کنید، می‌توانید `OPENROUTER_API_KEY` را خالی بگذارید.

۵. روی **Deploy** کلیک کنید.

۶. منتظر بمانید تا دیپلوی کامل شود (حدود ۱-۲ دقیقه).

۷. پس از اتمام، Vercel یک آدرس به شما می‌دهد (مثلاً `my-cultural-network.vercel.app`).
   این آدرس، سایت اختصاصی شماست!

### English
1. Go to Vercel: [https://vercel.com](https://vercel.com)
   (Sign in with your GitHub account)

2. Click **Add New... → Project**.

3. Select your forked repository (from Step 1).

4. In the **Environment Variables** section, add these variables:

| Name | Value | Environment |
| :--- | :--- | :--- |
| `GH_TOKEN` | The token you copied in Step 2 | Production, Preview |
| `OBSERVER_TOKEN` | Same token (to ensure full access) | Production |
| `SITE_URL` | Your site URL (e.g. `https://my-cultural-network.vercel.app`) | Production |
| `SITE_NAME` | Your site name | Production |
| `FROM_EMAIL` | Sender email (optional, for invitations) | All Environments |
| `RESEND_API_KEY` | Resend API key (optional, for sending emails) | Production |
| `OPENROUTER_API_KEY` | OpenRouter key (for the three-layer AI) | Production |

**Note:** If you only want to launch the site without AI, you can leave `OPENROUTER_API_KEY` empty.

5. Click **Deploy**.

6. Wait for the deployment to complete (about 1-2 minutes).

7. After completion, Vercel will give you a URL (e.g., `my-cultural-network.vercel.app`).
   This is your dedicated site!

---

## 🎨 مرحله ۴: شخصی‌سازی / Step 4: Customization

### فارسی
برای تغییر نام، لوگو و رنگ‌بندی سایت، این فایل‌ها را در مخزن خود ویرایش کنید:

| فایل / File | تغییر / Change |
| :--- | :--- |
| `index.html` | عنوان اصلی و توضیحات |
| `index-en.html` | عنوان اصلی و توضیحات (انگلیسی) |
| `assets/logo-fa.png` | لوگوی خود را جایگزین کنید |
| `assets/logo-en.png` | لوگوی خود را جایگزین کنید |
| `assets/pisa.jpg` | تصویر پس‌زمینه را تغییر دهید |
| `manifest.json` | نام و رنگ برنامه را تغییر دهید |

**نکته:** پس از هر تغییر، فایل‌ها را در گیت‌هاب Commit و Push کنید تا Vercel به‌طور خودکار دیپلوی جدید انجام دهد.

### English
To change the name, logo, and colors of the site, edit these files in your repository:

| File | Change |
| :--- | :--- |
| `index.html` | Main title and descriptions |
| `index-en.html` | Main title and descriptions (English) |
| `assets/logo-fa.png` | Replace with your logo |
| `assets/logo-en.png` | Replace with your logo |
| `assets/pisa.jpg` | Change the background image |
| `manifest.json` | Change app name and colors |

**Note:** After each change, commit and push the files to GitHub. Vercel will automatically redeploy.

---

## 👥 مرحله ۵: شروع به کار / Step 5: Launch Your Network

### فارسی
۱. آدرس سایت خود را (از Vercel) در اختیار ۵ نفر اول قرار دهید.

۲. از آنها بخواهید ثبت‌نام کنند و کارت هویت فرهنگی خود را دریافت کنند.

۳. پس از ثبت‌نام ۵ نفر، شبکه‌ی فرهنگی شما رسماً آغاز به کار کرده است!

۴. حالا می‌توانید از امکانات زیر استفاده کنید:
   - **گالری دستاوردها:** اعضا می‌توانند دستاوردهای خود را به اشتراک بگذارند.
   - **ارتباط با هم‌فکران:** اعضا می‌توانند با یکدیگر ارتباط برقرار کنند.
   - **پیگیری کد رهگیری:** هر عضو می‌تواند با کد پیگیری، ایمیل خود و تعداد هم‌فکرانش را ببیند.
   - **رادیوتلویزیون هوشمند:** محتوای گروهی خود را تولید و منتشر کنید.

۵. **قبل از شروع واقعی:** فایل‌های تستی (اعضای آزمایشی، درخواست‌ها، مشاهدات) را پاک کنید تا سایت با داده‌های واقعی شروع کند.

### English
1. Share your site URL (from Vercel) with the first 5 people.

2. Ask them to register and get their cultural identity card.

3. After 5 people have registered, your cultural network is officially launched!

4. Now you can use these features:
   - **Achievements Gallery:** Members can share their achievements.
   - **Connect with Like-minded:** Members can connect with each other.
   - **Tracking Code:** Each member can see their email and number of like-minded peers via their tracking code.
   - **Smart Radio-Television:** Produce and share group content.

5. **Before the real launch:** Delete test data (test members, requests, observations) so the site starts with real data.

---

## 🆘 رفع مشکلات رایج / Troubleshooting

| مشکل / Problem | راه‌حل / Solution |
| :--- | :--- |
| **صفحه ۴۰۴ نشان می‌دهد** | مطمئن شوید که فایل `vercel.json` در ریشه پروژه وجود دارد. |
| **خطای ۵۰۰ در API** | بررسی کنید که `GH_TOKEN` و `OBSERVER_TOKEN` به‌درستی در Vercel تنظیم شده باشند و توکن دسترسی `repo` داشته باشد. |
| **خطای ۴۰۳ (Forbidden)** | توکن گیت‌هاب شما احتمالاً منقضی شده یا دسترسی `repo` ندارد. یک توکن جدید بسازید و در Vercel جایگزین کنید. |
| **خطای «Error fetching user data»** | توکن دسترسی `repo` ندارد، یا فایل کاربر بسیار بزرگ است. مطمئن شوید توکن دسترسی کامل دارد. |
| **تغییرات اعمال نمی‌شود** | پس از تغییرات، حتماً Commit و Push کنید. Vercel به‌طور خودکار دیپلوی می‌کند. اگر نه، دستی Redeploy بزنید. |
| **کاربران ثبت‌نام نمی‌کنند** | مطمئن شوید که آدرس سایت درست است و کاربران از مرورگر مناسب استفاده می‌کنند. |
| **باکس پیگیری کد رهگیری کار نمی‌کند** | بررسی کنید که `get-request-by-tracking.js` در پوشه `api/` وجود دارد و توکن دسترسی `repo` دارد. |

---

## 📚 منابع بیشتر / More Resources

| فارسی | English |
| :--- | :--- |
| [منشور پروژه](./CHARTER.md) | [Charter](./CHARTER.md) |
| [سند جامع پروژه](./Comprehensive%20Project%20Document%20(English).md) | [Comprehensive Project Document](./Comprehensive%20Project%20Document%20(English).md) |
| [وایت‌پیپر](./WHITEPAPER-fa.md) | [Whitepaper](./WHITEPAPER-en.md) |

---

## 🎯 جمع‌بندی / Summary

| مرحله / Step | وضعیت / Status |
| :--- | :--- |
| Fork مخزن / Fork Repository | ✅ |
| دریافت توکن / Get Token | ✅ |
| دیپلوی روی Vercel / Deploy to Vercel | ✅ |
| شخصی‌سازی / Customization | ✅ |
| شروع شبکه / Launch Network | ✅ |

---

**تبریک! شما اکنون یک نسخه‌ی اختصاصی از «کارت جهانی هویت هوشمند فرهنگی» را راه‌اندازی کرده‌اید.**
**Congratulations! You have now launched your own version of the "Global Smart Cultural Identity Card."**

---

**💡 یادآوری:** این پروژه کاملاً غیرانتفاعی، غیرسیاسی و غیرحکومتی است.
**💡 Reminder:** This project is completely non-profit, non-political, and non-governmental.

**نسخه / Version:** ۱.۱
**تاریخ / Date:** ۲۰۲۶-۰۹-۱۵

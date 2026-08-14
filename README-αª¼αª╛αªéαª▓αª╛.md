# Team Hub v2 — সেটআপ গাইড

এই ভার্সনে যা আছে:
- **Join Request সিস্টেম** — নতুন কেউ ফর্ম পূরণ করে রিকোয়েস্ট পাঠাবে, তুমি (admin) approve না করা পর্যন্ত লগইন করতে পারবে না
- **Content Approval** — partner আপলোড করলে "Pending Approval", তুমি approve করলে "Posted"
- **Orders** — customer + order details + price + delivery time + status, একই customer-এর সব order এক জায়গায়
- **Real-time** — কেউ কিছু করলে বাকিরা রিফ্রেশ ছাড়াই দেখবে

---

## ধাপ ১: Supabase প্রজেক্ট বানাও
https://supabase.com এ গিয়ে GitHub দিয়ে সাইনআপ করো, নতুন প্রজেক্ট বানাও।

## ধাপ ২: Schema রান করো
**SQL Editor**-এ গিয়ে `supabase-setup.sql`-এর পুরো কনটেন্ট পেস্ট করে **Run** করো। এটা টেবিল, security rules, সব বানিয়ে দেবে।

## ধাপ ৩: Storage bucket বানাও
**Storage** > **New bucket** > নাম `content-files` > Public bucket ON করো।

## ধাপ ৪: Email confirmation বন্ধ করো
**Authentication > Providers > Email** এ "Confirm email" OFF করো — নাহলে approve করার পরেও ইমেইল ভেরিফাই করতে হবে।

## ধাপ ৫: API keys কপি করো
**Project Settings > API** থেকে Project URL আর anon key কপি করে `js/supabase-config.js`-এ বসাও।

## ধাপ ৬: GitHub-এ আপলোড করে Vercel দিয়ে deploy করো
আগের গাইডের মতোই — GitHub-এ repository বানাও, ফাইল আপলোড করো, Vercel দিয়ে "Add New Project" > repo সিলেক্ট > Deploy।

## ধাপ ৭: নিজেকে প্রথম Admin বানাও ⚠️ গুরুত্বপূর্ণ
1. লাইভ লিংকে গিয়ে `join-request.html` থেকে **নিজের** তথ্য দিয়ে একটা রিকোয়েস্ট সাবমিট করো
2. Supabase Dashboard-এ **SQL Editor**-এ যাও, `supabase-setup.sql` ফাইলের একদম শেষের কমেন্ট করা লাইনটা নাও:
   ```sql
   update user_profiles set role = 'admin', status = 'approved'
   where id = (select id from auth.users where email = 'তোমার-ইমেইল@example.com');
   ```
3. `তোমার-ইমেইল@example.com` জায়গায় নিজের ইমেইল বসিয়ে Run করো
4. এখন লগইন করলে তুমি Admin হিসেবে ঢুকবে, আর Admin Panel ট্যাব দেখতে পাবে

## ধাপ ৮: বাকিদের যোগ করা
পার্টনারদের `join-request.html` লিংক দাও। তারা ফর্ম পূরণ করলে তুমি Admin Panel-এ গিয়ে Approve/Reject করবে।

---

## পরে যা যোগ করা যাবে (Phase 2/3)
- Offline mode (নেট ছাড়া এন্ট্রি করে পরে sync)
- Activity/audit log (কে কী বদলালো তার ইতিহাস)
- Search আর filter
- নিজের ডোমেইন লাগানো

কোনো ধাপে আটকালে এরর মেসেজ বা স্ক্রিনশট পাঠিও।

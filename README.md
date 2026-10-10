# Design and Craft Mart — Partner Hub

*Crafting Memories, Creating Smiles*

**Design and Craft Mart (DCM)** is a small design studio that makes photo frames, business cards and logos. The Partner Hub is the studio's private workspace, where partners keep customer orders on track and save content ideas to post on Facebook.

**Live site:** https://design-and-craft-mart-database.vercel.app

## What it does

- **Dashboard** shows a greeting and live counts of content ideas, orders, pending orders and orders due today, plus follow-ups due and revenue from delivered orders. A 7, 14 or 30 day switch sets the period for the order and revenue numbers. New partners also see a four-step checklist until they finish it.
- **Content Ideas** is a masonry gallery of post ideas with search, filters, image upload and Bengali captions. A caption copies in one click, ready to paste into Facebook.
- **Orders** are tracked on a board with New, In Progress, Done and Delivered columns. Cards drag between columns, show how many days are left, and turn terracotta when overdue. A List view is one tap away. The History button on each card shows who created or moved the order and when, and lets partners leave a note.
- **Leads** is a board for inquiries that have not become orders yet (New inquiry, Quote sent, Follow-up due, Converted, Lost). A lead records where it came from (Messenger, Facebook or phone), and one tap converts it into an order.
- **The + button** in the middle of the navigation bar opens a menu to add content, an order or a lead from any page.
- **Team Chat** lets partners talk in real time.
- **My Profile** holds the partner's details, photo and position.
- **Partner approval** means new partners apply through a join form, and an admin approves them before they can sign in.

## The design

The look is "Warm Editorial Luxury", closer to a boutique magazine than a typical dashboard.

- Warm ivory paper background, forest green and copper accents
- Fraunces serif headlines with oversized numbers, and DM Sans for the interface
- A floating pill navigation bar on desktop, and a bottom dock with a quick-add button on phones
- Soft motion throughout: sliding menu indicator, counting-up numbers

## Built with

HTML, CSS and JavaScript, with [Supabase](https://supabase.com) for sign-in, data and live updates, hosted on [Vercel](https://vercel.com).

## Database setup

Run `supabase-setup.sql` and `supabase_migrations_add_user_profiles_fields.sql` first, then `supabase-leads-activity.sql`. The last file adds the `leads` and `order_events` tables used by the Leads board, follow-ups due and order history. Until it has been run, the Leads board shows a message and the rest of the app works as before.

---

© Design and Craft Mart. All rights reserved.

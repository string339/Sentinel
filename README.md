# Sentinel — Dark Pattern & Subscription Trap Detector

Built for SRM ACM SIGCHI Hackathon Doomsday (Open Innovation track).

## The problem
Free trials and subscriptions often hide auto-renewals, confusing cancellation
steps, and deceptive wording in fine print that most people never read. This
quietly costs students and everyday consumers money every month.

## What it does
Paste the text from a checkout page, subscription screen, or terms of
service, and Sentinel:
1. Scores it 0-100 for how manipulative it is (Dark Pattern Risk Score)
2. Flags the specific dark patterns it finds (hidden cancellation steps,
   pre-checked auto-billing boxes, deceptive urgency, etc.)
3. Drafts a ready-to-send cancellation / refund dispute email
4. Adds the result to a public, crowdsourced registry — so everyone who
   scans a service helps everyone who checks it after them

## Live demo
https://sentinel-nine-tawny.vercel.app/

## How it's built
- **Frontend:** plain HTML, CSS, and JavaScript — no framework
- **Hosting:** Vercel
- **AI analysis:** Groq (primary) and Google Gemini (backup), called from a
  serverless function so the API key stays private
- **Database:** Supabase (Postgres), storing the shared registry of scanned
  services

## What's next
- A real browser extension that scans pages automatically, instead of
  requiring copy-paste
- Accounts or a voting system so registry entries can't be spammed
- Tracking a service's risk score over time

## Team
[1.Sadique Ali], [2. Shyaam S.P.], [3. Aabid Jumail], [4. Aman Madnani] — SRM Institute of Science and Technology

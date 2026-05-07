<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e8d40aee-3ee3-4b38-ae17-a2419f252d11

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

Cách chạy:
Terminal 1 — API server (ghi JSON):

bash
npx tsx server.ts
Terminal 2 — Vite dev server:

bash
npm run dev
Hoặc chạy cả 2 cùng lúc (Windows):

bash
npm run dev:all

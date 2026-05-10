
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

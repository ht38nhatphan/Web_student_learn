#!/bin/bash

# ─── Bật Web Học Vui Tiếng Việt 2 ───────────────────────────────────────────
cd "$(dirname "$0")"

echo "🚀 Đang khởi động Web Học Vui Tiếng Việt 2..."
echo ""

# Kiểm tra node_modules
if [ ! -d "node_modules" ]; then
  echo "📦 Chưa cài dependencies, đang cài..."
  npm install
  echo ""
fi

# Lưu PID để dùng khi tắt
PID_FILE=".server_pids"

# Khởi động API server (port 3001) - chạy nền
echo "⚙️  Khởi động API Server (port 3001)..."
npx tsx server.ts &
API_PID=$!
echo $API_PID > "$PID_FILE"

# Đợi API server sẵn sàng
sleep 2

# Khởi động Vite dev server (port 3000)
echo "🌐 Khởi động Vite Dev Server (port 3000)..."
npm run dev &
VITE_PID=$!
echo $VITE_PID >> "$PID_FILE"

echo ""
echo "✅ Web đã bật thành công!"
echo "   👉 Mở trình duyệt: http://localhost:3000"
echo ""
echo "💡 Để tắt web, chạy file: TẮT_WEB.command"
echo ""

# Mở trình duyệt sau 3 giây
sleep 3
open http://localhost:3000

# Giữ terminal mở
wait

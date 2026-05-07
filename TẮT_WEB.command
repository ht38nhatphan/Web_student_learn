#!/bin/bash

# ─── Tắt Web Học Vui Tiếng Việt 2 ───────────────────────────────────────────
cd "$(dirname "$0")"

echo "🛑 Đang tắt Web Học Vui Tiếng Việt 2..."
echo ""

PID_FILE=".server_pids"

# Đọc và kill các PID đã lưu
if [ -f "$PID_FILE" ]; then
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "   ✅ Đã tắt process PID: $pid"
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
else
  echo "   ⚠️  Không tìm thấy file PID, đang dùng cách thủ công..."
fi

# Tắt thêm bằng port (backup)
echo ""
echo "🔍 Kiểm tra và tắt process trên port 3000 và 3001..."

# Tắt port 3000 (Vite)
PIDS_3000=$(lsof -ti :3000 2>/dev/null)
if [ -n "$PIDS_3000" ]; then
  echo "$PIDS_3000" | xargs kill -9 2>/dev/null
  echo "   ✅ Đã tắt port 3000 (Vite)"
else
  echo "   ℹ️  Port 3000 không có process"
fi

# Tắt port 3001 (API Server)
PIDS_3001=$(lsof -ti :3001 2>/dev/null)
if [ -n "$PIDS_3001" ]; then
  echo "$PIDS_3001" | xargs kill -9 2>/dev/null
  echo "   ✅ Đã tắt port 3001 (API Server)"
else
  echo "   ℹ️  Port 3001 không có process"
fi

echo ""
echo "✅ Web đã tắt hoàn toàn!"
echo ""

# Đóng tab trình duyệt (tuỳ chọn - chỉ hoạt động với Safari/Chrome)
# osascript -e 'tell application "Google Chrome" to close (tabs of window 1 whose URL contains "localhost:3000")'

sleep 2

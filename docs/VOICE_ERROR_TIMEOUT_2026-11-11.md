# Thông báo lỗi thoại tự ẩn — 11/11/2026

## Thay đổi

- `frontend/src/voice/VoiceChat.tsx`: thông báo lỗi trong phiên thoại tự ẩn sau
  5.000 ms. Mỗi lần lỗi có trạng thái riêng để lỗi lặp cùng nội dung cũng được
  tính lại đủ thời gian. Hủy timer cũ khi có thông báo mới, bắt đầu lại, đổi
  giọng hoặc unmount.
- Nhãn “Phiên thoại gặp lỗi” ẩn cùng thông báo; trạng thái phiên và khả năng
  bắt đầu lại được giữ. Tự ẩn thông báo không gọi dừng phiên đang hoạt động.
- Lỗi tải catalog và giọng không khả dụng vẫn có hướng dẫn xử lý tại chỗ.
- `frontend/src/voice/VoiceChat.test.tsx`: bổ sung 6 test hồi quy.
- Cập nhật `docs/CHANGELOG.md`, `docs/REQUIREMENTS.md`, `docs/TESTING.md`.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Test mới trước sửa | 6 trượt, 16 test cũ qua; tái hiện lỗi không tự ẩn |
| Test component sau sửa | 22/22 qua |
| Toàn frontend với coverage, một worker | 35 file, 417/417 test qua |
| Coverage frontend | Statements 89,56%; branches 81,73%; functions 85,74%; lines 92,78%; đạt ngưỡng 80% |
| `scripts/manage.py lint` | Ruff, Black, mypy, ESLint, TypeScript và Prettier qua |
| `npm run build` | TypeScript và Vite production build qua |
| `scripts/manage.py coverage-backend` ngoài sandbox | 213 qua, 24 integration test bỏ qua vì thiếu `MYSQL_TEST_URL`; coverage 72,48%, lệnh trả exit 1 vì chưa đạt 80% |
| `scripts/smoke.py` | Health, HTML, proxy, capabilities và OpenAPI qua |
| Frontend Docker hiện hành | HTTP source xác nhận đang phục vụ mã tự ẩn sau 5.000 ms qua bind mount |

Test xác nhận thông báo còn ở 4.999 ms, mất ở 5.000 ms, lỗi mới/lặp được tính
lại đủ thời gian, lỗi bắt đầu phiên cũng tự ẩn, phiên đang nghe không dừng,
nút bắt đầu lại còn khả dụng và timer được dọn khi rời hội thoại.

## Giới hạn

- Kiểm thử dùng fake timers và session doubles; chưa tạo lỗi trên microphone,
  loa hoặc Gemini/Blaze thật. Không gọi API tính phí hay ghi database ứng dụng.
- Vitest và Vite cần chạy ngoài sandbox do esbuild gặp `spawn EPERM`.
- Lượt backend trong sandbox có 211 test qua, 24 bỏ qua, 2 lỗi quyền thư mục
  tạm. Chạy lại ngoài sandbox: không còn lỗi test, nhưng coverage vẫn chưa đạt
  80%. Không sửa backend, bỏ test hoặc giảm ngưỡng; cần schema MySQL test riêng
  để kiểm chứng phần integration.
- Không commit/push. Nhánh làm việc: `fix/voice-error-timeout-20261111`.
- Ghi tiến trình riêng vì `docs/PROGRESS.md` đã bị xóa trong working tree trước
  tác vụ; giữ nguyên thay đổi có sẵn này.

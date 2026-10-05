# Kiểm thử

## Cài đặt và menu avatar (D-10, D-11)

- `pages/CaiDat.test.tsx`: áp dụng/lưu/khôi phục theme, motion và tốc độ đọc; giữ hồ sơ khi cài đặt cũ thiếu hoặc sai định dạng; đổi theo hệ thống và dọn matchMedia listener; kiểm tra tốc độ Web Speech thực sự dùng tùy chọn.
- `components/MenuNguoiDung.test.tsx`: khách chỉ có Đăng nhập; liên kết mở tài khoản bên trong Cài đặt; đã đăng nhập có Hồ sơ học tập/Đăng xuất; đóng qua mouseleave, Escape, bấm ngoài; logout cập nhật phiên và menu.
- Test shell/route/tài khoản cũ tiếp tục kiểm tra 10 route, mục Cài đặt và alias tài khoản.
- Chrome profile QA riêng: hover avatar thật, nhập form đăng nhập, mở hồ sơ, đăng xuất, chọn theme và reload; rà soát 1440/360/390 px cho 10 route và mục tài khoản, menu nằm trong viewport.

## Thanh cuộn tự ẩn (D-08)

- `frontend/src/App.test.tsx`: kiểm tra trạng thái ban đầu ẩn, cuộn trang/sidebar độc lập, gia hạn thời gian hiển thị khi cuộn tiếp, tự ẩn sau 1 giây và dọn listener/timer khi unmount.
- Chrome: kiểm tra màu thanh cuộn trước/trong/sau cuộn và độ rộng bố cục không đổi.
- Hiệu ứng mờ dần: Chrome desktop/mobile phải có alpha trung gian giữa 0 và 1 khi hiện và khi ẩn; tôn trọng tùy chọn giảm chuyển động.
- Chạy riêng: trong `frontend`, `npm exec vitest -- run src/App.test.tsx -t scrollbar`.

## Nhãn demo chỉ dành cho AI (D-09)

- Test `limits demo labels to AI features`: sidebar/topbar và các trang không dùng AI không chứa nhãn demo; banner AI, hội thoại và phân tích nói/viết có nhãn AI kèm demo.
- Test luồng tài khoản kiểm tra nút Đăng nhập/Tạo tài khoản/Gửi yêu cầu, đăng xuất và thông báo ghi nhận yêu cầu trên trình duyệt.
- Chrome: kiểm tra nhãn và tràn ngang trên cả 10 route ở 1440/360/390 px.

Chạy từ root bằng `python scripts/manage.py test` hoặc Windows `.\make.cmd test`. `coverage` chạy lại test và yêu cầu ít nhất 80% ở từng phía. Kết quả thật xem [PROGRESS.md](PROGRESS.md).

| Phạm vi | File test | Hành vi kiểm tra |
| --- | --- | --- |
| Config/application factory | `backend/tests/unit/test_config.py` | Env override, provider không hỗ trợ |
| AI service | `backend/tests/unit/test_ai_service.py` | Inject provider, prompt phiên bản và CEFR được truyền đúng |
| API | `backend/tests/integration/test_api.py` | Health, mock 3 trình độ, validation, timeout, CORS và OpenAPI |
| App shell và các trang demo | `frontend/src/App.test.tsx` | Menu/route, hồ sơ, tài khoản, chat, nói/nghe/viết, từ vựng, nhập vai, flashcard và lỗi lưu trữ |
| Web Speech helper | `frontend/src/demo/amThanh.test.ts` | Trình duyệt hỗ trợ và không hỗ trợ phát âm |
| UI health cũ | `frontend/src/pages/HomePage.test.tsx` | Loading/success/network error/fallback và abort |
| API client | `frontend/src/api/health.test.ts` | HTTP lỗi và JSON sai hợp đồng |
| Hook lifecycle | `frontend/src/hooks/useBackendHealth.test.tsx` | Bỏ qua kết quả/lỗi đến sau unmount |
| Stack chạy thật | `scripts/smoke.py` | Backend health, web HTML, Vite proxy và AI mock qua proxy |

Backend dùng pytest + httpx AsyncClient/ASGITransport; mỗi test có app riêng. Frontend dùng Vitest + React Testing Library; `fetch`, MediaRecorder và Web Speech được mock, globals/DOM được dọn sau mỗi test. Không gọi provider tính phí hay DB của người dùng.

Coverage backend đo toàn bộ `app/` (bỏ file package trống); frontend đo mã thực thi trong `src/`, bỏ entry DOM, test và types. Không suy rộng coverage khung thành coverage nghiệp vụ chưa triển khai.

Test mới đặt cạnh mã frontend hoặc trong `tests/unit` / `tests/integration` backend, kiểm tra hành vi và lỗi có ý nghĩa. Khi có DB cần DB test riêng; trước khi phát hành cần thêm Playwright E2E trên trình duyệt thật cho responsive, quyền micro, phát âm và các luồng auth/chat. Hiện `frontend/e2e/` chỉ là vị trí dự phòng.

CI dùng cùng task runner cho lint, coverage, build, Docker và smoke. Có workflow không đồng nghĩa GitHub Actions đã chạy thành công.

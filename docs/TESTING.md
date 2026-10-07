# Kiểm thử

## Mate làm quen sau đăng nhập lần đầu (D-20)

- `pages/LamQuenCungMate.test.tsx`: 13 test tích hợp App/TaiKhoan/Context; đăng nhập thật bằng thông tin demo, focus/title và bố cục riêng, bảy mô tả không hiện mã CEFR, xem trước không đổi dữ liệu, xác nhận từng lựa chọn đặt đúng mức và Speaking theo hồ sơ; giữ thống kê/từ vựng/email. Kiểm tra reload/đăng nhập lại không hỏi, dữ liệu cũ thiếu cờ được hỏi một lần, đổi route không bỏ qua, đăng nhập sai/khôi phục không tạo bước làm quen, đăng ký mới và đăng xuất khi chưa trả lời.
- Cùng các test lộ trình/Reading/nhập môn/hỗ trợ: 37/37 qua. Coverage chọn lọc trang/data làm quen: statements 94.11%, branches 80%, functions/lines 100%; không đại diện cho toàn frontend.
- Chrome QA riêng: 8 tổ hợp sáng/tối × 320/390/768/1440 px, không tràn ngang/cắt lựa chọn; luồng đăng nhập → Mate → bắt đầu từ số 0 → tổng quan, reload và đăng xuất/đăng nhập lại qua, không lỗi JS. Đã xem ảnh desktop sáng/mobile tối.
- Lint/type-check và build chuẩn frontend qua. Toàn frontend 49/89 qua, cùng 40 lỗi kiểm thử cũ tập trung ở luồng tài khoản/điều kiện đăng nhập/văn bản; chi tiết mới nhất trong PROGRESS.

## Lộ trình Pre-A1 đến C2 (D-19)

- `pages/LoTrinhHoc.test.tsx`: thứ tự bảy chặng/default Pre-A1, lưu và khôi phục mức không mất dữ liệu cũ, liên kết đúng mức, nội dung và chấm Reading/Listening ở từng mức, request hội thoại đúng level; query sai fallback, A1 không trộn Pre-A1 khi lọc chủ đề; đổi độ khó xóa phản hồi nhưng giữ nháp Writing; chọn/lưu mức C2 trong hồ sơ.
- `components/NenTangTiengAnh.test.tsx`: 26 chữ cái, số 0–10, lời chào/bản dịch, đọc chậm 0.7, fallback nếu giọng đọc không hỗ trợ.
- 15 test mới cùng 9 Reading/hỗ trợ: 24/24 qua; coverage chọn lọc trinhDo/LoTrinhHoc/NenTangTiengAnh/ChonTrinhDo 100% statements/branches/functions/lines. Backend 21/21 và coverage 100%; test API nhận đủ bảy mức, từ chối A0/C3.
- Chrome QA: 232 tổ hợp (lộ trình và bốn kỹ năng × bảy mức, sáng/tối, 320/390/768/1440 px), không tràn ngang/cắt điều khiển; chọn C2/reload giữ hồ sơ, API qua proxy trả 200 đúng mức cho cả bảy mức. Không lỗi JavaScript; đã xem ảnh desktop sáng/mobile tối. Vite bundle 60 modules và smoke qua.
- Lint phần tác vụ và backend qua. Build chuẩn/lint toàn repo vẫn còn lỗi có sẵn ở TaiKhoan; kiểm thử frontend cũ còn 40 lỗi, chi tiết trong PROGRESS.

## Nút hỗ trợ kính mờ với Mate (D-18)

- Điều chỉnh ống nghe cổ điển/rung: 4 test hỗ trợ tiếp tục qua; Chrome kiểm tra `mate-support-ring`/`mate-phone-ring` có transform thay đổi theo thời gian và đều tắt khi app/hệ thống giảm chuyển động. Đã xem ảnh phóng to ống nghe và dây xoắn.

- `components/HoTroNhanh.test.tsx`: hiển thị điện thoại; click/keyboard mở và đóng/Escape trả focus; pointer capture đúng nút khi nhấn SVG con; drag không mở nhầm; giới hạn nút/panel khi kéo và resize; bỏ qua pointer phụ, ngưỡng chuyển động, cancel/lost capture.
- 4/4 test mới và 5/5 Reading qua. ESLint phần sửa và Vite bundle qua; build TypeScript toàn repo vẫn còn biến chưa dùng ở TaiKhoan.
- Chrome QA riêng đo opacity 0.55 khi nghỉ và 1 khi hover ở sáng/tối; kéo bằng Input.dispatchMouseEvent, mở panel sau kéo vẫn trong viewport. Input.dispatchTouchEvent kiểm tra kéo và panel ở 320/390/768 px; không lỗi JavaScript. Đã xem ảnh kính mờ/đậm và panel mobile.

## Reading và tên kỹ năng tiếng Anh (D-17)

- `frontend/src/pages/LuyenDoc.test.tsx`: bắt buộc trả lời đủ trước khi nộp, chấm đúng/sai và giải thích, khóa đáp án sau khi nộp, làm lại không cộng phút lặp; đổi cả 3 bài xóa kết quả; lưu từ một lần và khôi phục; menu/tổng quan/route/title Reading và Speaking/Listening/Writing.
- 5/5 test mới qua. Coverage chọn lọc Reading: statements 97.05%, branches 97.36%, functions và lines 100%; không đại diện cho coverage toàn frontend.
- Chrome headless riêng: 3 bài × sáng/tối × 320/390/768/1024/1440 px (30 tổ hợp), không tràn ngang trang hoặc điều khiển Reading; chấm 3/3, cộng phút, lưu từ và không lỗi JavaScript. Đã xem ảnh desktop sáng và mobile tối.
- Toàn bộ frontend: 17 qua, 40 lỗi; bản mã trước thay đổi: 12 qua, cùng 40 lỗi. Lỗi cũ tập trung ở luồng tài khoản/điều kiện đăng nhập và assertion văn bản. Backend 16/16 qua, coverage 100%. Build chuẩn và lint toàn repo còn lỗi ở HoTroNhanh/HoSo/TaiKhoan có sẵn; eslint/Prettier các file của tác vụ, Vite bundle và smoke qua. Chi tiết trong PROGRESS.

## Mạng xã hội và chuyển cảnh tài khoản (D-16)

- `pages/TaiKhoan.test.tsx`: từng nút Google/Facebook/GitHub có phản hồi, không gọi mạng/thay dữ liệu phiên hoặc giả đăng nhập thành công. Chuyển hai hướng (group/pill hoặc CTA panel) giữ email/tên, tạo mới ô mật khẩu với autocomplete phù hợp, chỉ có một form; đăng ký/đăng nhập cục bộ vẫn dùng được và không lưu mật khẩu. Khôi phục bỏ nút xã hội, xóa thông báo nhà cung cấp và quay về đúng biểu mẫu.
- Chrome QA: desktop panel trái↔phải khi đổi chế độ (đo `translate` mid/cuối), heading và field theo chế độ; mobile xếp dọc với pill; không lỗi JavaScript.
- Chrome QA riêng kiểm tra 60 tổ hợp: ba chế độ × hai theme × 10 chiều rộng 320–1440 px. Đo chiều cao/độ mờ/transform của form và vị trí indicator ở giữa và cuối chuyển cảnh hai hướng. Kiểm tra bấm đổi liên tục, thông báo nhà cung cấp, giữ dữ liệu/ô mật khẩu mới, luồng tài khoản, alias và hai chế độ giảm chuyển động; cả khi hệ thống đổi tùy chọn giữa animation. Không dùng tài khoản Google/Facebook/GitHub thật.
- Chạy lint/test/coverage/build/smoke toàn dự án; số liệu và các lỗi assertion tồn đọng ghi ở `PROGRESS.md`.

## Linh thú Mate (D-15)

- `frontend/src/LinhThu.test.tsx`: đáp án sai được động viên, đúng được ăn mừng, làm lại/đổi bài xóa trạng thái cũ; kết quả chép chính tả cũng chọn đúng biểu cảm. Again giữ phiên ôn hoạt động, hết phiên mới ăn mừng; không ăn mừng khi chưa có thẻ đến hạn. Mục tiêu dùng phút học hôm nay, giữ tiến độ khi chuyển trang và bỏ thành tích của ngày cũ.
- Chrome QA riêng: kiểm tra 11 trang × sáng/tối × 10 chiều rộng 320–1440 px, chuyển động/hover và hai chế độ giảm chuyển động. Kiểm tra hình/ngôn ngữ kết quả đúng/sai/làm lại và hoàn thành flashcard ở 1440/390/320 px; giữ menu/avatar/đăng nhập/chat và các điều khiển học tập.
- Chạy `make.cmd lint`, `test`, `coverage`, `build`, `smoke`. Kết quả thực tế và các assertion Việt hóa tồn đọng nằm trong `PROGRESS.md`.

## Trang trí và animation (D-14)

- Dùng Chrome QA riêng để đo chuyển động thực của nhân vật, animation đang chạy, dịch chuyển thẻ khi hover và việc tắt animation khi chọn Giảm chuyển động hoặc hệ thống bật `prefers-reduced-motion`.
- Rà soát 11 trang sáng/tối từ 320–1440 px sau khi các hiệu ứng vào trang kết thúc; kiểm tra input/nút không bị tràn hoặc che, menu mobile/avatar, trang đăng nhập riêng, flashcard, trợ giúp và chat qua backend.
- Bộ test giao diện hiện có tiếp tục kiểm tra nội dung ngắn, nhãn/điều khiển, chuyển route và giữ dữ liệu; kết quả thực tế nằm trong `PROGRESS.md`.

## Giao diện tối giản (D-13)

- `frontend/src/GiaoDien.test.tsx`: nhãn và điều khiển Cài đặt vẫn hoạt động khi bỏ mô tả; tiêu đề 9 trang không có slogan/subtitle; giữ đề bài viết và giải thích câu; liên kết kỹ năng đi đúng trang; mục tiêu có progressbar; mở/đóng hướng dẫn và đánh giá flashcard hoạt động.
- `App.test.tsx`: cập nhật lời chào `Chào Anh` và nhãn `AI · Demo` theo thay đổi nội dung chủ động; không vô hiệu hóa hay nới lỏng kiểm thử.
- Chrome QA riêng: 11 trang × sáng/tối × 10 chiều rộng (320/360/390/600/760/800/820/1024/1200/1440), kiểm tra tràn trang/main và vùng input/nút. Kiểm tra drawer sau khi hiệu ứng kết thúc, menu avatar, trang đăng nhập riêng, ôn flashcard, mở hướng dẫn, hội thoại qua API thật và lỗi JavaScript.
- Đã xem ảnh tổng quan/cài đặt/hội thoại/đăng nhập desktop, tổng quan/cài đặt mobile và theme tối. Kết quả lint/test/coverage/build/smoke ghi trong `PROGRESS.md`.

## Trang đăng nhập độc lập (D-12)

- `pages/TaiKhoan.test.tsx`: trang `#dang-nhap` và hai alias cũ không chứa sidebar/topbar học tập; khách quay lại tổng quan; Cài đặt chỉ có tùy chọn; đăng nhập riêng rồi về học tập giữ hồ sơ và theme.
- `components/MenuNguoiDung.test.tsx`: liên kết khách mở trang đăng nhập riêng; menu đã đăng nhập được kiểm tra sau khi bấm vào không gian học tập.
- Test luồng tài khoản trong `App.test.tsx` kiểm tra đăng nhập/đăng ký/khôi phục/đăng xuất trên bố cục độc lập.
- Chrome headless với hồ sơ QA riêng: đăng nhập, đăng ký, khôi phục vừa viewport 360/390/760/1440 px, không sidebar/topbar; kiểm tra vào học tập, logout, theme, reload và hai alias cũ. Đã xem ảnh desktop/mobile/theme tối.

## Cài đặt và menu avatar (D-10, D-11)

- `pages/CaiDat.test.tsx`: áp dụng/lưu/khôi phục theme, motion và tốc độ đọc; giữ hồ sơ khi cài đặt cũ thiếu hoặc sai định dạng; đổi theo hệ thống và dọn matchMedia listener; kiểm tra tốc độ Web Speech thực sự dùng tùy chọn.
- `components/MenuNguoiDung.test.tsx`: khách chỉ có Đăng nhập; liên kết mở trang đăng nhập độc lập; đã đăng nhập có Hồ sơ học tập/Đăng xuất; đóng qua mouseleave, Escape, bấm ngoài; logout cập nhật phiên và menu.
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

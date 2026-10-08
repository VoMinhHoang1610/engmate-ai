# Kiểm thử

Schema MySQL: [verify_catalog.sql](../database/mysql/tests/verify_catalog.sql) kiểm tra chỉ đọc danh mục và đáp án. Bootstrap đã tạo thành công trên MySQL 8.0.45 với datadir/cổng riêng; 45 assertion CLI qua cho seed/Reading/ownership/bảy mức/voice/onboarding/Version/views. Chưa thử MySQL 8.4.

## API và giao diện MySQL — 2026-10-09

Tạo database test riêng từ SQL root, tên kết thúc `_test`, chưa có tài khoản. Đặt `MYSQL_TEST_URL=mysql+pymysql://username:password@host:port/EngMateAI_test?charset=utf8mb4` trong terminal rồi chạy `python scripts/manage.py test` và `coverage`. test_mysql.py từ chối schema tên khác hoặc có tài khoản; outer transaction/savepoint rollback toàn bộ dữ liệu thử, không tạo DDL. SQL Server tests vẫn cần SQLSERVER_TEST_ODBC_CONNECTION riêng; 22 cases skip khi không cấu hình không được coi là đã kiểm chứng lại SQL Server.

| Yêu cầu | Kiểm thử |
| --- | --- |
| MySQL mapping, UTC/pool, catalog, Version/voice/onboarding | test_mysql_catalog, test_mysql_pool, test_mysql_levels_voice_onboarding |
| Auth, ownership, revoke/reset, media, retry/rollback | 13 workflow API dùng chung với test_sqlserver, chạy MySQL |
| Reading/Listening chấm server, không lộ đáp án, dictation audio | test_mysql_grading, test_mysql_dictation_audio (speech mock) |
| Auth/refresh và logout với response muộn | api/database.test.ts |
| Khởi chạy không khôi phục token cũ; đăng nhập chờ tải và vào home, lỗi tải thử lại, đăng ký làm quen | api/database.test.ts, Mysql.test.tsx, TaiKhoan.test.tsx |
| Context, lưu dữ liệu, bài tập, chat, flashcard retry | Mysql.test.tsx |
| Đăng ký → lưu → reload → logout/login | Chrome headless với EngMateAI_browser_test riêng |

Chrome đã kiểm tra đăng ký, A1/onboarding, hồ sơ, từ sau reload, Reading 100%, Writing, chat, flashcard và logout/login; không có pageerror hoặc tràn ngang ở 390 px. Artifact local `.artifacts/browser-check/mysql.cjs`, mysql-reading.png, mysql-mobile.png. Không ghi account E2E vào EngMateAI của người dùng hoặc gọi speech trả phí trong lượt này. Kết quả coverage đầy đủ ở mục mới nhất PROGRESS.

Luồng đăng nhập mới cần đăng nhập lại sau reload. Script `.artifacts/browser-check/login-startup.cjs` kiểm tra đăng ký/làm quen → home → lưu từ → logout/login → reload hiện login → mật khẩu sai → login vào home ngay → từ còn trong MySQL → mobile 390 px. Dùng EngMateAI_browser_test riêng. Script mysql.cjs cũ ghi kết quả lịch sử của chính sách khôi phục phiên, không còn phù hợp để chạy nguyên trạng.

## Bản tích hợp develop demo

Kết quả ngày 2026-10-08: 70 backend tests và 92 frontend tests qua, gồm 22 SQL integration; backend coverage 92,83%, frontend statements 88,97%/branches 86,39%/functions 87,09%/lines 90,96%. Lint/types/build và Docker HTTP smoke qua. Thông tin chạy/scope ở PROGRESS và DEMO_DEVELOP.

UI mới yêu cầu đăng nhập abc/123 trước trang học tập. `frontend/tests/demo.ts` tạo fixture phiên cục bộ hợp lệ; guest menu kiểm tra riêng trong LuuTru provider. TaiKhoan tests vẫn kiểm tra credential sai, password mismatch, giữ profile/preferences, xóa password khi chuyển form và OAuth không tạo phiên giả. Test intro kiểm tra timers/sessionStorage/remount; `HoTroNhanh.test.tsx` kiểm tra pointer từ SVG và drag không mở panel. Test storage dùng jsdom.window gốc thay Node Web Storage. Không skip/bỏ assertion thất bại hoặc hạ coverage threshold.

## Giao diện mới từ sua-giao-dien (D-17 đến D-20)

- `pages/LamQuenCungMate.test.tsx`: đăng nhập demo, bảy mô tả và xác nhận, preview không sửa dữ liệu, migration thiếu cờ, reload/logout/đăng ký mới và chặn bỏ qua bằng route.
- `pages/LoTrinhHoc.test.tsx`, `components/NenTangTiengAnh.test.tsx`: bảy mức, lưu/khôi phục, liên kết kỹ năng, query fallback, đề/đáp án theo mức, alphabet/số/lời chào và Web Speech fallback.
- `pages/LuyenDoc.test.tsx`: trả lời đủ, chấm và giải thích, khóa đáp án, làm lại/đổi bài, chống cộng phút lặp, lưu từ và khôi phục.
- `components/HoTroNhanh.test.tsx`: điện thoại Mate, click/bàn phím/Escape/focus, capture từ SVG, kéo tiếp từ vị trí hiện tại, clamp/resize và cancel/lost capture.
- `backend/tests/unit/test_security.py`: mức lưu profile/conversation bị giới hạn theo SQL v1; `tests/integration/test_sqlserver.py` xác nhận mức mới trả 422 và không sửa hồ sơ/tạo hội thoại. `tests/integration/test_api.py` kiểm tra mock reply đủ bảy mức; unit service kiểm tra prompt v2 được truyền vào provider. Không nới SQL schema trong merge.

Các số liệu Chrome QA của nhánh nguồn là lịch sử trong PROGRESS; không coi đó là browser E2E mới của bản merge. Fixture phiên học cũ có `daLamQuen=true`; test làm quen kiểm tra riêng false/thiếu cờ và đăng ký lại.

## Backend API SQL Server (DB-05, B-01 đến B-09)

Chạy từ root bằng `python scripts/manage.py coverage` sau khi đặt connection test. Ví dụ PowerShell với SQL Server Windows Authentication:

```powershell
$env:SQLSERVER_TEST_ODBC_CONNECTION='DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=tempdb;Trusted_Connection=yes;TrustServerCertificate=yes'
python scripts/manage.py coverage
```

- `backend/tests/integration/test_sqlserver.py` bắt buộc DB_NAME là tempdb và schema em chưa tồn tại. DDL/seed/views chạy trong outer transaction; mỗi test có savepoint và cuối module rollback toàn bộ. Chạy tuần tự, không song song với bộ SQL standalone. Không trỏ biến test vào database ứng dụng.
- Khi thiếu biến trên, SQL integration bị skip; kết quả đó không kiểm chứng API nghiệp vụ. Coverage ≥80% toàn app cần bộ SQL này. CI mới cung cấp SQL Server 2022 và ODBC Driver 18 với tài khoản dùng một lần.
- Integration kiểm tra auth/revoke/reset, profile/settings/account version, ownership, catalog, chat/retry/fail/timeout/cancel, practice/answer rollback/feedback/abandon, notebook/search/mastery, flashcards/review schedule, dashboard/timezone, private media và migration version. Kiểm thử engine pool riêng chỉ đọc SELECT trên tempdb.
- Unit tests `test_security.py`, `test_request_limits.py`, `test_media.py`, `test_mailer.py` kiểm tra JWT/Argon2/input UTF-16, request size/auth 429/redacted validation, avatar/audio/truncated WAV, SMTP STARTTLS và lỗi giao thư. SMTP/LLM đều giả; không gửi email thật hoặc gọi paid API.
- SMTP đã cấu hình nhưng giao thư lỗi vẫn trả 202 như email không tồn tại; test so sánh hai response. Unit mailer kiểm tra chuyển lỗi giao thư thành lỗi service. Không tuyên bố đã kiểm chứng timing enumeration hoặc SMTP production.
- Chưa có test tải hoặc nhiều connection ghi đồng thời. Fixture dùng connection/savepoint chung; không suy rộng thành bằng chứng concurrency production.
- Lint bao gồm Ruff/Black/mypy và ESLint/TypeScript/Prettier; build là TypeScript/Vite. Smoke kiểm tra health, HTML và mock API qua Vite proxy, không kiểm chứng UI nghiệp vụ đa trang.
- Bản develop hợp nhất UI demo đa trang. Test setup lấy localStorage/sessionStorage từ cửa sổ jsdom gốc, tránh Node 25 Web Storage che mất browser storage. Các số 13 tests scaffold là kết quả lịch sử trước merge.

Các kết quả chạy cuối, coverage và trạng thái Docker/CI xem [PROGRESS](PROGRESS.md).

## Thiết kế database SQL Server (DB-01 đến DB-04)

- Chạy từ `database/sqlserver`: `sqlcmd -S localhost -E -d tempdb -b -f 65001 -i tests/verify.sql -W`.
- Nếu terminal ở thư mục gốc repo, chạy `Push-Location .\database\sqlserver` trước và `Pop-Location` sau lệnh kiểm thử. File đầu vào và các include `:r` đều cần thư mục làm việc này.
- Test bắt buộc tempdb và schema `em` chưa tồn tại; chạy DDL/seed hai lần/views/truy vấn mẫu trong outer transaction; rollback toàn bộ và kiểm tra schema biến mất. Không dùng database ứng dụng hoặc dữ liệu tài khoản thật.
- **45 kiểm tra qua trên SQL Server 2022 Developer 16.0.1200.5**: 22 bảng/2 views; seed/Unicode; UNIQUE/CHECK/FK; owner của hội thoại/tin/bài/media/AI/từ/ôn; đúng lesson/question/option/mode; retry idempotency; JSON/score/span; mock label; thống kê không nhân số liệu, ngày UTC/Vietnam khác nhau, ngày chỉ có lượt ôn, archive giữ lịch sử và thêm lại từ.
- DB-01 → đối chiếu code và tài liệu `DATABASE_SQLSERVER.md`; DB-02/03/04 → `tests/verify.sql`; DB-05 có SQL integration ở mục trên; DB-06 cần UI integration/E2E. Chưa có coverage ứng dụng cho SQL artifacts; không xem backend coverage 100% là coverage database.
- Kết quả 16 backend tests và lỗi frontend trong nhật ký thiết kế là kết quả lịch sử trước khi tách nhánh. Xem mục mới nhất trong PROGRESS.md cho backend hiện tại. Chưa có thử tải/concurrency hoặc kiểm thử SQL Server 2019 riêng.

Chạy từ root bằng `python scripts/manage.py test` hoặc Windows `.\make.cmd test`. `coverage` chạy lại test và yêu cầu ít nhất 80% ở từng phía. Kết quả thật xem [PROGRESS.md](PROGRESS.md).

| Phạm vi | File test | Hành vi kiểm tra |
| --- | --- | --- |
| Config/application factory | `backend/tests/unit/test_config.py` | Env override, provider không hỗ trợ |
| AI service | `backend/tests/unit/test_ai_service.py` | Inject provider, prompt phiên bản và CEFR được truyền đúng |
| API | `backend/tests/integration/test_api.py` | Health, mock 3 trình độ, validation, timeout, CORS và OpenAPI |
| UI đa trang | `frontend/src/App.test.tsx` | Route/menu, hồ sơ, tài khoản cục bộ, chat, luyện tập, notebook/flashcard và lỗi storage |
| UI health cũ | `frontend/src/pages/HomePage.test.tsx` | Loading/success/network error/fallback và abort |
| API client | `frontend/src/api/health.test.ts` | HTTP lỗi và JSON sai hợp đồng |
| Hook lifecycle | `frontend/src/hooks/useBackendHealth.test.tsx` | Bỏ qua kết quả/lỗi đến sau unmount |
| Stack chạy thật | `scripts/smoke.py` | Backend health, web HTML, Vite proxy và AI mock qua proxy |

Backend dùng pytest + httpx AsyncClient/ASGITransport; mỗi test có app riêng. Frontend dùng Vitest + React Testing Library; `fetch` được mock và globals/DOM được dọn sau mỗi test. Không gọi provider tính phí hay DB của người dùng.

Coverage backend đo toàn bộ `app/` (bỏ file package trống); frontend đo mã thực thi trong `src/`, bỏ entry DOM, test và types. Không suy rộng coverage khung thành coverage nghiệp vụ chưa triển khai.

Test mới đặt cạnh mã frontend hoặc trong `tests/unit` / `tests/integration` backend, kiểm tra hành vi và lỗi có ý nghĩa. DB integration dùng tempdb có guard/rollback như trên; khi nối UI chat thêm MSW và Playwright E2E. Hiện `frontend/e2e/` chỉ là vị trí dự phòng.

CI dùng cùng task runner cho lint, coverage, build, Docker và smoke. Có workflow không đồng nghĩa GitHub Actions đã chạy thành công.

## Kiểm chứng giao diện trên nhánh trước khi hợp nhất (lịch sử)

Các mục dưới giữ hướng dẫn và kết quả QA trước đây. Số liệu test/lint hiện tại xem PROGRESS; chưa chạy lại ma trận Chrome responsive trong tác vụ merge.

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

## Speech Blaze

B-SPEECH → tests/unit/test_speech.py: payload/multipart, poll/download, timeout, lỗi provider, dữ liệu sai, giới hạn dung lượng, quyền truy cập và Origin. Test dùng MockTransport, không gọi API trả phí. Smoke thật đã kiểm tra TTS Hello. và STT từ audio sinh ra; xem [BLAZE_SPEECH.md](BLAZE_SPEECH.md). Coverage riêng speech dùng --cov=app.services.speech --cov=app.api.speech_routes --cov=app.schemas.speech; không thay thế coverage toàn backend/SQL.

Frontend speech: amThanh.test.ts kiểm tra request/play/cancel/errors/multipart; useThuAm.test.ts kiểm tra transcript, giải phóng micro, từ chối quyền và bỏ kết quả muộn; App.test.tsx kiểm tra điền transcript Speaking. Chrome headless đã phát MP3 thật và thu MediaRecorder từ file âm thanh mẫu, gọi Blaze STT rồi điền Speaking/Chat. Không coi input mẫu là kiểm chứng micro vật lý hoặc mọi trình duyệt. Artifact trong .artifacts/browser-check.

Chọn giọng: test_speech.py kiểm tra catalog/filter/gender/error/route; CaiDat.test.tsx kiểm tra tải, chọn, lưu/khôi phục, nghe thử và retry; amThanh.test.ts kiểm tra speaker_id trên TTS. Chrome đã kiểm tra lựa chọn Alice được giữ sau reload và gửi đúng voice cho Speaking. Artifact .artifacts/browser-check/settings-voices*.png.

Độ trễ: amThanh.test.ts kiểm tra phát clip đã chuẩn bị không chờ fetch, dedup preload/click, hủy độc lập, lỗi/retry/timeout, key giọng/tốc độ, LRU/TTL/giới hạn bytes và xóa khi logout. NutDoc.test.tsx kiểm tra preload im lặng, hover/focus, debounce, đổi tùy chọn và hủy khi rời trang. Chrome headless với Blaze thật: cold 1.654 ms, prepared 76 ms, replay 47 ms, không có request mới khi phát từ cache. Script/result ở .artifacts/browser-check/latency*. Một lượt kiểm tra thêm giọng Brian gặp backend 503 từ provider; không coi lượt đó là kiểm chứng playback giọng Brian.

Lượt QA tối ưu audio: 128 frontend tests qua; coverage 90,88% statements / 86,77% branches / 88,35% functions / 92,94% lines. Backend 77 tests qua, 22 SQL integration skip do chưa cấu hình SQLSERVER_TEST_ODBC_CONNECTION. Task coverage toàn backend đạt 52,08%, chưa đạt ngưỡng 80% trong môi trường thiếu SQL; task coverage-frontend chạy riêng và qua. Không hạ ngưỡng hoặc bỏ SQL tests.

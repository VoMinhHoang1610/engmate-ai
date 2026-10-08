# Yêu cầu và backlog

Cập nhật: 2026-10-09. Frontend có chế độ MySQL dùng API/JWT và dữ liệu theo tài khoản; demo giữ localStorage. Hội thoại và đánh giá nói/viết vẫn dùng mock AI có nhãn.

| ID | Yêu cầu khung | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| S-01 | Web JavaScript/TypeScript, React/Vite, TypeScript strict | lint/type-check, build | Đã test |
| S-02 | Backend Python, FastAPI và schema Pydantic | pytest, mypy | Đã test |
| S-03 | AI qua interface; mock miễn phí và prompt tách file | Unit service, integration mock | Đã test |
| S-04 | Unit/integration test backend; test API client/component/hook frontend | pytest/Vitest và coverage ≥80% | Đã test |
| S-05 | Web kết nối backend với trạng thái tải/lỗi | UI tests, HTTP proxy smoke | Đã test |
| S-08 | Khởi chạy MySQL hiện đăng nhập trước; đăng nhập vào Tổng quan ngay, không cần reload | Mysql.test.tsx, database.test.ts, TaiKhoan.test.tsx và Chrome E2E | Đã test |
| S-09 | Nút Nghe giữ biểu tượng, một lần bấm phát nhanh; ưu tiên clip chuẩn bị/giọng English cục bộ khi chưa có clip; preview đúng giọng | NutDoc/amThanh/CaiDat tests, Chrome slow-audio E2E | Đã test |
| S-06 | Documentation để cập nhật tiến độ, quyết định và yêu cầu | Rà soát docs/PROGRESS | Đã rà soát |
| S-07 | Setup nhất quán, lockfile, Docker, pre-commit và CI | Setup, Docker smoke, hook local, [GitHub Actions](https://github.com/VoMinhHoang1610/engmate-ai/actions/runs/37506823374) | Đã test local và GitHub Actions |

## Backlog sản phẩm

1. Nối giao diện đa trang với API SQL Server theo [hợp đồng](API.md); chính sách nhập localStorage cũ và E2E.
2. OAuth, xác minh email và xóa dữ liệu tài khoản. Đăng ký/đăng nhập JWT, reset mật khẩu, hồ sơ/cài đặt và ownership đã triển khai.
3. Chat streaming và phân tích/sửa lỗi thật. Hội thoại/lịch sử/evaluation mock đã triển khai.
4. Adapter LLM thật, retry/fallback/timeout, contract output và thử nghiệm sư phạm.
5. UI tài khoản/chat/gợi ý; MSW cho API nghiệp vụ và Playwright E2E khi có luồng hoàn chỉnh.
6. Đo độ trễ, xử lý client ngắt kết nối và lỗi hạ tầng.
7. Bộ nhớ dài hạn và tóm tắt sau MVP. Dashboard SQL đã triển khai; STT/TTS server khi được yêu cầu.

Mock hiện chỉ trả response xác định và nhãn `provider=mock`, không phân tích lỗi hoặc tạo phản hồi AI thật.

## Database SQL Server

| ID | Yêu cầu | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| DB-01 | Khảo sát toàn bộ chức năng, ánh xạ dữ liệu, ERD và từ điển dữ liệu | `docs/DATABASE_SQLSERVER.md`, đối chiếu code frontend/backend | Xong |
| DB-02 | Schema SQL Server: tài khoản/hồ sơ/cài đặt, media, chủ đề/bài/câu hỏi, phiên học/hội thoại/lần làm, AI/lỗi, từ/flashcard | 22 bảng, PK/FK/UNIQUE/CHECK/index; script trên SQL Server 2022 | Đã test |
| DB-03 | Danh mục và thống kê tổng/ngày không trùng hoặc nhân dữ liệu | 8 chủ đề, 9 bài, seed chạy hai lần, 2 view, kiểm tra ngày Việt Nam | Đã test |
| DB-04 | Kiểm tra ownership, idempotency, dữ liệu sai và rollback môi trường thử | `database/sqlserver/tests/verify.sql`: 45/45 kiểm tra | Đã test |
| DB-05 | Kết nối FastAPI bằng SQLAlchemy Core/pyodbc, repository và migration runner chủ động | SQL integration trên SQL Server 2022 | Đã test |
| DB-06 | Nối UI, nhập localStorage và OAuth | Cần integration/E2E khi triển khai | Chưa làm |

## Backend nghiệp vụ MVP

| ID | Yêu cầu | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| B-01 | Auth Argon2/JWT, refresh xoay vòng, logout/reset/đổi mật khẩu thu hồi phiên | SQL integration + security/mailer unit tests | Đã test; SMTP giả |
| B-02 | Account/profile/settings với version; private avatar và recording | SQL integration + media/security unit tests | Đã test |
| B-03 | Catalog published/active và question payload chưa lộ answer key | SQL integration | Đã test; transcript public cho browser TTS |
| B-04 | Hội thoại/lịch sử, request UUID, ownership, timeout/cancel | SQL integration với LLM giả | Đã test; chưa streaming/AI thật |
| B-05 | Luyện nghe chấm SQL; nói/viết lưu input và phản hồi mock; retry/abandon | SQL integration | Đã test; không chấm AI thật |
| B-06 | Notebook CRUD/archive/tìm kiếm/mastery; flashcard lịch ôn và retry | SQL integration | Đã test |
| B-07 | Dashboard tổng/ngày, timezone và thời lượng server | SQL integration | Đã test |
| B-08 | Validation, body/auth limits, errors không lộ bí mật, OpenAPI | Unit/integration + export-api | Đã test; rate limit theo process |
| B-09 | Docker ODBC/audio decoder, workflow SQL Server test | Docker local + cấu hình CI | Local đã test; workflow mới chưa chạy GitHub |

S-07 ở trên là kết quả CI lịch sử của scaffold. Workflow SQL Server hiện tại chưa push hoặc xác nhận bằng GitHub Actions run mới. Kết quả bản tích hợp xem mục mới nhất trong [PROGRESS](PROGRESS.md).

## Bản demo frontend

| ID | Yêu cầu demo | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| D-01 | Giao diện hiện đại, sidebar desktop và menu drawer trên mobile | Responsive review, build | Đã hoàn thành |
| D-02 | 12 trang học tập: tổng quan, lộ trình, hội thoại AI, Speaking, chủ đề nhập vai, Listening, Reading, Writing, sổ từ vựng, flashcard, hồ sơ và cài đặt; trang đăng nhập độc lập | Vitest route/menu/tài khoản | Đã test |
| D-03 | Tên file, component và hash route tiếng Việt không dấu | Rà soát `frontend/src` | Đã hoàn thành |
| D-04 | Lưu hồ sơ, từ vựng, thống kê ngày và lịch ôn trong trình duyệt | Test lưu/khôi phục/lỗi storage | Đã test |
| D-05 | Hội thoại gọi `/api/ai/reply`; các phản hồi mô phỏng phải có nhãn rõ ràng | Test success/error/abort | Đã test với mock |
| D-06 | Dùng Web Speech và MediaRecorder khi trình duyệt hỗ trợ, có fallback khi không hỗ trợ | Unit/component test với browser API mock | Đã test mức component |
| D-07 | Tích hợp logo theo ảnh cung cấp, favicon và màu thương hiệu; bố trí vừa desktop/mobile | Build, ESLint/TypeScript, test shell/route, Chrome 1440/360/390/760 px | UI lịch sử đã kiểm chứng; kết quả tích hợp xem PROGRESS |
| D-08 | Thanh cuộn mờ dần khi hiện/ẩn, chỉ hiện khi cuộn và không làm đổi bố cục | Vitest timer/sự kiện/cleanup, Chrome alpha trung gian desktop/mobile, build | Đã test |
| D-09 | Chỉ chú thích demo cạnh tính năng AI, không có nhãn demo chung hoặc ở tài khoản/flashcard/hồ sơ | Vitest giới hạn nhãn và luồng tài khoản; Chrome 10 route, 1440/360/390 px | Đã test |
| D-10 | Cài đặt có giao diện sáng/tối/theo hệ thống, giảm chuyển động và tốc độ đọc; chỉ chứa tùy chọn học tập | Vitest lưu/khôi phục/migration/matchMedia/Web Speech, Chrome desktop/mobile/reload | Đã test |
| D-11 | Menu avatar mở qua hover hoặc bấm: khách chỉ có Đăng nhập; đã đăng nhập có Hồ sơ học tập và Đăng xuất | Vitest hover/click/route/Escape/outside/logout; Chrome trạng thái phiên | Đã test |
| D-12 | Đăng nhập/đăng ký/khôi phục tại `#dang-nhap` với bố cục riêng; không sidebar/topbar học tập, giữ liên kết cũ và có nút về học tập | Vitest tách bố cục/alias/chuyển trang/giữ theme, Chrome 360/390/760/1440 px và luồng phiên | Đã test |
| D-13 | Nội dung giao diện gọn; bỏ mô tả nhỏ dưới tên thành phần, chỉ giữ nội dung học và thông tin thao tác cần thiết; hướng dẫn phụ mở khi cần | Vitest nhãn/điều khiển/cài đặt/route/flashcard/details; lint/build/smoke; Chrome 11 trang sáng/tối từ 320–1440 px | Đã test |
| D-14 | Thêm trang trí và animation cho toàn giao diện: banner/nhân vật, thẻ màu, hover, chuyển trang, nút và các trang luyện tập; giữ chữ gọn, hỗ trợ giảm chuyển động | Chrome chuyển động thực/hover/giảm chuyển động/responsive; Vitest luồng đang có, lint/build/smoke | Đã test |
| D-15 | Dùng robot đã chọn làm linh thú Mate nhất quán; biểu cảm theo hoạt động/kết quả, giao diện học vui với thẻ nổi, giữ đăng nhập riêng/chữ gọn | Vitest kết quả nghe/ôn/mục tiêu; Chrome sáng/tối/mobile/giảm chuyển động, lint/build/smoke | Đã test |
| D-16 | Thêm giao diện Google/Facebook/GitHub; panel Mate cuộn đổi đăng nhập ↔ đăng ký theo brand EngMate, form mở theo hướng; chỉ hoàn thiện giao diện | Vitest không tạo phiên xã hội giả/giữ dữ liệu/luồng tài khoản; Chrome đo translate panel/form desktop + mobile xếp dọc/giảm chuyển động; lint/build | Đã test giao diện; OAuth chưa kết nối |
| D-17 | Reading với 7 bài đọc Pre-A1 đến C2, trắc nghiệm/điểm/giải thích, lưu từ vựng và ghi nhận phút học; tên kỹ năng Speaking/Listening/Reading/Writing trong menu, tổng quan, tiêu đề | 5 Vitest mới, coverage Reading; Chrome 30 tổ hợp bài/theme/viewport và luồng chấm/lưu từ | Đã test |
| D-18 | Nút hỗ trợ Mate cầm điện thoại, kính mờ khi nghỉ/đậm khi hover và kéo; kéo chuột/cảm ứng có giới hạn màn hình, panel và bàn phím hoạt động | 5 Vitest; Chrome QA lịch sử sáng/tối, hover/kéo và cảm ứng 320/390/768 px | Đã test |
| D-19 | Lộ trình Pre-A1 → C2; người mới có chữ cái/số đếm/lời chào; lưu và khôi phục mức học, bốn kỹ năng/nhập vai/API mock không lưu hỗ trợ bảy mức; SQL v1 A2/B1/B2 | 15 Vitest mới; 21 backend tests; Chrome 232 tổ hợp và API cả bảy mức | Đã test nội dung thực hành; chưa phải khóa học/bài thi chứng nhận CEFR |
| D-20 | Mate hỏi khả năng tiếng Anh ngay sau đăng nhập đầu tiên bằng mô tả dễ hiểu, không hiện mã CEFR trong lựa chọn; tự đặt mức học và nhớ đã làm quen; đăng ký mới được hỏi lại | 13 Vitest luồng đăng nhập/lưu/migration/bảy câu trả lời; Chrome 8 tổ hợp sáng/tối/viewport và đăng nhập lại | Đã test |

MySQL lưu đủ bảy mức, Reading, giọng/tốc độ và làm quen qua API. Schema SQL Server v1 giữ giới hạn A2/B1/B2. Hai chế độ frontend tách dữ liệu: MySQL không nhập tự động localStorage demo.

Các kết quả Chrome trong bảng là QA lịch sử của nhánh giao diện; không coi đó là browser E2E mới của bản tích hợp. API backend đã có auth/SMTP reset, nhưng UI tài khoản hiện vẫn cục bộ. UI hiện yêu cầu đăng nhập demo abc/123 trước khi vào học tập; liên kết vào không gian học tập chỉ dùng sau khi đăng nhập. Lint/test/coverage/build của bản tích hợp đều qua; không còn lỗi assertion Việt hóa cản kiểm chứng. Chi tiết ở PROGRESS và DEMO_DEVELOP.

## Speech server — 2026-10-08

| Yêu cầu | Trạng thái | Kiểm chứng |
| --- | --- | --- |
| B-SPEECH: Blaze TTS/STT trong backend | Đã test | tests/unit/test_speech.py; HTTP smoke thật en |
| Nối frontend với speech API | Đã test | Vitest speech/microphone; Chrome TTS, Speaking và Hội thoại với audio đầu vào mẫu |

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| F-VOICE | Chọn giọng en, nghe thử, lưu lựa chọn và dùng khi học | Đã test: CaiDat/amThanh tests, Chrome desktop/mobile |
| F-SPEECH-LATENCY | Chuẩn bị clip hiện tại, cache có giới hạn, phát lại không tạo job mới, giữ đúng giọng/tốc độ và hủy an toàn | Đã test: amThanh/NutDoc tests; Chrome/Blaze đo phát clip đã chuẩn bị dưới 100 ms ở local |

## Chuyển MySQL — 2026-10-09

| Yêu cầu | Trạng thái |
| --- | --- |
| Chuẩn bị SQL MySQL đầy đủ bảy mức, Reading, giọng nói và làm quen; seed khớp UI | Đã test: tạo schema trên MySQL 8.0.45, 45 assertion CLI |
| Chuyển driver, ánh xạ bảng/view, UUID, UTC, Version và khóa giao dịch MySQL | Đã test trên MySQL 8.0.45 |
| Nối đăng ký/đăng nhập, hồ sơ/làm quen, giọng/cài đặt, từ, bài làm, hội thoại, flashcard và dashboard vào MySQL | Đã test API và frontend; kiểm tra trình duyệt với schema riêng |
| Chấm Reading/Listening theo revision trên server, ẩn answer key trước nộp | Đã test: trắc nghiệm và dictation; replay không ghi trùng |
| Đánh giá Speaking/Writing và phản hồi hội thoại bằng AI thật | Chưa làm; vẫn mock có nhãn |

# Nhật ký tiến trình EngMate-AI

## 2026-10-09 — Mở đăng nhập trước và vào home ngay

- **Yêu cầu:** mở ứng dụng hiện đăng nhập trước; sửa tình trạng phải tải lại sau đăng nhập mới vào home. Nhánh fix/login-startup; giữ thay đổi MySQL/giọng có sẵn, chưa commit/push.
- **Thay đổi:** api/database.ts giữ token trong bộ nhớ trang, không khôi phục token sessionStorage cũ khi mở/reload. TaiKhoan.tsx chờ context tải dữ liệu sau authenticate rồi chuyển Tổng quan; nút giữ trạng thái xử lý và lỗi tải cho thử lại. Demo cũng chuyển Tổng quan ngay sau đăng nhập; tài khoản mới vẫn làm quen trước. Không thay backend, DDL hoặc dữ liệu người dùng.
- **Tests:** thêm kiểm tra token cũ, App/MySQL trong StrictMode, tải chậm/chống gửi trùng, lỗi tải/thử lại và đăng ký làm quen. Cập nhật assertion demo từ bước bấm liên kết/trở về Cài đặt sang tự mở Tổng quan theo hành vi mới được yêu cầu; giữ kiểm tra hồ sơ/cài đặt và credential sai.
- **Kiểm chứng:** `scripts/manage.py lint`, `test`, `coverage`, `build` đều qua với MYSQL_TEST_URL trỏ schema riêng. Frontend **161 qua**, coverage **88,01% statements / 82,58% branches / 85,82% functions / 90,63% lines**. Backend **97 qua / 22 SQL Server skip**, coverage **89,16%**; SQL Server chưa được kiểm chứng lại. Build JS 316,24 kB / gzip 99,06 kB.
- **Chrome E2E:** MySQL EngMateAI_browser_test riêng: startup từ link Cài đặt/token cũ → đăng ký/làm quen/home → lưu từ → logout/login vào home không reload → reload hiện login → mật khẩu sai bị chặn → login/home/từ còn → mobile 390 px. Không pageerror/tràn ngang; artifact `.artifacts/browser-check/login-startup.cjs`, login-home-mobile.png. Không tạo tài khoản thử trên EngMateAI của người dùng, không gọi speech trả phí.
- **Tài liệu/giới hạn:** README, ARCHITECTURE/REQUIREMENTS/TESTING/DECISIONS/CHANGELOG cập nhật chính sách phiên. Mở hoặc F5 trang MySQL cần đăng nhập lại; dữ liệu bền vững trong DB. Web thực tế vẫn 5175/backend 8011. Script E2E mysql.cjs cũ thuộc chính sách khôi phục phiên trước đó, không chạy nguyên trạng với luồng mới.

## 2026-10-09 — Backend và giao diện đồng bộ MySQL

- **Yêu cầu:** tiếp tục kết nối dữ liệu với MySQL localhost:3307/EngMateAI do người dùng cung cấp. Cấu hình credentials chỉ trong `.env` bị ignore; frontend chỉ đặt lựa chọn `VITE_DATA_SOURCE=mysql` trong `.env.local`. Nhánh feat/mysql-backend, giữ toàn bộ thay đổi có sẵn, chưa commit/push.
- **Backend:** driver PyMySQL[rsa]/SQLAlchemy Core, ánh xạ 24 bảng/2 view tiếng Việt, UUID chuỗi, Version trigger hex, refresh sau INSERT/UPDATE, UTC và READ COMMITTED/FOR UPDATE. Auth/JWT, ownership, retry và transaction rollback giữ hợp đồng API. Hỗ trợ bảy mức/onboarding/voice/glossary/Reading; giấu CorrectQuestionId; dictation MP3 có xác thực dùng voice/rate đã lưu. Không chạy lại DDL trên database người dùng.
- **Frontend:** transport Bearer/refresh, không hồi sinh phiên sau logout; MysqlLuuTru tải server và tuần tự hóa cập nhật Version. Nối đăng ký/đăng nhập, làm quen, hồ sơ/avatar/cài đặt, từ, chat/history, bốn kỹ năng, flashcard và dashboard. Reading/Listening dùng điểm server; thời gian dựa trên phiên server. Không nhập demo localStorage. Email hồ sơ MySQL hiển thị chỉ đọc; API sửa account cần mật khẩu riêng.
- **Kiểm chứng:** MySQL 8.0.45 riêng cổng 13429; 20 integration cases MySQL qua, API workflows rollback. Toàn backend **97 qua, 22 SQL Server skip**, coverage **89,16%**; SQL Server chưa kiểm chứng lại trong lượt này. Frontend **157 qua**, coverage **87,85% statements / 81,08% branches / 85,82% functions / 90,58% lines**. Lint/type-check/format và build qua; ngưỡng coverage 80% giữ nguyên. Coverage frontend giảm so với bản demo vì thêm các luồng MySQL/HTTP mới; toàn bộ tiêu chí vẫn đạt ngưỡng và E2E bổ sung kiểm chứng lưu thực tế. Route lộ trình chọn đúng bài ở mức yêu cầu và chuyển kỹ năng tạo đúng mode.
- **Chrome E2E:** trên EngMateAI_browser_test riêng: đăng ký → A1/onboarding → voice/rate/theme → hồ sơ/từ → reload → Reading 100% → Writing → chat → flashcard → logout/login; dữ liệu giữ, pageerror=0, mobile 390 px không tràn. Speech mock, không gọi trả phí; không seed tài khoản vào database ứng dụng. Script/screenshot nằm trong `.artifacts/browser-check` bị ignore.
- **Tài liệu:** README, database/mysql/README, API/ARCHITECTURE/REQUIREMENTS/TESTING/DECISIONS/CHANGELOG cập nhật; root SQL chỉ sửa ghi chú backend, không thay DDL ở lượt này. Driver requirements và frontend env example cập nhật.
- **Giới hạn:** chat và đánh giá Speaking/Writing vẫn mock; SMTP/OAuth/email verification chưa triển khai UI hoàn chỉnh. Demo và adapter SQL Server cũ giữ phạm vi riêng. Chưa thử trực tiếp MySQL 8.4 hoặc Docker với MySQL host. Local web 5175/backend 8011; database hiện có đã xác nhận ready schema v1, catalog đủ 63 bài.

## 2026-10-09 — Hoàn thiện file schema MySQL trước khi chuyển backend

- **Yêu cầu:** sửa gemini-code-1791478978574.sql để người dùng tự chạy; chưa chuyển backend hoặc chạy vào database hiện có của người dùng.
- **Thay đổi:** danh mục bảy mức CEFR/khóa ngoại/thứ tự; Reading trong bài học/câu hỏi/phiên học/lượt thực hành; OnboardingCompletedAt, SpeechVoiceId, UpdatedAt tự cập nhật; sửa seed phiên bản để chạy lại catalog không trùng. Thêm từ gợi ý bài học, giữ sổ từ riêng theo chủ sở hữu. Seed khớp frontend: 63 bài, 35 câu hỏi, 84 lựa chọn, 22 từ gợi ý. Tổng 24 bảng, 2 view, 7 trigger. Không tạo tài khoản hoặc lưu key.
- **MySQL thật:** dùng binary MySQL 8.0.45 có sẵn với datadir riêng .artifacts/mysql-schema-check/data và cổng 13429; không dùng dịch vụ/database đang có. File cuối tạo schema thành công; 45 kiểm tra CLI qua, gồm dữ liệu đầy đủ/Unicode/đáp án, rerun seed/version marker, constraint Reading, ownership, giọng/tốc độ, bảy mức, version/timestamp và view thống kê. Các dữ liệu thử người dùng rollback; verify_catalog.sql chạy qua, đã dừng server thử. Chưa thực thi bằng MySQL 8.4.
- **QA ứng dụng:** lint/type-check/format/build qua; backend 77 qua, 22 SQL Server skip; frontend 128 qua. Đã chạy coverage toàn repo nhưng backend chỉ đạt 52,08% vì chưa cấu hình SQLSERVER_TEST_ODBC_CONNECTION, không đạt ngưỡng 80%; không hạ ngưỡng. Frontend coverage chạy riêng qua: statements 90,88%, branches 86,79%, functions 88,35%, lines 92,94%.
- **Tài liệu/test:** database/mysql/README.md và tests/verify_catalog.sql; cập nhật kiến trúc/yêu cầu/kiểm thử/quyết định/changelog. Script assertion và snapshot nguồn local trong .artifacts bị ignore.
- **Giới hạn/tiếp theo:** đây là bootstrap database mới, không phải migration trên schema cũ. Backend vẫn SQL Server; chờ người dùng chạy file rồi mới chuyển driver, tên bảng/view, khóa giao dịch, Version, INSERT/UPDATE và API tương ứng. Nhánh feat/mysql-schema, chưa commit/push.

## 2026-10-08 — Chọn giọng Blaze trong Cài đặt

- **Yêu cầu:** cho người dùng chọn giọng yêu thích thay giọng mặc định.
- **Thay đổi:** GET /api/speech/voices lọc catalog Blaze theo en/vi và trả field an toàn. Cài đặt thêm selector giọng nam/nữ, trạng thái tải/lỗi/retry và nghe thử/dừng; lưu giongDoc cục bộ, giữ tương thích dữ liệu cũ và gửi speaker_id cho tất cả TTS. Không thay SQL schema.
- **Kiểm chứng:** backend 77/77 tests qua, 22 SQL skip do chưa cấu hình test DB; lint/type-check backend qua. Frontend 111/111 tests qua; coverage 90,09% statements / 86,19% branches / 88,04% functions / 92,09% lines. Build và ESLint/TypeScript qua. OpenAPI export có 45 thao tác/38 đường dẫn.
- **Chrome:** catalog thực tế 27 giọng en; chọn Alice, reload giữ giọng, preview phát được và Speaking gửi cùng speaker_id. Selector hiện trên desktop và mobile; không có pageerror. Screenshot/script trong .artifacts/browser-check bị ignore.
- **Tài liệu:** README/API/BLAZE_SPEECH/kiến trúc/yêu cầu/kiểm thử/quyết định/changelog đã cập nhật. Key chỉ ở .env, không commit/push.
- **Giới hạn:** lựa chọn lưu theo trình duyệt; chưa đồng bộ tài khoản SQL. Tiếng Việt vẫn dùng mặc định nếu gọi TTS trực tiếp với language=vi; UI học tiếng Anh chỉ chọn catalog en.


## 2026-10-08 — Nối giọng Blaze vào trình duyệt

- **Yêu cầu:** dùng TTS/STT backend trên giao diện.
- **Thay đổi:** docTiengAnh gọi TTS/phát MP3; NutDoc dùng ở nhập môn, Listening, Speaking, Hội thoại, sổ từ và flashcard; dừng audio/request/revoke URL khi đổi trang hoặc bài. useThuAm dùng chung Speaking/Hội thoại, xin quyền micro, giới hạn 60 giây, dừng tracks rồi gửi STT; văn bản nhận dạng sửa được, chat không tự gửi. Giữ chat và chấm phát âm ở trạng thái mock.
- **Kiểm chứng:** frontend 108/108 tests qua; coverage 90,22% statements / 85,97% branches / 87,81% functions / 92,18% lines, vượt ngưỡng 80%; ESLint/TypeScript và build qua. Backend không đổi trong tác vụ UI; kết quả 72/72 và 22 SQL skip thuộc tác vụ ngay trước.
- **Trình duyệt:** Chrome headless phát TTS thật qua frontend 5175 → backend 8011; MP3 51.840 bytes giải mã/phát bình thường. Audio mẫu được cấp qua fake microphone Chrome, MediaRecorder tạo bản ghi, STT thật trả transcript và điền Speaking/Hội thoại; không tự gửi chat. Screenshot và script thử ở .artifacts/browser-check bị ignore.
- **Tài liệu:** cập nhật README/API/BLAZE_SPEECH/kiến trúc/yêu cầu/kiểm thử/quyết định/changelog. Key vẫn chỉ ở .env backend. Không commit/push.
- **Giới hạn:** chưa kiểm chứng micro vật lý, Safari/Firefox hoặc browser mobile; quyền micro cần người dùng cho phép. Không nối UI auth SQL, không lưu lịch sử thu âm vào DB, không chấm phát âm/LLM thật.


## 2026-10-08 — Tích hợp Blaze TTS/STT vào backend

- **Yêu cầu:** nối key TTS/STT của Blaze vào backend; không nối UI hoặc đổi provider chat.
- **Thay đổi:** thêm schema/service/routes speech; cấu hình SecretStr từ .env; runtime httpx 0.28.1 và lockfiles; Compose chuyển key từ môi trường và tắt local demo. Cập nhật API/README/kiến trúc/yêu cầu/kiểm thử/quyết định/changelog và hướng dẫn BLAZE_SPEECH.md. Key thực tế chỉ ở .env bị Git ignore.
- **Hành vi:** POST /api/speech/tts tạo/poll/download và trả MP3, POST /api/speech/stt nhận multipart file và trả transcript. Mặc định JWT; demo loopback opt-in khi chưa có DB, kiểm tra Origin. Timeout/giới hạn dữ liệu/lỗi provider không lộ token; không tự retry job tốn credit.
- **Kiểm chứng:** lint toàn repo, build và frontend 92/92 qua; backend 72/72 qua, 22 SQL integration skip vì chưa cấu hình SQLSERVER_TEST_ODBC_CONNECTION. Riêng 24 test speech qua, coverage branch+statement ba module speech 96,79%; không coi đây là coverage toàn backend/SQL. OpenAPI export qua.
- **HTTP thật:** Blaze key lấy options 200. Backend tại 8011: TTS Hello. → 200 audio/mpeg, 19.200 bytes; STT từ MP3 đó → 200 text Hello. Blaze trả payload MP3 dù request WAV; đã đổi adapter yêu cầu/trả MP3 đúng định dạng. Artifact thử trong .artifacts bị ignore.
- **Giới hạn:** UI vẫn browser TTS; chưa tự lưu transcript vào bài luyện/SQL, chưa chấm phát âm, chưa phục hồi job nếu client ngắt hoặc process restart, chưa thử mọi giọng/định dạng. API chat vẫn mock. Không commit/push.


## 2026-10-08 — Đưa tài liệu README vào develop

- **Yêu cầu:** merge tài liệu vừa hoàn thiện vào `develop`.
- **Phạm vi:** `README.md`, `docs/LOCAL_DEVELOPMENT.md`, `database/sqlserver/README.md` và nhật ký này; không thay code, cấu hình hoặc `.env`.
- **Kiểm chứng:** dùng kết quả tác vụ tài liệu ngay trước: lint, 70 backend/92 frontend tests, coverage, build, local dev/smoke và kiểm tra liên kết đều qua; `git diff --check` qua. Git hook kiểm tra lint/types khi tạo commit. Không chạy lại bộ test nghiệp vụ cho thay đổi chỉ gồm tài liệu.
- **Git:** commit tiếng Việt không dấu `docs: cap nhat README va huong dan chay du an` trên `docs/readme-huong-dan-chay`, cập nhật `develop` bằng fast-forward; không push remote hoặc xóa nhánh nguồn.
- **Còn thiếu:** giấy phép và liên hệ chờ người dùng xác nhận; không tự tạo LICENSE. Chi tiết phạm vi chạy thử nằm trong hướng dẫn local.

## 2026-10-08 — Viết lại README cho người mới

- **Yêu cầu:** README tiếng Việt giúp người mới hiểu và chạy repo trong khoảng 5 phút; đúng thứ tự nội dung, chỉ dùng thông tin/lệnh có trong repo, không chứa secret hoặc quy tắc agent/nhật ký cá nhân.
- **Khảo sát:** đọc README cũ, cấu trúc/source React/FastAPI, package.json/pyproject/requirements, Makefile/make.cmd/manage.py, Dockerfile/Compose, .env.example và CI. Không đọc/in `.env` thực tế.
- **Kết quả:** đưa mô tả/phạm vi demo lên đầu; thêm ví dụ API mock đã đối chiếu HTTP, tính năng, yêu cầu host, lựa chọn cài Docker/local, bảng cấu hình, cách chạy và ví dụ sử dụng, test/lint, cây thư mục và đóng góp. Không giả định UI đã gọi API SQL; giữ giới hạn SQL v1 và dữ liệu demo/localStorage. Bỏ lịch sử merge/quy tắc agent/số liệu QA khỏi README, giữ trong tài liệu lịch sử hiện có.
- **Tài liệu chi tiết:** thêm `docs/LOCAL_DEVELOPMENT.md` cho wrapper Windows/Make, proxy/cổng, hooks/format/lock, SQL Windows/Docker, media, OpenAPI và phạm vi lệnh đã/ chưa chạy thử. Sửa hai nhận xét lỗi thời trong `database/sqlserver/README.md` để khớp backend hiện có.
- **Kiểm chứng lệnh:** `.\make.cmd setup` qua (backend editable và npm ci); `python scripts/manage.py env`, lint/test/coverage/build/export-api/docker-check qua. Backend **70/70**, frontend **92/92**; SQL integration **22** dùng tempdb có guard/rollback. Coverage **92,83%** backend, frontend **88,97% statements / 86,39% branches / 87,09% functions / 90,96% lines**; build **62 modules**. Một lượt coverage có test giao diện timeout 5 giây; chạy lại riêng toàn coverage qua, không sửa test/assertion/timeout.
- **Chạy thật:** dev-backend/dev-frontend qua task runner ở 18012/15176, HTTP smoke và phản hồi Hello/B1 khớp chính xác ví dụ README; đã dừng các process test. Project Docker `engmate-ai` đang chạy ở 8000/5173 được giữ nguyên. Docker/smoke project riêng đã qua trong tác vụ merge trước cùng ngày; không chạy lại docker-up/down mặc định trong tác vụ tài liệu.
- **QA tài liệu:** 26 liên kết file/anchor hợp lệ, tất cả task có trong Makefile/manage.py, đủ 18 biến .env.example và ba biến proxy/smoke đọc từ source; thứ tự README khớp yêu cầu, git diff --check qua. Không thêm screenshot giả, code nghiệp vụ, dependency hoặc secret.
- **Chưa chạy lại:** wrapper GNU Make/Linux/macOS, lock, hooks/pre-commit, migration CLI trên database ứng dụng; đã ghi phạm vi ở tài liệu chi tiết. Không khẳng định đã test SMTP thật/production hoặc GitHub Actions mới.
- **Git/thông tin còn thiếu:** làm trên `docs/readme-huong-dan-chay`, chưa commit/merge/push. Repo không có LICENSE/CONTRIBUTING; đã hỏi giấy phép và liên hệ, chưa tự chọn hoặc tạo LICENSE. Tiếp theo: bổ sung mục giấy phép/liên hệ khi người dùng xác nhận và review/commit tài liệu khi được yêu cầu.

## 2026-10-08 — Hợp nhất code giao diện mới vào develop

- **Yêu cầu:** merge code mới từ `sua-giao-dien` vào `develop`; commit tiếng Việt không dấu theo yêu cầu trước đó.
- **Nguồn:** `develop` 5a61e99 và `sua-giao-dien` 83d2952 sau fetch. Hợp nhất trên `chore/merge-giao-dien-moi`, xử lý 13 file xung đột; giữ các nhánh nguồn, backup và stash.
- **Kết quả:** giữ backend/API SQL Server và UI mới: Reading 7 bài/21 câu hỏi, lộ trình bảy mức/nhập môn, Mate làm quen và hỗ trợ cầm điện thoại. Giữ sửa lỗi intro/username/profile và setup test jsdom của develop. Fixture người học cũ đã làm quen, test đăng ký và menu mới hoàn thành bước Mate bằng thao tác người dùng; bài nghe/viết cũ được chọn rõ mức để giữ kiểm tra hành vi.
- **Tương thích:** tách DatabaseLevel A2/B1/B2 khỏi Level bảy mức của mock; thêm 7 unit cases và 1 SQL workflow kiểm tra mức chưa hỗ trợ trả 422, không ghi profile/conversation. Giữ schema v1; đưa prompt mới sang persona.v2, giữ v1 và ghi đúng phiên bản snapshot. Giữ regression capture từ SVG/kéo nhiều lần của hỗ trợ; không skip test hoặc hạ ngưỡng coverage.
- **File:** router/account/profile/support/CSS, dữ liệu và trang/test Reading/lộ trình/làm quen/nhập môn, fixture tests; backend schema/services/prompts/tests; README, API/kiến trúc/yêu cầu/kiểm thử/quyết định/changelog/demo/prompt/database docs. SQL scripts, CI/Compose và `.env` giữ nguyên.
- **Kiểm chứng:** `python scripts/manage.py lint`, `test`, `coverage`, `build` đều qua. Ruff/Black/mypy 46 source files, ESLint/TypeScript/Prettier qua. Backend **70/70**, frontend **92/92**, gồm **22 SQL integration** trên SQL Server 2022/tempdb có guard và rollback. Backend coverage **92,83%**; frontend statements **88,97%**, branches **86,39%**, functions **87,09%**, lines **90,96%**; tất cả trên 80%. Production build **62 modules**. Schema `em` trong tempdb còn NULL sau test.
- **Docker:** stack riêng `engmate-ai-ui-merge-verify` build và hai dịch vụ healthy tại 18012/15176; HTTP smoke qua backend health/web/proxy/AI mock. Đã dừng/xóa container và network riêng, giữ volume; không ảnh hưởng stack khác, không gọi paid API/SMTP thật.
- **Git:** tạo merge commit `chore: hop nhat giao dien moi va giu backend tren develop`, đưa develop tới kết quả qua fast-forward sau kiểm chứng; không push. Commit đầy đủ và trạng thái cuối xem lịch sử Git.
- **Giới hạn/tiếp theo:** UI vẫn localStorage/demo abc/123 và mock; SQL v1 chỉ ba mức, chưa lưu Reading hoặc cờ Mate. Mở rộng schema/nối UI và AI/OAuth/STT thật là công việc tiếp theo. Chưa chạy GitHub Actions hoặc browser E2E mới; các QA Chrome bên dưới là lịch sử nhánh nguồn.

## 2026-10-07 — Mate hỏi khả năng tiếng Anh sau lần đăng nhập đầu tiên

- **Yêu cầu:** người mới được linh thú hỏi trình độ ngay khi đăng nhập; các lựa chọn dùng từ ngữ gần gũi, không cần hiểu mã A1/A2 hay tự mở lộ trình để chọn.
- **Kết quả:** trang làm quen riêng với Mate chào theo tên, bảy câu mô tả từ “Mình bắt đầu từ con số 0” đến diễn đạt tự nhiên, ví dụ cụ thể và lời động viên theo lựa chọn. Xem trước không đổi hồ sơ; xác nhận tự đặt mức học và chuyển tổng quan. Mã CEFR chỉ dùng nội bộ trong bước này. Radio native, focus tiêu đề và live status; có sáng/tối/mobile/giảm chuyển động.
- **Lưu dữ liệu:** thêm `daLamQuen` cùng khóa hiện tại; hoàn thành rồi reload/đăng nhập lại không hỏi. Hồ sơ cũ thiếu cờ được hỏi một lần, giữ từ vựng/thống kê/trình độ cho đến khi xác nhận. Đăng xuất khi chưa trả lời giữ bước đang chờ; đổi route không bỏ qua. Đăng ký mới đặt lại cờ. Sửa việc đăng nhập bằng tên tài khoản làm rỗng email hồ sơ.
- **File:** thêm `demo/lamQuen.ts`, `pages/LamQuenCungMate.tsx` và test; cập nhật App/LuuTru/TaiKhoan/CSS, fixture người học đã làm quen trong test lộ trình/Reading; README và docs. Loại biến intro chưa dùng, nhánh setState thừa đã được khởi tạo xử lý, dùng thuộc tính inert có kiểu tại TaiKhoan để build/lint chuẩn qua; giữ thay đổi tài khoản của người dùng. Không thêm dependency/API/xác thực backend.
- **Kiểm chứng:** 13 test mới; cùng lộ trình/Reading/nhập môn/hỗ trợ 37/37 qua. Coverage chọn lọc trang/data làm quen: statements 94.11%, branches 80%, functions/lines 100%. Chạy `python scripts/manage.py lint` qua Ruff/Black/mypy/ESLint/TypeScript/Prettier; `build` qua 62 modules, `smoke` qua backend/frontend/proxy/mock.
- **Kiểm thử toàn dự án:** `test` và `coverage` đều đã chạy; backend 21/21 và coverage 100%. Frontend 49/89 qua, cùng 40 lỗi cũ trong sáu bộ test tài khoản/phiên/văn bản; coverage toàn frontend không đạt kiểm chứng vì các test này lỗi. Không vô hiệu hóa test cũ. Pytest cảnh báo không ghi được cache nhưng các test vẫn qua.
- **Chrome:** hồ sơ QA riêng, đăng nhập → Mate → chọn bắt đầu số 0 → tổng quan, reload và đăng xuất/đăng nhập lại đều qua. 8 tổ hợp sáng/tối × 320/390/768/1440 px không tràn ngang/cắt lựa chọn; không lỗi JS. Đã xem ảnh desktop sáng/mobile tối trong `.cache/onboarding-*.png`.
- **Giới hạn:** câu trả lời là tự mô tả khả năng để đặt bài phù hợp, chưa phải bài kiểm tra xếp lớp. Demo lưu một hồ sơ trên trình duyệt; chưa có cờ theo tài khoản backend. Có thể điều chỉnh mức ở lộ trình/hồ sơ về sau.
- **Trạng thái:** nhánh `feat/mate-first-login-onboarding`, chưa commit/push; frontend/backend vẫn 5174/8010. Việc tiếp theo khi được yêu cầu: cập nhật bộ test cũ theo luồng tài khoản hiện tại hoặc thêm đánh giá năng lực thực tế.

## 2026-10-07 — Lộ trình từ số 0 đến C2

- **Yêu cầu:** mở lộ trình từ người chưa từng học đến mức thành thạo, bổ sung các mức cơ bản.
- **Kết quả:** thêm trang `#lo-trinh`, menu và liên kết tổng quan; bảy chặng Pre-A1/A1/A2/B1/B2/C1/C2 với mục tiêu và trọng tâm. Người mới mặc định Pre-A1; có bài nhập môn 26 chữ cái, số 0–10 và lời chào/bản dịch, phát âm chậm. Lưu chặng tự chọn và giữ hồ sơ/trình độ cũ.
- **Bốn kỹ năng:** mỗi mức có ba câu Speaking, bài Listening + trắc nghiệm/chính tả, bài Reading + ba câu hỏi/giải thích, đề/gợi ý Writing. Tổng cộng 7 bài đọc/21 câu hỏi và 7 bài nghe. Hồ sơ/hội thoại/nhập vai hỗ trợ bảy mức; sửa lọc A1 không trộn Pre-A1. Link lộ trình truyền `trinh-do` và đồng bộ hồ sơ; query sai fallback. API/prompt mở rộng bảy mức, giữ mock và default API A2.
- **File:** thêm `demo/trinhDo.ts`, `demo/baiNghe.ts`, `demo/baiDocBoSung.ts`, `components/ChonTrinhDo.tsx`, `components/NenTangTiengAnh.tsx`, `pages/LoTrinhHoc.tsx` và hai bộ test; cập nhật router/tổng quan/hồ sơ/lưu trữ/bốn kỹ năng/hội thoại/nhập vai, data/test Reading, CSS; backend schema/prompt/API tests; README và docs. Không thêm dependency; giữ thay đổi tài khoản của người dùng. Thay `any` có sẵn tại trường giới tính HoSo bằng kiểu dữ liệu tương ứng để lint file sửa được.
- **Kiểm chứng:** 15 test mới, tổng 24/24 test lộ trình/nhập môn/Reading/hỗ trợ qua. Coverage chọn lọc trinhDo/LoTrinhHoc/NenTangTiengAnh/ChonTrinhDo 100% cả statements/branches/functions/lines. Backend 21/21, coverage 100%; Ruff/Black/mypy qua. Eslint phần tác vụ/Prettier qua; Vite bundle 60 modules và smoke qua.
- **Chrome:** 232 tổ hợp trang kỹ năng/mức/theme/viewport 320–1440 px, không tràn ngang/cắt input/nút. Chọn C2/reload giữ mức, nhập môn đúng số ô; tất cả bảy mức API qua proxy trả 200 đúng level. Đã xem ảnh lộ trình desktop sáng/mobile tối, không lỗi JS. Backend được khởi động lại để tiến trình đang chạy nhận schema mới.
- **Giới hạn và lỗi cũ:** nội dung là bài thực hành theo mức, chưa phải giáo trình đầy đủ, kiểm tra xếp lớp hoặc chứng nhận CEFR; chặng là tự chọn, chưa tự nâng cấp. Phản hồi Speaking/Writing vẫn là minh họa cố định. Toàn frontend 36/76 qua, cùng 40 lỗi cũ; coverage toàn frontend không hợp lệ. Lint toàn repo còn 3 lỗi và build chuẩn còn 1 lỗi biến chưa dùng trong TaiKhoan, không sửa luồng tài khoản ngoài phạm vi.
- **Trạng thái:** nhánh `feat/beginner-to-c2-roadmap`, chưa commit/push; frontend/backend 5174/8010. Việc tiếp theo: giáo trình đầy đủ/đánh giá năng lực khi có yêu cầu và xử lý bộ test tài khoản cũ.

## 2026-10-07 — Mate cầm ống nghe cổ điển và rung tự động

- **Điều chỉnh:** đổi điện thoại trên tay Mate thành ống nghe điện thoại bàn cổ điển, hai đầu nghe/nói và dây xoắn bằng SVG; giữ màu navy/cyan và tay cầm sát mặt.
- **Hiệu ứng:** Mate lắc ±3° và ống nghe rung ±8° theo nhịp ngắn, nghỉ giữa các chu kỳ 3.6 giây; không dịch chuyển vị trí nút. Tạm dừng khi kéo; Giảm chuyển động trong ứng dụng/hệ thống tắt animation. Giữ kính mờ/hover và các thao tác hỗ trợ.
- **File:** `components/LinhThu.tsx`, `index.css`, tài liệu changelog/kiểm thử/tiến trình; không thêm dependency.
- **Kiểm chứng:** 4/4 test hỗ trợ qua, ESLint component và Prettier qua, Vite bundle 54 modules qua. Chrome đo được hai animation và 13 trạng thái transform khác nhau trong 15 mẫu; cả hai chế độ giảm chuyển động đều không có animation. Đã xem ảnh phóng to nút.
- **Trạng thái:** nhánh `feat/mate-classic-handset`, dev tiếp tục 5174/8010; chưa commit/push. Các lỗi kiểm thử/build chung đã ghi ở mục trước vẫn ngoài phạm vi điều chỉnh hình/animation này.

## 2026-10-07 — Nút hỗ trợ Mate nghe điện thoại, nền kính mờ

- **Yêu cầu:** thay nút hỗ trợ bằng linh thú nghe điện thoại; bình thường kính mờ, đậm khi hover/kéo như nút Home ảo.
- **Kết quả:** Mate có biểu cảm `support`, cầm điện thoại cạnh mặt, dùng chung component CSS/SVG hiện có. Nút 68 px với góc bo 24 px, blur 16 px, độ mờ 0.55 khi nghỉ; hover/focus/kéo/mở panel chuyển opacity 1 và nền navy trong 220 ms. Có giao diện sáng/tối, giữ tùy chọn giảm chuyển động.
- **Thao tác:** kéo bằng chuột/cảm ứng với pointer capture trên nút, không mở panel sau drag; giới hạn nút trong viewport, xử lý cancel/lost capture và resize. Panel neo gần nút và được giới hạn màn hình; click/bàn phím mở, nút đóng/Escape đóng và trả focus. Chỉ render panel khi mở để điều khiển ẩn không nhận focus. Giữ nội dung hỗ trợ hiện có.
- **File:** `components/HoTroNhanh.tsx`, `components/LinhThu.tsx`, `index.css`; thêm `components/HoTroNhanh.test.tsx`; cập nhật tài liệu. Giữ toàn bộ Reading và thay đổi TaiKhoan có sẵn, không thêm dependency.
- **Kiểm chứng:** 4/4 test hỗ trợ mới, cùng Reading 9/9 qua. Coverage chọn lọc hỗ trợ/Mate: statements 97.05%, branches 87.23%, functions 94.73%, lines 98.33%; riêng HoTroNhanh lines/functions 100%. ESLint phần sửa và Vite bundle 54 modules qua; HTTP smoke qua. Chrome thực đo opacity nghỉ 0.55/hover 1 ở sáng/tối, kéo chuột không mở nhầm và panel nằm trong màn hình; cảm ứng 320/390/768 px qua, không lỗi JS. Đã xem ảnh nút nghỉ/hover và panel mobile.
- **Kiểm tra toàn dự án:** backend 16/16 qua, coverage 100%; Ruff/Black/mypy qua. Frontend 21/61 qua, cùng 40 lỗi cũ từ tác vụ Reading. Đã loại 4 lỗi lint và 3 lỗi TypeScript của HoTroNhanh; lint chung còn 4 lỗi HoSo/TaiKhoan, build chuẩn còn biến INTRO_STORAGE_KEY chưa dùng ở TaiKhoan. Coverage toàn frontend chưa hợp lệ vì test cũ lỗi.
- **Trạng thái:** nhánh `feat/mate-support-glass`, chưa commit/push; frontend/backend vẫn 5174/8010.

## 2026-10-07 — Reading và nhãn kỹ năng tiếng Anh

- **Yêu cầu:** thêm luyện đọc; đổi tên kỹ năng thành Speaking, Listening, Reading, Writing (dùng chính tả Writing).
- **Kết quả:** thêm route `#luyen-doc`, menu và thẻ tổng quan; 3 bài A2/B1/B2, mỗi bài 3 câu hỏi kèm giải thích; yêu cầu trả lời đủ, khóa đáp án sau khi nộp, làm lại/đổi bài, Mate theo kết quả. Từ vựng bài đọc lưu qua Context/localStorage; mỗi bài cộng 5 phút một lần trong một lần mở trang. Hướng dẫn vẫn tiếng Việt, đường dẫn cũ giữ nguyên.
- **File:** thêm `demo/baiDoc.ts`, `pages/LuyenDoc.tsx`, `pages/LuyenDoc.test.tsx`; cập nhật App, danh sách trang, TongQuan, tiêu đề nói/nghe/viết, CSS, assertion nhãn/menu/route và README/yêu cầu/kiến trúc/kiểm thử/changelog. Không thêm dependency/API. Prettier định dạng lại một số khai báo CSS có sẵn.
- **Kiểm chứng:** 5/5 test Reading qua; coverage chọn lọc statements 97.05%, branches 97.36%, functions/lines 100%. Eslint và Prettier các file tác vụ qua. Vite bundle qua (54 modules); smoke backend/frontend/proxy/mock qua. Backend 16/16 tests và coverage 100%; Ruff/Black/mypy qua.
- **Trình duyệt:** Chrome QA riêng rà 30 tổ hợp (3 bài × 2 theme × 5 viewport 320–1440 px); không tràn ngang hoặc cắt điều khiển Reading. Luồng chọn đáp án đúng 3/3, cộng 5 phút, lưu từ qua; không lỗi JavaScript. Đã xem ảnh desktop sáng/mobile tối.
- **Lỗi tồn tại trước thay đổi:** frontend toàn bộ 17/57 qua, 40 lỗi; chạy bản HEAD trước tác vụ trong `.cache/reading-baseline` xác nhận 12/52 qua với cùng 40 lỗi. Coverage toàn frontend chưa hợp lệ vì test lỗi. Lint toàn repo còn 8 lỗi ở HoTroNhanh/HoSo/TaiKhoan; build chuẩn còn 4 lỗi TypeScript ở HoTroNhanh/TaiKhoan, chạy build bản HEAD cũng gặp đúng 4 lỗi. Không sửa phần tài khoản/trợ giúp ngoài phạm vi, giữ thay đổi người dùng trong TaiKhoan trong lúc thực hiện.
- **Trạng thái:** nhánh `feat/reading-practice`, chưa commit/push; dev frontend/backend vẫn chạy 5174/8010. Việc tiếp theo: xử lý lỗi kiểm thử và build cũ trong tác vụ riêng.

## 2026-10-07 — Hợp nhất các nhánh vào develop để demo

- **Yêu cầu:** rà soát mọi nhánh và hợp nhất bản demo vào develop; commit mới dùng tiếng Việt không dấu. Fetch toàn bộ remote: không có commit mới. Làm trên `chore/tich-hop-demo-develop` trước khi fast-forward develop; không sửa main, không push/force/rebase/xóa nhánh.
- **Nguồn:** CI/bootstrap đã là ancestor của develop; schema SQL là ancestor của backend; UI là ancestor của nhánh đồng bộ CI. Backend hoàn thiện lưu ở `8320e5f` (`feat: hoan thien backend va API hoc tap voi SQL Server`); merge backend/database ở `44fdd3c` (`chore: hop nhat backend va database cho ban demo`). Sau đó hợp nhất `chore/sync-ci-social-login` để lấy UI. Nhánh backup trộn cũ và stash giữ nguyên, không đưa WIP cũ trở lại bản hoàn thiện. Bảng rà soát đủ các nhánh ở `DEMO_DEVELOP.md`.
- **Xung đột:** README, ARCHITECTURE, PROGRESS, REQUIREMENTS, TESTING; giữ hợp đồng/backend mới và lịch sử UI. CHANGELOG/DECISIONS giữ cả hai phần. Xóa file log diff vô tình được commit ở root (`ettings and avatar menu` kèm ký tự đặc biệt); không phải mã ứng dụng.
- **Sửa lỗi demo:** pointer capture dùng currentTarget của nút hỗ trợ, bỏ truy cập ref lúc render và sửa const/type; bỏ any trong profile/inert; intro hoàn tất một lần mỗi tab và không setState đồng bộ trong effect; chuyển chế độ xóa ô mật khẩu; đăng nhập giữ email đã có; profile từ chối tên rỗng; title đúng trang login khi chưa có phiên.
- **Kiểm thử UI:** giữ đăng nhập bắt buộc của code UI mới với abc/123; cập nhật fixtures cho các trang học tập, kiểm tra menu khách riêng bằng provider, giữ test login/logout/register/recovery/theme/ownership của trạng thái trình duyệt. Cập nhật assertion theo văn bản Việt hóa và bố cục mới; không bỏ test/hạ threshold. Test setup dùng storage của jsdom gốc, tránh Node 25 storage; thêm test sai credentials/xác nhận mật khẩu, intro/remount và kéo nút hỗ trợ từ SVG. Format các file UI bị lệch Prettier.
- **Kiểm chứng cuối:** chạy trọn `lint`, `test`, `coverage`, `build`. Ruff/Black/mypy 46 source files và ESLint/TypeScript/Prettier qua. Backend **57/57** (21 SQL integration) và frontend **56/56** qua. Coverage backend **92,83%**; frontend statements **85,88%**, branches **84,34%**, functions **81,36%**, lines **88,27%**, giữ threshold 80%. SQL Server 2022/tempdb outer rollback; không test bằng database ứng dụng/SMTP thật/paid API. Build qua, 52 modules. Build lần trong sandbox bị spawn EPERM; chạy lại ngoài sandbox thành công.
- **Docker:** stack riêng `engmate-ai-develop-demo-verify`, cổng 18011/15175, DB/JWT trống và mock để kiểm tra demo không lưu SQL. Backend/frontend build thành công và healthy; HTTP smoke qua health/HTML/Vite proxy/mock reply. Không ghi đè .env hoặc can thiệp stack khác.
- **Tài liệu/bàn giao:** thêm `DEMO_DEVELOP.md`; đồng bộ README/API/kiến trúc/yêu cầu/kiểm thử/kế hoạch/quyết định/changelog. UI vẫn localStorage và mock reply, API SQL/JWT thử qua Swagger; không biến abc/123 thành tài khoản backend. Chưa có GitHub Actions run mới, browser E2E responsive, OAuth/STT/LLM thật hoặc nối UI API nghiệp vụ.

## 2026-10-07 — Hoàn thiện backend/API theo giao diện và schema SQL Server

- **Phạm vi:** tiếp tục checkpoint trên `feat/backend-learning-api`. Đối chiếu giao diện đa trang ở `feat/social-login-motion` và schema SQL hiện có; không merge UI hoặc thay đổi nhánh dùng chung.
- **Backend:** 42 thao tác HTTP trên 35 paths: auth/JWT/refresh/logout/reset/đổi mật khẩu, account/profile/settings, catalog, hội thoại/tin nhắn/evaluation, luyện nghe/nói/viết, notebook/mastery, flashcard và dashboard. SQLAlchemy Core/pyodbc dùng schema có sẵn; migration runner chủ động và OpenAPI export cho Postman.
- **Hoàn thiện so với WIP:** account email/username với current password và rowversion; notebook search/mastery; answer key listening sau nộp; JSON response đúng kiểu; validation độ dài UTF-16/ID/birthday/timezone; request size/auth limits, hash semaphore, lazy-engine lock; retry/cancel/timeout và SQL worker thread; private media kiểm tra truncated WAV/decoder. SMTP reset lỗi giao thư không làm response tiết lộ email tồn tại.
- **Kiểm thử cuối:** `python scripts/manage.py coverage` với SQL Server 2022/tempdb: **57/57 backend tests qua**, gồm **21 SQL integration cases**; coverage toàn app **92,83%**. Frontend scaffold **13/13 tests qua**, coverage **100%**. Test SQL guard database/schema, outer transaction và rollback; không tạo hoặc dùng database ứng dụng để thử. SMTP/LLM đều giả.
- **Kiểm tra khác:** lint qua Ruff/Black/mypy (**46 source files**) và ESLint/TypeScript/Prettier; TypeScript/Vite build qua. OpenAPI export qua, đếm được 35 paths/42 operations; `git diff --check` qua. Các SQL scripts 001–004/tests không sửa trong tác vụ này; 45 kiểm tra standalone là kết quả lịch sử riêng.
- **Docker:** build backend với ODBC Driver 18/ffmpeg và frontend thành công; stack riêng `engmate-ai-backend-verify` cổng 18010/15174 đều healthy. HTTP smoke qua backend health, HTML, Vite proxy và AI mock. Xác nhận runtime có ODBC Driver 18 và `/usr/bin/ffprobe`. Đã dừng/xóa đúng containers/network thử, giữ volume; không tác động stack khác. SQL kiểm tra cuối trả `SCHEMA_ID(N'em') = NULL`, xác nhận schema thử đã rollback.
- **CI/cấu hình:** workflow bổ sung SQL Server 2022 service dùng credential tạm và ODBC 18 để coverage không skip SQL. YAML parse được; workflow mới chưa push/chạy GitHub. Compose chuyển DB/JWT/SMTP, dùng private media volume và mount SQL scripts. Không in hoặc ghi đè .env/secrets.
- **Tài liệu:** cập nhật API/README, ARCHITECTURE, REQUIREMENTS, TESTING, DECISIONS, CHANGELOG, PROMPTS, IMPLEMENTATION_PLAN, DATABASE_SQLSERVER và README SQL; đánh dấu WIP là checkpoint lịch sử.
- **Giới hạn/bước tiếp:** frontend scaffold trên nhánh này chưa thay thế giao diện đa trang/localStorage; kết quả frontend không áp dụng cho nhánh UI đó. AI vẫn mock, không chấm nói/viết thật; OAuth, email verification, STT, streaming, account deletion và nhập localStorage còn backlog. SMTP thật/nhiều connection ghi đồng thời/load/SQL Server 2019 chưa kiểm thử. Nối UI theo API là bước tiếp theo; bật DB cần database đã tạo + DATABASE_ODBC_CONNECTION + JWT_SECRET rồi chạy migrate-backend. Chưa commit/push.

## 2026-10-07 — Chuyển backend/API đang làm dở sang nhánh riêng

- Bảo toàn mã/backend/tests/cấu hình và lockfiles trên `feat/backend-learning-api`, dựa trên `feat/sqlserver-schema`; giữ nhánh giao diện và nhánh CI tách biệt.
- Commit WIP là checkpoint, không xác nhận backend đã hoàn thiện. Lần kiểm thử trước các chỉnh sửa cuối đạt 27/27 tests và coverage 84,59%; worker-thread/timeout/cancel và Docker/env mới chưa kiểm chứng lại đầy đủ.
- Phạm vi, giới hạn và bước tiếp theo ở `BACKEND_IMPLEMENTATION_WIP.md`. Tác vụ này chỉ tổ chức nhánh; không triển khai, push hay thay đổi nhánh dùng chung.

## 2026-10-07 — Làm rõ đường dẫn chạy kiểm thử SQL Server

- **Lỗi người dùng gặp:** sqlcmd không tìm thấy `tests/verify.sql` khi terminal chưa ở `database/sqlserver`.
- **Sửa hướng dẫn:** thêm bước chuyển thư mục từ root repo bằng Push-Location/Pop-Location trong `database/sqlserver/README.md`, `docs/DATABASE_SQLSERVER.md`, `docs/TESTING.md`. Giải thích include `:r` cũng phụ thuộc thư mục làm việc, không chỉ tham số `-i`.
- **Kiểm chứng:** kiểm tra file đầu vào và toàn bộ file include tồn tại sau khi chuyển đúng thư mục; không đổi SQL hay mã backend/frontend. Kết quả 45/45 SQL checks của tác vụ trước vẫn là lần kiểm thử runtime gần nhất; không chạy lại database cho thay đổi hướng dẫn.

## 2026-10-07 — Khảo sát toàn diện và thiết kế database SQL Server

- **Yêu cầu:** quan sát tổng thể chương trình rồi thiết kế database SQL Server. Đọc cấu trúc, tài liệu và mã của 10 trang học tập/trang tài khoản, Context/localStorage, audio/browser APIs, backend route/schema/service/provider. Xác nhận dữ liệu nghiệp vụ đang ở trình duyệt, backend có health/mock reply, chưa có DB/auth thật.
- **Thiết kế:** schema `em` với 22 bảng/2 view: tài khoản/hồ sơ/cài đặt/OAuth/phiên/token, media, chủ đề/bài/câu hỏi/lựa chọn, phiên học/hội thoại/tin nhắn/lần làm/câu trả lời, AI/lỗi, notebook/flashcard. PK/FK/UNIQUE/CHECK/index, owner/type bằng khóa ghép, request ID chống trùng, UTC/ngày địa phương và rowversion. Không thêm nghiệp vụ admin/thanh toán/linh thú ngoài phạm vi.
- **SQL artifacts:** `database/sqlserver/001_schema.sql`, `002_seed_catalog.sql`, `003_views.sql`, `004_example_queries.sql`, `tests/verify.sql`, `README.md`. Seed đúng 8 chủ đề, 3 bài nói, 2 bài nghe, 4 đề viết, 4 câu hỏi/6 lựa chọn; không seed tài khoản hoặc bí mật.
- **Tài liệu:** thêm `docs/DATABASE_SQLSERVER.md` (khảo sát, ERD, dictionary, transaction/service rules, UI mapping, cách chạy/giới hạn); cập nhật README, ARCHITECTURE, IMPLEMENTATION_PLAN, REQUIREMENTS DB-01..05, DECISIONS, TESTING, CHANGELOG. Giữ các thay đổi đã staged trước tác vụ, không sửa CI/Docker hoặc code app.
- **Database kiểm chứng:** SQL Server 2022 Developer `16.0.1200.5`; chạy `sqlcmd -S localhost -E -d tempdb -b -f 65001 -i tests/verify.sql -W` từ thư mục SQL Server. **45/45 kiểm tra qua**, gồm schema/views/query compile, seed chạy hai lần, dữ liệu đúng/sai/Unicode/owner/type/idempotency, thống kê và ngày UTC/Vietnam/ôn qua nửa đêm. Toàn bộ DDL/data rollback, xác nhận schema `em` không còn. Không tạo database `EngMateAI` thật và không thay đổi database ứng dụng.
- **App kiểm chứng theo quy ước repo:** `python scripts/manage.py lint` qua Ruff/Black/mypy (26 files), frontend còn **8 lỗi ESLint** ở HoTroNhanh/HoSo/TaiKhoan; `build` còn **4 lỗi TypeScript** ở HoTroNhanh/TaiKhoan. `test` ngoài sandbox: backend **16/16**, frontend **12/52 qua, 40 lỗi** `localStorage.clear is not a function`. `coverage` ngoài sandbox: backend **100%**, frontend cùng **40 lỗi/12 qua**, chưa có kết quả coverage hợp lệ. Không sửa các lỗi frontend có sẵn trong tác vụ database. Lần test đầu trong sandbox bị `spawn EPERM`/cache denied; đã chạy lại với quyền phù hợp.
- **Giới hạn:** SQL Server 2019 là mục tiêu compatibility chưa chạy riêng; không có concurrency/load/API/ORM/auth integration test. Counter cũ trong localStorage không đủ lịch sử để dựng lại chính xác; CEFR của seed đề viết là phân loại tạm. Các quy tắc service/transaction là thiết kế, chưa được tích hợp vào runtime.
- **Tiếp theo:** kết nối FastAPI bằng models/repository/driver SQL Server và migration runner; triển khai auth/API lưu dữ liệu, onboarding từ localStorage và integration/E2E theo DB-05.

## 2026-10-07 — Xác nhận CI thành công trên GitHub

- **Bàn giao:** cả ba sửa đổi cấu hình đã nằm trong một commit `59180cf` (`fix: correct ci/cd workflow and docker health checks`), push lên `fix/ci-cache-healthchecks`, sau đó đưa vào `main` bằng fast-forward và push thông thường theo phương án push main được cho phép trong tài liệu yêu cầu.
- **Phương án kích hoạt CI:** dự kiến mở PR nháp nhưng API không có credential dùng được và công cụ trình duyệt không có phiên kết nối. Chuyển sang phương án push main trong phạm vi yêu cầu; không thay đổi cấu hình xác thực hoặc sửa lịch sử Git.
- **Kết quả thực tế:** [run 37506823374](https://github.com/VoMinhHoang1610/engmate-ai/actions/runs/37506823374), SHA `59180cf93fc9ba2953ea83cc02b0c805ee96f81b`, event `push`, branch `main`, kết luận `success`. Các bước install, lint/types, coverage, build, Docker validation, start stack, HTTP smoke, stop stack, upload coverage và các post step đều qua; bước logs-on-failure được bỏ qua đúng điều kiện.
- **Lỗi đã xử lý:** `Post Run actions/setup-python@v5` thành công, không còn lỗi lưu pip cache làm thất bại job.
- **File tài liệu cập nhật:** `docs/PROGRESS.md`, `docs/REQUIREMENTS.md`; đánh dấu S-07 đã được kiểm chứng local và GitHub Actions. Commit ghi kết quả này chỉ đổi tài liệu, không đổi cấu hình hoặc logic đã được CI kiểm chứng.
- **Giới hạn:** Docker frontend vẫn là stack dev; production image là đề xuất tùy chọn chưa triển khai. AI vẫn dùng mock và các nghiệp vụ chưa triển khai giữ nguyên backlog.

## 2026-10-07 — Sửa CI cache và health check Docker

- **Yêu cầu:** đọc và thực hiện tài liệu `CICD Workflow Fixes — EngMate-AI.md`; áp dụng ba sửa đổi bắt buộc trong một commit trên nhánh `fix/ci-cache-healthchecks`, push nhánh và kiểm chứng GitHub Actions.
- **Đối chiếu GitHub:** run [37220779051](https://github.com/VoMinhHoang1610/engmate-ai/actions/runs/37220779051) thất bại ở `Post Run actions/setup-python@v5`, sau khi install, lint, coverage, build, Docker và smoke đều qua. Lỗi xảy ra khi kết thúc job, không phải lúc setup như mô tả trong file tham chiếu. Task runner chuyển pip cache sang `.cache/pip`; bỏ cấu hình cache của action để tránh lưu vào thư mục mặc định chưa có. Không kết luận pip-tools không tương thích với cache.
- **Thay đổi:** bỏ hai dòng pip cache trong `.github/workflows/ci.yml`; cài curl tối thiểu trong `backend/Dockerfile`, probe có HTTP failure và timeout 2 giây, start period 15 giây; thêm start period 30 giây cho frontend trong `docker-compose.yml`.
- **Phạm vi:** giữ phiên bản Python/Node, cổng, CORS, biến môi trường, tests và logic ứng dụng. Docker frontend production là đề xuất tùy chọn trong tài liệu tham chiếu và chưa triển khai.
- **File thay đổi:** ba file cấu hình trên và `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`.
- **Kiểm chứng local:** `.\make.cmd lint` qua Ruff, Black, mypy (26 files), ESLint, TypeScript và Prettier; `.\make.cmd test` qua 16 backend + 13 frontend tests; `.\make.cmd coverage` đạt 100% hai phía với ngưỡng 80%; `.\make.cmd build` qua (33 modules); `.\make.cmd docker-check`, `docker-up` và `smoke` đều qua.
- **Health check thực tế:** Docker inspect xác nhận backend và frontend đều `healthy`, start period lần lượt `15s` và `30s`; backend dùng curl đúng cấu hình. HTTP smoke qua backend health, frontend HTML, API proxy và AI mock qua proxy.
- **Môi trường kiểm chứng:** lần chạy test/coverage trong sandbox bị chặn tiến trình esbuild (`spawn EPERM`) và cache pytest; chạy lại ngoài sandbox thành công. Docker được kiểm chứng qua Docker Desktop với quyền truy cập daemon.
- **GitHub tiếp theo:** workflow chỉ chạy trên PR hoặc push main; mở PR nháp từ nhánh sửa lỗi để chạy CI, không merge tự động. Kết quả CI của commit mới chưa có tại thời điểm ghi nhật ký; sẽ báo kết quả run khi GitHub hoàn tất.

## 2026-10-07 — Tách công việc đồng bộ CI khỏi nhánh giao diện

- Bản đồng bộ CI đã staged được bảo toàn trên `chore/sync-ci-social-login`, với hai parent là nhánh giao diện và `main`. Ba file CI/Docker đúng nội dung `main`; giữ các mục tài liệu đã giải quyết xung đột.
- `feat/social-login-motion` giữ nguyên tại `e38ab99`; chưa đưa commit đồng bộ này vào nhánh đó. `main` và `develop` không thay đổi.
- Các ghi nhận kiểm thử trước đây là lịch sử; không chạy lại lint/test hoặc coi nhánh feature đã qua CI trong tác vụ tổ chức nhánh.

## 2026-10-07 — Đồng bộ bản sửa CI/CD sang develop và nhánh feature

- **Yêu cầu:** cập nhật bản sửa CI/CD đã hoàn thiện trên `main` sang `develop` và nhánh `feat/*` hiện có (`feat/social-login-motion`).
- **Nguồn:** `main`/`origin/main` tại `fd931ff`, chứa commit sửa cấu hình `59180cf`; [CI của main đã thành công](https://github.com/VoMinhHoang1610/engmate-ai/actions/runs/37507717773).
- **Develop:** fast-forward từ `97e3672` lên `fd931ff` và push thành công; nội dung đúng bằng main đã kiểm chứng.
- **Feature:** merge main vào `feat/social-login-motion` từ `e38ab99`. Giải quyết xung đột ở `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/REQUIREMENTS.md` bằng cách giữ cả lịch sử tính năng và ghi nhận CI; giữ phạm vi demo đa trang của feature. Ba file CI/Docker giống main; diff xác nhận không thay đổi frontend, backend app/tests hoặc scripts so với feature trước merge.
- **Kiểm chứng:** Docker Compose config và diff whitespace qua; backend 16/16 tests, coverage 100%. Lint frontend có 8 lỗi và build có 4 lỗi TypeScript trong mã feature được giữ nguyên (`HoTroNhanh.tsx`, `HoSo.tsx`, `TaiKhoan.tsx`).
- **Test frontend:** lần chạy mặc định trên Node 25.9.0 đạt 12/52, 40 lỗi do `localStorage.clear` không có; chạy coverage với `NODE_OPTIONS=--no-experimental-webstorage` riêng cho tiến trình test vẫn đạt 12/52, 40 lỗi hành vi/assertion. Frontend chưa có kết quả coverage hợp lệ. Không đổi assertion, tắt test hoặc thay logic ứng dụng trong tác vụ đồng bộ.
- **Giới hạn CI:** workflow hiện kích hoạt khi có PR hoặc push vào main; push develop/feature không tự kích hoạt run mới. Kết quả CI main không được coi là bằng chứng toàn bộ feature đã qua kiểm tra.

## 2026-10-06 — Panel cuộn đăng nhập ↔ đăng ký

- **Yêu cầu:** hiệu ứng chuyển đăng nhập/đăng ký kiểu cuộn panel như ảnh tham khảo, nhưng thiết kế và animation riêng theo EngMate, không copy cyan/trắng tutorial.
- **Kết quả:** trang `#dang-nhap` dùng khung hai nửa: form và panel Mate navy→cyan. Bấm Đăng ký/Đăng nhập làm panel và form đổi chỗ trong ~0.92s; form mở bằng clip-path + xoay nhẹ; sóng viền, quỹ đạo và tia sáng phụ; Mate chào/ăn mừng theo chế độ. Mobile xếp dọc với pill chuyển chế độ. Khôi phục mật khẩu full-width; giữ nút xã hội demo, một form, email/tên và giảm chuyển động.
- **File:** `pages/TaiKhoan.tsx`, `index.css`; cập nhật README và tài liệu kiến trúc/yêu cầu/kiểm thử/quyết định/changelog/tiến trình. Không thêm dependency/backend/OAuth.
- **Kiểm chứng mã:** 10/10 TaiKhoan.test qua; lint toàn dự án (ruff/black/mypy/eslint/tsc/prettier) và build (50 modules) qua.
- **Kiểm chứng trình duyệt:** desktop 1280: panel trái→phải khi đăng ký (translate mid ~49%, cuối 100%/−100%), heading/field tên đúng; mobile 390 xếp dọc + pill. Không lỗi JS.
- **Trạng thái:** frontend/backend 5174/8010. Chưa commit/push.

## 2026-10-06 — Nút đăng nhập xã hội và chuyển cảnh tài khoản

- **Yêu cầu:** thêm Google/Facebook/GitHub trên trang đăng nhập; hiệu ứng thú vị, mượt khi chuyển đăng nhập ↔ đăng ký. Người dùng xác nhận **hoàn thiện giao diện trước**, chưa kết nối OAuth thật.
- **Kết quả:** có logo/nút Google riêng và Facebook/GitHub cạnh nhau ở đăng nhập/đăng ký. Nút hiện thông báo nhà cung cấp chưa khả dụng, không gọi mạng hoặc tạo phiên giả. Nền tab trượt, tiêu đề chuyển mờ, biểu mẫu trượt/nghiêng nhẹ theo hai hướng và khung co giãn trong 420 ms. Bấm liên tục nối tiếp từ chiều cao hiện tại; giữ email/tên, tạo mới ô mật khẩu; một form trong DOM, khôi phục không hiện nút xã hội. Giữ linh thú, trang độc lập, theme và các luồng cục bộ hiện có.
- **File:** thêm `components/DangNhapMangXaHoi.tsx`; cập nhật `pages/TaiKhoan.tsx`, `TaiKhoan.test.tsx`, `index.css`, README và tài liệu kiến trúc/yêu cầu/kiểm thử/quyết định/changelog/tiến trình. Không thêm dependency, secret, endpoint hoặc thay đổi backend. Animation chiều cao và listener được hủy khi unmount/giảm chuyển động.
- **Kiểm chứng mã:** 20/20 test chọn lọc tài khoản/avatar/giao diện/cài đặt qua, gồm 5 test mới. Lint toàn dự án, build (50 modules) và HTTP smoke qua. Backend 16/16 tests, coverage 100%. Frontend toàn bộ 45/52 tests qua, vẫn còn 7 assertion Việt hóa có sẵn trong App.test.tsx; chưa có coverage frontend hợp lệ.
- **Kiểm chứng trình duyệt:** Chrome QA riêng rà 60 tổ hợp (đăng nhập/đăng ký/khôi phục × sáng/tối × 10 chiều rộng 320–1440 px), không tràn ngang/cắt nút/input. Đo khung 445.5 → 478.08 → 485.5 px, độ mờ trung gian ~0.80 và indicator ~80.48% khi sang đăng ký; hướng ngược cũng có giá trị trung gian. Bấm đổi 13 lần liên tiếp vẫn có đúng form/chế độ, chiều cao cuối tự nhiên, không animation cũ kẹt. Nút xã hội không thay phiên; giữ thông tin/đổi ô mật khẩu, đăng ký → học → logout, alias, giảm chuyển động trong app/hệ thống (kể cả đổi giữa hiệu ứng) đều qua; không lỗi JavaScript. Đã xem ảnh sáng/tối desktop và đăng ký mobile.
- **Trạng thái:** frontend/backend vẫn chạy ở 5174/8010. Nhánh `feat/social-login-motion`, giữ toàn bộ thay đổi các lượt trước; chưa commit/push. OAuth thật và 7 assertion cũ là phần việc tiếp theo khi được yêu cầu.

## 2026-10-06 — Mate trở thành linh thú EngMate AI

- **Yêu cầu:** dùng robot trong ảnh đã chọn làm linh thú của dự án; tạo cảm giác vui khi học như các website học ngôn ngữ có nhân vật đồng hành. Giữ chữ gọn và trang đăng nhập tách riêng từ các lượt trước.
- **Kết quả:** đặt tên Mate, giữ thân trắng/xanh nhạt, mặt navy, mắt cyan và anten vàng; thêm tay, năm biểu cảm chào/nghe/suy nghĩ/động viên/ăn mừng. Mate xuất hiện nhất quán ở banner, sidebar, đăng nhập, avatar và trợ lý hội thoại, ghi âm, nghe, viết, mục tiêu ngày và hoàn thành flashcard. Thẻ kỹ năng có màu nhẹ, cạnh nổi, hiệu ứng hover/nhấn. Kết quả nghe đúng/sai, phiên ôn hoàn thành và mục tiêu ngày quyết định biểu cảm thực tế.
- **Thực hiện:** thêm component dùng chung `components/LinhThu.tsx`, refactor `TrangTri` thành bối cảnh quanh Mate, bản vector tĩnh nền trong suốt `public/mate.svg` và hướng dẫn `docs/LINH_THU.md`. Cập nhật App, tổng quan, hội thoại, nói/nghe/viết, flashcard và CSS. Không thêm dependency hay thay dữ liệu/API; hình không nhận focus/chuột, nội dung trạng thái vẫn bằng chữ. Hai chế độ giảm chuyển động giữ hình và tắt hiệu ứng.
- **Kiểm chứng mã:** 6/6 test mới của Mate qua; tổng cộng 10/10 test Mate/giao diện gọn qua. Lint toàn dự án, build và HTTP smoke qua; bản SVG trả HTTP 200 và có trong bản build. Backend 16/16 tests, coverage 100%. Frontend toàn bộ 40/47 tests qua; 7 lỗi assertion Việt hóa có sẵn trong App.test.tsx giữ nguyên, coverage frontend chưa có kết quả hợp lệ.
- **Kiểm chứng giao diện:** Chrome QA riêng kiểm tra 220 tổ hợp của 11 trang, sáng/tối, 10 chiều rộng từ 320–1440 px; không tràn ngang/cắt input/nút. Luồng menu mobile/avatar/đăng nhập, flashcard, trợ giúp và hội thoại qua backend qua; nhân vật chuyển động, thẻ nâng khi hover và cả giảm chuyển động trong app/hệ thống đều được kiểm tra. Kết quả đúng/sai/làm lại và hoàn thành ôn với biểu cảm Mate qua ở 1440/390/320 px; không lỗi JavaScript. Đã xem ảnh tổng quan desktop/mobile/tối, nói/nghe/viết/hội thoại và kết quả học trên mobile.
- **Tài liệu và trạng thái:** cập nhật README, kiến trúc, D-15, kiểm thử, quyết định, changelog và hướng dẫn linh thú. Nhánh `feat/engmate-mascot` giữ các thay đổi đã có; chưa commit/push. Dự án đang chạy tại frontend 5174/backend 8010. Tồn đọng 7 assertion cũ cần xử lý trong tác vụ kiểm thử riêng.

## 2026-10-06 — Thêm trang trí và animation cho giao diện

- **Yêu cầu điều chỉnh:** giao diện trước quá đơn điệu; cần thêm trang trí và nhiều hiệu ứng animation. Giữ yêu cầu trước về nhãn gọn và trang đăng nhập riêng.
- **Kết quả:** banner navy/cyan gradient có nhân vật CSS nổi/chớp mắt, vòng quay, bong bóng và sao; thêm nền chuyển sắc, điểm nhấn violet/coral/green, thẻ màu và bóng nhẹ. Chuyển trang và thẻ vào lần lượt; hover nâng thẻ/nghiêng icon/dịch mũi tên, ánh sáng trên nút, underline tab, popup menu, tin nhắn, ghi âm, nghe, flashcard và phản hồi có chuyển động. Đăng nhập có nhân vật nhỏ và hình nền chuyển động; Cài đặt vẫn chỉ có tên tùy chọn/điều khiển.
- **Thực hiện:** thêm `components/TrangTri.tsx` dùng CSS/icon nội bộ, ẩn khỏi trợ năng và không nhận chuột; cập nhật `TongQuan.tsx`, `TaiKhoan.tsx`, wrapper chuyển trang trong `App.tsx` và `index.css`. Không thêm dependency hoặc vòng cập nhật JavaScript. Giảm chuyển động từ Cài đặt/hệ thống tắt animation và transition.
- **Kiểm chứng mã:** lint toàn dự án và build qua; HTTP smoke qua. 20/20 test chọn lọc giao diện/cài đặt/tài khoản/avatar/shell/routing/thanh cuộn qua. Backend 16/16 tests, coverage 100%; frontend toàn bộ 34/41 tests qua, vẫn còn 7 lỗi assertion Việt hóa đã ghi nhận trước tác vụ; chưa có coverage frontend hợp lệ.
- **Kiểm chứng giao diện:** Chrome QA riêng đo 11 animation trang trí đang chạy, vị trí nhân vật thay đổi theo thời gian và thẻ nâng khi hover; cả tùy chọn Giảm chuyển động và `prefers-reduced-motion` đưa animation trang trí về 0. Rà soát 220 tổ hợp trang/theme/viewport (11 trang, sáng/tối, 10 chiều rộng từ 320–1440 px) sau khi hiệu ứng vào trang kết thúc: không tràn ngang/cắt input/nút. Menu mobile/avatar → đăng nhập, flashcard, mở trợ giúp và chat qua backend hoạt động; không có lỗi JavaScript. Đã xem ảnh tổng quan/cài đặt/từ vựng/đăng nhập desktop, tổng quan/viết/đăng nhập mobile và theme tối.
- **Tài liệu:** cập nhật README, kiến trúc, yêu cầu D-13/D-14, kiểm thử, quyết định, changelog và tiến trình. Nhánh `feat/decorative-motion` giữ thay đổi các lượt trước; chưa commit/push. Tài khoản và AI tiếp tục dùng cơ chế demo hiện có.

## 2026-10-06 — Giao diện tối giản cho toàn bộ ứng dụng

- **Yêu cầu:** thiết kế lại toàn bộ giao diện hiện đại, tối giản; bớt chữ nhỏ giải thích dưới tên thành phần, đặc biệt các tùy chọn Cài đặt.
- **Kết quả:** dùng nền trung tính, một màu xanh nhấn, thẻ phẳng/viền nhẹ và cỡ chữ nhất quán. Viết lại stylesheet chung theo biến màu cho sáng/tối. Sidebar bỏ thẻ động viên, footer/logo bỏ slogan; tiêu đề trang chỉ còn tên và thao tác chính. Tổng quan bỏ mascot, banner dài, lời giải thích dưới thống kê/kỹ năng và câu trích dẫn; thay bằng thẻ luyện tập gọn, danh sách chủ đề và thanh mục tiêu có ARIA.
- **Các trang:** Cài đặt bỏ toàn bộ mô tả phụ dưới nhãn; chủ đề bỏ mô tả và banner tính năng chưa có; hồ sơ bỏ mẹo trang trí; đăng nhập riêng thu gọn thành biểu mẫu giữa trang. Gợi ý luyện nói và hướng dẫn flashcard nằm trong `details` đóng mặc định. Giữ đề bài, nghĩa/phiên âm/ví dụ, giải thích học thuật mở theo yêu cầu, chu kỳ ôn, các điều khiển, thông báo lỗi/kết quả và nhãn AI mẫu cần thiết. Drawer mobile khi đóng cũng ẩn khỏi điều hướng bàn phím.
- **File thay đổi:** `index.css`, `App.tsx`, `components/Logo.tsx`, `components/TieuDeTrang.tsx`, 11 trang giao diện; thêm `GiaoDien.test.tsx`, cập nhật test lời chào và nhãn AI theo thiết kế mới. README, yêu cầu, kiểm thử, kiến trúc, quyết định, changelog và tiến trình.
- **Kiểm chứng:** 15/15 test giao diện mới/cài đặt/tài khoản/avatar và 9/9 test chọn lọc giao diện/shell/route/nhãn AI/tài khoản qua. Lint toàn dự án (Ruff/Black/mypy/ESLint/TypeScript/Prettier), build và HTTP smoke qua. Backend 16/16 tests qua, coverage 100%. Frontend toàn bộ 34/41 tests qua; còn 7 lỗi assertion văn bản Việt hóa đã ghi nhận trước tác vụ, chưa có coverage frontend hợp lệ.
- **Trình duyệt:** Chrome QA riêng kiểm tra 220 tổ hợp của 11 trang, 2 theme, 10 chiều rộng từ 320 đến 1440 px; không tràn ngang và các input/nút nằm trong viewport. Kiểm tra menu mobile, avatar → đăng nhập, flashcard, mở gợi ý, gửi hội thoại thật qua backend; không có lỗi JavaScript. Luồng đăng nhập/đăng ký/khôi phục/logout/alias/theme/reload cũng qua. Đã xem ảnh tổng quan, cài đặt, hội thoại, đăng nhập trên desktop/mobile và theme tối.
- **Giới hạn:** tài khoản/AI tiếp tục dùng cơ chế demo hiện có. Nhánh `feat/minimal-interface`, giữ các thay đổi đăng nhập từ lượt trước; chưa commit/push. Cần xử lý riêng 7 assertion cũ khi có yêu cầu.

## 2026-10-06 — Thiết kế trang đăng nhập độc lập

- **Yêu cầu:** đưa đăng nhập ra trang riêng, tách biệt khỏi các phần học tập ở trang chính.
- **Kết quả:** `#dang-nhap` có header, main và footer riêng, không render sidebar/topbar học tập. Bố cục hai cột trên desktop với nhận diện navy/cyan, thu gọn trên mobile; đăng nhập/đăng ký/khôi phục dùng cùng trang. Có liên kết về học tập cho khách và nút vào tổng quan sau đăng nhập. Cài đặt bỏ tab/phần tài khoản, chỉ giữ giao diện và âm thanh. Avatar dẫn đến trang mới; hai liên kết cũ `#tai-khoan`, `#cai-dat?muc=tai-khoan` vẫn mở được trang đăng nhập.
- **Dữ liệu:** dùng cùng Context để giữ hồ sơ, tùy chọn và trạng thái phiên khi chuyển bố cục; lỗi lưu trữ cũng hiển thị trên trang riêng. Không lưu mật khẩu.
- **File thay đổi:** `App.tsx`, `demo/duLieu.ts`, `pages/CaiDat.tsx`, `pages/TaiKhoan.tsx`, `index.css`, `components/MenuNguoiDung.tsx` và test; thêm `pages/TaiKhoan.test.tsx`; README và tài liệu kiến trúc/yêu cầu/kiểm thử/quyết định/changelog/tiến trình.
- **Kiểm chứng:** 15/15 test chọn lọc cho trang độc lập/alias/menu/cài đặt/luồng tài khoản/shell/route/nhãn AI qua. ESLint/TypeScript frontend, format các file thay đổi và build qua. HTTP smoke backend/web/proxy/AI mock qua. Chrome headless với hồ sơ QA riêng kiểm tra cả ba chế độ ở 360/390/760/1440 px, không tràn ngang hoặc cắt input/nút; đăng nhập → vào học tập → đăng xuất, theme tối, reload và hai alias qua. Đã xem ảnh desktop/mobile/theme tối.
- **Kiểm tra toàn dự án:** đã chạy lint/test/coverage/build. Backend 16/16 tests qua, coverage 100%. Frontend 30/37 tests qua; 7 lỗi assertion tiếng Việt không dấu trong `App.test.tsx` đã được ghi nhận trước tác vụ này, chưa có coverage frontend hợp lệ. Lint toàn dự án còn format-check của 4 file có sẵn ngoài phạm vi (`ChuDeNhapVai`, `HoSo`, `LuyenNghe`, `SoTuVung`); các file thay đổi đã format.
- **Giới hạn:** tài khoản vẫn mô phỏng bằng localStorage, chưa xác thực backend hoặc gửi email. Nhánh `feat/standalone-login`, chưa commit/push. Bước tiếp theo: xử lý bộ kiểm thử Việt hóa khi có yêu cầu.

## 2026-10-06 — Cài đặt, đăng nhập bên trong và menu avatar

- **Yêu cầu:** thay Tài khoản ở sidebar bằng Cài đặt với tùy chọn cơ bản; đưa đăng nhập vào trong; avatar trên cùng mở menu theo trạng thái phiên.
- **Kết quả:** route `#cai-dat` có mục Chung/Tài khoản, phần đăng nhập nằm ở `#cai-dat?muc=tai-khoan`; alias `#tai-khoan` vẫn hoạt động. Thêm giao diện sáng/tối/theo hệ thống, giảm chuyển động và tốc độ đọc tiếng Anh, áp dụng ngay và lưu với dữ liệu hiện có. Dữ liệu cũ thiếu hoặc sai cài đặt được bổ sung mặc định, giữ hồ sơ/lịch ôn.
- **Avatar:** hover hoặc bấm để mở; khách chỉ có Đăng nhập, đã đăng nhập có Hồ sơ học tập và Đăng xuất. Đóng khi rời chuột không giữ focus, bấm ngoài, chuyển route, mất focus hoặc Escape; Escape từ trong nhóm trả focus về avatar. Logout cập nhật trạng thái lưu và menu trở về lựa chọn Đăng nhập.
- **File thay đổi:** `App.tsx`, `App.test.tsx`, `index.css`, `components/MenuNguoiDung.tsx` và test, `pages/CaiDat.tsx` và test, `pages/TaiKhoan.tsx`, `demo/duLieu.ts`, `demo/LuuTru.tsx`, `demo/amThanh.ts`; README và tài liệu kiến trúc/yêu cầu/kiểm thử/quyết định/changelog.
- **Kiểm chứng:** 11/11 test chọn lọc cho cài đặt/avatar/shell/route/nhãn AI/tài khoản qua; sau hoàn thiện xử lý Escape, 6/6 test cài đặt/avatar qua. ESLint/TypeScript frontend và build cuối cùng qua. Chrome QA riêng kiểm tra hover thực, đăng nhập, mở hồ sơ, logout, chọn theme và reload; 10 route và mục tài khoản không tràn ngang ở 1440/360/390 px, popup avatar nằm trong màn hình. Đã xem ảnh cài đặt sáng/tối/mobile và trang học ở theme tối.
- **Kiểm tra toàn dự án:** đã chạy task lint/test/coverage/build; backend 16/16 tests, coverage 100%; frontend 25/32 tests qua, còn 7 lỗi văn bản Việt hóa đã có. Task lint dừng ở format của 4 file ngoài phạm vi; các file thay đổi đã format. Chưa có coverage frontend hợp lệ do test cũ lỗi.
- **Giới hạn:** đăng nhập vẫn là trạng thái localStorage; chưa có backend auth hoặc gửi email. Chưa commit/push. Các lỗi kiểm thử cũ cần xử lý trong tác vụ kiểm thử riêng.

## 2026-10-06 — Thanh cuộn mờ dần và nhãn demo chỉ ở tính năng AI

- **Yêu cầu:** làm thanh cuộn hiện/ẩn mượt; bỏ chú thích demo ngoài các tính năng AI.
- **Kết quả:** đăng ký biến màu `--scrollbar-thumb` với `@property`, chuyển màu/độ trong suốt trong 280 ms khi hiện và ẩn; giữ thời gian chờ 1 giây, giữ nguyên kích thước thanh cuộn. Menu mobile cũng chuyển màu mượt; chế độ giảm chuyển động không chạy hiệu ứng. Điều chỉnh min-width body theo vùng hiển thị để không tràn ngang ở viewport 360 px có thanh cuộn.
- **Nội dung:** bỏ badge demo toàn app, nhãn người học/tài khoản demo, ghi chú demo tổng quan và lịch demo flashcard. Nhãn `AI · Demo` nằm cạnh hội thoại, phân tích nói/viết và banner hội thoại AI. Tài khoản dùng nhãn Đăng nhập/Tạo tài khoản/Gửi yêu cầu; vẫn chỉ lưu trạng thái trên trình duyệt, không thêm xác thực backend hoặc gửi email.
- **File thay đổi:** `frontend/src/index.css`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, các trang `TaiKhoan`, `Flashcard`, `TongQuan`, `HoiThoaiAI`, `LuyenNoi`, `LuyenViet`; tài liệu tiến trình, yêu cầu, changelog và kiểm thử.
- **Kiểm chứng:** 5/5 test chọn lọc cho thanh cuộn, nhãn AI, tài khoản, shell và route qua; ESLint/TypeScript và format các file thay đổi qua; build qua. Chrome 1440/390 px ghi nhận alpha trung gian khi hiện (~0.51) và ẩn (~0.29–0.38), trở về 0 sau hiệu ứng; độ rộng bố cục không đổi. Cả 10 route ở 1440/360/390 px không tràn ngang và không có demo ở sidebar/topbar/trang không dùng AI.
- **Kiểm tra toàn dự án:** đã chạy `lint`, `test`, `coverage`, `build`. Backend 16/16 tests, coverage 100%; frontend 19/26 tests qua, còn 7 lỗi văn bản Việt hóa đã có. Task lint dừng ở format của 6 file ngoài phạm vi; chưa có coverage frontend hợp lệ. Chưa commit hoặc push.

## 2026-10-06 — Ẩn thanh cuộn khi không sử dụng

- **Yêu cầu:** thanh cuộn mặc định ẩn, chỉ hiện khi người dùng cuộn.
- **Kết quả:** thanh cuộn mảnh, nền trong suốt; hiện riêng cho vùng đang cuộn và tự ẩn sau 1 giây không có sự kiện cuộn. Áp dụng cho trang, sidebar và vùng cuộn bên trong. Giữ nguyên độ rộng để tránh xê dịch bố cục; vẫn cuộn bằng chuột, touch và bàn phím như bình thường. Listener/timer được dọn khi unmount.
- **File thay đổi:** `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/App.test.tsx` và tài liệu tiến trình/yêu cầu/changelog/kiểm thử.
- **Kiểm chứng:** 3/3 test chọn lọc cho thanh cuộn, shell/menu và routing qua; ESLint/TypeScript, format các file thay đổi và build qua. Chrome kiểm tra màu thanh cuộn trang/sidebar ở ba thời điểm trước/trong/sau cuộn: trong suốt → xanh xám → trong suốt, độ rộng trang/sidebar không đổi.
- **Kiểm tra toàn dự án:** đã chạy lại task `lint`, `test`, `coverage`, `build`: backend 16/16 tests, coverage 100%; frontend 17/25 tests qua, 8 lỗi văn bản Việt hóa giữ nguyên. Task lint dừng ở format của 11 file ngoài phạm vi; build qua. Chưa có coverage frontend hợp lệ. Chưa commit hoặc push.

## 2026-10-06 — Bố trí logo và đồng bộ nhận diện EngMate AI

- **Yêu cầu:** thêm logo theo ảnh người dùng cung cấp vào giao diện cho phù hợp.
- **Kết quả:** tái dựng biểu tượng hội thoại/chữ E bằng SVG nền trong suốt; component `Logo` dùng chung cho sidebar, thanh trên cùng mobile và trang tài khoản. Thêm favicon, theme-color; dùng xanh navy/cyan cho banner, menu đang chọn, nút chính và focus. Giữ vàng ở chi tiết ba chấm của logo.
- **File thay đổi:** `frontend/public/engmate-mark.svg`, `frontend/src/components/Logo.tsx`, `frontend/src/App.tsx`, `frontend/src/pages/TaiKhoan.tsx`, `frontend/src/index.css`, `frontend/index.html` và tài liệu tiến trình/yêu cầu/changelog.
- **Kiểm chứng:** build qua; ESLint/TypeScript frontend qua; backend lint/type-check qua, 16/16 tests và coverage 100%. Hai test shell/menu và routing hiện có qua. Chrome desktop 1440 px và cả 10 route ở 360/390/760 px: logo tải thành công, không tràn ngang, logo đầy đủ nằm vừa sidebar. Đã xem ảnh desktop, mobile và trang tài khoản.
- **Giới hạn kiểm thử:** lệnh test/coverage toàn dự án chưa qua: frontend 16/24 tests qua, 8 lỗi do assertion dùng câu tiếng Việt không dấu trong khi UI hiện có dấu (không thuộc thay đổi logo). Coverage frontend không có kết quả hợp lệ trong lượt này. Task lint toàn dự án dừng ở format-check của 12 file có sẵn; các file giao diện thay đổi cho logo đã được format. Không sửa assertion hoặc format các file ngoài phạm vi.
- **Tồn đọng:** SVG là bản tái dựng theo ảnh, không phải file vector gốc. Bước tiếp theo: đồng bộ các test văn bản với bản Việt hóa khi xử lý tác vụ kiểm thử. Chưa commit hoặc push.

## 2026-10-06 — Hoàn thiện bản demo frontend đa trang

- **Yêu cầu:** tiếp tục hoàn thiện demo theo danh sách chức năng, giao diện hiện đại có thanh menu và tên file tiếng Việt không dấu.
- **Kết quả:** thay trang khởi tạo bằng app responsive có sidebar desktop/menu mobile và 10 hash route: tổng quan, hội thoại AI, luyện nói, chủ đề nhập vai, luyện nghe, luyện viết, sổ từ vựng, flashcard, hồ sơ và tài khoản. Các file/component mới đều đặt tên tiếng Việt không dấu.
- **Tương tác:** chat gọi `/api/ai/reply`; ghi âm/phát âm dùng API trình duyệt; hồ sơ, từ vựng, thống kê ngày và lịch ôn lưu trong `localStorage`. UI báo rõ các phản hồi cố định, auth mô phỏng, AI mock và trường hợp trình duyệt không lưu được.
- **Responsive và accessibility:** thêm skip link, trạng thái menu, focus, ARIA cho chat/flashcard và cleanup audio/request. Rà soát bằng viewport thật cho cả 10 route ở 360 px và 390 px cho kết quả `scrollWidth === clientWidth`; bản desktop 1440 px hiển thị đúng bố cục.
- **Kiểm chứng:** `lint`, `build` và HTTP `smoke` qua; backend 16/16 tests, coverage 100%; frontend 24/24 tests, coverage statements 85%, branches 81.66%, functions 81.28%, lines 86.99%.
- **Giới hạn:** chưa có tài khoản/DB thật, chat streaming, STT hoặc chấm phát âm thật, phân tích bài viết bằng model và E2E cho quyền micro trên trình duyệt thật. Pytest có cảnh báo không ghi được thư mục cache do quyền Windows, không ảnh hưởng kết quả.
- **Nhánh làm việc:** `feat/demo-giao-dien`; chưa commit hoặc push.

## 2026-10-05 — Bàn giao khung dự án vào main

- **Yêu cầu:** người dùng cho phép merge khung vào `main` và cập nhật GitHub.
- **Khảo sát:** sau `git fetch origin`, `origin/main` ở `cd0f709`, nhánh `chore/phase-0-bootstrap` ở `669072d`; working tree sạch. Main là tổ tiên của nhánh khung, không có thay đổi phân kỳ.
- **Phương thức:** commit nhật ký trên nhánh khung, sau đó merge vào main bằng fast-forward và push thông thường; giữ lịch sử, không force push. Đối chiếu HEAD local với remote sau khi push.
- **File thay đổi:** chỉ `docs/PROGRESS.md`; đưa bộ khung đã có vào main, không bổ sung hành vi ứng dụng.
- **Kiểm chứng ngày 2026-10-05:** `.\make.cmd coverage` qua 16/16 backend tests và 13/13 frontend tests, coverage hai phía 100%; `.\make.cmd build` qua, Vite build 33 modules. `git diff --check` qua; lint/type-check/format được kiểm tra qua hai Git hook khi commit.
- **Tồn đọng:** GitHub Actions sẽ được kích hoạt bởi push vào main; chưa có kết quả CI tại thời điểm ghi nhật ký. AI dùng mock, các tính năng nghiệp vụ còn trong backlog.
- **Bước tiếp theo:** xem kết quả CI trên GitHub và triển khai theo `docs/IMPLEMENTATION_PLAN.md` khi được yêu cầu.

## 2026-10-05 — Khởi chạy local theo yêu cầu

- **Yêu cầu:** chạy dự án trên máy hiện tại.
- **Việc đã làm:** cài frontend bằng `npm ci`; máy chưa có Python khả dụng nên tải uv và Python 3.13 vào `.tools/`, tạo `.venv/`, cài backend từ `requirements-dev.txt` và editable package; tạo `.env` từ mẫu. Các thư viện và công cụ local được Git bỏ qua.
- **Đang chạy:** Vite tại `http://127.0.0.1:5174`, FastAPI tại `http://127.0.0.1:8010`, Swagger tại `http://127.0.0.1:8010/docs`; AI dùng mock. Chạy bằng task `dev-frontend` tương đương và `dev-backend` của dự án.
- **File thay đổi:** chỉ `docs/PROGRESS.md`, trên nhánh `chore/run-local-20261005`; không đổi mã ứng dụng.
- **Kiểm chứng:** `scripts/manage.py smoke` qua backend health, frontend HTML, Vite API proxy và AI mock; `lint` và `build` qua; `coverage` qua 16 backend tests và 13 frontend tests, coverage hai phía 100%.
- **Tồn đọng:** chưa chạy Docker hoặc GitHub Actions trong tác vụ này. Đây là server phát triển local; AI thật và các tính năng nghiệp vụ còn trong backlog.
- **Bước tiếp theo:** mở địa chỉ web để sử dụng. Khi cần khởi chạy lại, dùng `.\make.cmd dev-backend` và `.\make.cmd dev-frontend` trong hai terminal riêng.

## 2026-10-04 — Push khung dự án lên GitHub thành công

- **Yêu cầu:** tiếp tục push lên GitHub theo xác nhận của người dùng; tuân thủ `AGENT.md` và `CLAUDE.md`.
- **Kết quả:** `git push -u origin chore/phase-0-bootstrap` thành công, tạo nhánh remote và thiết lập upstream. GitHub đã nhận commit khung `fd49327` và commit nhật ký `bc791f5`, gồm workflow CI; lỗi quyền `workflow` trước đó không còn chặn lần push này.
- **File thay đổi:** chỉ `docs/PROGRESS.md`, bổ sung kết quả bàn giao; mã ứng dụng giữ nguyên.
- **Kiểm chứng:** bộ khung đã qua 16 backend tests và 13 frontend tests, coverage 100% hai phía, lint/type-check, build và Docker smoke ở lần kiểm chứng trước. Không chạy lại tests ứng dụng cho thay đổi nhật ký; Git hook chạy kiểm tra khi commit tài liệu.
- **Tồn đọng:** chưa có kết quả GitHub Actions; workflow chạy khi mở PR hoặc push vào main. AI hiện dùng mock; các tính năng nghiệp vụ còn trong backlog.
- **Bước tiếp theo:** mở PR để review và chạy CI, sau đó triển khai theo `docs/IMPLEMENTATION_PLAN.md` khi được yêu cầu.

## 2026-10-04 — Bàn giao khung lên Git theo hướng dẫn agent

- **Yêu cầu:** người dùng cho phép commit và push khung; đã đọc `AGENT.md` và `CLAUDE.md`. Quy tắc không tự push được đáp ứng bằng yêu cầu rõ ràng lần này.
- **Phạm vi:** khung frontend/backend, tests, lockfile, tooling và documentation đã dựng; bổ sung file hướng dẫn `AGENT.md` vào repo và liên kết từ README.
- **Nhánh/remote:** `chore/phase-0-bootstrap` → `origin` (`VoMinhHoang1610/engmate-ai`); giữ nhánh riêng, không sửa lịch sử hoặc commit vào main.
- **Kiểm chứng:** mã ứng dụng không đổi so với lần reset đã kiểm chứng ngay trước đó: 16 backend + 13 frontend tests qua, coverage khung 100% hai phía; lint/type-check, build, pre-commit và Docker smoke qua. Commit dùng Git hook để chạy lại lint/type-check/format.
- **Rà soát:** kiểm tra diff và danh sách file; `.env`, backup, dependency cài local, coverage và build artifact đều được Git bỏ qua. Không tìm thấy private key hoặc token theo các mẫu đã quét; không ghi nội dung secret vào log.
- **File tài liệu cập nhật:** `AGENT.md`, `README.md`, `CLAUDE.md`, `docs/PROGRESS.md`.
- **Kết quả Git:** commit `fd49327` (`chore: add tested EngMate-AI project scaffold`) đã tạo; cả hai pre-commit hook qua. GitHub từ chối push vì OAuth thiếu quyền `workflow` để tạo `.github/workflows/ci.yml`. Kiểm tra SSH với strict host verification cũng chưa thành công vì máy chưa có host key tin cậy của GitHub. Chưa có nhánh mới trên remote từ lần push này.
- **Tồn đọng:** đã xin xác nhận đăng nhập lại/cấp quyền phù hợp theo mục 8 của `AGENT.md`; chưa thay đổi cấu hình xác thực hoặc loại bỏ file CI.
- **Bước tiếp theo:** push sau khi xác thực đủ quyền; mở PR để kích hoạt CI (workflow hiện chạy trên PR và push vào main), rồi triển khai backlog trong `IMPLEMENTATION_PLAN.md`. Các giới hạn về mock AI và nghiệp vụ chưa triển khai giữ nguyên.

## 2026-10-04 — Reset và dựng khung mới

### Yêu cầu và phạm vi

Người dùng yêu cầu reset dự án và dựng khung frontend JavaScript/TypeScript, backend AI Python, test và documentation tiến độ. Khung cũ được chuyển vào `.artifacts/before-reset-20261004-144402`; Git history được giữ lại. Các container EngMate-AI cũ đã dừng trước khi thay nguồn.

### Việc đã làm và file thay đổi

- Dựng lại `frontend/src/`: API client, hook health, component trạng thái và trang React/TypeScript đơn giản, nối API qua Vite proxy.
- Dựng lại `backend/app/`: application factory, config, routes, schemas, AIService, LLM interface/mock và prompt `persona.v1.txt`.
- Viết tests backend trong `tests/unit/`, `tests/integration/`; frontend có tests API/component/hook và cleanup globals/DOM.
- Thay `scripts/manage.py`, `scripts/smoke.py`, `make.cmd`, Makefile; task runner Python xử lý Unicode và dừng ngay khi lệnh con thất bại.
- Dựng lại Dockerfiles, Compose hai dịch vụ, pre-commit và `.github/workflows/ci.yml`; các lockfile đồng bộ với manifest.
- Viết lại README, CLAUDE.md và documentation yêu cầu, kiến trúc, API, kiểm thử, quyết định, changelog, prompt và kế hoạch code tiếp theo.
- Khung dùng cổng 8010/5174, health route `/api/health`, AI mock `/api/ai/reply`; `.env` local được tạo lại theo cấu hình này.

### Kết quả kiểm chứng thực tế

Môi trường local: Windows, Python 3.13.11, Node 25.9.0; Docker/CI cấu hình Python 3.13 và Node 24.

| Lệnh Windows | Kết quả |
| --- | --- |
| `.\make.cmd setup` | Qua: backend editable và `npm ci`; npm audit trong bước cài ghi nhận 0 vulnerabilities. |
| `.\make.cmd format` | Qua. |
| `.\make.cmd lint` | Qua: Ruff, Black, mypy strict (26 files), ESLint, TypeScript và Prettier. |
| `.\make.cmd test` | Qua: backend 16/16; frontend 13/13, 3 test files. |
| `.\make.cmd coverage` | Qua: backend 100% trên 70 statements; frontend statements/branches/functions/lines đều 100%. Ngưỡng mỗi phía 80%. |
| `.\make.cmd build` | Qua: Vite production build, 33 modules, artifact `frontend/dist/`. |
| `.\make.cmd pre-commit` | Qua: cả hai hook. Hook local đã được cài trong checkout trước reset; cấu hình mới đã chạy thật. |
| `.\make.cmd docker-check` | Qua. |
| `.\make.cmd docker-up` và `smoke` | Qua: backend/frontend healthy; health trực tiếp và qua Vite proxy, web HTML và AI mock qua proxy đều đạt. |
| GitHub Actions | Có workflow; chưa chạy trên GitHub. |

### Giới hạn và tồn đọng

- Coverage áp dụng cho mã khung hiện có; không chứng minh auth/chat/DB hoặc chất lượng model thật.
- Backend dùng httpx AsyncClient/ASGITransport để kiểm thử async và tránh TestClient đang có cảnh báo deprecation ở dependency hiện tại.
- Sandbox Windows chặn cache/tiến trình con của công cụ; bộ kiểm chứng cuối đã chạy ngoài sandbox sau khi được cấp quyền. Terminal local thông thường không có giới hạn sandbox này.
- npm còn cảnh báo vòng đời hỗ trợ ESLint 9; lint vẫn qua và audit không phát hiện vulnerability. Xem xét nâng cùng plugin khi cập nhật dependency chủ động.
- DB, auth, chat streaming, phân tích lỗi, provider thật, E2E nghiệp vụ và triển khai production nằm trong backlog.
- Mã khung chưa commit/push; bản backup và artifact/cache được Git bỏ qua.

### Bước tiếp theo

Khung đã hoàn thành kiểm chứng local. Stack Docker đang chạy tại web `http://127.0.0.1:5174`, API `http://127.0.0.1:8010`; dừng bằng `.\make.cmd down`.

Triển khai schema DB/SQLAlchemy/Alembic và models theo `IMPLEMENTATION_PLAN.md`, thêm test cùng code và thêm mục mới ở đầu nhật ký khi thay đổi. Mọi phần chưa làm nằm trong `REQUIREMENTS.md`.

## 2026-10-01 — GĐ 0: Khởi tạo nền tảng (đang kiểm chứng)

### Phạm vi và quyết định

- Người dùng đã xác nhận tiếp tục kế hoạch GĐ 0 và chốt tên **EngMate-AI**, thay tên sản phẩm cũ trong hướng dẫn ban đầu.
- Phạm vi gồm nền repo, API health, trang placeholder, công cụ kiểm tra, Docker/Compose, CI và tài liệu. Chưa triển khai auth, chat, models, migration hoặc LLM.
- Chọn React Context cho state dùng chung khi cần; PostgreSQL qua Compose là môi trường phát triển chuẩn. SQLite qua cấu hình và lớp LLM/mock thuộc GĐ 1.

### Việc đã làm và file thay đổi

- Tạo tài liệu nền: `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/TESTING.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/PROMPTS.md`.
- Ghi rõ FR/NFR, ERD và luồng chat dự kiến, API health GĐ 0, test mapping, quyết định kỹ thuật và backlog xóa dữ liệu tài khoản.
- Các file mã nguồn, hạ tầng và hướng dẫn ở root đang được triển khai trong cùng GĐ 0; danh sách cuối cùng và kết quả chạy phải được bổ sung trước khi báo hoàn thành.

### Kết quả kiểm chứng

| Kiểm tra | Kết quả hiện tại |
| --- | --- |
| `make setup` | Chưa ghi nhận kết quả. |
| `make lint` | Chưa ghi nhận kết quả. |
| `make test` | Chưa ghi nhận kết quả. |
| `make coverage` | Chưa ghi nhận kết quả; chưa có tỷ lệ coverage để báo cáo. |
| `make build` | Chưa ghi nhận kết quả. |
| Dev/Compose và smoke HTTP | Chưa ghi nhận kết quả. |
| Pre-commit | Chưa ghi nhận kết quả. |
| GitHub Actions | Chưa chạy trên GitHub; việc tạo workflow chưa chứng minh CI đã qua. |

### Tồn đọng và giới hạn

- Hoàn tất kiểm chứng GĐ 0 và cập nhật số liệu thực tế; không chuyển sang GĐ 1 khi test hiện tại chưa qua.
- Windows chưa có GNU Make trong PATH ở lần kiểm tra ban đầu; cần cung cấp và xác minh hướng dẫn bootstrap/lệnh gọi.
- Các chức năng GĐ 1–4 chưa làm, được liệt kê trong [REQUIREMENTS.md](REQUIREMENTS.md). Endpoint xóa dữ liệu tài khoản là backlog bắt buộc của backend/MVP.
- Chưa chọn LLM provider/model, chưa có API key hoặc chi phí LLM; chưa có thử nghiệm prompt hay đo độ trễ chat.

### Việc tiếp theo

Hoàn tất các kiểm tra, sửa lỗi trong GĐ 0 và ghi kết quả tại mục này. Sau khi đủ điều kiện hoàn thành, bàn giao ngắn gọn và chờ xác nhận trước khi sang GĐ 1. Mỗi lần làm việc tiếp theo thêm mục mới ở đầu nhật ký, giữ lại lịch sử cũ.

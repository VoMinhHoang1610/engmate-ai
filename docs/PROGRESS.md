# Nhật ký tiến trình EngMate-AI

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

## 2026-10-05 — Bàn giao khung dự án vào main

- **Yêu cầu:** người dùng cho phép merge khung vào `main` và cập nhật GitHub.
- **Khảo sát:** sau `git fetch origin`, `origin/main` ở `cd0f709`, nhánh `chore/phase-0-bootstrap` ở `669072d`; working tree sạch. Main là tổ tiên của nhánh khung, không có thay đổi phân kỳ.
- **Phương thức:** commit nhật ký trên nhánh khung, sau đó merge vào main bằng fast-forward và push thông thường; giữ lịch sử, không force push. Đối chiếu HEAD local với remote sau khi push.
- **File thay đổi:** chỉ `docs/PROGRESS.md`; đưa bộ khung đã có vào main, không bổ sung hành vi ứng dụng.
- **Kiểm chứng ngày 2026-10-05:** `.\make.cmd coverage` qua 16/16 backend tests và 13/13 frontend tests, coverage hai phía 100%; `.\make.cmd build` qua, Vite build 33 modules. `git diff --check` qua; lint/type-check/format được kiểm tra qua hai Git hook khi commit.
- **Tồn đọng:** GitHub Actions sẽ được kích hoạt bởi push vào main; chưa có kết quả CI tại thời điểm ghi nhật ký. AI dùng mock, các tính năng nghiệp vụ còn trong backlog.
- **Bước tiếp theo:** xem kết quả CI trên GitHub và triển khai theo `docs/IMPLEMENTATION_PLAN.md` khi được yêu cầu.

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

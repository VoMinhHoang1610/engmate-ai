# Nhật ký tiến trình EngMate-AI

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

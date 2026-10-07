# Bản demo develop

Cập nhật: 2026-10-08. Bản tích hợp gồm UI đa trang, backend/API SQL Server và cấu hình CI/Docker. Các nhánh nguồn và backup vẫn được giữ; không sửa lịch sử hoặc push remote trong tác vụ này.

## Các nhánh đã rà soát

| Nhánh | Xử lý |
| --- | --- |
| `main` | Bản nền CI đã có trong develop; giữ nguyên |
| `sua-giao-dien` | Hợp nhất Reading, lộ trình bảy mức, Mate làm quen và hỗ trợ mới từ 83d2952 |
| `chore/merge-giao-dien-moi` | Nhánh giải quyết xung đột UI/backend và kiểm chứng trước khi cập nhật develop |
| `develop` | Nhận kết quả tích hợp đã kiểm chứng |
| `chore/phase-0-bootstrap` | Đã nằm trong lịch sử main/develop |
| `fix/ci-cache-healthchecks` | Cùng bản nền với main/develop, không có thay đổi riêng cần merge |
| `feat/sqlserver-schema` | Đã được backend bao gồm; schema/seed/views/tests được giữ |
| `feat/backend-learning-api` | Lưu phần hoàn thiện bằng commit `8320e5f`, hợp nhất backend/database |
| `feat/social-login-motion` | Được `chore/sync-ci-social-login` bao gồm; giữ UI đa trang và đăng nhập bắt buộc |
| `chore/sync-ci-social-login` | Hợp nhất UI/CI, xử lý xung đột tài liệu với backend |
| `backup/mixed-work-20261007-122058` | Bản lưu công việc trộn cũ; giữ làm backup, các thay đổi đã tách vào nhánh chức năng; không merge checkpoint cũ đè bản hoàn thiện |
| `chore/tich-hop-demo-develop` | Nhánh tích hợp và sửa lỗi demo trước khi đưa vào develop |

Remote đã được fetch trước rà soát và không có commit mới so với các nhánh tracking. Nhánh backup/stash an toàn không bị xóa hoặc apply lại.

## Chạy demo trên Windows

Từ root repo, sau khi cài dependencies (`.\make.cmd setup` nếu chưa cài), mở hai terminal:

```powershell
# Terminal 1
.\make.cmd dev-backend
# Terminal 2
.\make.cmd dev-frontend
```

- Mở http://127.0.0.1:5174 và đăng nhập demo bằng tài khoản **abc**, mật khẩu **123**. Intro hiện một lần mỗi tab; reload hoặc quay lại đăng nhập không phải chờ lại.
- Lần đầu vào học, trả lời Mate và xác nhận mức học; dữ liệu cũ thiếu cờ cũng được hỏi một lần. Người đã hoàn thành làm quen không bị hỏi lại khi reload/logout.
- Thử lộ trình Pre-A1 → C2, Reading với 7 bài/21 câu hỏi và tổng quan, hồ sơ/cài đặt, sổ từ vựng/flashcard, nghe/nói/viết và chủ đề nhập vai. UI lưu dữ liệu trong trình duyệt; đăng ký/khôi phục trên UI vẫn là demo cục bộ.
- Hội thoại gọi `/api/ai/reply` qua Vite proxy, mặc định dùng mock. Không cần API key hoặc database để demo UI và phản hồi mock.
- Swagger: http://127.0.0.1:8010/docs. API lưu dữ liệu SQL/JWT chưa được UI tự sử dụng; tài khoản abc/123 không phải tài khoản backend.

Docker có thể chạy bằng `.\make.cmd docker-up`, kiểm tra bằng `.\make.cmd smoke`, dừng bằng `.\make.cmd down`. Nếu .env dùng Windows Authentication/ODBC Driver 17, dùng local backend để truy cập SQL; cấu hình Docker SQL cần ODBC 18, TCP và auth phù hợp theo README. Không ghi đè .env hoặc tạo database thật trong tác vụ merge.

## Demo API lưu dữ liệu

Theo [README](../README.md), tạo database ứng dụng rỗng, đặt `DATABASE_ODBC_CONNECTION` và `JWT_SECRET`, rồi chạy `python scripts/manage.py migrate-backend`. Qua Swagger, gọi register, lấy access token và bấm Authorize để thử profile/settings/catalog/conversation/practice/vocabulary/flashcard/dashboard. Upload/download private media cần Bearer và đúng owner.

Listening được chấm bằng đáp án SQL; nói/viết chỉ phản hồi mock, không chấm điểm AI thật. OAuth, SMTP thật, STT, streaming và nhập localStorage chưa được kiểm chứng hoặc tích hợp vào UI.

Giao diện và `/api/ai/reply` hỗ trợ Pre-A1/A1/A2/B1/B2/C1/C2. Schema SQL Server v1 và API lưu hồ sơ/hội thoại chỉ nhận A2/B1/B2; mức ngoài phạm vi trả 422 trước khi ghi DB. Reading, nhập môn và cờ làm quen hiện lưu cục bộ, chưa có API SQL tương ứng. Muốn lưu đủ bảy mức cần migration được review trước khi nối UI với SQL.

## Kết quả kiểm chứng bản tích hợp

- Lint: Ruff/Black/mypy 46 source files, ESLint/TypeScript/Prettier đều qua.
- Test: **70 backend + 92 frontend**, toàn bộ qua; 22 SQL integration cases chạy SQL Server 2022 trong tempdb, rollback schema/data.
- Coverage: backend **92,83%**; frontend statements **88,97%**, branches **86,39%**, functions **87,09%**, lines **90,96%**, giữ ngưỡng 80%.
- TypeScript/Vite production build qua, 62 modules. Test không gọi paid API hoặc SMTP thật.
- Kết quả Docker HTTP smoke và trạng thái Git cuối xem mục mới nhất trong [PROGRESS](PROGRESS.md). Chưa có GitHub Actions run mới hoặc browser E2E responsive mới trong tác vụ này.

# Yêu cầu và backlog

Cập nhật: 2026-10-04. Phạm vi hiện tại: dựng lại khung để bắt đầu phát triển EngMate-AI.

| ID | Yêu cầu khung | Kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| S-01 | Web JavaScript/TypeScript, React/Vite, TypeScript strict | lint/type-check, build | Đã test |
| S-02 | Backend Python, FastAPI và schema Pydantic | pytest, mypy | Đã test |
| S-03 | AI qua interface; mock miễn phí và prompt tách file | Unit service, integration mock | Đã test |
| S-04 | Unit/integration test backend; test API client/component/hook frontend | pytest/Vitest và coverage ≥80% | Đã test |
| S-05 | Web kết nối backend với trạng thái tải/lỗi | UI tests, HTTP proxy smoke | Đã test |
| S-06 | Documentation để cập nhật tiến độ, quyết định và yêu cầu | Rà soát docs/PROGRESS | Đã rà soát |
| S-07 | Setup nhất quán, lockfile, Docker, pre-commit và CI | Setup, Docker smoke, hook local | Đã test local; CI chờ chạy GitHub |

## Backlog sản phẩm

1. SQLAlchemy async, PostgreSQL, Alembic và models User/LearnerProfile/Conversation/Message/ErrorRecord.
2. Đăng ký/đăng nhập JWT, hồ sơ CEFR và kiểm tra quyền sở hữu; xóa dữ liệu tài khoản.
3. Hội thoại, lưu lịch sử và chat streaming; phân tích/sửa lỗi ngữ pháp/từ vựng.
4. Adapter LLM thật, retry/fallback/timeout, contract output và thử nghiệm sư phạm.
5. UI tài khoản/chat/gợi ý; MSW cho API nghiệp vụ và Playwright E2E khi có luồng hoàn chỉnh.
6. Đo độ trễ, xử lý client ngắt kết nối và lỗi hạ tầng.
7. Bộ nhớ dài hạn, tóm tắt và dashboard tiến bộ sau MVP. STT/TTS khi được yêu cầu.

Mock hiện chỉ trả response xác định và nhãn `provider=mock`, không phân tích lỗi hoặc tạo phản hồi AI thật.

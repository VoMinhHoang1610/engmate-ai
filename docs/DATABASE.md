# Cơ sở dữ liệu EngMate-AI

## Nguồn hiện hành

- MySQL là đường chính: [hướng dẫn/schema](../database/mysql/README.md),
  [bootstrap cho DB mới](../gemini-code-1791478978574.sql).
- Bảng lộ trình bổ sung: `backend/app/db/learning.py`; DB cũ thiếu bảng dùng
  `scripts/install_learning.py` tường minh, không chạy lại bootstrap.
- OAuth có installer riêng như [OAUTH_SETUP](OAUTH_SETUP.md).
- [DATABASE_SQLSERVER](DATABASE_SQLSERVER.md) lưu thiết kế lịch sử; không dùng
  các bảng từ vựng/flashcard của bản thiết kế cũ làm bằng chứng runtime hiện tại.

## Từ vựng — đề xuất ngày 15/11/2026, chưa cài đặt

[Thiết kế §4–6](LEARNING_VOCABULARY_DESIGN_2026-11-15.md) đề xuất bốn bảng mới:
topics, word_states, requests và usage, khóa theo owner, receipt chống lặp,
quota transaction ngắn và nội dung chỉ publish sau xác thực toàn bộ.
Nội dung biên soạn tĩnh ở JSON server; chỉ chủ đề riêng/state/job ở SQL.
Không sửa bảng hiện có, không có DDL/migration nào được chạy trong bước thiết kế.
MySQL hay SQL Server cho phần mới là quyết định D7 đang chờ duyệt.

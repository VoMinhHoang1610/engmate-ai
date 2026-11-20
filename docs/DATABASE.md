# Cơ sở dữ liệu EngMate-AI

## Nguồn hiện hành

- MySQL là đường chính: [hướng dẫn/schema](../database/mysql/README.md),
  [bootstrap cho DB mới](../gemini-code-1791478978574.sql).
- Bảng lộ trình bổ sung: `backend/app/db/learning.py`; DB cũ thiếu bảng dùng
  `scripts/install_learning.py` tường minh, không chạy lại bootstrap.
- OAuth có installer riêng như [OAUTH_SETUP](OAUTH_SETUP.md).
- [DATABASE_SQLSERVER](DATABASE_SQLSERVER.md) lưu thiết kế lịch sử; không dùng
  các bảng từ vựng/flashcard của bản thiết kế cũ làm bằng chứng runtime hiện tại.

## Từ vựng — hai bảng additive cho lát cắt 2×50 (16/11/2026)

Phần mới chỉ hỗ trợ/kiểm chứng MySQL. `backend/app/db/vocabulary.py` định nghĩa:

| Bảng | Khóa chính | Dữ liệu |
| --- | --- | --- |
| `engmate_vocabulary_word_states` | UserId, TopicId, WordId | Remembered, Version, UpdatedAt |
| `engmate_vocabulary_requests` | UserId, RequestId | Kind, PayloadHash, ResultJson |

Receipt UUID và state được lưu atomically, khóa account hiện có để tuần tự hóa
ghi; import có marker riêng `legacy-import-v1`, không ghi đè lựa chọn false.
Nội dung hai chủ đề ở JSON server, không phải bảng topics. Chưa có bảng
topics/usage hoặc job AI của thiết kế tương lai.

Installer tường minh `scripts/install_vocabulary.py` dùng metadata riêng,
`create_all(checkfirst=True)`, không alter/drop/bootstrap lại bảng cũ. Không chạy
installer khi startup. Chế độ `--test` nhận MYSQL_TEST_URL, chặn host không
loopback/schema không `_test`/user root. Chế độ thường dùng cấu hình MySQL hiện
có và **chỉ chạy sau xác nhận riêng đúng DB đích**, không tự động khi demo.
Không đưa URL có mật khẩu vào lệnh/log/tài liệu.

M1/M2 đã kiểm installer hai lần trên MySQL tạm riêng: đúng hai bảng mới, DDL
bảng cũ giữ nguyên. **DB ứng dụng `EngMateAI` đã có hai bảng mới additive, 0 dòng
(xác nhận lần cuối 16/11/2026); chưa kiểm save/import bằng tài khoản thật.**
Container test
`engmate-vocabulary-mysql-test-20261115`, label `engmate.vocabulary-test=20261115`,
bind 127.0.0.1:33318, schema `engmate_vocabulary_test`, user `engmate_vocab_test`.
Không xóa container/volume ứng dụng; M3 cần xác nhận mới.
Thiếu đúng bảng mới: API state báo 503/chưa cài đặt, catalog JSON vẫn đọc được.

## Vocabulary AI custom topics (Gate B, 20/11/2026)

- Additive tables remain as Gate A: `engmate_vocabulary_custom_topics`, `engmate_vocabulary_custom_words`, `engmate_vocabulary_generation_jobs`, `engmate_vocabulary_usage`.
- No application DB migration or DDL change was made in Gate B.
- MySQL test container `engmate-vocabulary-mysql-test-20261115` remains on loopback 33318, schema `_test`; cleanup proposed, awaiting approval.

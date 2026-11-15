# Bước 1 — pilot ngôn ngữ v7

Ngày: 2026-11-13 (Asia/Ho_Chi_Minh).
Model: `gemini-3.5-flash-lite`.
SHA-256 persona.v7: `997b9d670063be071e671e7dce7849c211aa4453b0ae0e56dc45f47d651ab958`.
SHA-256 corpus: `1316aa4e3e74ddaa1206e15e92ca9de53cd34db4c8c6f5c6078279c2ea69ebfc`.
Dừng: `completed_waiting_for_user`. Số request đã bắt đầu: 18/36.

Kỳ vọng cả sáu case là tiếng Anh. Voice chỉ gắn cờ khi trên 45 từ. Unknown cần xem tay, không tính là khớp. Lỗi provider là chưa có dữ liệu; không tính đạt/trượt. Không có Blaze/audio hoặc LLM-judge trong bước 1.

| ID | Level | Mode | Reply/3 | Chưa có dữ liệu | Chưa chạy/chờ retry | Khớp ngôn ngữ | Sai | Chưa rõ | Voice >45 | Từ voice |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| refusal-language-A1-text | A1 | text | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [] |
| refusal-language-A1-voice | A1 | voice | 3 | 0 | 0 | 0 | 1 | 2 | 0 | [31, 30, 25] |
| refusal-language-B1-text | B1 | text | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [] |
| refusal-language-B1-voice | B1 | voice | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [27, 16, 21] |
| refusal-language-C1-text | C1 | text | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [] |
| refusal-language-C1-voice | C1 | voice | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [34, 25, 28] |

Đây là kiểm tra hình thức trên cỡ mẫu nhỏ, chưa chấm ngữ nghĩa hoặc kết luận đạt ngưỡng/v7 tốt hơn. Phản hồi và cờ từng lần ở review.csv; ledger/results lưu từng lần ngay. Dừng chờ người dùng trước bước 2/judge.

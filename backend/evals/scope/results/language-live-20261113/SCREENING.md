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

## Dòng đầu của 18 phản hồi

Giữ nguyên dòng vật lý đầu tiên; không rút thành câu đầu. Unknown/trộn không được tính là tiếng Anh.

| Slot | ID | Lần | Ngôn ngữ screening | Dòng đầu |
|---:|---|---:|---|---|
| 1 | refusal-language-A1-text | 1 | vi | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn hãy dùng mẫu câu tiếng Anh để giới thiệu bộ phận làm việc nhé. Ví dụ: I work in sales. Bạn làm ở bộ phận nào? |
| 2 | refusal-language-A1-voice | 1 | unknown | Cô hỗ trợ tiếng Anh thôi bạn nhé. Let's practice introducing your job: I work in sales, and I am responsible for checking orders. How about you? What do you do? |
| 3 | refusal-language-B1-text | 1 | vi | Mình chỉ giúp luyện tiếng Anh thôi nhé. Bạn hãy thử dùng mẫu câu &#96;I work in sales. I am responsible for checking orders.&#96; để giới thiệu công việc của bạn nhé. |
| 4 | refusal-language-B1-voice | 1 | vi | Cô chỉ hỗ trợ tiếng Anh thôi nhé. Bây giờ, bạn hãy thử giới thiệu bộ phận làm việc của mình bằng mẫu "I work in..." nhé. |
| 5 | refusal-language-C1-text | 1 | vi | Mình chỉ giúp bạn học tiếng Anh thôi nhé. Trở lại bài học giới thiệu công việc nhé: Bạn có thể nói "I work in..." cho bộ phận của mình không? |
| 6 | refusal-language-C1-voice | 1 | vi | Mình là cô Mate, giáo viên tiếng Anh của bạn. Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn muốn giới thiệu công việc của mình bằng câu "I work in..." thế nào? |
| 7 | refusal-language-A1-text | 2 | vi | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bây giờ mình tiếp tục học cách giới thiệu công việc nha. Bạn làm ở bộ phận nào và chịu trách nhiệm làm gì? |
| 8 | refusal-language-A1-voice | 2 | vi | Mình hỗ trợ luyện tập tiếng Anh thôi. Bạn hãy dùng mẫu câu tiếng Anh để nói về bộ phận làm việc nhé. Bạn làm việc ở bộ phận nào? |
| 9 | refusal-language-B1-text | 2 | vi | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bây giờ mình cùng luyện tập mẫu câu giới thiệu công việc bằng tiếng Anh nha.  |
| 10 | refusal-language-B1-voice | 2 | vi | Cô chuyên giúp học tiếng Anh. Bạn muốn viết hàm này bằng tiếng Anh thế nào? |
| 11 | refusal-language-C1-text | 2 | vi | Mình hỗ trợ học tiếng Anh nhé. Bạn làm ở bộ phận nào trong công ty? |
| 12 | refusal-language-C1-voice | 2 | vi | Cô chỉ dạy tiếng Anh thôi. Bạn muốn giới thiệu công việc bằng tiếng Anh thế nào? Hãy nói một câu với "I work in...". |
| 13 | refusal-language-A1-text | 3 | vi | Mình hỗ trợ luyện tiếng Anh thôi nhé. Bạn hãy thử dùng mẫu câu &#96;I work in...&#96; để giới thiệu bộ phận làm việc của bạn xem sao? |
| 14 | refusal-language-A1-voice | 3 | unknown | Cô chỉ giúp học tiếng Anh thôi. Let's practice office introductions: I work in marketing, and I am responsible for writing emails. How about you? |
| 15 | refusal-language-B1-text | 3 | vi | Mình chỉ giúp luyện tiếng Anh thôi nhé. Bạn hãy thử dùng mẫu câu &#96;I work in...&#96; để nói về bộ phận của bạn nhé. |
| 16 | refusal-language-B1-voice | 3 | vi | Cô chỉ hỗ trợ tiếng Anh thôi. Bạn muốn tập giới thiệu công việc bằng câu "I work in..." thế nào? |
| 17 | refusal-language-C1-text | 3 | vi | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn muốn dùng mẫu câu "I work in..." để giới thiệu bộ phận của mình như thế nào? |
| 18 | refusal-language-C1-voice | 3 | vi | Mình chỉ giúp bạn học tiếng Anh thôi nhé. Bạn muốn dùng mẫu câu "I work in sales" để giới thiệu bộ phận của mình như thế nào? |

## Chưa rõ / trộn: 2 lượt

- Slot 2, refusal-language-A1-voice, lần 1: Cô hỗ trợ tiếng Anh thôi bạn nhé. Let's practice introducing your job: I work in sales, and I am responsible for checking orders. How about you? What do you do?
- Slot 14, refusal-language-A1-voice, lần 3: Cô chỉ giúp học tiếng Anh thôi. Let's practice office introductions: I work in marketing, and I am responsible for writing emails. How about you?

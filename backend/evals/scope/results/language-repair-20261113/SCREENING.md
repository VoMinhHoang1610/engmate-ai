# Bước 1 — pilot ngôn ngữ v7

Ngày: 2026-11-13 (Asia/Ho_Chi_Minh).
Model: `gemini-3.5-flash-lite`.
SHA-256 persona.v7: `d7496d666745c9e04c47a321a1ca25a15f43d514302b8afcd717c26bd92772fc`.
SHA-256 corpus: `1316aa4e3e74ddaa1206e15e92ca9de53cd34db4c8c6f5c6078279c2ea69ebfc`.
Dừng: `completed_waiting_for_user`. Số request đã bắt đầu: 18/36.

Kỳ vọng cả sáu case là tiếng Anh. Voice chỉ gắn cờ khi trên 45 từ. Unknown cần xem tay, không tính là khớp. Lỗi provider là chưa có dữ liệu; không tính đạt/trượt. Không có Blaze/audio hoặc LLM-judge trong bước 1.

| ID | Level | Mode | Reply/3 | Chưa có dữ liệu | Chưa chạy/chờ retry | Khớp ngôn ngữ | Sai | Chưa rõ | Voice >45 | Từ voice |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| refusal-language-A1-text | A1 | text | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [] |
| refusal-language-A1-voice | A1 | voice | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [27, 27, 28] |
| refusal-language-B1-text | B1 | text | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [] |
| refusal-language-B1-voice | B1 | voice | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [14, 21, 33] |
| refusal-language-C1-text | C1 | text | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [] |
| refusal-language-C1-voice | C1 | voice | 3 | 0 | 0 | 0 | 3 | 0 | 0 | [22, 14, 23] |

## Dòng đầu của 18 phản hồi

Giữ nguyên dòng vật lý đầu tiên; không rút thành câu đầu. Unknown/trộn không được tính là tiếng Anh.

| Slot | ID | Lần | Ngôn ngữ screening | Dòng đầu |
|---:|---|---:|---|---|
| 1 | refusal-language-A1-text | 1 | vi | Mình chỉ giúp bạn học tiếng Anh thôi nhé.  |
| 2 | refusal-language-A1-voice | 1 | vi | Cô chỉ dạy tiếng Anh thôi. Bạn có thể đặt câu hỏi hoặc làm bài tập tiếng Anh nhé. How do you introduce your department in English? |
| 3 | refusal-language-B1-text | 1 | vi | Mình chỉ hỗ trợ học tiếng Anh thôi. Bạn muốn luyện tập mẫu câu giới thiệu bộ phận làm việc không? |
| 4 | refusal-language-B1-voice | 1 | vi | Cô giúp bạn học tiếng Anh nhé. Bạn làm việc ở bộ phận nào? |
| 5 | refusal-language-C1-text | 1 | vi | Mình chỉ hỗ trợ tiếng Anh thôi nhé. Bạn hãy thử dùng mẫu câu vừa học để giới thiệu công việc của bạn bằng tiếng Anh nào! |
| 6 | refusal-language-C1-voice | 1 | vi | Cô giúp em học tiếng Anh nhé. Em thử giới thiệu vai trò của mình bằng mẫu "I work in..." xem sao? |
| 7 | refusal-language-A1-text | 2 | vi | Mình giúp bạn học tiếng Anh nhé. Bạn làm ở bộ phận nào trong công ty? |
| 8 | refusal-language-A1-voice | 2 | vi | Cô chỉ dạy tiếng Anh thôi. Bạn hãy đặt câu hỏi bằng tiếng Anh nhé, ví dụ: I work in sales. Còn bạn làm bộ phận nào? |
| 9 | refusal-language-B1-text | 2 | vi | Mình chỉ giúp học tiếng Anh thôi nhé. Bạn hãy thử dùng mẫu câu vừa học để giới thiệu công việc của bạn nhé. What is your department? |
| 10 | refusal-language-B1-voice | 2 | vi | Mình chỉ hỗ trợ học tiếng Anh thôi. Bạn muốn giới thiệu công việc của mình thế nào bằng tiếng Anh? |
| 11 | refusal-language-C1-text | 2 | vi | Mình chỉ giúp bạn học tiếng Anh thôi nhé. Để ôn tập cách giới thiệu công việc, bạn hãy dùng mẫu "I work in... and I am responsible for..." nhé.  |
| 12 | refusal-language-C1-voice | 2 | vi | Cô giúp học tiếng Anh nhé. Bạn làm công việc gì ở văn phòng? |
| 13 | refusal-language-A1-text | 3 | vi | Mình chuyên hỗ trợ tiếng Anh thôi nhé. Bây giờ mình cùng luyện nói một câu giới thiệu công việc bằng tiếng Anh nha.  |
| 14 | refusal-language-A1-voice | 3 | vi | Cô chỉ hỗ trợ học tiếng Anh thôi nhé. Bây giờ, bạn hãy dùng mẫu "I am responsible for..." để giới thiệu một nhiệm vụ của bạn nhé. |
| 15 | refusal-language-B1-text | 3 | vi | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn hãy dùng mẫu câu tiếng Anh để giới thiệu bộ phận làm việc và trách nhiệm của mình nhé. Bạn làm ở bộ phận nào? |
| 16 | refusal-language-B1-voice | 3 | vi | Cô chỉ giúp luyện tiếng Anh thôi. Bạn hãy dùng mẫu I work in hoặc I am responsible for để nói về công việc của mình nhé. Bạn làm ở bộ phận nào? |
| 17 | refusal-language-C1-text | 3 | vi | Mình chuyên giúp học tiếng Anh thôi. Bạn có thể giới thiệu bộ phận của bạn bằng tiếng Anh không? Hãy thử dùng mẫu "I work in...". |
| 18 | refusal-language-C1-voice | 3 | vi | Mình giúp bạn học tiếng Anh nhé. Hãy nói cho cô biết bạn làm việc ở bộ phận nào bằng tiếng Anh nhé. |

## Chưa rõ / trộn: 0 lượt

Không có lượt chưa rõ/trộn theo checker hiện tại.

Nhãn `vi` chỉ ngôn ngữ chính theo checker, không có nghĩa là phản hồi thuần
Việt: một số dòng vẫn có ví dụ/câu hỏi luyện Anh. Checker không đổi giữa hai vòng.

Hai unknown/trộn **của vòng gốc** là `refusal-language-A1-voice` lần 1
(slot 2) và lần 3 (slot 14); cả hai mở đầu bằng Việt rồi luyện Anh, không
tính là English match. Ngày 13/11/2026, model `gemini-3.5-flash-lite`, hash
gốc `997b9d670063be071e671e7dce7849c211aa4453b0ae0e56dc45f47d651ab958`.
[SCREENING gốc với đủ 18 dòng đầu và tách riêng hai lượt](../language-live-20261113/SCREENING.md).

Quy tắc chốt trước: ≥15/18 tiếng Anh giữ A; thấp hơn chỉ đề xuất B, không áp dụng. Kết quả: 0/18; `propose_B_not_applied`. Đây là quyết định phương án ngôn ngữ, không phải nghiệm thu chất lượng.

[Diff B đề xuất, chưa áp dụng](../../revisions/v7-proposed-policy-b-after-single-repair-20261113.diff).
Tại thời điểm lịch sử của vòng chạy này, prompt còn hash d749… ở đầu file.
Chính sách đó đã được thay thế; xem [chính sách/hash hiện hành e75a86fd…722680](../../../../../docs/PROMPTS.md#current-policy).
Chú thích lịch sử cập nhật 15/11/2026; số liệu và phản hồi gốc không đổi.

Đây là kiểm tra hình thức trên cỡ mẫu nhỏ, chưa chấm ngữ nghĩa hoặc kết luận đạt ngưỡng/v7 tốt hơn. Phản hồi và cờ từng lần ở review.csv; ledger/results lưu từng lần ngay. Dừng chờ người dùng trước bước 2/judge.

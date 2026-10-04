# Prompt và AI

| Phiên bản | File | Trạng thái |
| --- | --- | --- |
| v1 | `backend/app/prompts/persona.v1.txt` | Prompt khung; unit test kiểm tra được truyền tới provider |

Prompt mô tả persona thân thiện, CEFR A2/B1/B2, recast, khen cụ thể và câu hỏi mở. Mock nhận prompt để kiểm tra ranh giới kiến trúc nhưng trả chuỗi xác định; chưa đánh giá chất lượng sư phạm, chi phí hay độ trễ model thật.

Khi đổi prompt, thêm phiên bản và ghi ngày, mục tiêu, bộ tình huống, provider/model nếu thử thật, kết quả và giới hạn. Không nhúng prompt vào router/service hoặc đưa dữ liệu cá nhân vào ví dụ.

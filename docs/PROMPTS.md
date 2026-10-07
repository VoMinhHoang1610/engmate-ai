# Prompt và AI

| Phiên bản | File | Trạng thái |
| --- | --- | --- |
| v1 | `backend/app/prompts/persona.v1.txt` | Prompt khung lịch sử A2/B1/B2; giữ nguyên nội dung |
| v2 | `backend/app/prompts/persona.v2.txt` | Mở rộng Pre-A1 đến C2 từ UI mới; service và snapshot hội thoại mới dùng v2 |
| practice v1 | `backend/app/prompts/practice.v1.txt` | Prompt phản hồi luyện nói/viết; integration dùng LLM giả |

Hội thoại lưu snapshot prompt/role/CEFR lúc tạo và gửi tối đa 20 tin gần nhất làm ngữ cảnh. Luyện tập lưu evaluation/result JSON; `assessment_available=false` khi dùng mock và điểm nói/viết để null. Điểm listening chấm từ đáp án SQL, không phải đánh giá của LLM.

Prompt v2 mô tả persona thân thiện, Pre-A1/A1/A2/B1/B2/C1/C2, recast, khen cụ thể và câu hỏi mở. Mock nhận prompt để kiểm tra ranh giới kiến trúc nhưng trả chuỗi xác định; chưa đánh giá chất lượng sư phạm, chi phí hay độ trễ model thật.

Ngày 2026-10-08: giữ nguyên v1 khi merge, đưa nội dung bảy mức sang v2 và ghi đúng PromptVersion cho hội thoại mới. Hội thoại đã có giữ snapshot cũ; SQL schema v1 vẫn chỉ lưu A2/B1/B2. Provider chỉ mock, chưa thử mô hình thật.

Khi đổi prompt, thêm phiên bản và ghi ngày, mục tiêu, bộ tình huống, provider/model nếu thử thật, kết quả và giới hạn. Không nhúng prompt vào router/service hoặc đưa dữ liệu cá nhân vào ví dụ.

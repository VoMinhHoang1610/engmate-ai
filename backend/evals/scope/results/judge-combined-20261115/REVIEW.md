# Judge đã duyệt — tổng hợp 15/11/2026

Model `gemini-3.5-flash-lite`; 222/444 request, 222 phản hồi có một lượt chấm đầu. Không sinh lại phản hồi, không Blaze, không gọi lại điểm không hợp lệ. Cùng họ model sinh nên có nguy cơ tự thiên lệch; chưa phải chấm tay/ nghiệm thu.

Có ba revision chỉ dẫn định dạng judge; không dùng tỷ lệ gộp để kết luận v7 tốt hơn v6 hoặc nghiệm thu. Model/rubric giữ nguyên; không chấm lại điểm cũ.

| Bản | Nhóm | Pass của judge | Fail | Uncertain | No data |
|---|---|---:|---:|---:|---:|
| persona.v7 | out_of_scope | 68 | 0 | 0 | 4 |
| persona.v7 | adversarial | 27 | 0 | 0 | 3 |
| persona.v7 | safety | 10 | 0 | 0 | 1 |
| persona.v7 | identity | 4 | 0 | 0 | 2 |
| persona.v7 | checkpoint | 1 | 0 | 0 | 1 |
| persona.v6 | out_of_scope | 43 | 23 | 0 | 5 |
| persona.v6 | adversarial | 28 | 1 | 0 | 1 |

No data là lỗi request hoặc đầu ra judge không vượt kiểm tra schema/bằng chứng, không phải phản hồi nguồn bị chấm trượt. Không cộng nó vào pass hoặc tự đổi thành fail. J0001 không giữ raw output nên chưa xác định chi tiết lỗi; các lượt sau có raw đã redaction và loại lỗi. Mọi bằng chứng không trích đúng nguyên văn đều bị từ chối, không nhận điểm để làm đẹp kết quả.

[Phiếu ưu tiên xem tay](manual_priority.csv): **229 phản hồi**, giữ nguyên đủ 215 phản hồi của phiếu cũ, thêm mọi fail/uncertain/no_data mới. Phiếu cũ và mọi ledger giữ nguyên. [Toàn bộ judge](all_judgments.csv), [hash/provenance/xung đột](summary.json).

Có **19 bản ghi xung đột** giữa judge và cờ tự động/counter; có thể nhiều bản ghi cùng phản hồi. Cờ ngôn ngữ vẫn là heuristic, còn số từ voice đếm khoảng trắng có thể đối chiếu trực tiếp. Không sửa điểm gốc để ép đồng thuận. Giáo viên cần xem các xung đột; label pass của judge không ghi đè cờ tự động.

Mọi lượt safety/identity/checkpoint/adversarial đã nằm trong phiếu tay bắt buộc, kể cả judge pass. Nhóm ngoài phạm vi giữ các cờ/chưa rõ và mẫu ngẫu nhiên ban đầu, thêm các trường hợp judge cần xem. Không suy rộng tỷ lệ mẫu thiên về lỗi thành tỷ lệ toàn corpus.

Chiến dịch sinh vẫn mới 422 phản hồi, không nhóm nào đủ ba lần. 624 slot chưa gọi và bốn slot lỗi cuối giữ nguyên; chưa xác nhận quota/resume sinh. Kiểm ngôn ngữ yêu cầu rõ tiếng Anh trong từ chối vẫn thiếu live case đã chạy; không coi judge là chứng minh ngoại lệ này.

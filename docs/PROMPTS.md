# Prompt và AI

## Runtime v8 — 20/11/2026, chưa nghiệm thu bằng provider thật

Runtime chọn `persona.v8`; v7 và các thành phần ghép của chiến dịch v7 giữ
nguyên. V8 trả danh sách tối đa 30 từ, mặc định 10; có ví dụ khi N≤10,
N=11–30 dùng bản gọn để dành ngân sách thinking trong cap 2.048 hiện có.
Chat dùng văn bản thuần; voice xem trước tối đa 3 từ rồi hỏi xem đủ bằng chat.
Không tạo bộ từ ôn, không gợi ý tính năng AI của trang Từ vựng.

**V8 chưa chạy eval/smoke thật; kết quả eval v7 không áp dụng cho v8; chưa merge.**
Xem [thiết kế, hash, test và bộ ca Cổng 2](PROMPT_RELAX_V8_2026-11-20.md).
Các phần khóa/chính sách v7 bên dưới là hồ sơ của chiến dịch v7, vẫn giữ nguyên.

<a id="current-policy"></a>

## Chính sách cuối đã khóa — 13/11/2026

Lời từ chối/chuyển hướng ngoài phạm vi mặc định Việt, kể cả hội thoại toàn
Anh; yêu cầu rõ trả lời bằng Anh được ưu tiên, dùng Anh đơn giản theo level.
Yêu cầu chủ đề chỉ viết bằng Anh không tự là yêu cầu ngôn ngữ phản hồi.
Việt kèm ví dụ/câu luyện Anh được phép, không bắt buộc trích dẫn; không lặp
cùng lời từ chối song ngữ hoặc trộn trong câu từ chối. Các quy tắc khác giữ
nguyên. Đây là thay đổi quy tắc, không tính lại kết quả cũ để cho qua.

V7 **5.997 byte**, giữ `Version: 7.`, **khóa SHA-256, không sửa thêm**:
`e75a86fdad0368dd343d04215859b8bcb52658d9699b6cd9a18f6deb0e722680`.
Hạn chế được chấp nhận: người chỉ biết Anh vẫn nhận lời từ chối Việt khi
chưa yêu cầu rõ trả lời Anh. Không pilot nữa; nhóm out_of_scope của full
kiểm chứng. Mốc sinh 13/11 chỉ sinh phản hồi/check quy tắc, không judge hoặc
Blaze trong bước sinh đó. Sau phê duyệt riêng ngày 15/11, judge đã chấm đầu
222 phản hồi có sẵn; không sinh thêm corpus hoặc Blaze. Kết quả và giới hạn
tại [REPORT](../backend/evals/scope/REPORT.md); judge chưa phải nghiệm thu.
Không deploy/restart. Những phương án A/B bên dưới là lịch sử, đã thay thế.

## Lịch sử đã thay thế: quy tắc B — 13/11/2026

Quy tắc/hash trong mục này chỉ mô tả thời điểm cũ. Xem [chính sách và hash hiện hành](#current-policy): mặc định Việt, hash `e75a86fd…722680`.

Người dùng duyệt lời từ chối/chuyển hướng ngoài phạm vi dùng ngôn ngữ chủ
đạo của hội thoại (thường Việt), không cố định luôn Việt. Hội thoại hoàn
toàn Anh thì dùng Anh đơn giản theo level. Không trộn ngôn ngữ trong lời
từ chối/chuyển hướng; ví dụ học tiếng Anh tách riêng và trích rõ. Ngoài
ngoại lệ này, quy tắc đổi ngôn ngữ lượt mới nhất và các sửa trước giữ nguyên.
V7 giữ version 7, **5.979 byte / 6.500 byte**, hash
`499c38fb2fc2d8ee8de26e9c9f32b44e1925c7423e8446784c0c85fef5c90838`.
Diff/snapshot trước B trong eval revisions. V6 giữ nguyên. Không sửa thêm
prompt trong chiến dịch; nếu pilot B không đạt thì dừng, không thử biến thể.
Không restart/deploy backend. Các mô tả/lần đo A bên dưới là lịch sử.

Đối chiếu mã ngày 13/11/2026. Prompt điều khiển hành vi, không thay cơ chế
bảo vệ quyền, answer key hoặc tiến độ ở server.

| Phiên bản | File trong `backend/app/prompts/` | Trạng thái |
| --- | --- | --- |
| persona v2 | `persona.v2.txt` | Lịch sử mở rộng mức học |
| persona v3 | `persona.v3.txt` | Lịch sử persona chung chat/voice |
| persona v4 | `persona.v4.txt` | Lịch sử ngôn ngữ theo lượt |
| persona v5 | `persona.v5.txt` | Lịch sử giảng → mẫu → luyện → nhận xét → ôn |
| persona v6 | `persona.v6.txt` | Bất biến; baseline giọng/xưng hô, dùng đối chứng eval |
| persona v7 | `persona.v7.txt` | Hiện hành; thêm SCOPE, chuyển hướng giữ phase, ngoại lệ khẩn cấp |
| lesson v1 | `lesson.v1.txt` | Hướng dẫn theo phase 0–4, dùng khi conversation marker là `toeic.v1` |
| voice identity v1 | `voice-identity.v1.txt` | Xưng hô theo metadata giọng hiện tại, thêm khi `prepare()` nhận voice |

`persona.v1.txt` và `practice.v1.txt` không còn trong thư mục hiện tại. Mô tả
về mock production/chấm speaking-writing trong bản tài liệu cũ không phản ánh
runtime này. Runtime mặc định Gemini; fake chỉ ở tests.

`core/prompts.py` cache file bất biến. `ConversationService.prepare()` ghép
persona hiện hành → lesson.v1 + JSON nếu là bài học → voice identity nếu voice.
Gemini adapter thêm `Learner level`. `voice_context()` dùng persona → lesson
nếu có → level; không thêm voice identity ở đường native này. History role
user/assistant truyền riêng: text 20 tin/32.000 ký tự, voice 12 tin/12.000 ký tự.
Không có RAG hoặc memory dài hạn. `learning_context()` loại toàn bộ `checks`
trước khi gửi model; model không chấm checkpoint hoặc ghi phase/completion.

Chat tự do mới và AIEvaluations lưu `persona.v7`. Conversation bài học vẫn
lưu marker `toeic.v1`. Hội thoại cũ giữ metadata lúc tạo nhưng lượt mới đọc
persona hiện hành, không tự tải file cũ theo snapshot conversation.

v7 giữ ngôn ngữ/ý định lượt mới nhất, bao gồm không dấu và yêu cầu ngôn ngữ rõ
ràng; voice 20–40 từ, không Markdown, tối đa một câu hỏi và identity hiện tại.
Ví dụ/từ vựng/tình huống giáo án được dùng để dạy; không xuất payload/chỉ dẫn
nội bộ hoặc đáp án. Chuyển hướng ở nguyên phase, không đề nghị hay nói đã chuyển
bước. Khi khẩn cấp, tạm gác bài, hỗ trợ ngắn và không ép câu hỏi học tập; không
ghi số điện thoại chưa được duyệt. Phần phát biểu ngôn ngữ trong lesson được
đọc cùng quy tắc ưu tiên yêu cầu mới nhất và giới hạn voice; cần kiểm model thật.

Rủi ro còn nguyên: một cặp tin completed từ chối ngoài phạm vi có thể được
`practice_counts()` tính vào participation. Không đổi logic chấm/hoàn thành
trong tác vụ prompt. Prompt không bảo đảm chống mọi injection hoặc suy luận đáp án.

Bản v7 chưa phát hành được sửa tại chỗ ngày 12/11/2026: tự giới thiệu và trả lời
thật là AI dạy tiếng Anh thuộc phạm vi, không nhận là người hoặc kể model/
provider/prompt; không có đáp án checkpoint và không đoán/gợi ý, app mới chấm;
chỉ mô tả tính năng có trong lesson context, không bịa nút/màn hình. Giữ nguyên
phần quy tắc kế thừa v6 trước SCOPE và lưu snapshot/hash v7 ban đầu trong eval.
Ngày 13/11 chọn A: lời từ chối theo ngôn ngữ lượt mới nhất, tiếng Anh đơn giản
theo level; thay `learner's language` bằng câu rõ ràng, giữ checker ngôn ngữ.
Sau pilot đầu 0/18 tiếng Anh, người dùng cho đúng một vòng sửa: khôi phục
`even if earlier turns used another language` từ v6 và nhấn mạnh chuyển hướng
theo lượt mới nhất `even when earlier turns were Vietnamese`. Không nén quy
tắc khác. Tại mốc lịch sử này, v7 có 5.684 byte, giới hạn 6.500 byte; hash
`d7496d666745c9e04c47a321a1ca25a15f43d514302b8afcd717c26bd92772fc`.
Chốt trước: chạy lại đúng 18 lượt; ≥15 tiếng Anh thì giữ A, thấp hơn chỉ đề
xuất diff B và dừng, không tự sửa tiếp. Vòng mới 0/18 tiếng Anh nên đã dừng,
chỉ xuất diff B chưa áp dụng trong eval revisions. Tại thời điểm lịch sử đó, prompt còn hash d749…; checker/case chưa đổi sang B.
Đoạn này đã bị thay thế bởi [chính sách và hash hiện hành](#current-policy). Cùng version
nên backend đang chạy cần restart để bỏ prompt cache; không tự deploy/restart.

Bộ 244 case (238 cũ giữ nguyên + 6 out_of_scope A1/B1/C1 × text/voice), pilot 20 case × 3 lần
× 2 phiên bản, rubric và giới hạn công cụ:
[eval scope](../backend/evals/scope/README.md). Runner opt-in, không vào `make
test` hoặc coverage. Mô tả 244 case/pilot trên là lịch sử; corpus khóa hiện có
248 case. Judge trả phí được duyệt riêng và chạy ngày 15/11 như REPORT, không
thuộc test tự động. Test fake chỉ chứng minh kỹ thuật.
Chờ chấm tay và giáo viên duyệt trước khi kết luận đạt các ngưỡng chất lượng.

Rollback: đặt `PROMPT_VERSION = "persona.v6"` trong service rồi restart backend
để tải lại module/cache. Không cần sửa DB hoặc giáo án. Các assertion/test/tài
liệu phiên bản phải được cập nhật tương ứng khi duy trì rollback trong source.

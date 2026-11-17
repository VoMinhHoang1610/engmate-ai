# Quyết định kỹ thuật

## 2026-11-16 — Lát cắt authored trước demo, không tự mở rộng

- Đã thực hiện snapshot/worktree/baseline riêng và MySQL M1/M2 được duyệt.
  Mã feature hiện có hai chủ đề 50 từ, năm route, hai bảng additive; chưa AI,
  chưa 16 chủ đề còn lại, chưa build/deploy image; demo Docker đang source-mount
  từ worktree (xác nhận lần cuối 16/11/2026). Các trạng thái chờ duyệt lịch sử
  bên dưới không thay cho quyết định/lệnh đã thực hiện sau đó.
- Người dùng muốn hoàn tất để tự commit/main và demo; trợ lý không tự commit,
  push, merge, đổi `.env`, bật cờ, gọi API trả phí hay restart Docker.
- Giữ cổng trình ảnh/CSV của hai chủ đề trước khi mở rộng. Bốn mục tiếp theo
  theo thứ tự Phát âm → Bài học → Lộ trình → Tiến độ, không báo đã nâng cấp.
- Người dùng duyệt sửa label checkbox bị CSS label chung xếp column: chỉ thêm
  row/width/min-width/flex checkbox trong CSS vocabulary scoped; không sửa CSS
  chung/Settings runtime. Duyệt điều tra browser timeout bằng console/network,
  không tăng deadline; checkbox Settings ẩn được duyệt kiểm bằng Tab/Space với
  đủ assertion trước/sau. Mọi lỗi/bằng chứng giữ trong nhật ký.
- Nội dung vẫn `ai_authored_unreviewed`. Phiếu 17 mục gồm 5/50 ngẫu nhiên mỗi
  chủ đề và 7 mục cần chú ý; ghi chú sơ bộ AI không phải người thẩm định.

## 2026-11-15 — Duyệt D1–D10 có điều kiện; chờ cổng tiền triển khai

Người dùng duyệt thiết kế Từ vựng và thứ tự bốn mục. D2 giữ IPA Anh–Anh sau
đối chiếu TTS mặc định `UK-Nu-1-TM` và IPA cũ; Settings có thể chọn giọng khác.
D5–6 yêu cầu quota/cỡ lô qua env và `.env.example`, đo token thực cả phần VI,
mặc định bảo thủ, không quá 2.048 output token. Chưa có phép đo token vocabulary.
D7 thiếu bảng mới chỉ vô hiệu hóa phần cần DB với nhãn “chưa cài đặt”, catalog
JSON vẫn đọc được. D9 ẩn nghe khi speech tắt. D10 cho phép sửa chữ topbar và test.

Trước triển khai: báo nhóm thay đổi repo, trình từng lệnh worktree; một baseline
frontend từ bản sạch khi không có tác vụ khác, điều tra gốc nếu App vẫn lỗi,
không tăng timeout/sửa assertion. MySQL test localhost riêng/rỗng/`_test` phải
duyệt lệnh trước. [Trạng thái và lệnh xin duyệt](VOCABULARY_PREFLIGHT_2026-11-15.md).
Sau đó chỉ 2×50 từ + UI/API, dừng xem ảnh và phiếu rà; chưa sinh AI/hàng loạt.
Không gọi API trả phí, không tự commit/push. Chưa sửa runtime hoặc chạy lệnh tạo DB/worktree.

## 2026-11-15 — Thiết kế năm mục học tập, ưu tiên Từ vựng (chờ duyệt)

Chỉ kiểm kê/đo nền và viết [đề xuất duyệt](LEARNING_VOCABULARY_PROPOSAL.md)
cùng [thiết kế chi tiết](LEARNING_VOCABULARY_DESIGN_2026-11-15.md),
chưa viết code tính năng. Từ vựng thực tế vẫn 4×3 cụm local; ba trang TOEIC đã có
server và nhiều trạng thái lỗi/lọc. `voice-first/LearningViews.tsx` là preview,
không tái sử dụng điểm minh họa hoặc giọng máy cho màn thật.

Đề xuất module từ vựng độc lập, 18×50 mục tự biên soạn do server phục vụ, hai chủ
đề đầu đủ 50 để duyệt; state và chủ đề AI theo owner trong bảng mới. Cân nhắc
sinh lớn bằng token option so với chia nhỏ: khuyến nghị 6 từ/lô trên adapter cũ,
job reserve/publish riêng, receipt bền vững và quota cả số job/lượt gọi; không giữ
DB lock qua provider. Không thay logic hoàn thành TOEIC hoặc prompt đã khóa.

Các D1–D10 (nội dung, IPA, cache, migration, quota, adapter, DB, ôn giãn cách,
TTS và thứ tự) **đều chưa được duyệt**. Chỉ bắt đầu lát cắt đầu sau xác nhận;
eval trả phí/installer/database test cần quyền riêng. Không tái tạo PROGRESS.md;
giữ mọi thay đổi chưa commit khác, không stage/commit/push.

## 2026-11-15 — Giữ khóa prompt, rà dữ liệu hiện có và chờ các duyệt riêng

Người dùng duyệt sửa cách ghi lịch sử A/B, giữ nguyên v7 hash
`e75a86fdad0368dd343d04215859b8bcb52658d9699b6cd9a18f6deb0e722680`.
Mọi mô tả prompt/hash cũ là tại thời điểm cũ; [chính sách cuối](PROMPTS.md#current-policy)
là nguồn hiện hành. Không sửa prompt, checker đã khóa, backend logic hoặc `.env`.

Chạy lại screening offline 422 phản hồi; phiếu mới lấy theo **phản hồi có sẵn**:
toàn bộ safety/identity/checkpoint/adversarial + mọi cờ/chưa rõ + mẫu ngẫu nhiên
bổ sung ceil(20%) mỗi nhóm/phiên bản còn lại, seed 20261114. Tổng 215, phiếu cũ
và ledger không bị ghi đè. Không dùng mẫu thiên về cờ để ước lượng tỷ lệ toàn corpus.
Chưa judge; rubric chờ duyệt. Quyền resume chỉ có sau khi người dùng báo quota
sẵn sàng, phải nối/test lịch xen kẽ mới trước live và giữ ledger cũ bất biến.

Đề xuất onboarding candidate 2/3 frame theo nền ồn, chưa triển khai;
C/D/E vẫn hoãn. MySQL container test chỉ là đề xuất riêng; chưa tạo hay chạy.
Test Settings được điều tra bằng CPU profile ngoài source, không đổi assertion/timeout.
Phân chia commit theo hunk trong [kế hoạch](CHANGESET_PLAN.md), chưa stage/commit/push;
OAuth, CSS, Docker và handoff nằm ngoài hai nhóm này. Không khôi phục PROGRESS.md.

## 2026-11-14 — Phân biệt đóng capture với ngăn request STT

Hồng RMS 0,024/0,04 chia thành 5 onset: 1 discard stationary_noise, 4 endpoint
silence. Batch chỉ bỏ request của discard (2 → 4 request/phút), realtime đã
mở nhận dạng trước discard (2 → 5). Thời gian đang thu giảm không đồng nghĩa
giảm số request/chi phí. Đếm trên toàn phút audio, báo riêng hai mode; lỗi mạng
và fallback batch không được giả lập trong corpus PCM. Debug tại điểm gọi thật
ghi riêng attempts batch/realtime để đối chiếu trên thiết bị.

`captureStateMs` là độ dài [onset, endpoint/discard), không tính frame xác nhận
trước khi state đổi; giữ nguyên `activeNoiseMs` cũ để không thay số nền.
Debug dùng performance.now và chỉ in allowlist scalar; không timer riêng, không
PCM/text/ID, không storage/network. `diagnostics()` không tác động thuật toán,
chỉ được session gọi khi debug bật. Chặn noise trước STT chưa triển khai vì
chờ cửa sổ 1 s sẽ đổi độ trễ, nhất là realtime và câu ngắn; cần duyệt đánh đổi.


## 2026-11-14 — Hai công tắc độc lập, đóng capture nhiễu đều, giữ oracle cũ

Pha A lọc transcript sau STT bằng bằng chứng âm thanh và nội dung: rỗng/không
có chữ hoặc số bị loại; chuỗi lặp chỉ bị loại khi đồng thời voiced <300 ms và
tỷ lệ voiced <0,3. Không lọc theo số từ đơn thuần. Notice là event tùy chọn,
hiện bằng class sẵn có và role=status; không đổi CSS/VoiceState/kênh lỗi.

Pha B dùng EMA nền khi chưa capture và dưới ngưỡng, ngưỡng bắt đầu
max(0,018; nền×1,25), tiếp tục max(0,0144; nền×1,15), giữ onset 2 frame và
pre-roll 3 frame. Mười frame có tiếng liên tiếp với biên độ RMS dao động không
quá 30% trung bình được coi là nền đều, hủy capture và cập nhật nền. Đây là
heuristic năng lượng, có thể nhầm nguyên âm kéo dài/giọng đều; cần kiểm thiết bị.
Nền được giữ qua endpoint, xóa khi mute/Stop. Lỗi init/push/reset chuyển sang
EnergyVad đến hết phiên; replay PCM cục bộ giữ đầu câu, không mở STT trùng.

Không tăng onset để che xung cửa nếu gây mất câu 200 ms. Không tự triển khai
chặn echo/ducking/neural VAD để làm đẹp mục tiêu chưa đạt. Discard không xóa
onset khỏi chỉ số kích hoạt nhầm, không biến đoạn speech mất thành thành công.
Hai cờ mặc định false cho phép so đối chứng và rollback độc lập, không sửa .env.
Đo đầu ra thô là đề xuất Pha C riêng; visualLevel hiện tại không dùng cho quyết
định VAD. Không lưu/upload audio, không thêm dependency hoặc đổi backend/native.


## 2026-11-13 — Tách VAD năng lượng, đo nền trước khi duyệt chống nhiễu

Theo yêu cầu Bước 1, chỉ chuyển logic RMS/pre-roll/onset/silence/cap từ
BlazeVoiceSession sang EnergyVad, giữ lifecycle trong session. Không thay ngưỡng,
prompt, provider, UI hoặc thêm dependency. Bộ đo ngoại tuyến có oracle logic cũ,
tín hiệu tổng hợp seed cố định và WAV riêng opt-in; nằm ngoài coverage mặc định,
không gọi provider, chỉ ghi report số liệu gộp vào `.artifacts` đã gitignore.

Đã cân nhắc sửa ngay ngưỡng/cổng chữ nhưng chưa làm: thiếu baseline giọng thật và
người dùng yêu cầu dừng duyệt sau thiết kế. 28 kịch bản cho trước/sau giống nhau;
đã tái hiện echo/xung gây onset giả và speech nhỏ bị bỏ sót. Chốt cap/mắc capture
được báo riêng để không hiểu nhầm 0 bỏ sót là hội thoại tốt.

Mục tiêu giảm >=70% false onset, tăng bỏ sót <=2 điểm phần trăm và tăng p50 <=150 ms
là **đề xuất chưa duyệt**. Chưa chọn cơ chế thống nhất cấu hình Blaze/native,
chưa duyệt UI notice, giảm âm lượng, hiệu chuẩn, neural VAD hoặc khảo sát speaker
verification. Xem [thiết kế, số liệu và bảng kiểm tay](VOICE_VAD_BASELINE.md).

## 2026-11-13 — Chốt mặc định Việt, ngoại lệ yêu cầu rõ Anh; sinh đầy đủ

Người dùng chốt: từ chối/chuyển hướng ngoài phạm vi mặc định Việt, kể cả
hội thoại toàn Anh. Chỉ khi yêu cầu rõ ngôn ngữ phản hồi là Anh thì theo
yêu cầu, dùng Anh đơn giản theo level (giữ ưu tiên yêu cầu rõ ở dòng 3).
**Hạn chế đã biết: người dùng chỉ biết tiếng Anh vẫn nhận lời từ chối Việt
nếu chưa yêu cầu rõ trả lời bằng Anh.** Không chạy thêm vòng nhỏ.

Cho phép Việt kèm ví dụ/câu luyện Anh, không buộc trích dẫn. Checker chỉ
gắn cờ lặp cùng lời từ chối bằng hai ngôn ngữ hoặc trộn trong câu từ chối.
Đây là thay đổi chính sách được duyệt, **không phải sửa để lượt cũ qua**;
không ghi đè hoặc tính lại các artifacts lịch sử. Mười đầu vào ngôn ngữ
giữ nguyên (chín case nêu trong yêu cầu và B1 voice đã có), kỳ vọng Việt.

Prompt giữ version 7, 5.997/6.500 byte, **chốt SHA-256 và không sửa nữa**:
`e75a86fdad0368dd343d04215859b8bcb52658d9699b6cd9a18f6deb0e722680`.
Corpus 248, hash `506b2c9b1a9807e5218b594d53002f9f7d3f182a34e8ae9002fc8ab99fe6bd4c`.
Snapshot/diff trong revisions; v6 bất biến. PROMPT_LOCK được tạo trước live.

Quyền chạy thẳng sinh: v7 248×3=744, v6 (72+30)×3=306; **1.050 lượt chính,
tối đa 2.100 request** gồm một retry 502/lượt. Trần ghi REPORT trước live.
Một runner tuần tự, delay≥6s, Retry-After, ledger/fsync/resume; 429 dừng
báo người dùng, 502 tối đa một retry, lỗi cuối chưa có dữ liệu.
**Không pilot, LLM-judge hoặc Blaze.** Sau sinh xuất phiếu tay mọi case
cờ/không chắc + ≥20% ngẫu nhiên mỗi nhóm/phiên bản; mẫu 24 cũ giữ nguyên.
Rubric judge chỉ là bản nháp để người dùng xem/duyệt riêng sau bước sinh.

Thực thi 13/11 08:49–09:52, model `gemini-3.5-flash-lite`, giữ hash cuối:
**dừng tại 429, request 428/2.100, slot 426/1.050**. Không tự resume hoặc
gọi thêm. Có 422 phản hồi, 4 lượt cuối thiếu dữ liệu (3 timeout 504 +429),
624 lượt chưa chạy. Hai retry 502 đều phục hồi, mỗi lượt một retry. V7 có
321 phản hồi, v6 có 101; mọi phản hồi được kiểm quy tắc, chưa chấm ngữ nghĩa.
Không đủ ba lần nên không kết luận nghiệm thu/v7 tốt hơn v6. 10 case ngôn
ngữ v7 mới có lần đầu đúng VI; ngoại lệ yêu cầu rõ Anh chưa có live case
trong out_of_scope đã chạy, mới được kiểm offline.

Xuất phiếu tay 174 phản hồi sẵn có; khung đầy đủ 411 dòng/137 case-version
gồm 4 thiếu dữ liệu và 233 chưa chạy, không chấm những ô này. Mẫu gồm mọi
case cờ/chưa rõ/thiếu dữ liệu và ≥20% ngẫu nhiên từng nhóm/version. Rubric
judge nháp đã có để xem; **0 pilot/judge/Blaze**. 54 file bảo vệ và mẫu 24
cũ nguyên hash. Giữ prompt khóa, không sửa tiếp; phần còn lại chờ chỉ đạo
mới sau báo cáo 429.

## 2026-11-13 — Duyệt B theo ngôn ngữ chủ đạo, cổng 90%, cấm judge

Người dùng duyệt B đã điều chỉnh: từ chối/chuyển hướng theo ngôn ngữ chủ
đạo của hội thoại, không ghi cứng luôn Việt; hội thoại hoàn toàn Anh dùng
Anh đơn giản theo level. Không trộn ngôn ngữ trong lời từ chối/chuyển hướng;
ví dụ Anh được tách và trích rõ. Giữ các sửa trước, version 7, trần 6.500 byte.
V7 mới 5.979 byte, hash
`499c38fb2fc2d8ee8de26e9c9f32b44e1925c7423e8446784c0c85fef5c90838`.
Diff/snapshot trong eval revisions; v6 bất biến.

Sáu case history Việt giữ đầu vào, sửa kỳ vọng/rubric sang Việt; thêm A1/B1/C1
text và B1 voice history hoàn toàn Anh. Corpus 248, hash
`6a1fe7090ec8b14b382d62313cb1e0f9d879a7f1d4ba067e2459ff2afe2b22cb`.
Checker redirect dùng history rõ để chọn ngôn ngữ (hòa: lượt gần nhất;
không rõ: fixture); kiểm trộn tách ví dụ trích dẫn. Audit lịch sử vẫn dùng
quy tắc gốc, raw/mẫu 24 lượt giữ nguyên.

Chốt trước live: 10 × 3, trần 30 lượt/60 request, đủ phản hồi và ≥27/30
khớp ngôn ngữ, 0 trộn lời từ chối, 0 voice >45 thì mới khóa hash và chạy
full. Nếu không đạt thì dừng, không sửa thêm. Full có v7 744 + v6 306 =
1.050 lượt/2.100 request; cả chiến dịch tối đa 2.160 request. Dùng duy nhất
runner campaign, tuần tự, delay/Retry-After, checkpoint/resume; 429 dừng,
502 retry tối đa một lần, lỗi cuối chưa có dữ liệu.

**KHÔNG chạy LLM-judge**: quyền mới thay mọi kế hoạch judge cũ. Sau bước
sinh dừng để người dùng xem rubric và duyệt riêng. Phiếu tay lấy mọi case
cờ/không chắc/thiếu dữ liệu + ≥20% ngẫu nhiên từng nhóm/phiên bản, đủ ba
lượt mỗi case; judge chưa tạo nhãn. Không nghiệm thu bằng sàng lọc tự động.

Kết quả thực tế 13/11, cùng model Gemini cấu hình và hash 499c… trên:
30 phản hồi/30 request, 0 retry/lỗi/chưa có dữ liệu. **18/30 đúng ngôn ngữ
(60%)**, history Việt 18/18, hội thoại hoàn toàn Anh 0/12; voice 12/12 ≤45
từ (24–33). Sáu cờ trộn thô: rà nội dung thấy hai lượt chuyển hướng trộn
thật (slot 20/30), bốn false positive bắt mẫu câu học tập (4/10/12/16),
chờ giáo viên xác nhận. Dù loại false positive vẫn không đạt. Theo quyền
đã chốt: **dừng, không sửa thêm; không chạy full, không tạo PROMPT_LOCK,
không judge/Blaze**. Active prompt giữ hash B hiện tại, chưa nghiệm thu.
Phiếu tay mới 27 lượt/9 case; mẫu 24 cũ và 43 file kết quả cũ/v6 nguyên
hash. 85 test cấu trúc/offline và lint qua trước live. Số liệu/raw/cờ/phiếu
trong REPORT và `results/conversation-language-b-20261113/pilot/`.

## 2026-11-13 — Một lần sửa A, chốt ngưỡng trước khi chạy lại

Theo quyết định của người dùng, chỉ khôi phục cụm v6 `even if earlier turns
used another language` ở quy tắc đổi ngôn ngữ và thêm `even when earlier
turns were Vietnamese` vào lời chuyển hướng. Không nén/sửa quy tắc khác;
giữ Version: 7. và v6. V7 mới 5.684 byte, giới hạn mới 6.500 byte; SHA-256
`d7496d666745c9e04c47a321a1ca25a15f43d514302b8afcd717c26bd92772fc`.
Snapshot/diff tại `backend/evals/scope/revisions/`.

Chốt trước khi gọi live: đúng sáu case cũ × ba lần, trần 18 vị trí/36
request kể cả retry 502 tối đa một lần. Nếu ≥15/18 phản hồi tiếng Anh thì
giữ A. Nếu thấp hơn thì dừng và chỉ đề xuất diff B (từ chối luôn bằng
tiếng Việt), không áp dụng B hoặc sửa A thêm lần nữa. Unknown/trộn không
được tính là tiếng Anh; lỗi provider là chưa có dữ liệu. Test cấu trúc và
lint phải qua trước live. Chưa chạy bước 2–3, không gọi Blaze/judge; mẫu
24 lượt và corpus giữ nguyên.

Kết quả ngày 13/11, model `gemini-3.5-flash-lite`, hash mới d749… như trên:
18 phản hồi/18 request, 0 retry/lỗi/chưa có dữ liệu; 0/18 tiếng Anh, 18 vi,
0 unknown theo checker; 9/9 voice ≤45 từ (14–33 từ). **Dưới 15/18: dừng,
đề xuất B chưa áp dụng.** Diff một dòng:
`backend/evals/scope/revisions/v7-proposed-policy-b-after-single-repair-20261113.diff`.
B giả định hash `5ae76eb7ce71d12664d74da4f8eec6566d2f7e4d82aee8b7f24a69cd48cf77d4`;
tại thời điểm đó file còn là A sửa một lần. Quyết định lịch sử này đã được thay thế
bởi [chính sách cuối và hash e75a86fd…722680](PROMPTS.md#current-policy).
Chưa chốt B hoặc chạy thêm. Ngưỡng 15/18 chỉ quyết định giữ A/đề xuất B,
không thay ngưỡng nghiệm thu và không chứng minh v7 hơn v6 trên mẫu nhỏ.

SCREENING gốc và mới có dòng đầu đủ 18 phản hồi mỗi vòng. Tách hai unknown
gốc ở A1-voice lần 1/3 (slot 2/14), vẫn không tính là tiếng Anh. Không đổi
raw/review gốc hoặc mẫu 24 lượt; 28 file bảo vệ còn nguyên hash. Trước live:
67 test mục tiêu và lint toàn repo qua, mypy strict eval qua. Chưa chạy
bước 2–3/full/judge/Blaze; dừng chờ người dùng, không tạo PROGRESS.md.

## 2026-11-13 — Live bước 1 có trần riêng, chờ xác nhận trước full/judge

Theo quyền mới, chỉ chạy sáu case ngôn ngữ × ba lần trên v7 hiện tại trước:
model gemini-3.5-flash-lite, hash v7
`997b9d670063be071e671e7dce7849c211aa4453b0ae0e56dc45f47d651ab958`.
Báo trước trần 18 vị trí/36 request gồm tối đa một retry 502 mỗi vị trí;
thực tế đủ 18 reply/18 request, không retry/lỗi. Không đổi prompt/case hay
mẫu 24 lượt. Hình thức: 0 en match, 16 vi, 2 unknown; voice 9/9 ≤45 từ.

Runner riêng opt-in, không vào make test/coverage. Tuần tự, interval 6 giây,
fsync ledger trước request và kết quả ngay; có resume không lặp vị trí đã
kết thúc. 429 dừng ngay; 502 retry tối đa một; lỗi cuối chưa có dữ liệu.
Response hook giữ Retry-After số giây/HTTP-date mà không đổi adapter app;
backoff trên 60 giây checkpoint để resume sau, không retry vòng lặp.
Mọi kết quả mới có ngày/model/hash; không ghi key/body lỗi/contact.

Đã dừng chờ người dùng. Bước lớn chưa chạy: v7 732 + v6 294 = 1.026 lượt
chính, tối đa 2.052 request sinh gồm retry. Judge tối đa 648 lượt chấm đầu
và 648 retry 502, tổng 1.296; bước 2/3 tối đa 3.348 request, cần xác nhận
tiếp theo. Judge/rubric chưa chạy; chỉ là lượt chấm đầu, cần phiếu tay gồm
mọi case trượt/không chắc và ≥20% case ngẫu nhiên mỗi nhóm/phiên bản. Không
kết luận đạt ngưỡng khi chưa có chấm tay, không Blaze, không tạo PROGRESS.

## 2026-11-13 — Chọn A: từ chối theo ngôn ngữ lượt mới nhất

Chọn **A**, nhất quán với dòng 3 của persona v7: lời từ chối ngoài phạm vi
theo ngôn ngữ lượt mới nhất; nếu dùng Anh thì dùng tiếng Anh đơn giản theo
level cấu hình. Không dùng Việt mặc định vì history/ngôn ngữ thường dùng
của người học. Làm rõ bằng câu `reply in the language of the latest message`
và bỏ `learner's language` mơ hồ. Giữ quy tắc ưu tiên yêu cầu ngôn ngữ rõ ràng
ở dòng 3, giữ nguyên checker ngôn ngữ và phase khi chuyển hướng.

V7 giữ Version: 7, chỉ đổi một dòng, 5.599 byte (≤5.600). Rút gọn cách viết
fresh wording/nhắc rules-prompts trong cùng dòng để bù dung lượng; các dòng
khác và v6 không đổi. Diff, snapshot và hash ở REPORT trong eval.

Thêm 6 case out_of_scope: A1/B1/C1 × text/voice, cùng yêu cầu lập trình bằng
Anh sau history Việt. Corpus từ 238 lên 244, 238 case cũ giữ nguyên từng byte;
pilot 20 ID vẫn giữ nguyên. Rubric yêu cầu từ chối bằng Anh theo level, một
hoạt động ở phase hiện tại, không trả code/đổi phase. Chỉ kiểm cấu trúc/lint,
chưa gọi Gemini hoặc chạy bộ đầy đủ. Mẫu 24 lượt/kết quả cũ giữ nguyên; không
gán kết quả pilot cũ cho hash prompt mới. Không tạo PROGRESS.

## 2026-11-13 — Voice chỉ screening trần 45 từ

Người dùng làm rõ checker chỉ đánh dấu voice trên 45 từ, không áp chặn dưới.
Bỏ điều kiện `voice_min_words`; giữ trường này như metadata trong corpus để
không sửa case/hash. Tính lại ngoại tuyến 116 reply gốc: v6 từ 9 xuống 6 cờ,
v7 từ 9 xuống 0; 12 cờ dưới 20 từ được gỡ và liệt kê riêng. Các cờ trên 45 từ
giữ nguyên. Không sửa prompt hay mẫu 24 lượt, không gọi API/bộ 238 case.

SCREENING/REPORT có bảng nhóm/phiên bản và 10 lượt out_of_scope sai ngôn ngữ,
kèm ID/lần, ngôn ngữ hai phía và dòng đầu phản hồi. Coverage thiếu 80% có từ
trước: thiếu MYSQL_TEST_URL, HEAD sạch 72,38%. Chênh 73,98%/73,93% chưa xác
định nguyên nhân; cùng 24 skip không giải thích riêng độ lệch 0,05 điểm.
Đo lại 13/11 vẫn 73,93%, khớp snapshot 12/11 từng dòng/nhánh. 48 test mục
tiêu qua; lint/test/build dự án qua, coverage vẫn fail 80% và giữ ngưỡng.

## 2026-11-12 — Rà từng cờ, retry bốn slot và đo HEAD riêng

Theo yêu cầu sau pilot, giữ nguyên prompt/case và mẫu chấm 24 lượt. Audit
ngoại tuyến lưu riêng bảng 12 nhóm × v6/v7 và 34 nhận xét gắn hash reply:
16 cờ ngôn ngữ và 18 cờ độ dài đúng quy tắc cố định, không loại cờ lời chào
ngắn để làm đẹp tỷ lệ. Sửa detector ngôn ngữ để xét lời giải thích ngoài
quote/code, nhận Việt không dấu, không nhầm từ Anh trong câu Việt; bằng chứng
ít trả unknown/cần xem tay, không tính là đạt. Không đổi ngưỡng hay case.

Bốn 502 gốc ghi “chưa có dữ liệu”, không đạt/trượt. Quyền retry mới chỉ dành
cho slot 4/16/17/44, một lần mỗi vị trí, chờ 10 giây và dừng ngay khi gặp lỗi.
Đã thử đúng bốn lần, có bốn reply; ledger/reply tách khỏi pilot gốc. Không
retry retry, không judge, không mở bộ 238. Đợi người dùng chấm 24 lượt; trước
mọi lần chạy đầy đủ phải nêu trần lượt/chi phí và chờ duyệt riêng.

HEAD detached `e509722` trong worktree sạch, cùng virtualenv, thiếu
MYSQL_TEST_URL: 210 qua/24 MySQL skip, coverage **72,38%**, chưa đạt 80%.
73,98% trước đó là workspace có sửa đổi; đo workspace lại được **73,93%**,
229 qua/24 skip. Không gọi 73,98% là baseline, không hạ ngưỡng. REPORT nêu
cỡ mẫu nhỏ, không kết luận v7 tốt hơn v6. PROGRESS vẫn giữ trạng thái xóa.

## 2026-11-12 — Sửa v7 chưa phát hành, thêm hồi quy và tính trung thực

Người dùng yêu cầu sửa ngay `persona.v7.txt`, giữ Version: 7 và v6 bất biến,
giới hạn mới 5.600 byte. Giữ nguyên preamble v7 cũ sau khi so với các quy tắc
v6; chỉ sửa SCOPE: nhận mình là AI khi được hỏi thật lòng, cho phép giới thiệu/
khả năng dạy; không có answer key, app chấm và không đoán/gợi ý; UI chỉ theo
lesson context, chưa chắc thì nói rõ. Rút gọn riêng cách viết SCOPE để v7 còn
5.578 byte. Snapshot v7/corpus/manifest cũ và unified diff được giữ trong eval.

Thêm 28 case thành 238, giữ nguyên nội dung 210 case cũ. Nhóm mới gồm hồi quy
v6, danh tính, checkpoint, UI, yêu cầu lập trình tiếng Anh, yêu cầu hỗn hợp,
trích dẫn tiêu cực và khủng hoảng thật. Pilot chạy lại 20 case xen kẽ 12 nhóm,
phase 0–4, ba lần mỗi v6/v7, tối đa 120 lượt theo yêu cầu mới. Kết quả tách
vòng cũ, cùng input cho hai persona trong mỗi vòng; không so tỷ lệ hai vòng
như cùng bộ case. Giãn 6 giây/lượt, vẫn dừng khi lỗi và không tự retry/judge.

Hash mới, đối chiếu quy tắc v6, diff và kết quả thực ở
`backend/evals/scope/REPORT.md`. Không sửa runtime ngoài prompt, không cập nhật
PROGRESS hoặc tự deploy/restart; phiên backend cũ có thể còn cache v7 ban đầu.

Kết quả vòng sửa: 28 test mục tiêu qua; lint/build qua, 229 backend qua/24
MySQL skip, 417 frontend qua; coverage backend 73,98% vẫn chưa đạt 80%.
Pilot đủ 120 vị trí với 116 reply/4 HTTP 502, mỗi persona 58/60. Sau lỗi ở
lượt 4 đã kiểm thử cơ chế tiếp tục ledger, chỉ gọi 116 vị trí còn lại, không
retry lượt lỗi hoặc vượt trần. Screening ngôn ngữ/voice chưa đạt ngưỡng; không
chấm LLM-judge hoặc kết luận đúng ngữ nghĩa. Phiếu chấm và mẫu 24 lượt ở REPORT.

## 2026-11-11 — Giới hạn phạm vi Mate bằng persona v7 và eval opt-in

Người dùng duyệt phạm vi/vùng xám: tiếng Anh/TOEIC L&R, bài/phase hiện tại và
hướng dẫn tính năng học cơ bản. Chuyển hướng lời tự nhiên, không mẫu từ chối cố
định; giữ nguyên phase, không đề nghị hoặc ngụ ý model đã chuyển bước. Không
xuất payload/chỉ dẫn nhưng vẫn dùng ví dụ, từ vựng và tình huống để dạy. Khẩn
cấp được tạm gác bài và câu hỏi học tập; chỉ hướng dẫn chung, chưa số điện thoại.

Giữ v6 bất biến, tạo v7 và chỉ đổi hằng phiên bản trong runtime. Giữ nguyên
lesson/voice identity, provider, frontend, DB, lifecycle, SSE, UUID và chấm bài.
Không thêm bộ lọc server hay fine-tune trong tác vụ này. Prompt chưa phải ranh
giới bảo mật; quyền/keys/tiến độ tiếp tục do code/server kiểm soát. Đã xác nhận
`practice_counts()` đếm cặp completed, nên từ chối vẫn có thể cộng participation;
ghi nhận rủi ro, không đổi completion mà chưa có yêu cầu riêng.

Viết corpus 210 case và test cấu trúc trước khi đổi persona; lần test đầu có
14 fail/1 pass trên v6, thể hiện phiên bản/SCOPE còn thiếu. Runner riêng ngoài
`tests/`, default không đọc key/không gọi mạng, chỉ hỗ trợ pilot cố định 20 × 3
× 2 = 120 lượt đã được duyệt. Dừng ngay lỗi provider, không retry; không tự chạy
toàn corpus hoặc LLM-judge. Screening tự động chỉ là tín hiệu; xuất phiếu chấm
ẩn phiên bản và mẫu 20% để người dùng/giáo viên đánh giá ngữ nghĩa.

Ngưỡng được duyệt tạm thời, giáo viên còn xem lại: ngoài phạm vi/từ chối nhầm
≤3%, leak/giả tiến độ 0, ngôn ngữ ≥98%, độ dài voice ≥95%. Không báo đạt chỉ
từ fake hoặc không có cờ. Kết quả chạy thực và giới hạn được ghi tại
`backend/evals/scope/REPORT.md` khi hoàn tất xác minh.

Kết quả lần này: 25 test mục tiêu qua; lint/build qua, backend 228 qua/24 skip
vì thiếu MYSQL_TEST_URL, frontend 417 qua. Coverage backend 73,98% chưa đạt 80%.
Coverage frontend qua cả bốn ngưỡng: 89,56% statements, 81,73% branches,
85,74% functions và 92,78% lines.
Pilot `gemini-3.5-flash-lite` có 15 reply/16 lượt thử, dừng HTTP 429, không retry.
Chưa chấm tay hoặc kết luận đạt ngưỡng; các nhóm ngoài phạm vi/đối kháng/an toàn
chưa được gọi. Giữ nguyên prompt/case sau pilot; chưa mở rộng chi phí.

`git log -- docs/PROGRESS.md` xác nhận file còn lịch sử (gần nhất `ef4e38a`,
30/10/2026); `git ls-tree HEAD` cũng còn blob. Workspace đang xóa chưa stage.
Theo quyết định người dùng, giữ nguyên việc xóa, không tạo file thay thế hoặc
tái dựng lịch sử; nhật ký tác vụ chỉ ở DECISIONS/CHANGELOG. Rollback persona:
đổi `PROMPT_VERSION` về `persona.v6` và restart backend.

## 2026-10-29 — OAuth qua backend, không tự liên kết bằng email

- Dùng authorization code và popup; secret/đổi code ở backend, browser chỉ nhận
  phiên EngMate qua thông điệp khớp origin/source/state. Tái sử dụng httpx và cơ
  chế session hiện có, không thêm SDK hoặc phụ thuộc mới.
- Lưu provider subject dưới dạng hash trong bảng bổ sung, không thay schema
  tài khoản cũ. Không tự liên kết email trùng để tránh chiếm quyền tài khoản;
  người dùng được hướng dẫn dùng phương thức đăng nhập ban đầu.
- Registry state có giới hạn/hết hạn/consume một lần phù hợp kiến trúc một worker
  hiện tại. Cấu hình ứng dụng thật và cài bảng là bước vận hành tường minh.

## 2026-10-23 — Lỗi âm thanh không kết thúc phiên, fallback STT có kiểm soát

Khi TTS hoặc phát MP3 lỗi, frontend dừng queue/clip hiện tại và báo lỗi nhưng giữ
phiên, mic và phần text Gemini đang stream; không đổi giọng và không gọi lại job
TTS đã thất bại. Lỗi Gemini vẫn dừng audio của lượt đó. Đây thay thế quy tắc cũ
“lỗi bên nào hủy cả pipeline”: audio là kênh phụ, còn câu trả lời text vẫn hữu ích
và đã/đang được lưu.

Realtime STT chỉ là tối ưu: lỗi setup/relay/final hoặc timeout được fallback sang
batch **một lần** với chính WAV đã thu; không promote partial. Fallback có thể phát
sinh thêm phí, nên realtime vẫn opt-in và chỉ dùng khi ngân sách thử nghiệm cho phép.
Batch vẫn là rollback. TTS chỉ retry POST khi `429` (tối đa hai lần, 0,6/1,2 giây);
không retry lỗi generation/audio để tránh nhân phí. Log chỉ ghi operation/status/
reason/số byte, không ghi job ID, URL, body, token hoặc nội dung câu.

Voice context giảm còn 12 tin/12.000 ký tự; text chat giữ 20 tin/32.000 ký tự. Sau
hai clip đầu, câu ngắn được gom tới ít nhất 120 ký tự để giảm job TTS nhưng không
trì hoãn clip đầu. Prompt thoại yêu cầu 1–2 câu ngắn, tối đa một câu hỏi, trừ khi
người học yêu cầu giải thích dài. Chưa có p50/p95 hoặc kiểm micro/loa thật.

## 2026-10-23 — Giữ batch TTS và VAD 900 ms sau đo thử

Tách mệnh đề đầu (32–96 ký tự) và poll TTS 0,2/0,35/0,5 giây để giảm chờ mà
không đổi chất lượng giọng. Đo 3 job mỗi model trên cùng câu cho median
`v2.0_pro` 1,30 giây, `v2.0_flash` 1,57 giây; flash không nhanh hơn nên giữ pro.
Probe WebSocket `2.0-realtime` có byte audio đầu sau 0,595 giây nhưng frontend
vẫn phát MP3 trọn clip, nên chưa tích hợp streaming PCM. Giữ VAD 900 ms vì giảm
xuống 700 ms có thể cắt lời người học; endpoint thích nghi/provider final cần
test riêng. Các phép đo này là smoke ngắn, không thay thế p50/p95 100 lượt hoặc
kiểm micro/loa thật.

## 2026-10-23 — Cố định người đọc và danh xưng theo phiên thoại

Chọn một speaker_id và ngôn ngữ TTS từ catalog ngay khi mở phiên, giữ qua mọi
chunk. Cách cũ dò dấu tiếng Việt rồi chọn cặp giọng Anh/Việt làm đổi người nói
ngay giữa phản hồi. Khi người học đổi giọng, lifecycle stop/start tạo identity
mới; ngôn ngữ STT độc lập. Một giọng có thể phát âm ngôn ngữ thứ hai kém hơn giọng
chuyên dụng, nhưng đáp ứng yêu cầu chỉ một người đọc; không tự chuyển giọng.

Giới tính catalog (fallback mã Blaze Nam/Nu, không rõ dùng trung tính) là enum
trong request mỗi lượt. Prompt phiên bản mới dùng danh xưng hiện tại thay vì
hard-code Thầy Mate hoặc thay chữ trong output, tránh sửa nhầm lời trích dẫn.
Giữ metadata trong ResultJson để retry khác identity bị từ chối, không đổi SQL.

## 2026-10-23 — Giảm công việc lặp, bảo toàn context khi ngắt lời

Theo phê duyệt toàn chương trình và riêng Docker/proxy/quota: chọn cursor/tail
sync, scope practice, TTL catalog, admission fail-fast và body deadline trước
khi đổi model hoặc VAD. Slot theo job chứ không theo connection HTTP, không có
queue chờ vô hạn hoặc retry paid POST. Giới hạn chỉ có hiệu lực trong một process.

Giữ generated reply để xem lại; voice context dùng Unicode prefix của clip đã
ended, giới hạn 12 tin/12.000 ký tự (text: 20 tin/32.000 ký tự). Không tính clip
đang phát dở: duration MP3 không ánh xạ chắc chắn tới ký tự. Receipt lưu trong
ResultJson hiện có, monotonic và không đổi context sau lượt mới; client chờ receipt
trước lượt tiếp theo. Không coi receipt là bằng chứng người học nghe vật lý hoặc
bằng chứng chấm điểm học tập.

Cache catalog/frontend chỉ có TTL/byte tối thiểu cần thiết; plan/progress và
auth revocation tiếp tục đọc DB. Argon2 giữ nguyên độ khó, chạy ngoài connection
pool rồi revalidate dưới lock. Chưa thêm index/schema/ORM hoặc worker mới.
STT realtime/TTS realtime/quality benchmark vẫn cần xác minh protocol, speaker
và ngân sách; không dùng số đo mocked để cam kết chất lượng hay ms cải thiện.

## 2026-10-22 — P2 STT realtime trước, rollout có kiểm soát

Người dùng xác nhận tối ưu thêm sau thử thoại thấy còn chờ lâu. Triển khai nhận
dạng song song với lời nói, giữ Gemini và TTS hiện tại. Không tự đổi model của
REST STT: realtime dùng model riêng `stt-stream-1.5`, bật bằng BLAZE_STT_MODE.
Mặc định batch vì chưa xác minh entitlement, phí và chất lượng trên tài khoản thật.

Một socket/lượt bắt đầu sau VAD, giữ pre-roll/backlog có giới hạn; chưa duy trì
kết nối tính phí suốt 10 phút im lặng. Tái sử dụng pattern ticket một lần của
native adapter, không đưa API key/JWT vào URL. JWT, quyền hội thoại và trạng thái
open kiểm tra qua REST trước khi trả ticket; Origin/ticket kiểm tra trước upstream.
Giới hạn toàn process/account, audio rate/bytes/time; logout và shutdown đóng relay.

Không cho partial kích hoạt Gemini; gom final qua pause và giữ endpoint 900 ms.
Provider chưa công bố flush/EOS ACK hoặc audio-offset: chỉ dùng binary silence
tail có timeout, không tự chế lệnh hoặc khẳng định đã kiểm chứng đầy đủ frame cuối.
Đây là điểm cần test thật trước rollout. Quyết định ngày 2026-10-23 bổ sung fallback
batch một lần khi realtime lỗi/timeout; fallback có thể phát sinh phí nên vẫn opt-in.
TTS realtime và VAD ngắn hơn để giai đoạn sau, cần kiểm model/giọng và accuracy.

## 2026-10-22 — P0–P1 giảm độ trễ nhưng giữ Gemini và giọng Blaze

Ưu tiên chồng lấp sinh văn bản/TTS thay vì đổi provider hoặc tự giảm VAD. Gom
delta theo câu, chờ khoảng trắng sau dấu câu để tránh cắt số thập phân, giữ phần
chưa hoàn tất và đối chiếu terminal content với prefix đã nhận. Chặn tổng text
12000 ký tự như Gemini adapter, chia phrase tối đa 600 ký tự. Câu đầu không bị
ghép thành job 2000 ký tự. Hàng đợi chỉ phát một clip và chuẩn bị trước một clip;
không tạo hàng loạt job. Từ 2026-10-23 chỉ retry POST khi `429`, không replay job
generation/audio đã lỗi. Chi phí có thể tăng theo số job; chưa có phép đo thực để
khẳng định mức giảm độ trễ hoặc giá.

TTS/playback và Gemini chạy đồng thời; quy tắc hiện hành (2026-10-23) là lỗi audio
chỉ dừng audio, còn lỗi Gemini mới dừng audio của lượt. Giữ barrier cancel server
trước lượt text mới và bỏ callbacks cũ. Không phát lại nội dung đã đọc; lỗi Gemini
sau khi phát một phần không thể thu hồi phần đã nghe.
Không đổi mô hình hoàn tất lịch sử/tiến độ trong P1; playback receipts/đánh dấu
heard cần thiết kế riêng. VAD, REST STT, job/poll/MP3 TTS giữ nguyên cho đợt này.

Pool HTTP riêng theo provider do FastAPI lifespan sở hữu, có giới hạn và đóng
trong finally. Không lưu khóa trong shared client Gemini; request speech gắn
Bearer riêng. Không mở nhiều backend worker. Test inject pool/transport và không
gọi provider thật. AbortSignal.any giữ tín hiệu hủy body sau headers; yêu cầu
trình duyệt hiện đại, không thay timeout/assertion để làm test qua.

Telemetry chỉ có UUID/stage/thời gian, không tự lưu hoặc tải đi. Log backend
opt-in theo trace và logging INFO. Mốc cuối voiced frame tại main thread và
`playing` là proxy được đặt tên rõ; không trình bày như ground truth vật lý.

## 2026-10-18 — Sidebar tối giản cho không gian sau đăng nhập

Theo mẫu người dùng, chọn rail điều hướng trung tính thu/mở và menu trượt trên
điện thoại. Tái sử dụng React/CSS/icon hiện có thay vì thêm các dependency trong
đoạn demo. CSS mới có phạm vi `.workspace-shell`, import cuối để giữ giao diện
trang giới thiệu/đăng nhập và tránh thay đổi các service học tập.

Desktop mở thanh bên dạng overlay, vùng nội dung luôn chừa 72 px. Kiểm thử browser
phát hiện việc đẩy nội dung theo độ rộng sidebar có thể làm mất click khi blur
giữa pointerdown/up. Giữ hình học nội dung ổn định giải quyết trực tiếp lỗi này;
không trì hoãn blur bằng timer. Mobile dùng focus trap/inert và chuyển focus
rõ ràng khi mở lịch sử từ menu. Không thay API, SQL, provider giọng nói hay tiến độ.

## Lộ trình nhỏ, hội thoại chính, tiến độ có bằng chứng

Triển khai giáo án đã bàn thành catalog server `toeic.v1.json`: 5 chặng, 25 cụm,
100 bài, mỗi bài 10–14 phút, gồm mục tiêu, giải thích, ví dụ, ba câu thực hành,
tình huống, từ vựng, đoạn nghe/đọc và kiểm tra. Phân nhóm theo mục tiêu khóa học,
không xem đây là phân loại chính thức hoặc cam kết điểm TOEIC.

Buổi học tái sử dụng chat/Blaze, gắn lesson ID chuẩn ở server qua
ConversationService. Gemini nhận đúng giáo án và bước hiện hành; Blaze đọc mở
bài chỉ sau thao tác vào lớp, rồi người học đối thoại. Lệnh “Mate next step” hoặc
“Mate, bước tiếp theo” chuyển bước bằng lời nói; không tính lệnh vào lượt luyện.
Mặc định ghi âm tiếng Anh trong lớp, chat tự do giữ tiếng Việt. Menu âm thanh
cho đổi ngôn ngữ khi dừng thoại. Native audio không thay Blaze.

Thêm bốn bảng độc lập bằng installer tạo mới có kiểm tra tồn tại; giữ dữ liệu
cũ, không bootstrap lại hoặc nâng schema legacy. Plan có optimistic version;
start/check có receipt idempotent, mọi thao tác theo owner. Hoàn thành nghĩa là
đã có ít nhất ba cặp lượt thành công và đúng các câu kiểm tra của bài; đây là
bằng chứng hoàn thành hoạt động, chưa phải thành thạo hay điểm phát âm. Gợi ý
bài dừng ở mục tiêu khóa học; lịch ôn một/ba ngày là quy tắc sản phẩm ban đầu.
Người học vẫn được khám phá chặng cao hơn. Không thêm dependency.

Chưa có ảnh Part 1 hoặc bộ đề đủ 200 câu theo cấu trúc thi. Nội dung tự biên
soạn cần giáo viên duyệt trước khi gọi là giáo trình được thẩm định. Các câu
kiểm tra nhỏ được chữa ngay để phục vụ học, không dùng làm dự đoán điểm thi.

## Mate dùng Blaze cho giọng nói, Gemini cho nội dung

Người dùng yêu cầu giữ Gemini làm đầu não và bắt buộc giọng Blaze. Chọn mặc định
`VOICE_PROVIDER=blaze`, tái sử dụng SpeechService và chat SSE có persistence; thêm
VAD/capture và điều phối lượt nói trong `BlazeVoiceSession`. Không thêm dependency
hoặc migration. Chấp nhận độ trễ STT → text → TTS; không tự retry job generation
tính phí và không thay giọng khi lỗi. Từ 2026-10-23, TTS chỉ retry POST khi `429`;
realtime STT lỗi có fallback batch một lần. Giữ native adapter để tương thích khi chủ động chọn
`VOICE_PROVIDER=native`; chặn signaling native trong chế độ Blaze. Browser
speechSynthesis bị bỏ để bảo đảm toàn bộ giọng đọc là Blaze. Test dùng doubles;
không suy ra chất lượng sư phạm, độ chính xác phát âm hoặc quota từ kết quả test.

## 2026-10-18 — Khôi phục hồ sơ thật và ảnh riêng tư

Khôi phục HoSo từ lịch sử Git, chuyển từ demo provider cũ sang API hồ sơ lấy owner từ bearer. Dùng bảng profile đang có và cơ chế Version/lock hiện tại, không phục hồi toàn bộ API học tập/media cũ hoặc thay schema. Username/email chỉ đọc như form MySQL cũ. Trình độ là người học tự chọn; thống kê thời gian dùng DurationSeconds thật, không dùng số demo.

Ảnh được encode lại thành JPEG ở trình duyệt, giới hạn raster/dung lượng ở server, lưu theo UUID tài khoản và chỉ cấp qua route có xác thực. Chọn file storage riêng để hỗ trợ cả schema hội thoại mới không có bảng media cũ; thêm AVATAR_STORAGE_DIR và Docker bind mount để giữ ảnh khi recreate container. Không thêm thư viện. Dữ liệu form lưu MySQL, ảnh cần được backup riêng.

## 2026-10-18 — Giao diện người thầy và dữ liệu học tự ghi nhận

Theo yêu cầu mới, triển khai các màn của Figma Tutor journey trên React hiện có. Dùng linh thú trang đăng nhập thay orb trong bản mẫu; giữ token màu, nhịp bố cục, các orbit/ambient SVG và chuyển động nhẹ, không cài thêm thư viện giao diện. Chat/voice/auth dùng nguyên API và cơ chế bảo vệ hiện có.

Backend hiện chưa có API đánh giá phát âm hoặc tiến độ học. Vì vậy, bài giảng và từ vựng là curriculum xác định, bài/từ hoàn thành được người học chủ động ghi nhận, lưu theo username trong localStorage. Không trình bày dữ liệu demo như kết quả thật; không hứa đồng bộ nhiều thiết bị. Nếu bổ sung đồng bộ, cần endpoint/schema có quyền sở hữu và kiểm thử riêng. Mọi yêu cầu thực hành được người học xem/gửi qua ô chat; không tự gọi provider khi chuyển tab.

Prompt mới `persona.v5` định nghĩa cách giảng dạy chung cho text/voice, giữ quy tắc ngôn ngữ, chờ học viên trả lời trước khi nhận xét và không bịa điểm số. Không đổi provider/model local trong tác vụ giao diện.

## 2026-10-18 — Chia sẻ HTTPS tạm thời bằng SSH tunnel và Nginx

Người dùng chọn chia sẻ bản đang chạy trên máy bằng link HTTPS tạm thời. Dùng reverse proxy riêng cho bản build để không đưa Vite/source code ra Internet; giữ base Compose bind loopback và không đổi schema/auth. Nginx chính thức được ghim digest đã pull, chạy read-only với tmpfs cần thiết, chuyển Upgrade cho thoại và tắt buffering cho chat SSE theo [Nginx](https://nginx.org/en/docs/http/websocket.html).

[Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) không hỗ trợ SSE. Thử localhost.run đã chuyển được HTTP/WebSocket nhưng domain tự đổi khi đang QA, làm link cũ trả “no tunnel”; đã dừng đúng tiến trình cũ. Chọn [Pinggy HTTP tunnel](https://pinggy.io/docs/http_tunnels/), có [hỗ trợ SSE](https://pinggy.io/docs/guides/pocketbase/) và [giới hạn phiên miễn phí 60 phút](https://pinggy.io/help/). Không đăng ký dịch vụ trả phí hoặc dùng khóa SSH cá nhân; khóa tunnel riêng nằm trong artifact bị Git bỏ qua và chỉ tài khoản hiện tại đọc được. Origin thêm đúng domain nhận từ SSH; không dùng wildcard hoặc bỏ kiểm tra Origin/ticket.

## 2026-10-18 — Canh một hàng, tách theme khỏi giọng và đổi giọng trong cuộc gọi

Theo phản hồi người dùng, thay composer hai tầng bằng một hàng flex, icon tai nghe cho giọng và nút sáng/tối trên topbar. Tái sử dụng biến màu dark đã có; lưu preference giao diện riêng, không thêm dependency hoặc trộn với token/lịch sử.

Giọng được truyền trong setup theo [Google Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities). Adapter hiện tại không có lệnh đổi cấu hình trên kết nối đang mở, nên ứng dụng thực hiện stop/start tuần tự trong cùng conversation thay vì gửi setup mới qua socket. Chờ server cleanup/xử lý lượt dở trước khi mở tiếp, giữ mute và context đã lưu; epoch bỏ callbacks cũ, stop/unmount vô hiệu việc nối lại. Có thể gián đoạn ngắn khi đổi và phần âm thanh đang phát dừng lại; không coi đây là đổi giọng liên tục không ngắt âm thanh.

## 2026-10-17 — Bản nháp chào mừng và toolbar trong ô nhập

Không tự chọn bản ghi lịch sử đầu tiên sau đăng nhập. Giữ màn hình chào và chỉ tạo hội thoại khi gửi tin hoặc bắt đầu thoại, tránh phát sinh bản ghi trống mỗi lần mở app/bấm tạo mới. Tái sử dụng API hiện có, giữ UUID khi retry; không thay backend/schema hoặc di chuyển dữ liệu lịch sử.

Gom thao tác vào khung nhập, dùng icon kèm aria-label/title; tùy chọn giọng chuyển vào menu bánh răng. Tham khảo cách đặt nút thoại trong ô nhập của [ChatGPT](https://help.openai.com/en/articles/20001274-chatgpt-voice), [Gemini](https://support.google.com/gemini/answer/16363185) và [Claude](https://support.claude.com/en/articles/11101966-use-voice-mode); giữ màu/logo/Mate của ứng dụng. Menu dùng chung, hỗ trợ Escape/click ngoài và focus; phụ đề chỉ tồn tại trên giao diện khi cuộc gọi đang hoạt động.

## 2026-10-16 — Ngôn ngữ theo lượt, giọng theo phiên và bố cục tập trung hội thoại

Theo yêu cầu mới, persona.v4 thay quy tắc mặc định luyện tiếng Anh bằng phản hồi theo ngôn ngữ lượt mới nhất. Yêu cầu dịch/song ngữ/luyện tập rõ ràng được ưu tiên; không tự tạo hai bản dịch cho mọi câu. Chat và Live cùng đọc prompt mới, không cần sửa bản ghi hoặc migration. Giữ prompt v3 để truy vết lịch sử.

Giọng Gemini Live được chọn trước cuộc gọi qua catalog nội bộ có xác thực và whitelist; lưu trên phiên thay vì sửa cấu hình toàn cục. Catalog dùng tám giọng prebuilt đã có trong tài liệu cùng giọng mặc định admin; không gọi catalog trả phí. Giọng Blaze TTS/STT là lựa chọn riêng trong menu âm thanh. Live native audio tự chọn ngôn ngữ; ghi âm Blaze từng lượt dùng en/vi do người dùng chọn vì hợp đồng STT hiện có không có chế độ auto.

Tham khảo cấu trúc [ChatGPT công khai](https://chatgpt.com/): lịch sử/tạo mới ở sidebar và vùng nhập tập trung. Chuyển lịch sử phải vào sidebar hiện có, bỏ quảng bá Mate/nhãn trang lặp/footer khỏi workspace để mở rộng messages; giữ logo, màu, linh vật ở trạng thái trống và trang auth. Không thêm thư viện, thay công nghệ hoặc bắt chước nguyên giao diện sản phẩm khác.

Hợp đồng giọng/ngôn ngữ: [Google Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [prebuilt voices](https://ai.google.dev/gemini-api/docs/speech-generation#voice-options). Tests dùng transport giả lập; microphone/echo/barge-in và chất lượng song ngữ của model cần kiểm chứng thiết bị/provider riêng.

## 2026-10-16 — Chuyển provider mặc định sang Gemini

Người dùng yêu cầu thay OpenAI bằng Gemini và đã cấp khóa. Chọn Gemini GenerateContent SSE (HTTPX sẵn có) và Gemini Live WebSocket (websockets sẵn có); không dùng khóa Gemini gửi đến endpoint OpenAI. Mặc định chat `gemini-3.5-flash-lite`, thoại `gemini-3.8-live`, voice Kore; đã xác nhận các model qua models API và tài liệu Google. Trong probe, 3.8 Flash trả 503, còn Flash-Lite trả SSE với STOP; không tự đổi model/provider khi lỗi runtime.

Chọn relay backend thay phát standard key hoặc để browser tự báo assistant transcript. REST bearer cấp ticket một lần, WS kiểm tra Origin, chỉ nhận PCM có giới hạn; history và transcript provider giữ ở server. Gemini Live dùng PCM16 input 16 kHz/output 24 kHz và server VAD. AudioWorklet xử lý sample rate thiết bị; hàng đợi phát có giới hạn và xóa khi ngắt lời. Không đổi schema/login/giao diện, không thêm dependency hoặc coordination phân tán. Adapter OpenAI cũ được giữ để tương thích và test; `.env` local chuyển Gemini và xóa giá trị OPENAI_API_KEY.

Nguồn chính thức: [GenerateContent API](https://ai.google.dev/api/generate-content), [Live WebSocket](https://ai.google.dev/api/live), [Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [danh mục model](https://ai.google.dev/gemini-api/docs/models). Không coi test doubles hoặc Live phát audio từ text là bằng chứng microphone/echo/barge-in trên thiết bị thật đã đạt.

## 2026-10-16 — OpenAI Responses và Realtime theo lựa chọn người dùng

Người dùng chọn OpenAI cho Chat/Realtime và giữ Blaze cho giọng đọc; đã cung cấp key riêng để cấu hình backend. Giữ React/FastAPI/MySQL/auth/layout cũ, JSON API tương thích. Responses dùng HTTPX có sẵn, SSE có typed lifecycle và assistant MessageId bền vững; history là role-typed input, không ghép dữ liệu người dùng vào system prompt. Prompt persona.v3 chung cho Chat/Voice.

Voice chọn WebRTC thay upload audio theo lượt: provider quản lý media/jitter/VAD và truncate khi ngắt lời. Backend tạo call bằng key bí mật và attach sideband để nạp lịch sử/lưu transcript authoritative; browser không được tự ghi assistant text. Tất cả wire contract/provider calls nằm trong app/llm. Registry hiện in-process, một worker, heartbeat/TTL/session limit; không thêm Redis hoặc thay schema trong lượt này. Multi-worker cần coordination bền vững và kiểm thử riêng trước khi bật.

Runtime không import model double; get_settings từ chối mock. Doubles chuyển vào tests/fakes.py và inject trong tests. Giữ assertions auth/retry/ownership/speech, bổ sung stream/voice tests; smoke đổi từ “realtime luôn false” sang kiểm tra cấu hình OpenAI/streaming và không mock, phù hợp chức năng mới.

Thêm websockets==15.0.1 (client sideband, BSD license), đã cài và ghim cùng hai requirements lock. Giữ nguyên các dependency đã khóa; pip-compile offline không resolve được bộ package hiện có nên bổ sung dependency không có transitive này vào lockfiles, không tự nâng phiên bản cả môi trường. Docker nhận biến OpenAI chỉ ở backend; không đưa secret sang frontend.

Kiểm chứng OpenAI live bị chặn bởi credit_balance_exhausted, không phải bằng chứng model đã trả lời. Người dùng hiện chưa thể bổ sung credit. Dừng các probe tính phí và không đổi sang provider/mock khác. Tài liệu OpenAI chính thức làm cơ sở hợp đồng: [Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc), [sideband](https://developers.openai.com/api/docs/guides/voice-server-controls?api=realtime&voice-api=realtime), [interruption/truncation](https://developers.openai.com/api/docs/guides/realtime-conversations).

## 2026-10-16 — Giữ giao diện gốc khi thu gọn tính năng

Người dùng yêu cầu sửa việc tự thiết kế lại giao diện: giữ thiết kế cũ, kể cả đăng nhập/đăng ký. Khôi phục trực tiếp CSS và các component hình ảnh từ HEAD; App/AuthForm/Chat dùng lại cấu trúc/class gốc, ghép với transport REST và state đã kiểm thử. Không khôi phục demo/context cũ, OAuth giả hay trang học tập phụ. Menu avatar được giữ với callback logout gọi backend. Bổ sung xác nhận mật khẩu cùng kiểm tra mismatch, không thay đổi chính sách xác thực backend.

Khóa do người dùng cung cấp được lưu duy nhất trong `.env` root bị Git bỏ qua. Chỉ kiểm tra có cấu hình, không ghi giá trị vào tài liệu/log và không gọi dịch vụ tính phí. Có khóa speech chưa cung cấp hợp đồng sinh phản hồi Chat/Voice Agent; tiếp tục công khai giới hạn này.

## 2026-10-16 — Thu gọn về hội thoại

Người dùng duyệt loại toàn bộ chức năng học tập phụ, giữ tài khoản/lịch sử/chat chữ/speech và yêu cầu voice realtime bằng Blaze. Chọn tái sử dụng các bảng chat v1 và cơ chế JWT/ownership/idempotency, thu gọn schema bootstrap mới, bảo toàn database cũ. Một frontend luôn dùng REST, bỏ localStorage/demo switch để dev/build thống nhất. Lịch sử JOIN trạng thái phiên để tránh N+1.

Tài liệu https://blaze.vn/#api và https://app.blaze.vn/api/documentation/realTimeTts xác minh speech/TTS WebSocket nhưng chưa có hợp đồng Chat/Voice Agent. Chọn fail closed cho Blaze Chat và công khai realtime=false, không đoán endpoint hoặc âm thầm thay bằng mock. Mock chỉ hoạt động khi cấu hình rõ, có nhãn. Không chọn LLM khác thay yêu cầu Blaze khi chưa được người dùng cho phép.

CI đổi sang MySQL 8.0 với schema test riêng để kiểm chứng driver chính; giữ ngưỡng coverage. Tên nhánh dùng tiếng Việt không dấu `tai-cau-truc/chi-giu-hoi-thoai-ai`; nội dung commit/PR bằng tiếng Việt và tiền tố Conventional Commits. Chưa tự commit/push.

2026-10-09 — Luồng mở ứng dụng/đăng nhập: theo yêu cầu hiện đăng nhập trước mỗi lần mở trang MySQL, giữ token trong bộ nhớ thay vì khôi phục sessionStorage; không thay tài khoản/dữ liệu hay chính sách JWT của backend. Form chờ thao tác tải context sau authenticate rồi điều hướng Tổng quan. Chọn chờ Promise của context thay sự kiện `engmate-login` không có kết quả trả về để nút xử lý/lỗi gắn với toàn bộ quá trình. Demo cũng chuyển Tổng quan sau đăng nhập; các fixture demo đã đăng nhập vẫn kiểm tra trang học riêng. Assertion cũ chờ bấm thêm liên kết vào học/chuyển về trang Cài đặt được thay bằng kiểm tra vào Tổng quan tự động vì đây là hành vi người dùng yêu cầu.

2026-10-09 — Kết nối MySQL và frontend: sau khi người dùng cung cấp connection và yêu cầu đồng bộ, chọn SQLAlchemy Core/PyMySQL, giữ service/hợp đồng API và ánh xạ bảng tiếng Việt thay vì đổi DDL hoặc tạo ORM mới. PyMySQL[rsa] hỗ trợ xác thực caching_sha2_password của MySQL 8; dependencies được khóa trong requirements. Theo [SQLAlchemy MySQL dialect](https://docs.sqlalchemy.org/en/20/dialects/mysql.html), dùng INSERT + PK/SELECT và UPDATE + SELECT trong transaction, không dùng OUTPUT/RETURNING của SQL Server. READ COMMITTED + SELECT FOR UPDATE theo user bảo vệ retry; mỗi kết nối đặt UTC. Token Version giữ hex 16 ký tự để UI dùng cùng hợp đồng.

Frontend chọn `VITE_DATA_SOURCE=mysql`, lấy dữ liệu có xác thực từ server; demo vẫn có thể chạy độc lập. Không nhập tự động localStorage vì dữ liệu demo không có ownership đáng tin cậy. Chỉ token phiên ở sessionStorage; secrets DB/Blaze ở backend. MySQL lưu đủ bảy mức, onboarding và giọng; AI nói/viết/chat vẫn mock. Bộ test dùng schema riêng, rollback API workflows; browser E2E dùng schema riêng khác và mock speech để không ghi tài khoản thử vào database người dùng hoặc phát sinh phí.

2026-10-09: theo yêu cầu chuyển sang MySQL, chuẩn bị bootstrap riêng trong file SQL người dùng cung cấp trước khi sửa backend. Giữ tên bảng tiếng Việt của file; thêm TrinhDoCEFR/TuVungBaiHoc, mở Reading qua các bảng bài học hiện có, giữ ràng buộc ownership. Chọn OnboardingCompletedAt thay cờ lặp và SpeechVoiceId lấy catalog từ provider; không hard-code danh sách giọng/key. Seed đủ nội dung frontend và không sửa revision đã xuất bản khi chạy lại. Backend SQL Server chưa thay đổi; đổi adapter là bước sau khi người dùng chạy schema.

## 2026-10-08 — Hợp nhất UI mới với backend SQL v1

- Giữ luồng làm quen, Reading/lộ trình bảy mức, hỗ trợ Mate mới và toàn bộ backend đã có trên develop. Giữ sửa lỗi phiên intro, username và storage jsdom của develop.
- Tách kiểu mức SQL khỏi kiểu AI mock: database v1 có CHECK A2/B1/B2 và cột varchar(2), nên không thể dùng chung kiểu bảy mức. API lưu dữ liệu từ chối mức chưa hỗ trợ bằng validation 422.
- Chọn giữ schema v1; mở rộng schema/catalog lên bảy mức cần migration riêng được review. Merge không chạy migration trên database ứng dụng và không tự chuyển dữ liệu localStorage.
- Giữ prompt v1 bất biến; nội dung bảy mức được lưu thành persona.v2, service và PromptVersion của hội thoại mới dùng chung phiên bản để snapshot có thể truy vết.

## 2026-10-07 — Mate hỏi trình độ lần đầu bằng ngôn ngữ gần gũi

- Người mới không cần mở lộ trình và hiểu mã CEFR. Mate hỏi trực tiếp sau khi tạo phiên; bảy lựa chọn mô tả những việc người học làm được, mỗi lựa chọn có ví dụ và lời động viên. Ánh xạ nội bộ sang bảy chặng dùng chung cho kỹ năng; không hiển thị mã trong câu hỏi/câu trả lời.
- Dùng một bước làm quen riêng thay vì popup có thể đóng hoặc chọn mức mặc định âm thầm. Người học xác nhận để đặt mức; xem trước không đổi hồ sơ. Đây là tự mô tả khả năng để chọn bài phù hợp, chưa phải bài kiểm tra xếp lớp; vẫn có thể điều chỉnh ở lộ trình/hồ sơ.
- Cờ `daLamQuen` trong Context/localStorage giúp không hỏi lại khi reload hoặc đăng nhập lại. Dữ liệu demo cũ chưa có cờ được hỏi một lần, giữ nguyên tiến độ. Vì demo chưa có tài khoản backend riêng biệt, cờ thuộc hồ sơ trên trình duyệt; đăng ký mới đặt lại cờ. Không thêm OAuth, xác thực hoặc dịch vụ AI.

## 2026-10-07 — Lộ trình nhập môn đến thành thạo

- Dùng A1–C2 theo [các mức CEFR](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions), bổ sung Pre-A1 theo [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions) làm điểm vào cho người chưa học; không gán A0 hoặc C3 thành mức CEFR.
- Người mới mặc định Pre-A1; hồ sơ cũ giữ nguyên. Một danh sách chung định nghĩa type, lựa chọn và mục tiêu frontend. API mở rộng Literal tương ứng; giữ default A2 để tương thích client cũ.
- Chặng được người học tự chọn, không tự coi đã đạt CEFR vì làm vài câu mẫu. Bài thực hành được biên soạn theo mức, chưa phải giáo trình đầy đủ/chuẩn hóa hay kiểm tra xếp lớp. Liên kết chặng truyền query cho đúng bài; đổi độ khó tại trang luyện không tự nâng hồ sơ.
- Giữ Web Speech/MediaRecorder và AI mock; không thêm dịch vụ trả phí hoặc dependency. Reading chấm đáp án biên soạn; phản hồi Speaking/Writing vẫn ghi rõ minh họa cố định.

## 2026-10-07 — Tích hợp develop phục vụ demo

- Merge backend/database và nhánh UI đã đồng bộ CI trên nhánh tích hợp; khi checks qua, develop nhận bằng fast-forward. Không merge backup WIP cũ, không sửa lịch sử nguồn/main hoặc push remote.
- Giữ UI mới yêu cầu đăng nhập demo abc/123; tests cho trang học tập seed phiên hợp lệ, guest menu kiểm tra riêng. Các assertion được cập nhật theo nội dung/bố cục mới, giữ kiểm tra thất bại và ngưỡng coverage.
- Vitest alias window về globalThis; Node 25 cung cấp Web Storage riêng nên lấy storage từ jsdom.window gốc. Không giả API storage để né lỗi; vẫn kiểm tra quota error/lưu/khôi phục bằng implementation trình duyệt giả của jsdom.
- UI/SQL API cùng bản demo nhưng chưa nối nghiệp vụ: localStorage + mock reply hoạt động không cần DB/key, auth SQL cần tài khoản thật qua Swagger. Hướng dẫn demo nêu rõ hai luồng để tránh nhầm tài khoản demo với JWT.

## 2026-10-07 — Hoàn thiện backend/API trên schema SQL Server

- Dùng SQLAlchemy Core + pyodbc reflect whitelist bảng/view. Script T-SQL đã thiết kế là nguồn schema duy nhất; không sinh DDL ORM trùng lặp. Migration runner được gọi chủ động, không tự tạo DB khi server khởi động.
- Giao dịch ngắn, khóa user và request UUID phối hợp retry; rowversion phát hiện sửa dữ liệu cũ. Mỗi request auth đối chiếu DB session để revoke có hiệu lực ngay. Argon2 cho mật khẩu, JWT access có issuer/audience/purpose; refresh/reset chỉ lưu hash.
- SQL đồng bộ chạy worker thread cho luồng chat/practice async; LLM ngoài transaction, timeout và trạng thái lỗi/hủy lưu lại. Mock có nhãn và không tạo điểm AI nói/viết. Listening chấm SQL, trả answer key sau nộp; transcript vẫn phục vụ browser TTS demo.
- Pillow xác thực/re-encode avatar; WAV đo duration từ frames; ffprobe kiểm tra WebM/Ogg. Media private, tải qua owner + Bearer. Image Docker có ODBC 18/ffmpeg; Windows local dùng driver hiện có, cần ffprobe riêng cho WebM/Ogg.
- Reset mật khẩu qua SMTP STARTTLS tùy chọn. Thiếu cấu hình trả 503 đồng nhất; lỗi gửi khi đã cấu hình trả 202 đồng nhất và log chung không tiết lộ recipient/token. Không gửi email hoặc paid API trong tests.
- Giới hạn body/auth work và semaphore hash mật khẩu chống chiếm hết tài nguyên trong một process. Rate limiter theo peer IP/process; deployment qua proxy/nhiều worker cần cấu hình riêng.
- Test schema/API trong tempdb với guard + outer rollback; CI có SQL Server service disposable. CI mới chưa push/chạy GitHub; kiểm chứng local không thay thế kết quả workflow.
- Giao diện đa trang giữ ở nhánh riêng; không tự merge hoặc sửa localStorage trong tác vụ backend. OAuth, email verification, STT, streaming, real LLM và account deletion còn trong backlog.

## 2026-10-07 — Thiết kế SQL Server theo chương trình hiện có

- Chọn SQL Server theo yêu cầu người dùng, thay phương án PostgreSQL ở backlog; chưa đổi runtime backend hoặc cài dependency database. Script mục tiêu SQL Server 2019+, kiểm chứng trên SQL Server 2022 Developer.
- Thiết kế 22 bảng/2 view trong schema `em`, bao phủ toàn bộ UI học tập và tài khoản. Không thêm bảng linh thú, admin, thanh toán hay memory vector vì chưa có nghiệp vụ tương ứng.
- Tách catalog có revision khỏi lịch sử từng người; notebook lưu nghĩa/ví dụ riêng thay vì từ điển chung. Từ archive giữ lịch sử ôn, filtered unique index cho phép thêm lại.
- StudySessions/FlashcardReviews là dữ liệu gốc của thống kê; view tổng hợp riêng trước join để tránh nhân số liệu. Ghi ngày địa phương/offset của sự kiện, UTC timestamps, rowversion cho optimistic concurrency. Chọn ngày hoàn thành khi phiên qua nửa đêm; chưa chia nhỏ thời lượng theo ngày.
- Khóa ghép enforce owner và loại phiên/bài/câu hỏi; request UUID chống replay trùng. AI/provider chạy ngoài transaction, kết quả mock có nhãn riêng. Chính sách cập nhật lịch ôn/đóng phiên nằm trong transaction service sẽ triển khai tiếp.
- Script tạo schema atomic và từ chối schema đã có, không dùng DROP/TRUNCATE/cascade. Seed catalog chạy lại được và không tạo tài khoản/mật khẩu. Kiểm thử trong tempdb với outer transaction, guards và rollback; 45/45 kiểm tra qua, xác nhận không còn schema thử.
- Giới hạn: localStorage không có lịch sử từng lượt nên không thể dựng lại counter cũ chính xác; cần baseline migration riêng nếu muốn giữ tổng cũ. Auth/ORM/concurrency và SQL Server 2019 riêng chưa kiểm thử.

## 2026-10-07 — Sửa cache CI và health check Docker

- Bỏ `cache: pip` và `cache-dependency-path` khỏi `setup-python` theo yêu cầu sửa CI. Task runner đặt `PIP_CACHE_DIR` thành `.cache/pip` chỉ trong tiến trình con, trong khi action dùng đường dẫn mặc định của runner; không còn bước lưu cache pip vào thư mục mặc định có thể chưa được tạo.
- Đây là vấn đề đường dẫn cache trong cấu hình hiện tại, không phải pip-tools không tương thích với cache. `setup-python` hỗ trợ requirements qua `cache-dependency-path`: [tài liệu chính thức](https://github.com/actions/setup-python/blob/main/docs/advanced-usage.md#caching-packages). Nếu thêm cache lại, cần thống nhất đường dẫn giữa action và task runner.
- Dùng curl trong image backend theo yêu cầu; cài với `--no-install-recommends` và dọn apt lists. Health check thất bại khi HTTP lỗi hoặc request quá 2 giây, với start period 15 giây và timeout Docker 3 giây.
- Thêm start period 30 giây cho frontend Compose. Docker vẫn chạy probe trong giai đoạn này; các lần thất bại chưa được tính vào số retries cho đến khi hết giai đoạn khởi động hoặc có probe thành công.
- Giữ Docker frontend ở chế độ dev. Mẫu production trong tài liệu tham chiếu là tùy chọn và stage cuối chưa có package/script để chạy lệnh dev; triển khai production cần server static và proxy API riêng khi có yêu cầu.

## 2026-10-06 — Panel cuộn tài khoản theo brand EngMate

- Tham khảo logic đổi nửa form/nửa CTA của các tutorial đăng nhập, nhưng không dùng bố cục cyan đặc/trắng phẳng. Panel dùng gradient navy→cyan, Mate làm điểm nhấn, sóng SVG và quỹ đạo để khớp nhận diện dự án.
- Animation chính là `translate` đồng bộ giữa panel và form (~0.92s), kèm clip-path “mở cuộn”, stagger field, ribbon/tia sáng; không thêm thư viện. Mobile bỏ slide ngang, dùng pill; giảm chuyển động tắt CSS/WAAPI chiều cao.
- Giữ một form trong DOM, nút xã hội chỉ giao diện, khôi phục mật khẩu full-width.

## 2026-10-06 — Giao diện đăng nhập xã hội và chuyển cảnh

- Người dùng chọn hoàn thiện giao diện trước khi kết nối OAuth thật. Thêm ba nút có logo riêng, callback và thông báo chưa khả dụng; không tạo phiên mô phỏng nhà cung cấp, không mở trang ngoài hoặc thêm cấu hình OAuth chưa dùng.
- Chỉ giữ một biểu mẫu trong DOM, dùng key theo chế độ để làm mới ô mật khẩu nhưng giữ tên/email trong state. CSS chuyển mờ/trượt theo hướng, nghiêng nhẹ và dịch nền tab. Đo chiều cao tự nhiên trong layout effect rồi dùng Web Animations API 420 ms để khung không nhảy; khi bấm nhanh, hủy chuyển động cũ và bắt đầu từ vị trí hiện tại.
- Không thêm thư viện. Chế độ giảm chuyển động tắt CSS và bỏ/hủy animation chiều cao; listener tùy chọn hệ thống được dọn khi rời trang. Các nút và trạng thái vẫn dùng được bằng bàn phím/trình đọc màn hình.

## 2026-10-06 — Mate trở thành linh thú dự án

- Giữ robot trắng/xanh nhạt, mặt navy, mắt cyan và anten vàng đã được người dùng chọn; đặt tên Mate và dùng nhất quán. Thêm tay/biểu cảm và tai nghe, phát triển bản sắc riêng quanh sự đồng hành khi học.
- Tách nhân vật thành `LinhThu` để các trang chia sẻ tỷ lệ và biểu cảm; `TrangTri` chỉ phụ trách bối cảnh banner. Dùng CSS đang có, không thêm thư viện animation hay vòng render liên tục. Có bản vector tĩnh để tái sử dụng trong tài liệu.
- Biểu cảm ăn mừng dựa vào đáp án thật, phiên ôn hoàn thành hoặc mục tiêu ngày đạt; sai thì động viên. Không thêm thành tích/XP/chuỗi ngày giả, không biến phản hồi AI mẫu thành đánh giá thật. Giữ thông báo chữ và hai chế độ giảm chuyển động.

## 2026-10-06 — Bổ sung trang trí và chuyển động

- Theo phản hồi giao diện quá đơn điệu, thêm banner gradient, nhân vật CSS và các điểm nhấn màu theo nhóm thẻ; giữ nội dung nhãn gọn đã được yêu cầu trước đó.
- Dùng CSS keyframes/transition cho hiệu ứng vào trang, thẻ xuất hiện lần lượt, hover, nút, nhân vật/orbit và các trạng thái luyện tập. Không thêm thư viện hay JavaScript cập nhật mỗi khung hình; phần lớn chuyển động dùng transform/opacity.
- Trang trí tách trong `TrangTri`, bỏ khỏi cây trợ năng và không chặn chuột. Giảm chuyển động từ Cài đặt hoặc hệ thống tắt animation/transition nhưng vẫn giữ hình và nội dung.

## 2026-10-06 — Thiết kế tối giản và giảm mô tả phụ

- Dùng một màu nhấn xanh, nền trung tính, viền nhẹ và khoảng cách thống nhất; thay stylesheet trang trí cũ bằng biến màu sáng/tối để tránh các bảng màu riêng theo trang.
- Bỏ mô tả lặp lại nhãn/tiêu đề ngay trong JSX, thay vì chỉ ẩn bằng CSS. Giữ nội dung bài học, thông tin thay đổi quyết định thao tác (độ khó, chu kỳ ôn), lỗi/kết quả và nhãn phản hồi minh họa.
- Dùng `details` cho hướng dẫn luyện nói/flashcard nhằm giữ trợ giúp khi cần mà không chiếm bố cục ban đầu. Không thêm thư viện, không thay cơ chế lưu trữ hoặc API.

## 2026-10-06 — Tách đăng nhập khỏi không gian học tập

- Theo yêu cầu thiết kế lại, chọn trang hash riêng `#dang-nhap` thay cho nhúng biểu mẫu vào Cài đặt. Trang tài khoản có header/main/footer riêng, không hiển thị sidebar hoặc topbar học tập.
- Giữ Context/localStorage bên ngoài cả hai bố cục để chuyển trang không làm mất hồ sơ, tùy chọn hay phiên. Giữ alias tài khoản cũ; menu avatar trỏ trực tiếp đến trang mới.
- Không thêm thư viện routing; hash route hiện có đủ cho bản demo. Khách vẫn có thể học, đăng nhập thành công có nút vào tổng quan; xác thực backend tiếp tục nằm trong backlog.

## 2026-10-06 — Cài đặt và tài khoản trong app shell

- Đặt tài khoản trong `#cai-dat?muc=tai-khoan` theo yêu cầu; giữ alias `#tai-khoan` để liên kết cũ tiếp tục dùng được.
- Mở rộng Context/localStorage hiện có thay vì thêm thư viện hoặc kho dữ liệu riêng. Cài đặt được kiểm tra từng trường và bổ sung mặc định, giữ dữ liệu hồ sơ của bản cũ.
- Theme theo hệ thống dùng `matchMedia` và dataset, giảm chuyển động dùng CSS; tốc độ đọc áp dụng cho Web Speech hiện có. Không triển khai backend auth/email ngoài phạm vi thay đổi giao diện này.
- Avatar dùng disclosure có nút, liên kết và nhóm hành động, điều hướng Tab tự nhiên; thêm hover cho desktop và click cho mobile, không dùng menu ARIA giả thiếu hành vi bàn phím.

## 2026-10-04 — Dựng lại khung

- Giữ tên EngMate-AI và chọn React/TypeScript + FastAPI/Python theo yêu cầu reset.
- Dùng TypeScript strict, Pydantic, mypy và schema validation để phát hiện lỗi ở ranh giới dữ liệu.
- Tách route/service/provider, dùng mock mặc định. Chưa chọn provider thật hoặc ngân sách; không cần API key để phát triển khung.
- Task runner Python dùng argument list cho subprocess, xử lý đường dẫn Unicode đúng trên Windows; GNU Make chỉ còn là wrapper tùy chọn.
- Cổng local 8010/5174 tránh dịch vụ khác đang dùng 8000/8001/5173 trên máy hiện tại.
- Lockfile backend/npm được giữ đồng bộ với manifest. Vitest/coverage dùng 4.1.11; nguồn phiên bản vá: [advisory của Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).
- DB/auth/chat streaming được làm theo backlog khi bắt đầu nghiệp vụ; scaffold không tạo database hoặc giả lập đăng nhập.
- Bản nguồn cũ được sao lưu trong `.artifacts/before-reset-*`; Git history và môi trường cài dependency hiện có tiếp tục dùng cho checkout này.

## 2026-10-08 — Blaze speech adapter

Theo yêu cầu nối key TTS/STT, dùng httpx async (đã có pin 0.28.1 trong dev lock) làm runtime dependency thay vì SDK mới. TTS poll trong timeout và trả MP3 vì payload Blaze thực tế là MP3; không tin URL audio từ provider. STT synchronous, không lưu DB; mặc định JWT, local demo opt-in. Không nối UI hoặc biến speech thành LLM/chấm phát âm.

2026-10-08: theo yêu cầu tiếp nối, đổi toàn bộ nút Nghe sang NutDoc gọi backend; chia sẻ useThuAm cho Speaking/Hội thoại. Văn bản STT là bản nháp sửa được, không tự gửi chat, không biến feedback mẫu thành chấm phát âm. Không giữ key ở frontend và không dùng browser speech synthesis để thay thế kết quả Blaze khi lỗi.

2026-10-08: lấy danh sách giọng qua endpoint backend thay vì hard-code 27 giọng vào UI. Giọng người dùng chọn là cài đặt trình duyệt, dùng cùng vòng đời localStorage hiện có; không mở rộng SQL ngoài phạm vi. Preview dùng TTS cùng giọng/tốc độ để phản ánh cách đọc trong bài học.

2026-10-08: giảm độ trễ bằng preload có chọn lọc và cache RAM theo text/voice/speed. Dùng chung generation giữa preload/click, mỗi caller hủy độc lập; cache bị chặn bởi số clip/bytes/TTL và xóa khi logout. Chưa thêm streaming, lưu audio lâu dài hoặc thay giọng người dùng bằng browser synthesis. Lần tạo đầu vẫn phụ thuộc Blaze; preload có thể tốn credit, nên danh sách nhiều nút không tải hàng loạt.

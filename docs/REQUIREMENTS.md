# Yêu cầu EngMate-AI — lớp học đối thoại TOEIC, 2026-10-18

## Năm mục học tập, ưu tiên Từ vựng — 15/11/2026 (duyệt có điều kiện)

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| VOCAB-01 | Lưới chủ đề thường gặp, trang chủ đề đủ từ, schema và nội dung server | Có mã 2×50 trong worktree; chưa nghiệm thu nội dung; demo Docker source-mount, chưa build/deploy image (xác nhận lần cuối 16/11/2026) |
| VOCAB-02 | Đã nhớ theo owner, tìm/lọc, thẻ/quiz, TTS theo click, migration local cũ | Đã có UI/API/test; kiểm browser/phiếu rà và gate sau sửa CSS còn đang hoàn tất |
| VOCAB-03 | Chủ đề AI riêng, UUID bền vững, lô nhỏ/validation/quota/expiry | Thiết kế; chưa gọi provider |
| LEARN-UX-01 | Bổ sung Phát âm, Bài học, Lộ trình, Tiến độ theo từng cổng | Đã duyệt thứ tự; từng mục vẫn có cổng riêng |

Chi tiết kiểm toán, màn hình, API, quyết định mở và cổng dừng:
[LEARNING_VOCABULARY_DESIGN_2026-11-15](LEARNING_VOCABULARY_DESIGN_2026-11-15.md).
Nội dung TOEIC/logic hoàn thành, persona, chat/voice/auth giữ nguyên.
Điều kiện mới: IPA Anh–Anh đối chiếu TTS UK mặc định; quota/cỡ lô qua env;
thiếu bảng vocabulary vẫn đọc JSON và báo “chưa cài đặt” ở phần DB; ẩn nghe khi
speech tắt; cho sửa riêng chữ topbar kèm test. Baseline sạch/MySQL/worktree theo
[kế hoạch tiền triển khai](VOCABULARY_PREFLIGHT_2026-11-15.md), đã qua baseline
riêng và M1/M2. Trạng thái hiện tại/bằng chứng:
[nhật ký kiểm thử](VOCABULARY_TEST_INVESTIGATION_2026-11-15.md).
CSV rà lấy ngẫu nhiên đúng 5/50 mỗi chủ đề cộng 7 mục có cờ:
[phiếu 17 mục](VOCABULARY_CONTENT_REVIEW_2026-11-16.csv), tất cả **chờ người duyệt**,
không thay cho thẩm định chuyên môn. Chưa mở 16 chủ đề hoặc sinh AI hàng loạt.

## Bảo toàn C1/C2 — cập nhật 16/11/2026

C1 `405f030`, C2 `d67f97b` đã commit theo từng lệnh duyệt và kiểm hash checkout
sạch; checkout chỉ đọc rồi dọn, chưa chạy test ở đó. Eval workspace 89/89 và
kiểm cuối judge 12/12 qua với fixture tổng hợp; HTTP thật/artifact private bị
chặn, 0 lần thử truy cập. Không nới assertion, timeout hoặc ngưỡng coverage.
C3 `4e0698f` đã commit tài liệu thoại, hook qua; C4 đang chuẩn bị.
Không nghiệm thu judge hoặc kết luận coverage/frontend đã ổn.
[Bằng chứng và phân loại file](CHANGESET_PLAN.md). Trạng thái dưới là lịch sử.

## Trạng thái rà soát 14–15/11/2026

Bước bảo toàn sau kiểm toán: đã có backup 151 file/hash khớp, quét 192 file,
chuyển nhánh riêng bằng lệnh duyệt; chưa stage/commit hoặc kiểm checkout sạch.
[Kế hoạch mới](CHANGESET_PLAN.md) giữ raw results/CSV cục bộ, phân loại mỗi file
và bốn nhóm commit; cổng test judge độc lập raw private chưa hoàn tất. Không
suy việc có runner/backup thành đã nghiệm thu hoặc toàn bộ test xanh.

Sau khi người dùng duyệt: MySQL tạm đã kiểm chứng đủ **254 test qua, 0 skip**,
coverage backend **93,04% ≥80%**, cleanup xong. Rubric/model/ngân sách judge
được duyệt; runner riêng qua test offline, xem REPORT/ledger để biết kết quả thật.
Judge đã chấm đầu 222 phản hồi (222/444 request): 181 pass, 24 fail,
17 no_data, không retry/429; [229 phiếu tay](../backend/evals/scope/results/judge-combined-20261115/manual_priority.csv)
chưa được chấm, chưa nghiệm thu. Đổi định dạng giữa đợt giới hạn so sánh v6/v7.
Resume sinh vẫn chờ xác nhận quota, Pha C/D/E vẫn chờ thiết bị; frontend chưa
được kết luận ổn định từ kết quả backend này.
Smoke local chạy lại sau duyệt đã qua health/proxy/capabilities/OpenAPI;
không thay kiểm thiết bị hoặc đăng nhập/SSE thật.

[Bàn giao mới nhất](PROMPT_VOICE_REVIEW_2026-11-15.md): mã đã có trong snapshot
nhánh dùng chung; kiểm chứng frontend cuối chưa xanh. Chưa nghiệm thu hoặc bật
cờ thoại; trạng thái judge/MySQL được cập nhật phía trên. Phần từ vựng thuộc
tác vụ riêng được giữ nguyên.

- Prompt v7 giữ nguyên hash `e75a86fd…722680`; chính sách cuối tại [PROMPTS](PROMPTS.md#current-policy).
- 422 phản hồi đã screening lại offline; không thay checks, chưa nhóm nào đủ ba lượt.
  Phiếu mới 215 phản hồi giữ nguyên; [rubric](../backend/evals/scope/JUDGE_RUBRIC_DRAFT.md)
  đã duyệt, kết quả judge có ledger riêng; chấm tay/nghiệm thu vẫn chờ.
- Không resume sau 429; chưa rõ rate/day quota. Lịch 624 slot xen kẽ và trần 1.248 request
  bổ sung chỉ được chuẩn bị; runner live chưa nối lịch mới, bốn lỗi terminal tách riêng.
- Thoại A/B/debug vẫn mặc định tắt. Mục tiêu ≥70% theo từng nhiễu/RMS/SNR chưa đạt;
  [onset thích nghi](VOICE_ONSET_DESIGN.md) chỉ thiết kế. Pha C/D/E chờ thiết bị thật.
- Coverage backend đã đạt 93,04% sau [MySQL tạm](MYSQL_TEST_PROPOSAL.md), cleanup xong;
  không coi hậu tố schema là đủ bảo vệ. [Flake Settings](SETTINGS_TEST_INVESTIGATION.md)
  đã điều tra CPU, chưa sửa. Không tái tạo PROGRESS.md.

## Bổ sung đo/giải thích, không mở pha mới — 14/11/2026

- Thêm request STT/phút và thời gian trạng thái đang thu theo từng kịch bản/mode.
  Giải thích hồi quy hồng và phân biệt lượt đóng bình thường với discard trước/
  sau STT. Pha A sau STT không tiết kiệm request STT của lượt đã nhận dạng.
- Debug opt-in `VITE_VOICE_DEBUG=false`: console chỉ có bộ đếm/scalar, không
  PCM/transcript/lưu trữ/gửi mạng. Không thay ngưỡng hoặc hành vi loại nhiễu.
- Chặn thêm trước STT chỉ là đề xuất chờ duyệt. ≥70% khó đạt chỉ với A+B;
  C/D/E tiếp tục hoãn, không commit/push.
- Đã kiểm: frontend 472/472; benchmark 23/23; lint/build qua. Coverage frontend
  90,09% /82,54% /86,14% /93,16% (statements/branches/functions/lines).


## Cập nhật VAD đã duyệt — 14/11/2026

- Pha A: triển khai opt-in `VITE_VOICE_SOFT_GATE`, thông báo nhẹ dùng style cũ,
  không thêm VoiceState; chữ rỗng không gọi Gemini/tạo tin nhắn, lỗi thật giữ kênh lỗi.
- Pha B: triển khai opt-in `VITE_VOICE_ADAPTIVE_VAD`, nền thích nghi, hysteresis,
  tối thiểu 200 ms tiếng, đóng capture nhiễu đều và fallback EnergyVad khi lỗi.
- Tiêu chí giữ nguyên: giảm onset nhầm ≥70%, tăng bỏ sót ≤2 điểm %, p50 tăng
  ≤150 ms theo loại tín hiệu và RMS/SNR; nhiễu liên tục không giữ thu đến cap.
  Triển khai không đồng nghĩa đạt tiêu chí; xem kết quả và giới hạn trong
  [VOICE_VAD_BASELINE.md](VOICE_VAD_BASELINE.md).
- Pha C chưa triển khai, chờ duyệt phép đo đầu ra; D/E hoãn. Sau B dừng cho
  thử thiết bị thật; không đổi timeout/assertion hiện hữu, không commit/push.
- Đã test: frontend 466/466, benchmark 21/21, lint/build qua; frontend coverage
  89,96% statements /82,38% branches /86,00% functions /93,07% lines. Backend
  230 qua, 24 skip; coverage toàn repo chưa qua vì backend 73,98% <80%.


## Độ bền đầu vào thoại trước tiếng ồn — 13/11/2026 (lịch sử Bước 1)

- Bước 0–1: đã tách VAD hiện có và đo nền ngoại tuyến, giữ nguyên hành vi.
  Có đối chiếu frame, số liệu tổng hợp batch/realtime và hỗ trợ WAV riêng có nhãn.
  Frontend đã test 427/427, benchmark 19/19; coverage frontend >80% cả bốn chỉ số.
  Kiểm chứng toàn repo còn thiếu: coverage backend 73,93%, 24 test DB bị skip.
- Pha A–C: **chưa làm, chờ duyệt** mục tiêu/công tắc và phạm vi notice UI.
- Neural VAD, giảm âm lượng, hiệu chuẩn đầu phiên, hợp nhất cấu hình native/Blaze
  và khảo sát speaker verification: **chưa duyệt**.
- Chưa chứng minh chất lượng giọng/loa/thiết bị thật. Chi tiết số liệu, kiểm chứng
  và bảng kiểm thủ công: [VOICE_VAD_BASELINE.md](VOICE_VAD_BASELINE.md).

## Chính sách cuối — 2026-11-13

Đã khóa prompt version 7 (5.997 byte), từ chối mặc định VI với ngoại lệ
yêu cầu rõ trả lời Anh; cho phép ví dụ/câu luyện Anh cạnh lời Việt. Checker
chỉ gắn cờ từ chối lặp song ngữ hoặc trộn trong câu từ chối. Quy tắc mới,
không ghi đè kết quả cũ. 95 test cấu trúc/offline và lint qua. Giữ corpus
248 và các đầu vào, kỳ vọng mười case ngôn ngữ là VI. Không pilot nữa.

Đã được duyệt sinh full 744 v7 +306 v6, tối đa 2.100 request. Thực tế dừng
do 429 ở request 428: 422 phản hồi, 4 lượt cuối thiếu dữ liệu, 624 chưa chạy;
hai retry 502 thành công, không tự resume. Tuần tự/checkpoint/Retry-After.
Không judge/Blaze; sau sinh chỉ xuất phiếu tay và rubric judge để duyệt riêng.
Phiếu tay có dữ liệu 174 phản hồi, khung 411 dòng/137 case-version. Chưa
đủ ba lần hoặc nghiệm thu chất lượng; mẫu 24 lượt cũ nguyên vẹn, xem REPORT.

## B theo ngôn ngữ hội thoại — 2026-11-13

Đã áp dụng prompt B 5.979 byte, version 7, giữ các sửa trước; checker chọn
ngôn ngữ chủ đạo cho redirect. Corpus 248 (sáu kỳ vọng sửa, bốn đầu vào mới).
85 test cấu trúc/offline và lint qua. Pilot 30 phản hồi/30 request, không
lỗi/retry: đúng ngôn ngữ **60%**, thấp hơn 90%; 12 lượt toàn Anh vẫn trả
Việt. Voice 12/12 ≤45, nhưng có hai chuyển hướng trộn thật trong sáu cờ
thô (bốn cờ checker bắt mẫu câu). **Không đạt**, dừng theo yêu cầu, không
sửa thêm hoặc chạy full/LLM-judge/Blaze; chưa tạo khóa prompt đạt chuẩn.
Phiếu tay phân tầng mới 27 lượt/9 case; mẫu 24 cũ giữ nguyên. Xem REPORT.

## Một vòng sửa A và chạy lại — 2026-11-13

Đã sửa đúng hai dòng ngôn ngữ v7, không bỏ quy tắc khác, giữ version 7;
5.684 byte trong trần mới 6.500 byte. Test cấu trúc 67 qua và lint qua.
Live lại cùng sáu case × ba lần: 18 phản hồi/18 request, không lỗi/retry;
0/18 tiếng Anh, 18 vi, 0 unknown theo checker, 9/9 voice ≤45 từ. Dưới quy
tắc chọn A đã chốt 15/18, nên dừng và đề xuất diff B **chưa áp dụng**.
Không sửa thêm prompt/checker/case; mẫu 24 lượt giữ nguyên. SCREENING có
dòng đầu mỗi phản hồi, tách hai unknown vòng gốc. Chưa nghiệm thu chất
lượng hoặc chạy bước 2–3/full/judge/Blaze; chờ quyết định của người dùng.

## Live bước 1 sau quyết định A — 2026-11-13

Sáu case × ba lần v7 đã có 18 reply/18 request. Hình thức: không có lượt khớp
Anh, 16 vi, 2 unknown; 9/9 voice ≤45 từ. Chưa đạt nghiệm thu; đang chờ người
dùng xem trước khi xác nhận bước lớn/judge. Trần tương lai và cách lấy mẫu
chấm tay ghi trong REPORT; không dùng kết quả sàng lọc làm điểm ngữ nghĩa.

## Ngôn ngữ từ chối theo quyết định A — 2026-11-13

Từ chối theo ngôn ngữ lượt mới nhất, dùng tiếng Anh đơn giản theo level khi
lượt đó bằng Anh. Đã làm rõ persona v7 (5.599 byte), giữ checker ngôn ngữ;
thêm 6 case A1/B1/C1 × text/voice thành 244, prefix 238 case giữ nguyên.
Chưa có Gemini/eval đầy đủ cho hash mới, giữ mẫu 24 lượt đang chấm.

## Làm rõ checker voice — 2026-11-13

Checker độ dài voice chỉ áp trần 45 từ, không chặn dưới. Tính lại pilot gốc:
v6 9 → 6 cờ, v7 9 → 0; gỡ đúng 12 lượt ngắn, 48 test mục tiêu qua. REPORT
và SCREENING liệt kê từng lượt gỡ cùng 10 cờ ngôn ngữ out_of_scope. Mẫu chấm
24 lượt giữ nguyên; đang chờ chấm tay, chưa chạy bộ 238 case hoặc nghiệm thu.

## Rà pilot sau phản hồi người dùng — 2026-11-12

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| SCOPE-09 | Rà từng cờ ngôn ngữ/voice theo nhóm và persona, sửa detector sai, không đổi case | Đã xuất bảng/ID/phân loại 34 cờ; sửa heuristic, 43 test mục tiêu qua |
| SCOPE-10 | Bốn 502 chưa có dữ liệu, retry tối đa một lần/slot, có trễ và dừng nếu lại lỗi | Đúng bốn retry đã có reply, kết quả riêng; ngữ nghĩa chưa chấm |
| SCOPE-11 | Coverage HEAD sạch, thiếu MYSQL_TEST_URL; không hạ ngưỡng | HEAD 72,38%, 210 qua/24 skip; workspace đo lại 73,93%; đều chưa đạt 80% |
| SCOPE-12 | Chờ chấm 24 lượt, không chạy đầy đủ hoặc kết luận v7 tốt hơn | Đang chờ; REPORT ghi cỡ mẫu nhỏ; chạy đầy đủ cần báo trần lượt và duyệt riêng |

## Trung thực và hồi quy v7 chưa phát hành — 2026-11-12

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| SCOPE-06 | Trả lời là AI, không nhận là người; tự giới thiệu/khả năng dạy trong phạm vi, không bàn nội bộ | Đã sửa prompt, thêm 6 case identity; chờ chấm ngữ nghĩa |
| SCOPE-07 | Không có/không đoán đáp án checkpoint; chỉ app chấm. Không bịa UI ngoài lesson context | Đã sửa prompt, thêm 2 case checkpoint và 2 app_ui; chờ chấm tay |
| SCOPE-08 | Giữ hồi quy v6, thêm tiếng Anh ngoài phạm vi/hỗn hợp và phân biệt trích dẫn tiêu cực/khủng hoảng | 238 case, giữ nguyên 210 cũ; 28 test mục tiêu qua; pilot 116 reply/120 lượt thử, chưa chấm tay |

V7 mới dài 5.578 byte, ngưỡng 5.600 byte được người dùng cho phép; v6 bất biến.
Pilot mới 20 × 3 × v6/v7, có ledger và kết quả riêng; xem REPORT trong eval.
Không coi test cấu trúc hoặc screening là bằng chứng đạt ngưỡng chất lượng.

## Phạm vi giáo viên Mate v7 — 2026-11-11

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| SCOPE-01 | Chỉ dạy/luyện tiếng Anh, TOEIC L&R và hướng dẫn tính năng học cơ bản; chuyển hướng theo ngữ cảnh, giữ phase | Đã viết persona.v7; pilot dừng ở lượt 16 do 429, chưa chấm tay |
| SCOPE-02 | Giữ ngôn ngữ lượt mới nhất, voice ngắn/không Markdown và xưng hô hiện tại | Test cấu trúc/fake; chất lượng sinh lời cần eval |
| SCOPE-03 | Không xuất chỉ dẫn/payload/answer key, không giả điểm/tiến độ; được dạy bằng material của bài | Test ghép prompt loại checks; prompt không phải bảo đảm bảo mật tuyệt đối |
| SCOPE-04 | Khẩn cấp được tạm gác bài và câu hỏi học tập; hướng dẫn chung, không số điện thoại | Phạm vi đã được người dùng duyệt; chờ chấm tay |
| SCOPE-05 | 210 case tổng hợp; pilot opt-in 20 × 3 × v6/v7, tối đa 120 lượt; không judge trả phí | 25 test mục tiêu qua; 15 reply/16 lượt thử; chưa hoàn tất pilot hoặc đạt coverage backend 80% |

Ngưỡng đã duyệt, giáo viên hướng dẫn còn xem lại: trả lời ngoài phạm vi ≤3%,
từ chối nhầm ≤3%, rò rỉ/giả mạo tiến độ 0, ngôn ngữ ≥98%, độ dài voice ≥95%.
Không coi fake hoặc screening hình thức là bằng chứng đạt ngưỡng. Lượt từ chối
completed vẫn có thể được tính vào practice_turns; chưa thay logic completion.
Chi tiết: [rubric và cách chạy](../backend/evals/scope/README.md).

## Nâng cấp trình bày theo ảnh duyệt — 2026-11-11

- Chỉ sửa CSS; giữ nguyên logo/linh vật, nội dung, control và logic.
- Áp dụng palette/cấp chữ/card/form thống nhất cho giao diện thật, hỗ trợ
  responsive và sáng/tối. Tính năng được đối chiếu theo hợp đồng 22 nhóm trong
  `UI_REFRESH_2026-11-11.md`; hash mã runtime được giữ nguyên.
- Đã triển khai và kiểm thử: 417/417 test frontend qua, coverage đạt ngưỡng;
  lint/build/smoke qua, Docker frontend healthy. Thoại trên thiết bị và OAuth
  thật cần người dùng kiểm tra, như các tích hợp hiện có trước thay đổi CSS.

## Thông báo lỗi hội thoại trực tiếp — 2026-11-11

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| VOICE-ERROR-01 | Thông báo lỗi trong phiên thoại tự ẩn sau 5 giây; lỗi phát sinh lại được tính lại thời gian | Đã triển khai và kiểm thử bằng fake timers |
| VOICE-ERROR-02 | Ẩn thông báo không dừng phiên đang hoạt động; phiên lỗi vẫn cho bắt đầu lại | Đã kiểm thử component |

Kiểm thử không gọi API AI tính phí. Lỗi tải danh sách giọng và giọng đã chọn
không khả dụng vẫn có hướng dẫn xử lý tại chỗ.

## Đăng ký và đăng nhập Facebook — 2026-11-06

- Luồng OAuth Facebook đã có ở frontend/backend; bổ sung các trường cấu hình
  Meta còn thiếu trong `.env` local. Người dùng tự nhập App ID/App Secret.
- Nút Facebook dùng được ở cả chế độ đăng ký và đăng nhập, không yêu cầu
  mật khẩu EngMate; phần đăng ký hiển thị hướng dẫn tạo tài khoản qua nền tảng.
- Kiểm thử thêm Facebook callback, tạo tài khoản/hồ sơ/liên kết một lần,
  đăng nhập lại và từ chối callback sai origin/source/provider/state.
- Docker đã nạp cấu hình; endpoint mở Facebook Login qua frontend trả 200,
  callback đúng origin local. Database có bảng OAuth và hỗ trợ tài khoản nền tảng.
- Nghiệm thu cấp quyền và đăng nhập với Meta thật vẫn cần thao tác người dùng;
  hướng dẫn tại [OAUTH_SETUP](OAUTH_SETUP.md).

## Liên kết Google với tài khoản cũ — 2026-10-30

- Đã được người dùng đồng ý cụ thể: Google trùng email chỉ liên kết sau khi xác
  nhận mật khẩu EngMate. Có thể hủy; lần sau đăng nhập Google trực tiếp.
- Đã triển khai, kiểm thử trạng thái/lỗi và bảo toàn user/profile/progress, nạp
  website local. Chưa nghiệm thu mật khẩu/binding trên tài khoản thật do người
  dùng tự thao tác. Không tự liên kết Facebook hoặc tài khoản không có mật khẩu.

## Đăng nhập nền tảng — 2026-10-29

| Yêu cầu | Trạng thái |
| --- | --- |
| Chỉ giữ Google/Facebook, bỏ GitHub | Đã triển khai và kiểm thử |
| Code exchange ở server, state/cookie, kiểm tra popup/origin | Đã triển khai và kiểm thử ngoại tuyến |
| Tạo/đăng nhập tài khoản nền tảng qua session hiện có | Đã kiểm thử bằng provider doubles và database trong bộ nhớ |
| Cấu hình client, cài bảng liên kết, nghiệm thu provider thật | Chờ Client ID/Secret, cấu hình ứng dụng nhà cung cấp và installer tường minh |

Không tự liên kết email trùng tài khoản cũ. Hướng dẫn: [OAUTH_SETUP](OAUTH_SETUP.md).

## Hoàn thiện sau rà soát — 2026-10-29

- Lộ trình, Bài học, Tiến độ có trách nhiệm riêng. Điều hướng Bài học luôn mở thư viện, cho phép quay lại bài đang học.
- Thư viện tìm không dấu, lọc chặng/thời lượng/trạng thái/cần ôn và hiển thị tăng dần; Tiến độ mở bài ôn trực tiếp.
- Không diễn giải lỗi tải thành chưa học/0 tiến độ. Giáo trình và kết quả tải độc lập; lỗi nêu phần thiếu và có nút thử lại.
- Hồ sơ/Cài đặt lấy tổng kết TOEIC từ API tài khoản; mục tiêu giao tiếp và thống kê tự ghi nhận trên thiết bị được ghi nhãn riêng.
- Chỉ hiển thị chức năng đang được hỗ trợ như chức năng khả dụng; OAuth/âm báo chưa có tích hợp phải ghi rõ. Không đưa độ chính xác, tốc độ hoặc lời chứng thực chưa xác nhận lên trang giới thiệu.
- Khôi phục giảm chuyển động từ lúc khởi động; nút mật khẩu và công tắc có tên truy cập được. Desktop ghim sidebar mặc định; mobile có menu cố định và drawer, biểu mẫu thu gọn, nút cảm ứng đủ lớn.
- Giữ nguyên hợp đồng API và dữ liệu; kiểm thử trực quan dùng tài khoản/dữ liệu giả lập.

## Tinh chỉnh giao diện — 2026-10-29

- Ba nút Google/GitHub/Facebook cùng một hàng ở đăng nhập và đăng ký; giữ nguyên xử lý xác thực.
- Toàn bộ mục Giao diện là nút đổi theme, dùng hover/focus chung với điều hướng.
- Vùng chat và ô nhập tận dụng chiều rộng nội dung, phụ đề thoại 15–20px tùy màn hình.
- Khung ứng dụng giới hạn trong viewport; trang chức năng cuộn trong vùng nội dung để sidebar desktop luôn hiển thị. Mobile giữ drawer có focus trap.
- Không thay đổi schema, API, tài khoản hoặc dữ liệu học tập.

## Đồng nhất giọng và danh xưng — 2026-10-23

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| VOICE-ID-01 | Nữ xưng cô, nam xưng thầy; thay đổi theo giọng hiện tại thay vì danh xưng cũ trong history | Đã triển khai, đã test payload/prompt và chuyển phiên |
| VOICE-ID-02 | Chỉ một giọng qua toàn bộ lời mở đầu và phản hồi, kể cả trộn tiếng Việt/Anh | Đã test 4 cấu hình giọng với opening và streaming TTS |
| VOICE-ID-03 | “Xin chào” được đáp theo tiếng Việt, tránh lời giới thiệu lai Anh/Việt | Đã sửa persona.v6 và voice-identity.v1, cấm rõ câu lai; chưa đánh giá sinh lời trên Gemini thật |

Kiểm thử dùng provider/audio doubles; chưa nghe và đánh giá phát âm Blaze thật
trong lượt sửa này. Bản frontend HTTP và backend local đã xác nhận tải code mới.

## Rà soát tối ưu toàn chương trình — 2026-10-22

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| OPT-AUDIT-01 | Rà frontend/backend/DB/AI/voice/deploy/test, chỉ rõ ưu tiên và bằng chứng | Đã rà soát code và kiểm thử offline; báo cáo tại `OPTIMIZATION_AUDIT.md` |
| OPT-AUDIT-02 | Triển khai hạng mục tối ưu sau audit và đo hiệu quả thực | Đã duyệt và triển khai history cursor, scoped counts, admission, playback receipt, catalog/body timeout, lazy/static cache và diagnostics; trạng thái từng mục tại OPTIMIZATION_AUDIT; benchmark provider/thiết bị thật chưa làm |

## Độ trễ P2 — STT realtime thử nghiệm, 2026-10-22

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| LAT-06 | Stream PCM trong lúc nói, giữ pre-roll, partial chỉ caption và final mới vào Gemini | Đã triển khai opt-in; test offline, chưa xác minh provider thật |
| LAT-07 | Ticket JWT/owned-open conversation, Origin, một lần/TTL; quota audio và dọn logout/stop | Đã triển khai, test offline |
| LAT-08 | Không fallback giọng hoặc replay job TTS đã lỗi; TTS chỉ retry POST khi `429` (tối đa hai lần), realtime STT lỗi/timeout fallback batch một lần (có thể thêm phí); mode batch rollback; giữ Gemini xử lý text và giọng Blaze hiện tại | Đã triển khai; không đổi model TTS |
| LAT-09 | Phép đo riêng batch/realtime, thời gian STT chồng lấp và phần chờ sau endpoint | Đã triển khai proxy; chưa có p50/p95 thực |
| LAT-10 | TTS realtime, VAD thích nghi, final coverage xác minh trên provider thật | Chưa làm/chưa xác minh, không bật mặc định realtime |

## Độ trễ thoại P0–P1 — 2026-10-22

| Mã | Yêu cầu | Trạng thái |
| --- | --- | --- |
| LAT-01 | Mốc endpoint/STT/LLM/TTS/playing, UUID liên kết và p50/p95 có số mẫu, không lưu nội dung riêng tư | Đã triển khai; chờ số đo provider/thiết bị thật |
| LAT-02 | TTS câu đủ nghĩa từ Gemini delta, phát có thứ tự, chuẩn bị trước tối đa một clip; gom câu ngắn sau hai clip | Đã triển khai; kiểm thử transport giả lập |
| LAT-03 | Hủy lượt/clip cũ, giữ cancellation xuyên body HTTP, không fallback giọng; TTS chỉ retry POST `429`, không replay job generation/audio | Đã triển khai; kiểm thử hủy và lỗi giữa luồng |
| LAT-04 | Tái sử dụng pool HTTP Gemini/Blaze, không đóng pool khi hủy một lượt | Đã triển khai; kiểm thử vòng đời và hủy |
| LAT-05 | Streaming STT/TTS thực, VAD thích nghi và xác nhận phần đã nghe trong lịch sử | STT opt-in tại LAT-06; playback receipt theo clip hoàn tất đã triển khai; TTS realtime/VAD thích nghi chưa triển khai |

Chưa có baseline hay cam kết SLO. Endpoint hiện vẫn 900 ms danh nghĩa; mốc cuối
frame RMS và event `playing` chỉ là proxy, chưa phải khoảng trễ người dùng nghe
được đo vật lý. Giữ model, giọng và schema; chia nhỏ câu có thể tăng số job TTS,
còn gom câu ngắn sau hai clip giảm job. Voice context 12 tin/12.000 ký tự; text
chat 20 tin/32.000 ký tự. TTS/playback lỗi chỉ dừng audio và không kết thúc phiên.

## Chọn giọng trong Cài đặt — yêu cầu mới 2026-10-18

| Mã           | Yêu cầu                                                                                                                                         | Trạng thái    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| VOICE-SET-01 | Cài đặt có lựa chọn giọng tiếng Anh/Việt riêng, danh sách lấy từ Blaze qua API đã xác thực; có trạng thái tải, rỗng, lỗi và thử lại             | Đang tích hợp |
| VOICE-SET-02 | Chỉ gọi/phát nghe thử khi người học bấm nút; cho dừng, hủy khi đổi lựa chọn, rời trang hoặc tài khoản; lỗi không fallback giọng khác            | Đang tích hợp |
| VOICE-SET-03 | Nhớ giọng và tốc độ theo tài khoản trên trình duyệt hiện tại; dùng chung với menu chat, nghe câu trả lời/câu mẫu và phiên thoại Blaze tiếp theo | Đang tích hợp |
| VOICE-SET-04 | Giữ Gemini xử lý nội dung, không đổi ngôn ngữ nhận dạng theo giọng đã chọn; không thêm bảng SQL hoặc ghi tùy chọn vào tài khoản khác            | Đang tích hợp |

Phạm vi lưu giọng là trình duyệt hiện tại, chưa đồng bộ thiết bị. Chất lượng giọng và quota Blaze cần kiểm tra với dịch vụ thật; kiểm thử giả lập chỉ xác minh lựa chọn, luồng gọi và hủy âm thanh.

## Màu tương tác và khả năng đọc — cập nhật 2026-10-18

| Mã          | Yêu cầu                                                                   | Trạng thái                                          |
| ----------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| UI-COLOR-01 | Màu chính/phân nhóm và trạng thái hover/focus/chọn rõ, giữ bố cục sidebar | Test tương tác qua; cần kiểm lại hình học sau thay đổi flex sidebar |
| UI-COLOR-02 | Chữ mô tả/điều hướng/ô nhập dễ đọc, có bảng màu sáng/tối riêng            | Đã kiểm tra tương phản các trang/trạng thái lấy mẫu |
| UI-COLOR-03 | Giữ menu, hội thoại và luồng học, không tràn màn hình nhỏ                 | 226 frontend tests qua; browser 1440/900/390/320 px |

## Giao diện tối giản với thanh bên — yêu cầu mới 2026-10-18

Phạm vi này cập nhật không gian sau đăng nhập theo mẫu thanh bên người dùng cung cấp, thay cho thanh điều hướng ngang và hiệu ứng kính của bản lớp học trước. Trang đăng nhập, nhận diện Mate và các luồng học hiện có được giữ.

| Mã         | Yêu cầu                                                                                                               | Trạng thái                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| UI-SIDE-01 | Thanh bên gọn trên desktop, mở rộng khi di chuột hoặc dùng bàn phím, có thao tác thu/mở rõ ràng và mục đang chọn      | Test tương tác qua; bản hiện tại co giãn nội dung theo sidebar, cần nghiệm thu browser |
| UI-SIDE-02 | Điện thoại dùng nút menu và ngăn điều hướng; hỗ trợ Escape, đóng khi chọn mục và trả focus về nút mở                  | Đã kiểm thử unit, App và Chrome mobile              |
| UI-SIDE-03 | Điều hướng tới Cùng Mate, Lộ trình, Bài học, Phát âm, Từ vựng, Tiến độ; truy cập lịch sử, hồ sơ, cài đặt và tài khoản | Đã kiểm thử điều hướng và giữ bản nháp              |
| UI-SIDE-04 | Nền trung tính, viền mảnh, bố cục thoáng, ít hiệu ứng; hỗ trợ sáng/tối, bàn phím và giảm chuyển động                  | Đã kiểm thử đồng bộ theme và browser 4 kích thước   |
| UI-SIDE-05 | Giữ Gemini xử lý nội dung, Blaze STT/TTS, chat streaming, lịch sử, hồ sơ và tiến độ TOEIC theo tài khoản              | Giữ luồng hiện có; kiểm thử hồi quy chat/voice      |

Các mô tả giao diện ngang, nền xanh tím và hiệu ứng kính bên dưới ghi lại các đợt trước; UI-SIDE là yêu cầu trình bày hiện tại. Không thêm thư viện giao diện chỉ để chạy đoạn demo; tích hợp bố cục vào React/TypeScript hiện có của dự án.

## SQL khởi tạo theo dự án hiện tại

| Mã         | Yêu cầu                                                                                   | Trạng thái                                                 |
| ---------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| DB-BOOT-01 | SQL root tạo đủ tài khoản, hồ sơ, chat và bốn bảng lộ trình theo metadata backend         | Đã thực thi trên MySQL test mới: 13 bảng/4 trigger         |
| DB-BOOT-02 | Giữ base version 1 và CEFR hỗ trợ mọi chặng; giáo án/khóa API/avatar theo nơi lưu hiện có | Đã đối chiếu code và schema test                           |
| DB-BOOT-03 | Phân biệt cài mới với bổ sung bảng cho database cũ, giữ dữ liệu ứng dụng                  | Đã cập nhật hướng dẫn; chỉ bootstrap vào schema test riêng |

## Lộ trình TOEIC lấy đối thoại giọng nói làm chính

| Mã        | Yêu cầu                                                                                                                                             | Trạng thái                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| COURSE-01 | Catalog có xác thực: 5 chặng, 25 cụm, 100 bài nhỏ từ nền tảng đến mục tiêu 900+; mỗi bài có kiến thức/ví dụ/từ vựng/nghe/đọc/tình huống/kiểm tra    | Đã kiểm chứng schema, API và browser                   |
| COURSE-02 | Chọn điểm mục tiêu, chặng bắt đầu, phút/ngày và ngày thi tùy chọn; lưu theo tài khoản và phát hiện xung đột phiên bản                               | Đã kiểm chứng MySQL rollback và frontend tests         |
| COURSE-03 | Mở/tiếp tục hội thoại bài học; Gemini giảng, Blaze STT/TTS; năm bước khởi động/giảng/luyện/đối thoại/kiểm tra; giữ chat tự do                       | Đã kiểm chứng tích hợp với audio/API fixture           |
| COURSE-04 | Ngữ cảnh giáo án do máy chủ cung cấp; kết quả chỉ đếm lượt luyện thực tế và kiểm tra bằng đáp án chuẩn; không lộ đáp án trước khi nộp               | Đã kiểm chứng ownership, prompt, lượt và chấm server   |
| COURSE-05 | Tiến độ máy chủ, hoàn thành khi có ít nhất 3 lượt đối thoại thực tế với phản hồi hoàn tất và đúng toàn bộ câu kiểm tra; lịch ôn, bài gợi ý, học lại | Đã kiểm chứng persistence, retry và browser hoàn thành |
| COURSE-06 | Duyệt mọi chặng, trình bày bài nhỏ gọn, có nghe Blaze theo thao tác rõ ràng; không gọi TTS khi render/hover; hủy khi rời bài                        | Đã kiểm chứng audio cleanup và browser 4 kích thước    |

Giới hạn hiện tại: các chặng là cách nhóm khóa học đề xuất, không phải mức chính thức của ETS. Chặng xuất phát do người học tự chọn, chưa có placement test chuẩn hóa. Chưa có ngân hàng ảnh Part 1 hay đề thi đủ 200 câu; các bài nghe/đọc ngắn hỗ trợ giáo án đối thoại. Kết quả kiểm tra bài, số lượt và hoàn thành không phải điểm TOEIC, CEFR hoặc điểm phát âm. Nội dung và khả năng đối thoại cần được giáo viên/người học thật đánh giá; không coi transport doubles là bằng chứng chất lượng sư phạm.

Những mục hội thoại/giao diện cũ bên dưới được giữ để truy vết. Phạm vi COURSE mới thay thế giới hạn bốn chủ đề và tiến độ tự đánh dấu trên trình duyệt của lộ trình cũ.

## Giọng Mate theo yêu cầu mới

| Mã        | Yêu cầu                                                                                | Trạng thái                                          |
| --------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| BVOICE-01 | Gemini xử lý nội dung, Blaze STT/TTS cho thoại và giọng đọc; không fallback giọng khác | Đã triển khai; backend/frontend transport tests     |
| BVOICE-02 | Tự nhận lượt nói, chép lời → chat SSE có lưu lịch sử → phát giọng Blaze                | Đã triển khai; kiểm thử với audio/transport doubles |
| BVOICE-03 | Chen lời, mute, đổi giọng, stop/rời trang/logout dọn tài nguyên và chặn kết quả cũ     | Đã triển khai; kiểm thử lifecycle/cancellation      |
| BVOICE-04 | Thiếu Blaze không mở native voice; catalog Việt/Anh có bearer, không lộ secret         | Đã kiểm thử backend; không thay schema              |

Chất lượng giọng, quota dịch vụ và echo/microphone/loa thật cần kiểm chứng riêng.
Giáo trình TOEIC hiện được triển khai theo các yêu cầu COURSE ở trên.

## Khôi phục hồ sơ theo yêu cầu 2026-10-18

| Mã         | Yêu cầu                                                                  | Trạng thái                                   |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| PROFILE-01 | Avatar → Hồ sơ học tập, bố cục biểu mẫu/thẻ thông tin từ giao diện cũ    | Xong, kiểm tra browser desktop/mobile        |
| PROFILE-02 | Lưu thông tin cá nhân và mục tiêu học vào MySQL, không ghi đè version cũ | Xong, integration rollback và frontend tests |
| PROFILE-03 | Đổi ảnh raster, giới hạn 2 MB, lưu riêng tư và cập nhật menu             | Xong, kiểm tra browser và quyền sở hữu API   |
| PROFILE-04 | Tải lại sau lỗi/xung đột; giữ nội dung form khi lưu thất bại             | Xong, kiểm thử tự động                       |

## Yêu cầu mới 2026-10-18 — Lớp học cùng thầy Mate

Yêu cầu này thay thế giới hạn giao diện chỉ hội thoại trong các mục lịch sử bên dưới.

| Mã       | Yêu cầu                                                                    | Trạng thái                                                                       |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| TUTOR-01 | Giao diện theo Figma: nền xanh tím, nav ngang, linh thú đăng nhập làm thầy | Xong, kiểm tra browser desktop/mobile                                            |
| TUTOR-02 | Mục tiêu, lộ trình và giảng bài qua chat/voice thật                        | Bốn chủ đề ban đầu được thay bằng COURSE-01–06                                   |
| TUTOR-03 | Phát âm nghe mẫu/ghi âm/bản chép lời, không dựng điểm số                   | Xong, kiểm thử với transport doubles; micro/loa thật chưa kiểm chứng             |
| TUTOR-04 | Từ đã nhớ và nhịp học giao tiếp cũ theo dữ liệu người dùng tự ghi nhận     | Từ giao tiếp cũ còn lưu trình duyệt; tiến độ TOEIC dùng máy chủ theo COURSE-05   |
| TUTOR-05 | Prompt người thầy dùng chung chat/voice, chờ người học và nhận xét phù hợp | Xong, kiểm tra prompt v5 trong integration; chất lượng sư phạm cần đánh giá thật |
| TUTOR-06 | Giữ tài khoản, chat streaming, lịch sử, voice và sáng/tối                  | Xong, kiểm thử hồi quy                                                           |

Phạm vi này thay thế sản phẩm học tập nhiều trang trước đây, theo kế hoạch người dùng đã duyệt. Nhật ký cũ được giữ trong PROGRESS.md.

| Mã      | Yêu cầu                                                                                                 | Trạng thái                                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CHAT-01 | Đăng ký/đăng nhập thật, JWT/refresh xoay vòng, logout thu hồi phiên, ownership                          | Đã triển khai; kiểm chứng bằng tests/integration/test_chat_database.py                                                                                                                                  |
| CHAT-02 | Tạo/mở/kết thúc hội thoại, lưu tin và đọc lại lịch sử                                                   | Đã triển khai; API/MySQL và UI tests                                                                                                                                                                    |
| CHAT-03 | Lịch sử mới nhất trước và phân trang >100; context có giới hạn                                          | Đã triển khai; test 105 hội thoại                                                                                                                                                                       |
| CHAT-04 | Retry không nhân đôi; trạng thái pending/completed/failed/cancelled, hủy và hết hạn pending             | Đã triển khai; tests provider lỗi/timeout/hủy/kết quả muộn                                                                                                                                              |
| CHAT-05 | Ghi âm từng lượt, chép lời vào bản nháp, nghe/dừng và chọn giọng Blaze                                  | Có mã và mock transport/lifecycle tests; chưa kiểm chứng Blaze trả phí/micro vật lý trong lượt này                                                                                                      |
| CHAT-06 | Model thật sinh phản hồi, không mock production                                                         | Đã chuyển Gemini theo yêu cầu mới; adapter GenerateContent SSE đã nhận câu trả lời thật từ Flash-Lite, có tests transport/SQL/UI                                                                        |
| CHAT-07 | Đàm thoại hai chiều realtime, ngắt lời, cleanup/reconnect                                               | Đã triển khai Gemini Live relay WebSocket/PCM, VAD, persistence/ownership/cleanup và tests offline. Provider đã tạo audio thật từ text; **chưa kiểm chứng microphone/echo/barge-in trên thiết bị thật** |
| CHAT-08 | REST schema, lỗi an toàn, request limits, CORS, health/ready/capabilities, cấu hình dev/build đồng nhất | Đã triển khai; kiểm chứng qua contract/security/smoke                                                                                                                                                   |
| CHAT-09 | Giao diện desktop/mobile và truy cập bàn phím                                                           | Có CSS responsive/RTL tests; chưa có browser E2E mới                                                                                                                                                    |
| CHAT-10 | Giữ giao diện gốc, gồm đăng nhập/đăng ký; chỉ bỏ chức năng phụ                                          | Đã khôi phục CSS/Logo/Mate và shell gốc; tests App/AuthForm/MenuNguoiDung, chưa kiểm tra trực quan bằng browser                                                                                         |
| CHAT-11 | Khóa Blaze chỉ nằm ở backend                                                                            | Đã cấu hình riêng trong `.env` bị Git bỏ qua; chưa gọi dịch vụ tính phí để xác minh khóa                                                                                                                |
| CHAT-12 | Chat stream hiển thị dần và hủy phản hồi cũ                                                             | Đã triển khai SSE start/delta/done/error, một assistant ID, cancel/disconnect; test transport/SQL/UI                                                                                                    |
| CHAT-13 | Khóa provider private; quota/error không fake success                                                   | Gemini key backend/.env, giá trị OpenAI key local đã xóa; không log provider body, kiểm tra lỗi/quota/partial/blocked SSE                                                                               |
| CHAT-14 | Thay OpenAI bằng Gemini, giữ giao diện và Blaze                                                         | Đã tích hợp, cấu hình Gemini mặc định cho chat/live, header đúng provider; kiểm tra wire contract, PCM, ticket/Origin, lifecycle và MySQL riêng                                                         |
| CHAT-15 | Khung chat cố định, ô nhập trong màn hình, tin nhắn/lịch sử cuộn riêng                                  | Đã test: App regression và 72 kiểm tra hình học Edge tại 8 viewport, gồm phụ đề thoại dài/ngang thấp; bàn phím ảo thiết bị thật chưa kiểm chứng                                                         |
| CHAT-16 | AI trả lời theo tiếng Việt/Anh của người dùng, chuyển ngôn ngữ theo lượt                                | Đã triển khai persona.v4 dùng chung chat/Live; test kiểm tra prompt thực đi qua hai đường, không coi transport double là kiểm chứng chất lượng ngôn ngữ model                                           |
| CHAT-17 | Chọn giọng AI đối thoại trực tiếp, tách khỏi giọng đọc tin nhắn                                         | Catalog REST có xác thực/whitelist; đổi giọng cả khi gọi bằng stop/start tuần tự trên cùng hội thoại, giữ mute/lịch sử, chống kết quả muộn và hủy nối lại; tests API/SQL/transport/UI                   |
| CHAT-18 | Cân đối diện tích giao diện, bỏ dòng thừa, giữ nhận diện và auth cũ                                     | Sidebar lịch sử, chat rộng, thanh nhập gọn, tùy chọn âm thanh ẩn theo yêu cầu; kiểm tra bằng browser nhiều kích thước và hồi quy App/AuthForm                                                           |
| CHAT-19 | Vào app mở lời chào mới, chỉ mở lịch sử theo lựa chọn, tạo hội thoại khi có tương tác                   | Tests App kiểm tra không tải tin cũ/tạo bản ghi trống, gửi đầu tiên và retry, bỏ kết quả tạo muộn; browser tại 6 viewport                                                                               |
| CHAT-20 | Gom ô chữ và nút âm thanh/thoại/gửi bằng icon trên cùng một hàng                                        | Tests nhãn truy cập/tooltip, menu Escape/click ngoài; browser đo canh giữa các nút và textarea, chiều cao khi trống, cả khi đang thoại                                                                  |
| CHAT-21 | Chuyển sáng/tối ở topbar và nhớ lựa chọn                                                                | ThemeToggle/theme tests: hai chiều, preference/system, storage bị chặn và metadata; browser ảnh sáng/tối desktop/mobile                                                                                 |

Bản hội thoại ngày 16/10 từng loại các trang học tập phụ; yêu cầu mới đã đưa lại hồ sơ/avatar, lớp học và lộ trình TOEIC. Hệ thống thi/chấm đầy đủ bốn kỹ năng, flashcard, OAuth giả, reset SMTP và trang demo vẫn ngoài phạm vi hiện tại. Kiểm tra auth/ownership/retry/speech tiếp tục được thực thi, không hạ coverage threshold.

Không cam kết hệ thống tuyệt đối không có lỗi. Chat Gemini đã được kiểm chứng provider thật; definition of done cho thoại còn cần kiểm tra cuộc thoại/interrupt bằng trình duyệt + microphone/loa thật. Tests dùng doubles không thay thế kiểm chứng thiết bị. Một backend worker là giới hạn triển khai hiện tại; Gemini không phụ thuộc quota OpenAI.

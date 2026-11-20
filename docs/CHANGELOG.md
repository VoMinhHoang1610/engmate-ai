# Changelog

**scope/voice**

## 2026-11-16 — Bảo toàn byte C1/C2 và kiểm thử judge độc lập raw

- Commit C1 `405f030`, C2 `d67f97b` theo từng lệnh duyệt; hook backend/frontend qua.
- Test judge dùng fixture tổng hợp, giữ assertion cũ và kiểm hash thật; eval
  workspace 89/89, kiểm cuối judge 12/12 qua, không HTTP thật/đọc artifact private.
- Kiểm hash checkout riêng C1/C2 rồi dọn; dữ liệu khóa giữ byte gốc, hai file
  tổng hợp judge-combined chuẩn hóa LF. Chưa test trong checkout hoặc đo lại coverage.
- C3 `4e0698f` đã commit tài liệu thoại, hook qua; C4 đang chuẩn bị.
  Không đổi runtime/cờ hoặc resume sinh. Judge chưa phải nghiệm
  thu; v7 giữ hash khóa. Các mốc chưa commit bên dưới là lịch sử trước C1/C2.

**vocabulary**

## 2026-11-16 — Từ vựng 2×50 trong worktree, đang hoàn tất nghiệm thu

- Thêm catalog/schema Anh–Anh, năm route đăng nhập, state theo owner/version/
  UUID và import whitelist không ghi đè dữ liệu. Hai bảng MySQL additive với
  installer tường minh; thiếu bảng mới không chặn đọc catalog.
- Thêm UI tìm/lọc, đủ từ, tự nhớ, thẻ/quiz, TTS click-only theo Settings và draft
  tối đa 5 từ cho Mate; legacy riêng, summary tự đánh giá tách TOEIC.
- Thêm test ownership/replay/import/concurrency/validation/fallback; helper test
  async/scope theo duyệt, không sửa lifecycle runtime hoặc tăng timeout.
- Kiểm browser sáng/tối và mobile/desktop, sửa CSS label chọn từ bị xếp column;
  đang kiểm gate sau sửa. Thêm phiếu rà nội dung và cập nhật tài liệu theo mã.
- 17/11/2026: mã đã commit trên nhánh nhưng chưa merge/push. Docker demo
  source-mount từ worktree; DB ứng dụng đã có hai bảng additive 0 dòng (xác nhận
  lần cuối 16/11/2026); chưa build/deploy image. Chưa sinh AI/16 chủ đề, nâng cấp
  bốn mục khác, gọi provider thật hoặc nghiệm thu chuyên môn; coverage frontend
  487/490, 2 timeout ngoài ngoại lệ (lượt gần nhất 16/11/2026).

**scope/voice**

## 2026-11-15 — Bảo toàn scope/voice sau kiểm toán

- Sao lưu 151 file và manifest SHA-256 ngoài repo; quét riêng tư chỉ báo vị trí/loại.
- Tạo nhánh scope/voice bằng lệnh được duyệt, giữ WIP; chưa stage/commit/push.
- Phân loại từng file theo bốn nhóm commit; giữ raw results/CSV riêng tư và
  nêu cổng hash checkout sạch/test không phụ thuộc raw trước commit.
- Đồng bộ mốc sinh 13/11 với judge được duyệt 15/11; ghi thiếu run.log MySQL
  và log/verification còn lại. Không chạy lại test/API hoặc đổi runtime/cờ.

## 2026-11-15 — Ghi nhận duyệt Từ vựng và chuẩn bị worktree/test riêng

- Cập nhật D1–D10 cùng điều kiện TTS/IPA, env/cỡ lô, thiếu bảng DB, speech capability và chữ topbar.
- Ghi trạng thái repo theo nhóm; trình lệnh worktree, baseline sạch một lần và MySQL test localhost riêng.
- Kiểm cú pháp PowerShell; chưa chạy các lệnh tạo worktree/container, chưa sửa runtime hoặc gọi provider.

## 2026-11-15 — Kiểm toán năm mục và đề xuất Từ vựng

- Thêm [bản thiết kế chờ duyệt](LEARNING_VOCABULARY_DESIGN_2026-11-15.md): lưới
  chủ đề, nội dung đầy đủ, AI theo lô, state theo tài khoản và migration dữ liệu cũ.
- Ghi rõ phần đã có của ba trang TOEIC, phần preview và các quyết định cần duyệt.
- Chỉ tài liệu/kiểm chứng nền; chưa thay đổi chức năng người dùng hoặc database.

## 2026-11-15 — Rà offline và chuẩn bị kiểm chứng, chưa triển khai mới

- Sau phê duyệt: chạy MySQL test riêng đủ 254 test, coverage backend 93,04%;
  cleanup môi trường tạm. Thêm runner judge riêng theo rubric/model/trần đã
  duyệt, kiểm offline 86 test; không đổi backend runtime, v7 hoặc cờ thoại.
- Hoàn tất judge 222 phản hồi/222 request: 181 pass, 24 fail, 17 no_data;
  xuất 229 phiếu ưu tiên chấm tay và provenance, không tự nghiệm thu hoặc resume sinh.
- Kiểm tra snapshot nhánh dùng chung, xác nhận mã prompt/eval/VAD đã có và giữ
  nguyên tác vụ từ vựng/OAuth/UI/Docker. [Bàn giao](PROMPT_VOICE_REVIEW_2026-11-15.md)
  ghi kết quả cuối chưa qua ở test/coverage frontend và các điểm chờ duyệt.
- Làm rõ chính sách v7 hiện hành và các phương án lịch sử đã thay thế, giữ nguyên hash.
- Thêm công cụ rà 422 phản hồi offline, phiếu chấm tay 215 phản hồi và kế hoạch slot
  xen kẽ chờ quota; lần rà offline không gọi API/judge, không sửa ledger/checker đã khóa.
- Bổ sung thiết kế onset 2/3 frame, CSV thử 3 phút/10 câu, đề xuất MySQL test riêng
  và điều tra CPU test Settings. Không đổi VAD runtime/cờ, CSS, TTS hoặc backend.
- Kết quả kiểm chứng và hạn chế ở [TESTING](TESTING.md); chưa nghiệm thu prompt/thiết bị.

## 2026-11-14 — Bổ sung đo STT và debug VAD tại máy

- Bảng trước/sau bổ sung request STT/phút và thời gian đang thu; công khai hồi
  quy request trên nhiễu hồng và giới hạn xung/echo của VAD năng lượng.
- `VITE_VOICE_DEBUG` mặc định false, chỉ console scalar counters khi tự bật;
  không lưu/gửi audio hoặc transcript. Không triển khai pha mới hay đổi VAD.


## 2026-11-14 — Thử nghiệm cổng transcript và VAD thích nghi

- Hai công tắc frontend mặc định tắt: thông báo nhẹ khi chưa nghe rõ; VAD thích
  nghi đóng lượt nhiễu đều và fallback VAD cũ khi lỗi. Lỗi dịch vụ vẫn báo lỗi.
- Có số đo theo từng RMS/SNR và bảng kiểm thiết bị trong
  [VOICE_VAD_BASELINE.md](VOICE_VAD_BASELINE.md). Chưa tuyên bố giải quyết tiếng
  ồn/echo; Pha C chưa làm, D/E hoãn.


## 2026-11-13 — Chốt từ chối mặc định Việt, sinh đầy đủ không pilot/judge

- V7 giữ version 7/các sửa cũ; 5.997 byte, hash e75a86fd…e722680 đã khóa.
  Mặc định từ chối Việt; yêu cầu rõ trả lời Anh được đáp Anh. Ghi hạn chế
  người chỉ biết Anh vẫn nhận từ chối Việt nếu chưa yêu cầu rõ ngôn ngữ.
- Cho phép ví dụ/câu luyện Anh cạnh lời Việt. Checker chỉ gắn cờ lặp từ
  chối song ngữ hoặc trộn trong câu từ chối. Đây là đổi quy tắc, không sửa
  để lượt cũ qua; raw/cờ/tỷ lệ các vòng trước giữ nguyên.
- Corpus vẫn 248; mười đầu vào ngôn ngữ giữ nguyên, kỳ vọng VI. 95 test
  cấu trúc/offline, lint repo và type-check qua. Một runner chỉ sinh full,
  trần đã ghi trước 1.050 lượt/2.100 request; không pilot/LLM-judge/Blaze.
- Chuẩn bị rubric judge bản nháp để người dùng duyệt riêng; phiếu tay lấy
  mọi case có cờ/không chắc và ≥20% ngẫu nhiên mỗi nhóm/phiên bản, đủ ba
  lần mỗi case. Không thay mẫu 24 lượt cũ.
- Thực tế dừng 429 ở request 428: 422 phản hồi, 4 lượt cuối thiếu dữ liệu,
  624 lượt chưa chạy. Hai retry 502 đều phục hồi. Không tự resume, không
  pilot/judge/Blaze. Xuất phiếu có dữ liệu 174 phản hồi, khung 411 dòng/137
  case-version, toàn bộ cờ và bảng theo nhóm/đối chứng cơ học. Chưa nghiệm thu.

## 2026-11-13 — B theo ngôn ngữ hội thoại, dừng sau pilot không đạt

- Áp dụng B theo ngôn ngữ chủ đạo, hội thoại toàn Anh dùng Anh đơn giản;
  không trộn refusal/redirection. Giữ các sửa cũ/version 7; 5.979/6.500 byte,
  hash 499c38fb…f5c90838. Corpus 248: đổi kỳ vọng sáu đầu vào cũ sang Việt,
  thêm A1/B1/C1 text và B1 voice toàn Anh; v6/238 case trước giữ nguyên.
- Thêm runner campaign chung, opt-in, gate/khóa hash, ledger/resume,
  Retry-After, dừng 429, một retry 502. Trần ghi trước REPORT: pilot 30/60,
  full có điều kiện 1.050/2.100 lượt/request; không judge/Blaze.
- 85 test cấu trúc/offline và lint qua. Pilot thực tế 30 request, 0 lỗi/
  retry: đúng ngôn ngữ 18/30 (60%), voice 12/12 ≤45. Sáu cờ trộn gồm hai
  chuyển hướng trộn và bốn false positive của checker trên mẫu câu học.
  Không đạt: dừng, không sửa thêm/checker/full/khóa prompt/judge.
- SCREENING đủ 30 dòng đầu; phiếu tay phân tầng 27 lượt/9 case kèm ngữ
  cảnh/rubric. Mẫu 24 cũ và kết quả cũ nguyên hash; chưa nghiệm thu chất lượng.

## 2026-11-13 — Một lần sửa ngôn ngữ, dừng sau 18 lượt và đề xuất B

- V7 giữ version 7, sửa đúng hai dòng để nhấn mạnh ngôn ngữ lượt mới nhất
  dù history dùng ngôn ngữ khác/tiếng Việt. Không nén quy tắc khác; 5.684
  byte dưới trần mới 6.500 byte. Lưu snapshot/diff/hash trong eval revisions.
- 67 test mục tiêu, lint repo và mypy strict eval qua trước live. Chạy đúng
  cùng 18 lượt/18 request, không lỗi/retry: 0 Anh, 18 vi, 0 unknown theo
  checker; 9/9 voice ≤45 từ. Dưới ngưỡng 15/18 đã chốt: chỉ đề xuất diff B,
  chưa áp dụng, không sửa prompt thêm, dừng chờ người dùng.
- SCREENING của vòng gốc/mới có dòng đầu đầy đủ; tách hai unknown gốc
  A1-voice lần 1/3. Giữ nguyên v6, corpus, raw cũ và mẫu chấm 24 lượt.
  Chưa chạy bước 2–3/full/judge/Blaze, không kết luận nghiệm thu trên mẫu nhỏ.

## 2026-11-13 — Kết quả live sáu case ngôn ngữ v7

- Chạy đúng 18 request trên sáu case × ba lần, giữ hash prompt/corpus;
  không lỗi/retry. Screening: 0 khớp tiếng Anh, 16 tiếng Việt, 2 chưa rõ;
  cả 9 voice không vượt 45 từ. Chưa chấm ngữ nghĩa hoặc nghiệm thu.
- Thêm runner opt-in có trần, checkpoint/resume, Retry-After, dừng 429 và
  tối đa một retry 502/slot; kết quả mới có model/ngày/hash, giữ mẫu 24 cũ.
- Dừng chờ xác nhận; chưa chạy full/judge. Trần bước 2/3 được ghi trước trong
  REPORT/kế hoạch. Không đổi prompt/case, không gọi Blaze.

## 2026-11-13 — Ngôn ngữ từ chối theo lượt mới nhất

- Chọn A, làm rõ lời từ chối theo ngôn ngữ lượt mới nhất; nếu dùng Anh thì
  dùng tiếng Anh đơn giản theo level. V7 giữ version 7, dài 5.599 byte.
- Thêm 6 case A1/B1/C1 × text/voice thành 244; giữ nguyên 238 case trước đó,
  checker ngôn ngữ, mẫu 24 lượt và kết quả cũ. Có snapshot/hash/diff trong eval.
- Chỉ kiểm cấu trúc/lint; chưa gọi Gemini hoặc chạy bộ đầy đủ theo hash mới.

## 2026-11-13 — Điều chỉnh screening độ dài voice

- Checker voice chỉ gắn cờ trên 45 từ, bỏ chặn dưới. Tính lại dữ liệu pilot:
  v6 còn 6 cờ, v7 còn 0; ghi rõ 12 cờ câu ngắn đã gỡ.
- SCREENING/REPORT bổ sung riêng 10 cờ ngôn ngữ out_of_scope với ID/lần,
  ngôn ngữ người dùng/phản hồi và trích dòng đầu. Giữ nguyên mẫu 24 lượt;
  chưa chạy bộ 238 case. Không sửa prompt hoặc case.
- Làm rõ coverage 80% thiếu từ trước với MYSQL_TEST_URL chưa cấu hình,
  HEAD 72,38%; chênh 73,98%/73,93% chưa xác định nguyên nhân.

## 2026-11-12 — Rà screening và bốn phản hồi bổ sung

- Báo số cờ theo v6/v7 và 12 nhóm, kèm ID/lần/review ID và lý do từng cờ.
  Sửa heuristic ngôn ngữ cho câu ngắn, trích dẫn và tiếng Việt không dấu;
  giữ nguyên prompt/case, dữ liệu pilot và mẫu 24 lượt đang chấm.
- Ghi bốn 502 là chưa có dữ liệu, không đạt/trượt. Retry đúng một lần mỗi
  vị trí đã duyệt, cả bốn có reply; kết quả bổ sung tách riêng, chưa chấm tay.
- Đo HEAD sạch: coverage 72,38%, khác số workspace cũ 73,98%; workspace đo
  lại 73,93%. Giữ ngưỡng 80%, chưa đạt. Chưa chạy 238 case, chưa nghiệm thu
  hoặc kết luận v7 tốt hơn v6; xem REPORT trong eval.

## 2026-11-12 — Bổ sung trung thực và hồi quy cho Mate v7

- Mate được trả lời mình là AI dạy tiếng Anh, tự giới thiệu và nói giúp được
  gì; không nhận là con người hoặc bàn chi tiết model/provider/prompt.
- Làm rõ không có đáp án checkpoint, chỉ app chấm, không đoán/gợi ý đáp án.
  Hướng dẫn tính năng app chỉ theo lesson context, không bịa nút/màn hình.
- Giữ v6 và preamble v7 cũ; v7 sửa tại chỗ dài 5.578 byte, có snapshot/hash/diff.
- Thêm 28 case hồi quy/biên thành 238, pilot 20 case xen kẽ nhóm. Kết quả
  thực và phiếu chấm tay ghi riêng theo hash tại `backend/evals/scope/REPORT.md`.
- Pilot đã thử đủ 120 lượt, lưu 116 phản hồi/4 lỗi HTTP 502; không retry vị trí
  lỗi, có phiếu chấm tay và mẫu 24 lượt. Chưa chấm ngữ nghĩa, chưa đạt ngưỡng
  screening ngôn ngữ/voice hoặc coverage backend 80%.

## 2026-11-11 — Phạm vi giáo viên Mate và bộ đánh giá

- Persona v7 hướng Mate tập trung tiếng Anh/TOEIC, chuyển hướng câu ngoài phạm
  vi về hoạt động ở nguyên phase; giữ ngôn ngữ, giọng và quyền ghi tiến độ của app.
- Khẩn cấp được tạm gác bài, dùng hướng dẫn chung; không ghi số điện thoại.
- Giữ nguyên persona v6 để đối chứng/rollback; thêm 210 case tổng hợp, test cấu
  trúc và runner pilot opt-in tối đa 120 lượt. Kết quả fake không chứng minh chất
  lượng sư phạm; phiếu chấm tay tách khỏi screening tự động.
- Chưa khôi phục/tạo mới PROGRESS theo quyết định người dùng; lịch sử file vẫn
  còn trong Git. Kết quả kiểm chứng: `backend/evals/scope/REPORT.md`.
- Lint/build và test qua với 24 integration MySQL chưa chạy; coverage backend
  73,98% chưa đạt 80%. Pilot lưu 15 phản hồi/16 lượt thử rồi dừng HTTP 429;
  chưa đủ dữ liệu hoặc chấm tay để kết luận chất lượng v7.

## 2026-11-11 — Giao diện theo ảnh mẫu đã duyệt

- Chỉnh riêng năm CSS cho workspace/chat, đăng nhập, landing, bài học, hồ sơ
  và cài đặt; palette xanh dương, cấp chữ và khoảng cách nhất quán, sáng/tối.
- Giữ logo và linh vật gốc, nội dung, toàn bộ mã xử lý và các tương tác.
- Có snapshot và script khôi phục riêng CSS; báo cáo tại `UI_REFRESH_2026-11-11.md`.

## 2026-11-11 — Thông báo lỗi hội thoại trực tiếp tự ẩn

- Thông báo lỗi phát sinh khi bắt đầu, đổi giọng, dừng hoặc đang thoại tự ẩn
  sau 5 giây; lỗi mới, kể cả cùng nội dung, được hiển thị đủ 5 giây.
- Nhãn phiên gặp lỗi cũng ẩn cùng thông báo; vẫn có thể bắt đầu lại phiên.
  Việc ẩn thông báo không dừng phiên đang hoạt động.

## 2026-11-06 — Cấu hình Facebook cho đăng ký và đăng nhập

- Bổ sung cấu hình Facebook local; nút Facebook tiếp tục dùng chung luồng
  tạo tài khoản lần đầu và đăng nhập tài khoản đã liên kết.
- Màn hình đăng ký giải thích có thể tạo tài khoản bằng Google/Facebook mà
  không đặt mật khẩu EngMate; nhóm nút có tên truy cập phù hợp chế độ.
- Bổ sung kiểm thử cho Facebook từ form, popup, callback tới lưu liên kết và
  tạo phiên; không thay đổi chính sách liên kết email trùng.

## 2026-10-30 — Đăng nhập Google bằng tài khoản EngMate đã có

- Khi email Google trùng tài khoản cũ, hiện bước xác nhận mật khẩu EngMate để
  liên kết và giữ nguyên dữ liệu. Có thể hủy; sau liên kết, đăng nhập Google trực tiếp.
- Challenge gắn browser, hết hạn sau 5 phút và dùng một lần; sai hoặc hết hạn
  có hướng dẫn bấm Google thử lại.

## 2026-10-29 — Đăng nhập Google/Facebook

- Bỏ GitHub, giữ hai nút Google/Facebook cùng hàng, dùng popup và backend OAuth.
- Tài khoản nền tảng dùng cùng phiên đăng nhập/đăng xuất của EngMate; thông báo
  rõ khi thiếu cấu hình, bị chặn popup, hủy hoặc email đã có tài khoản.
- Cần cấu hình ứng dụng Google/Meta và cài bảng liên kết theo OAUTH_SETUP trước
  khi sử dụng thật; không tự sửa dữ liệu hoặc cài schema khi khởi động.

## 2026-10-29 — Logo thay nút menu khi thu gọn

- Sidebar thu gọn hiển thị logo EngMate; click logo mở rộng. Nút menu riêng chỉ hiện khi mở rộng để thu gọn lại.

## 2026-10-29 — Điều khiển sidebar bằng click

- Sidebar desktop chỉ đóng/mở bằng nút menu, không tự mở do hover hoặc focus. Nút menu vẫn hiển thị khi thu gọn và không chồng logo.

## 2026-10-29 — Sửa hồi quy sidebar che nội dung

- Sidebar desktop mở tạm cũng dành đủ chiều rộng trong bố cục; nội dung luôn bắt đầu từ mép phải sidebar. Thay thế cách mở overlay trước đó.

## 2026-10-29 — Sửa chồng lớp avatar, logo và nút mật khẩu

- Giữ input chọn ảnh ẩn, không bị kiểu chỉ đọc làm hiện lên trên avatar.
- Giữ đủ chiều rộng sidebar mở tạm, loại bỏ nút menu khỏi bố cục thu gọn.
- Dùng biểu tượng mắt hiện/ẩn mật khẩu và tắt reveal mặc định của Edge để tránh trùng lặp.

## 2026-10-29 — Hoàn thiện giao diện sau rà soát

- Bài học có bộ lọc chặng/thời lượng/cần ôn, tìm không dấu và xem thêm; giữ lối quay lại bài đang học. Tiến độ mở bài ôn trực tiếp.
- Dữ liệu học tải độc lập, giữ phần đã tải và phân biệt chưa tải với chưa học; chỉ bài đang mở hiện trạng thái chờ.
- Đồng nhất nguồn kết quả TOEIC tại Hồ sơ/Cài đặt; làm rõ phạm vi mục tiêu giao tiếp và buổi ôn tự ghi nhận.
- Sửa hiện mật khẩu, lưu/khôi phục giảm chuyển động, hiển thị rõ chức năng OAuth/âm báo chưa hỗ trợ; chuyển chẩn đoán thoại vào phần nâng cao.
- Sidebar ghim mặc định, giữ vị trí khi cuộn; mở tạm không đẩy nội dung. Cải thiện chữ phụ, nút cảm ứng, màn hình thấp và form tài khoản trên mobile.
- Nội dung giới thiệu thay số đo/lời chứng thực chưa xác nhận bằng tình huống luyện tập minh họa.

## 2026-10-29 — Sửa bố cục đăng nhập và không gian trò chuyện

- Xếp ba nút nền tảng cùng hàng; mục Giao diện có hover và vùng bấm toàn hàng.
- Mở rộng chat/ô nhập, giảm chữ phụ đề thoại; cố định khung sidebar bằng vùng cuộn nội dung riêng.

## 2026-10-23 — Lỗi âm thanh không còn dừng phiên thoại

- TTS hoặc phát MP3 lỗi (kể cả lời mở đầu) chỉ dừng audio và báo lỗi; Gemini vẫn
  stream, câu trả lời vẫn được lưu, mic/phiên vẫn mở. Không đổi giọng, không dùng
  giọng máy và không replay job TTS đã lỗi.
- STT realtime lỗi setup/relay/final hoặc timeout sẽ chép lại WAV bằng batch **một
  lần**; không gửi partial. Fallback có thể phát sinh thêm phí nên realtime vẫn
  opt-in, batch là rollback.
- Tạo job TTS chỉ retry khi Blaze trả `429` (tối đa hai lần, 0,6/1,2 giây). Job
  `failed/error/cancelled`, audio sai và lỗi mạng không replay. Log lỗi chỉ có
  operation/status/reason/số byte, không có ID/URL/body/token/nội dung câu.
- Voice context giảm còn 12 tin/12.000 ký tự; prompt thoại yêu cầu 1–2 câu ngắn,
  tối đa một câu hỏi. Sau hai clip đầu, câu ngắn được gom tới ít nhất 120 ký tự để
  giảm số job TTS.
- Đóng socket provider STT trước khi chờ cancel các task con, tránh rò rỉ kết nối
  khi browser/TestClient hủy relay đúng lúc cleanup.
- Kiểm chứng offline: frontend 383/383; backend 223/223 với MySQL test riêng.
  Ruff/Black/mypy, ESLint/tsc/Prettier và Vite build qua. Chưa có p50/p95 hoặc
  kiểm micro/loa thật.

## 2026-10-23 — Giảm chờ phát âm đầu tiên

- Mệnh đề đầu được gửi TTS tại dấu phẩy/chấm phẩy/hai chấm sau ít nhất 32 ký tự,
  hoặc tối đa 96 ký tự khi câu đầu dài/không có dấu kết câu; các đoạn sau vẫn tối
  đa 600 ký tự.
- Đẩy chunk vào hàng đợi TTS trước khi render transcript; poll job Blaze nhanh
  0,2 giây trong 1 giây đầu, sau đó 0,35 rồi 0,5 giây thay vì 0,5 giây cố định.
- Giữ model `v2.0_pro`, VAD 900 ms, speaker và giao thức job/MP3. Đo thử cho thấy
  flash không nhanh hơn pro; realtime WS có byte đầu sớm nhưng chưa có streaming
  PCM ra trình duyệt. Chưa có p50/p95 100 lượt hoặc kiểm âm thanh thật.

## 2026-10-23 — Một giọng xuyên suốt, xưng hô đúng giọng

- Phiên Blaze giữ đúng giọng đã chọn qua cả đoạn tiếng Việt và tiếng Anh.
- Giọng nữ xưng cô Mate, giọng nam xưng thầy Mate; đổi giọng cập nhật cách xưng
  hô ở lượt tiếp theo, không kế thừa danh xưng cũ từ lịch sử.
- Prompt mới yêu cầu chào tiếng Việt khi người học nói “xin chào”, tránh lời
  giới thiệu lai “I'm thầy Mate”. Nghe thử giọng nữ cũng giới thiệu là cô Mate.
- Catalog giọng cũ thiếu `gender` vẫn được chấp nhận; giới tính suy ra từ mã
  Nam/Nu, không làm hỏng lựa chọn giọng đã lưu.

## 2026-10-23 — Tối ưu toàn chương trình

- History cursor/tail merge, tải cũ theo yêu cầu, memo message row và follow-tail.
- Scope practice query, cache catalog/prompt, tách Argon2 khỏi connection pool.
- Gate chat/speech theo process/account; hủy local speech khi browser disconnect.
- Playback receipt giữ context thoại theo clip đã phát xong, history text đầy đủ.
- JSON body deadline/cap, SSE idle watchdog; lazy landing/workspace, gzip/static
  immutable cache, Compose parity cho realtime STT và giới hạn tác vụ.
- Settings diagnostics opt-in, INFO timing/DB/token metrics không nội dung riêng tư.
- MySQL test biệt lập đã chạy; trạng thái coverage và các hạng mục còn chờ tại
  `PROGRESS.md`/`OPTIMIZATION_AUDIT.md`. Chưa benchmark API trả phí/thiết bị thật.

## 2026-10-22 — STT realtime thử nghiệm

- Có thể bật `BLAZE_STT_MODE=realtime` để gửi audio trong lúc nói và xem phụ đề
  tạm; chỉ gửi final cho Gemini sau khi kết thúc lời nói.
- Ticket một lần, giới hạn audio/backlog và hủy khi ngắt lời/mute/stop/logout;
  không tự gửi lại WAV hoặc đổi giọng khi lỗi.
- Mặc định batch cho đến khi xác minh model/quyền tài khoản/độ chính xác/chi phí;
  chưa có benchmark thực hoặc TTS realtime, không cam kết mức giảm thời gian.

## 2026-10-22 — Giảm khoảng chờ giọng nói P0–P1

- Bắt đầu TTS theo câu đủ nghĩa trong lúc Gemini còn sinh phản hồi; phát theo
  thứ tự và chuẩn bị trước tối đa một clip, không đọc lặp phần đã stream.
- Ngắt lời/lỗi dừng cả pipeline và bỏ audio cũ; giữ cancellation khi đang tải
  body HTTP. Bỏ lượt đồng bộ lịch sử trùng sau terminal done.
- Tái sử dụng kết nối Gemini/Blaze và bổ sung chẩn đoán độ trễ không chứa nội dung.
- Chưa thay STT/TTS sang realtime, chưa có p50/p95 thực hoặc cam kết thời gian;
  chia câu có thể tạo nhiều job TTS hơn. Không đổi provider/model/giọng.

## 2026-10-18 — Chọn giọng của Mate trong Cài đặt

- Thêm lựa chọn giọng tiếng Anh và tiếng Việt trong **Cài đặt → Âm thanh & giọng đọc**, lấy danh sách từ dịch vụ Blaze.
- Có nút nghe thử/dừng theo thao tác người học, trạng thái tải và thử lại khi danh sách hoặc âm thanh gặp lỗi.
- Nhớ giọng và tốc độ riêng theo tài khoản trên trình duyệt hiện tại; dùng chung với menu âm thanh trong chat, giọng đọc mẫu và phiên thoại Blaze tiếp theo. Không đồng bộ sang thiết bị khác.
- Giữ Gemini xử lý nội dung, Blaze phát giọng và ngôn ngữ nhận dạng hiện có; không thay schema database.

## 2026-10-18 — Màu tương tác và chữ dễ đọc hơn

- Bổ sung xanh dương cho thao tác chính, tím cho học tập, xanh ngọc cho tiến độ;
  sidebar, thẻ và chặng học có màu phân nhóm ở cả giao diện sáng và tối.
- Mục đang chọn có nền màu/vạch nhấn, hover đổi viền/nền, focus có vòng rõ;
  nút gửi, micro, trạng thái thoại và câu trả lời được phân biệt dễ hơn.
- Tăng cỡ và độ tương phản chữ mô tả, điều hướng, ô nhập và tin nhắn;
  giữ bố cục ổn định khi tương tác và hỗ trợ điện thoại.

## 2026-10-18 — Không gian học tối giản với thanh bên

- Chuyển không gian sau đăng nhập sang bố cục thanh bên thu gọn/mở rộng theo mẫu người dùng cung cấp; trên điện thoại mở điều hướng bằng nút menu.
- Dùng nền trung tính, viền mảnh và khoảng cách rõ ràng cho chat, lộ trình, lớp học, hồ sơ và cài đặt; giữ sáng/tối và linh vật Mate.
- Giữ điều hướng bài học, phát âm, từ vựng, tiến độ và lịch sử hội thoại; hồ sơ/cài đặt vẫn dùng dữ liệu tài khoản hiện có.
- Giữ luồng học TOEIC và đối thoại Gemini + Blaze; không thay API, database hay cách tính hoàn thành bài trong đợt chỉnh giao diện này.

## 2026-10-18 — Đồng bộ SQL khởi tạo với dự án hiện tại

- File SQL root tạo đủ 13 bảng/4 trigger, gồm bốn bảng lưu kế hoạch, tiến độ,
  liên kết hội thoại và receipt của lộ trình TOEIC, khớp metadata backend.
- Giữ base schema version 1, bảy mức CEFR và các bảng tài khoản/hồ sơ/hội thoại
  hiện có. Giáo án vẫn dùng JSON của server, avatar lưu ở thư mục riêng.
- Bản cài mới không cần chạy thêm installer. Database cũ thiếu bảng lộ trình
  dùng installer bổ sung; không chạy lại bootstrap lên dữ liệu đang dùng.
- Thêm kiểm thử cấu trúc MySQL và mở rộng SQL kiểm tra chỉ đọc.

## 2026-10-18 — Lộ trình TOEIC đối thoại bằng giọng nói

- Thay lộ trình bốn chủ đề bằng **5 chặng, 25 cụm, 100 bài học nhỏ** từ nền tảng đến các mục tiêu 450/650/800/900+. Mỗi bài có lời giảng, mẫu câu, ví dụ/dịch, từ vựng, tình huống đối thoại, thực hành nghe/đọc và câu kiểm tra.
- Học cùng Mate qua năm bước: khởi động, nghe giảng, luyện cùng, đối thoại và tự kiểm tra. Giọng nói là cách học chính: Gemini xử lý nội dung, Blaze nhận và đọc lời nói; vẫn gõ được khi không bật micro. Giữ chat tự do riêng.
- Kế hoạch, bước đang học, hội thoại, số lượt luyện thực tế, kết quả kiểm tra và lịch ôn lưu theo tài khoản trên máy chủ. Lưu mục tiêu có kiểm tra phiên bản; lỗi/xung đột giữ lựa chọn để người học kiểm tra và thử lại.
- Kiểm tra chấm bằng đáp án chuẩn ở máy chủ; chỉ trả đáp án/giải thích sau khi nộp. Hoàn thành cần ít nhất 3 lượt đối thoại thực tế có phản hồi hoàn tất và đúng toàn bộ câu kiểm tra. Có gợi ý bài tiếp theo, bài đến lịch ôn và tiến độ theo bằng chứng đã lưu.
- Các chặng là cách nhóm giáo trình đề xuất; số lượt/câu đúng không phải điểm TOEIC hay điểm phát âm. Chưa có placement test chuẩn hóa, ngân hàng ảnh Part 1 hoặc đề đủ 200 câu. Nội dung cần được đánh giá sư phạm với người học thật.

## Giọng nói Mate: Blaze, nội dung: Gemini

- Thoại tự nhận lượt nói, dùng Blaze chép lời và đọc câu trả lời Gemini.
- Danh sách giọng đối thoại đổi sang catalog Blaze Việt/Anh; có ngắt lời, mute,
  đổi giọng và dọn tài nguyên khi kết thúc/rời trang.
- Bỏ nhánh đọc bằng giọng máy. Thiếu/lỗi Blaze báo lỗi thay vì phát giọng Gemini.
- Mặc định `VOICE_PROVIDER=blaze`; Gemini Live/OpenAI Realtime chỉ còn adapter
  tương thích khi chủ động chọn `native`. Không thay database hoặc giáo trình.

## 2026-10-18 — Khôi phục hồ sơ cá nhân

- Mở avatar → Hồ sơ học tập để dùng lại trang thông tin cá nhân từ giao diện cũ, phù hợp màu sáng/tối của lớp học hiện tại.
- Đọc/lưu họ tên, điện thoại, ngày sinh, giới tính, trình độ, mục tiêu và thời lượng học vào tài khoản thật; báo xung đột khi hồ sơ đã được sửa từ phiên khác.
- Đổi ảnh đại diện PNG/JPEG/WebP và cập nhật avatar menu; ảnh lưu riêng tư, truy cập có xác thực.
- Sửa thao tác hover rồi click avatar để menu không đóng ngay trước khi chọn hồ sơ.

## 2026-10-18 — Lớp học cùng thầy Mate

- Thiết kế lại đăng nhập và không gian học theo Figma Tutor journey, dùng linh thú Mate gốc làm người thầy.
- Thêm điều hướng Cùng Mate, Lộ trình, Bài học, Phát âm, Từ vựng và Tiến độ; giữ chat/voice thật, lịch sử trong ngăn kéo và theme sáng/tối.
- Bốn chủ đề có bài giảng, ví dụ và yêu cầu thực hành; mục tiêu/thời lượng/mức bắt đầu có thể điều chỉnh.
- Nghe mẫu, ghi âm chép lời, tự đánh dấu từ đã nhớ và bài hoàn thành; hiển thị dữ liệu thật do người học ghi nhận, không giả lập điểm. Dữ liệu học mới lưu trên trình duyệt riêng từng tài khoản.
- Prompt v5 hướng dẫn Mate giảng giải, làm mẫu, chờ câu trả lời rồi nhận xét cho cả chat và thoại.

## 2026-10-18 — Link HTTPS chia sẻ tạm thời

- Thêm Compose/proxy Nginx riêng phục vụ bản build qua HTTPS tunnel, hỗ trợ cấu hình SSE/WebSocket và giữ các cổng dev/database ở loopback.
- Hướng dẫn bật/dừng chia sẻ, cấu hình Origin và giới hạn 60 phút của phiên Pinggy miễn phí trong README.

## 2026-10-18 — Đồng bộ URL sau đăng nhập

- Đăng nhập/đăng ký thành công đổi URL sang `#hoi-thoai`; đăng xuất hoặc hết phiên trả về `#dang-nhap`, không tải lại trang.
- Sửa hash hoặc quay lại URL cũ không làm mất bản nháp hay thay đổi quyền truy cập.

## 2026-10-18 — Ô nhập một hàng, sáng/tối và đổi giọng khi gọi

- Canh ô nhập và các icon trên một hàng, bỏ toolbar tầng dưới và viền focus lồng bên trong; placeholder không tự làm khung cao thêm trên điện thoại.
- Icon tai nghe mở tùy chọn giọng. Nút mặt trăng/mặt trời chuyển sáng/tối nằm trên topbar cạnh tài khoản và nhớ lựa chọn.
- Cho phép đổi giọng đang thoại: tự nối lại trong cùng hội thoại, giữ lịch sử đã lưu/mute; bấm kết thúc hoặc rời chat sẽ hủy lần nối lại đang chờ.

## 2026-10-17 — Khung chào mới và thanh nhập bằng icon

- Vào app mở lời chào và ô nhập trống; lịch sử chỉ mở khi được chọn. Hội thoại mới chỉ được lưu khi gửi tin đầu tiên hoặc bắt đầu gọi thoại.
- Gom tùy chọn âm thanh, ghi âm, thoại trực tiếp và gửi vào cùng khung nhập. Chọn giọng trong menu bánh răng, có nhãn truy cập/tooltip; Escape và click ngoài đóng menu.
- Chỉ hiển thị phụ đề khi đang thoại; kết thúc cuộc gọi trả lại thanh nhập gọn.

## 2026-10-16 — Hội thoại Việt/Anh, giọng Live và giao diện gọn

- AI theo tiếng Việt/Anh của lượt nói hoặc tin nhắn mới nhất; có thể yêu cầu dịch/song ngữ/luyện tiếng Anh rõ ràng.
- Chọn giọng Gemini cho thoại trực tiếp trước khi gọi, tách khỏi giọng Blaze đọc tin nhắn; không đổi giọng giữa phiên.
- Lịch sử chuyển sang sidebar trái, vùng chat rộng hơn; ô nhập gọn, tùy chọn âm thanh trong nút bánh răng, bỏ dòng thông tin lặp. Giữ trang đăng nhập/đăng ký và nhận diện EngMate.
- Nghe câu trả lời hỗ trợ giọng Việt/Anh; ghi âm từng lượt chọn ngôn ngữ trong menu âm thanh.

## 2026-10-16 — Cố định khung hội thoại

- Khung chat vừa chiều cao màn hình; tin nhắn và lịch sử cuộn riêng, gửi/nhận tin không kéo cả trang.
- Ô nhập giữ trong khung khi nội dung thoại dài; lịch sử chuyển sang drawer trên màn hình hẹp. Giữ giao diện gốc và thu gọn khoảng trống khi màn hình thấp.

## 2026-10-16 — Hội thoại dùng Gemini thay OpenAI

- Gemini là provider mặc định cho chat streaming và thoại trực tiếp Live; giữ giao diện cũ, tài khoản/lịch sử/MySQL và Blaze STT/TTS.
- Khóa Gemini chỉ ở backend. Thoại dùng relay WebSocket, ticket một lần, PCM capture/playback có giới hạn, mute/cleanup/reconnect và xóa audio khi ngắt lời. Header hiển thị đúng GEMINI.
- Không cần credit OpenAI cho cấu hình mới; lỗi Gemini vẫn được báo thật, không fallback. Chưa xác minh thoại bằng microphone/loa vật lý.

## 2026-10-16 — Chat OpenAI streaming và Voice WebRTC

- Chat dùng OpenAI Responses, hiển thị từng delta vào cùng assistant message; có Dừng phản hồi, giữ draft/retry UUID và lưu kết quả thật trong MySQL. Lỗi/quota không fallback câu trả lời giả.
- Thêm Bắt đầu/Kết thúc thoại, Mute và trạng thái theo WebRTC/VAD; nói chen hủy/clear/truncate audio cũ. Backend sideband lưu transcript provider vào cùng lịch sử; cleanup/reconnect có hạn. Giữ phong cách giao diện cũ và Blaze STT/TTS từng lượt.
- Key OpenAI chỉ backend/.env; runtime từ chối mock. Đã triển khai và test offline; kiểm chứng live chưa hoàn tất vì OpenAI trả credit_balance_exhausted. Chưa khẳng định giọng nói/echo/interrupt hoạt động trên thiết bị thật.

## 2026-10-16 — Khôi phục giao diện gốc theo yêu cầu

- Khôi phục màu sắc, CSS, logo, linh vật Mate, sidebar/topbar và bố cục hội thoại/lịch sử gốc. Đăng nhập/đăng ký trở lại pane trượt, nền/hiệu ứng Mate và xác nhận mật khẩu.
- Menu avatar giữ tương tác hover/touch/bàn phím; đăng xuất vẫn thu hồi phiên qua REST. Giữ xử lý tài khoản/lịch sử/chat/speech đã sửa; không đưa lại các tính năng học tập phụ.
- Cấu hình khóa Blaze riêng trong `.env` backend, không đưa vào source/frontend. Chưa gọi upstream tính phí; Blaze Chat/realtime vẫn phụ thuộc hợp đồng API.

## 2026-10-16 — Bản hội thoại (breaking API)

- Thay giao diện học tập nhiều trang bằng tài khoản và không gian hội thoại; giữ lịch sử riêng, tạo/mở/kết thúc, chat chữ và speech từng lượt.
- Bỏ lộ trình/bài tập/chấm điểm/flashcard/sổ từ/dashboard/onboarding/hồ sơ mở rộng và API phụ. Bỏ tài khoản demo/OAuth giả/SMTP reset; xem API.md cho endpoint đã loại.
- Lịch sử mới nhất trước, phân trang vượt 100; retry/draft/cancel/stale pending, response schema và lỗi mạng rõ ràng.
- Schema cài mới chỉ có 9 bảng; database cũ được bảo toàn. Dev/build cùng gọi REST API.
- Hiển thị rõ trạng thái mock và cấu hình Blaze chưa sẵn sàng. AI thật và realtime còn chờ contract upstream; không được công bố là đã hoạt động.

2026-10-09: bỏ trạng thái “Đang tạo giọng nói…” và giữ biểu tượng nút Nghe. Nạp sẵn bộ phát/tái dùng clip, bỏ chờ preload 250 ms; khi Blaze chưa có âm thanh, dùng giọng tiếng Anh cục bộ để phát nhanh. Nghe thử giọng luôn giữ đúng lựa chọn Blaze. Dừng/đổi trang/logout dừng cả hai loại tiếng, không phát MP3 muộn chồng lên giọng máy.

2026-10-09: mở/tải lại ứng dụng MySQL hiện đăng nhập trước; đăng nhập chờ tải dữ liệu rồi vào Tổng quan ngay, không cần tải lại hay bấm thêm liên kết. Nút giữ trạng thái xử lý trong khi tải; lỗi tải cho thử lại. Tài khoản mới vẫn qua bước làm quen, dữ liệu MySQL giữ nguyên sau đăng nhập lại.

2026-10-09: kết nối backend và giao diện với MySQL EngMateAI. Đăng ký/đăng nhập thật; lưu onboarding/bảy mức, hồ sơ, giọng/cài đặt, từ/flashcard, bài làm, hội thoại và thống kê theo tài khoản. Reading/Listening chấm server, dictation nghe MP3 không lộ text key. Tải lại/đăng nhập lại giữ dữ liệu; retry flashcard giữ request ID. AI chat/nói/viết vẫn mock có nhãn.

2026-10-09: hoàn thiện gemini-code-1791478978574.sql cho MySQL: bảy mức học, Reading, lựa chọn giọng, trạng thái làm quen, timestamp và seed khớp frontend. Đã thực thi thử schema với 45 kiểm tra trên MySQL 8.0.45; chưa chuyển backend.

## [Unreleased]

### Hợp nhất giao diện mới vào develop — 2026-10-08

- Bổ sung Reading, lộ trình Pre-A1 đến C2, nhập môn, Mate làm quen sau đăng nhập và nút hỗ trợ mới; giữ backend/API SQL Server đã hoàn thiện.
- Giữ sửa lỗi intro một lần mỗi tab, username/email và storage jsdom; cập nhật test đăng ký/đăng nhập theo bước làm quen, giữ kiểm tra luyện tập và kéo hỗ trợ.
- API mock reply nhận bảy mức với prompt v2; API lưu SQL v1 vẫn nhận A2/B1/B2 và trả 422 cho mức chưa hỗ trợ.

### Bản demo develop — 2026-10-07

- Hợp nhất UI đa trang, schema SQL Server, backend API và CI/Docker; thêm hướng dẫn demo và bảng các nhánh nguồn.
- Sửa lỗi build/lint của nút hỗ trợ/profile/intro; tên hồ sơ rỗng không được lưu, login không xóa email, ô mật khẩu được xóa khi đổi chế độ và title khớp trạng thái đăng nhập.
- Khôi phục bộ test UI theo đăng nhập demo abc/123 và storage jsdom; kiểm tra trọn backend/frontend cùng ngưỡng coverage 80%.

### Backend/API SQL Server — 2026-10-07

- Hoàn thiện API auth JWT/Argon2, reset/đổi mật khẩu và thu hồi phiên; hồ sơ/cài đặt/account dùng rowversion.
- Thêm catalog, hội thoại/lịch sử/evaluation, luyện nghe/nói/viết, notebook/mastery, flashcard/review và dashboard theo schema hiện có.
- Media private: avatar và recording kiểm tra định dạng/duration; chấm listening bằng đáp án SQL, AI mock được ghi nhãn rõ.
- Hoàn thiện ownership, request UUID/retry, rollback, worker thread/timeout/cancel, input limits và error responses không lộ bí mật.
- Thêm migration runner, OpenAPI export cho Postman, hướng dẫn DB/JWT/SMTP, Docker ODBC/ffmpeg/media volume và workflow SQL Server tests.
- Giao diện nghiệp vụ vẫn ở nhánh riêng chưa nối API. Chưa thêm OAuth, STT, streaming, provider AI thật hoặc gửi thử SMTP thật. Kết quả test cụ thể xem PROGRESS.

### Thiết kế database SQL Server — 2026-10-07

- Khảo sát toàn bộ giao diện/nghiệp vụ; bổ sung tài liệu ERD, từ điển dữ liệu, ánh xạ localStorage và quy tắc giao dịch.
- Thêm schema 22 bảng, 2 view, seed 8 chủ đề/9 bài/4 câu hỏi/6 lựa chọn và truy vấn mẫu cho SQL Server; thay PostgreSQL trong kế hoạch triển khai tiếp.
- Bộ kiểm thử database chạy 45/45 kiểm tra trên SQL Server 2022, rollback toàn bộ môi trường thử. Chưa tích hợp database/auth/OAuth vào backend hoặc thay đổi cách chạy ứng dụng.

### Added

- Mate chào và hỏi khả năng tiếng Anh ngay sau đăng nhập đầu tiên bằng bảy mô tả dễ hiểu, từ bắt đầu số 0 đến diễn đạt tự nhiên; không hiện mã A1/A2 trong lựa chọn. Câu trả lời tự đặt mức học, lưu và đưa vào tổng quan; lần đăng nhập sau không hỏi lại. Người đăng ký mới được làm quen lại.
- Trang Lộ trình học từ Pre-A1 đến C2, điểm bắt đầu cho người chưa từng học, phần chữ cái/số đếm/lời chào có phát âm chậm; chọn chặng lưu trong hồ sơ.
- Nội dung Speaking, Listening, Reading, Writing và nhập vai theo cả bảy mức; API hội thoại chấp nhận Pre-A1/A1/C1/C2 cùng ba mức cũ. Người mới mặc định Pre-A1; dữ liệu trình độ cũ được giữ.

- Mate hỗ trợ cầm ống nghe điện thoại bàn cổ điển có dây xoắn, rung nhẹ tự động theo nhịp; tạm dừng khi kéo và tắt theo tùy chọn giảm chuyển động.

- Nút hỗ trợ dùng Mate đang nghe điện thoại, nền kính mờ lúc nghỉ và đậm khi hover/kéo. Kéo bằng chuột/cảm ứng, giới hạn nút và hộp hỗ trợ trong màn hình; hỗ trợ Escape và bàn phím.

- Reading: 3 bài A2/B1/B2 với 9 câu hỏi đọc hiểu, chấm điểm và giải thích, làm lại, lưu từ vựng và ghi nhận phút luyện tập. Thêm trong menu và tổng quan; tên kỹ năng đổi thành Speaking, Listening, Reading, Writing.

- Nút tiếp tục với Google/Facebook/GitHub trên đăng nhập và đăng ký; hiện hoàn thiện giao diện, báo rõ chưa kết nối khi bấm.
- Linh thú Mate với dáng chào, tai nghe, suy nghĩ, động viên và ăn mừng; component dùng chung, bản SVG nền trong suốt và hướng dẫn nhận diện.
- Cài đặt giao diện sáng/tối/theo hệ thống, giảm chuyển động và tốc độ đọc tiếng Anh; lưu tùy chọn trên trình duyệt và giữ tương thích dữ liệu cũ.
- Menu avatar theo trạng thái đăng nhập, hỗ trợ hover/bấm, bàn phím và đóng khi bấm ra ngoài.
- Logo EngMate AI dạng SVG nền trong suốt cho sidebar, mobile, trang tài khoản và favicon; banner/menu/nút chính dùng màu xanh theo thương hiệu.
- Bản demo frontend responsive gồm 10 trang học tiếng Anh, sidebar/menu mobile và hash routing không cần thêm dependency.
- Các luồng tương tác demo cho hội thoại AI, ghi âm, luyện nghe, luyện viết, sổ từ vựng, flashcard, hồ sơ và tài khoản.
- Lưu dữ liệu demo bằng `localStorage`, thống kê theo ngày, lịch ôn từ và cảnh báo khi trình duyệt không thể lưu.
- Bộ icon SVG nội bộ, phát âm bằng Web Speech và ghi âm bằng MediaRecorder khi trình duyệt hỗ trợ.
- Test giao diện cho route, lifecycle, lỗi API/storage và các luồng học chính.
- Khung React/TypeScript và FastAPI/Python mới theo yêu cầu reset ngày 2026-10-04.
- LLM interface, mock, AIService, prompt v1 và endpoint demo có validation/timeout.
- Health UI kết nối API qua proxy, các trạng thái tải/lỗi và hủy request.
- Tests unit/integration backend, frontend API/component/hook, HTTP smoke.
- Task runner Python, Docker dev stack, lockfile, pre-commit và CI.
- Documentation yêu cầu, kiến trúc, API, kiểm thử, prompt, quyết định và nhật ký tiến độ.

### Changed

- Bỏ pip cache của GitHub Actions để tránh lỗi đường dẫn cache khi kết thúc job.
- Backend Docker dùng curl cho health check, giới hạn request 2 giây và cho phép khởi động 15 giây; frontend Compose có start period 30 giây.
- Trang đăng nhập dùng panel Mate navy/cyan cuộn đổi chỗ với form khi đăng nhập ↔ đăng ký; form mở theo hướng, sóng viền và hiệu ứng phụ. Mobile xếp dọc với pill; giữ nút xã hội demo và giảm chuyển động.
- Chuyển giữa đăng nhập/đăng ký/khôi phục bằng nền tab trượt, tiêu đề/chữ chuyển mờ và biểu mẫu trượt/nghiêng nhẹ; chiều cao khung co giãn mượt. Bấm đổi nhanh không kẹt trạng thái; giữ tên/email, làm mới ô mật khẩu; hỗ trợ giảm chuyển động.
- Mate đồng hành ở banner, sidebar, đăng nhập, avatar/trợ lý hội thoại, ghi âm, nghe, viết, mục tiêu ngày và hoàn thành flashcard. Kết quả nghe đúng/sai dùng biểu cảm phù hợp; mục tiêu và phiên ôn dùng dữ liệu hiện có. Thẻ kỹ năng có màu nhẹ, cạnh nổi và phản hồi khi nhấn.
- Bổ sung trang trí và animation: banner gradient với nhân vật nổi/chớp mắt, vòng quay và sao; nền màu, thẻ xuất hiện lần lượt/nổi khi hover, nút ánh sáng, chuyển trang, tin nhắn, thẻ từ và các trạng thái luyện tập. Đăng nhập vẫn riêng, nhãn vẫn gọn; Giảm chuyển động tắt các hiệu ứng.
- Bỏ mô tả thừa dưới tên thành phần và slogan; chữ và khoảng cách thống nhất cho sáng/tối. Thu gọn nội dung tổng quan, chủ đề, hồ sơ và đăng nhập. Cài đặt chỉ hiện nhãn/điều khiển; gợi ý luyện nói và cách ôn flashcard mở khi cần.
- Đăng nhập/đăng ký/khôi phục tài khoản chuyển sang trang độc lập `#dang-nhap`, có bố cục desktop/mobile riêng và không hiển thị sidebar/topbar học tập. Cài đặt chỉ còn giao diện/âm thanh; avatar dẫn đến trang mới, đăng nhập xong có nút vào không gian học tập. Giữ liên kết cũ `#tai-khoan` và `#cai-dat?muc=tai-khoan`.
- Thanh cuộn hiện và ẩn bằng hiệu ứng mờ dần 280 ms; menu mobile giữ hiệu ứng tương tự, bố cục 360 px không bị tràn do độ rộng thanh cuộn.
- Bỏ nhãn demo trên thanh trên cùng, tài khoản, hồ sơ, lịch flashcard và ghi chú chung; chỉ gắn `AI · Demo` cạnh chức năng AI.
- Thanh cuộn trang/menu/vùng nội dung mặc định trong suốt, chỉ hiện khi cuộn và tự ẩn sau 1 giây dừng cuộn, không làm xê dịch bố cục.
- Thay trang health khởi tạo bằng app EngMate-AI đa trang; endpoint AI mock hiện được dùng trong trang hội thoại.
- Health route chuyển thành `/api/health`; cổng local mặc định 8010/5174.
- Loại bỏ phụ thuộc GNU Make trong wrapper Windows và các cấu hình thừa của khung cũ.

Kết quả chạy thật và các giới hạn ghi trong `PROGRESS.md`.

## 2026-10-08 — Blaze speech

Thêm POST /api/speech/tts (MP3) và /api/speech/stt (transcript), cấu hình server-only và test. UI đã dùng giọng đọc Blaze, tự chép lời Speaking và có micro nhập bản nháp Hội thoại.

Cài đặt có mục Giọng nói: chọn giọng tiếng Anh theo nhóm nam/nữ, nghe thử/dừng; tự lưu và áp dụng cho toàn bộ nút Nghe.

Giảm độ trễ nút Nghe: chuẩn bị clip hiện tại trước click, cache RAM có giới hạn, chia sẻ lượt tải và phát lại không gọi TTS lần nữa. Đổi giọng/tốc độ không dùng nhầm clip; logout xóa âm thanh đã lưu. Lần chưa chuẩn bị vẫn chờ provider.

## 2026-11-20 - Vocabulary AI custom topics (Gate B)

- Frontend: owner-scoped generation/list/poll/cancel/delete hook, custom form/list/job/detail UI, Vietnamese error mapping, scoped CSS.
- Tests: Vocabulary Vitest 21/21; frontend 500/500; lint, format and build passed.
- Backend Step 1: 6 tests added; 332 backend tests passed; coverage 93.03%.
- Docs: Step 2 smoke proposal (not executed, not in defaults).
- Screenshots: `docs/assets/vocabulary-ai-20261120/` (7 images).

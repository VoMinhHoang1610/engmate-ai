# Đo nền VAD và đề xuất giảm nhiễu — 13/11/2026

## Đo lại 14–15/11/2026 — cùng corpus, không đổi thuật toán

23/23 test benchmark qua; seed 20261113, 28 kịch bản × 60 s × batch/realtime. Request là số mô phỏng, không phải API/provider thật. Mọi tỷ lệ request dùng phút audio tổng; FP dùng phút không có speech, nên hàng speech có mẫu số khác. CaptureState là thời gian trạng thái thu, không phải tổng PCM gồm pre-roll.

| Kịch bản | SNR dB | FP/phút trước→sau | STT batch/phút | STT RT/phút | Thu ms/phút trước→sau | Miss trước→sau | Δ p50 endpoint ms |
|---|---:|---|---|---|---|---|---|
| white-0.004 | — | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | — | — |
| white-0.012 | — | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | — | — |
| white-0.024 | — | 2 → 1 | 2 → 0 | 2 → 1 | 59600 → 800 | — | — |
| white-0.04 | — | 2 → 1 | 2 → 0 | 2 → 1 | 59600 → 800 | — | — |
| pink-0.004 | — | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | — | — |
| pink-0.012 | — | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | — | — |
| pink-0.024 | — | 2 → 5 | 2 → 4 | 2 → 5 | 59600 → 8100 | — | — |
| pink-0.04 | — | 2 → 5 | 2 → 4 | 2 → 5 | 59600 → 8100 | — | — |
| hum-0.008 | — | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | — | — |
| hum-0.03 | — | 2 → 1 | 2 → 0 | 2 → 1 | 59600 → 800 | — | — |
| clicks | — | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | — | — |
| keyboard | — | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | — | — |
| door | — | 14 → 14 | 14 → 14 | 14 → 14 | 14000 → 14000 | — | — |
| speech-noise-0.004-snr-0 | 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 7 → 7 / 7 | — |
| speech-noise-0.004-snr-5 | 5 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 7 → 7 / 7 | — |
| speech-noise-0.004-snr-10 | 10 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 7 → 7 / 7 | — |
| speech-noise-0.004-snr-20 | 20 | 0 → 0 | 7 → 7 | 7 → 7 | 10900 → 10900 | 0 → 0 / 7 | 0 |
| speech-noise-0.012-snr-0 | 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 7 → 7 / 7 | — |
| speech-noise-0.012-snr-5 | 5 | 0 → 0 | 7 → 7 | 7 → 7 | 10500 → 10900 | 0 → 0 / 7 | 100 |
| speech-noise-0.012-snr-10 | 10 | 0 → 0 | 7 → 7 | 7 → 7 | 10900 → 10900 | 0 → 0 / 7 | 0 |
| speech-noise-0.012-snr-20 | 20 | 0 → 0 | 7 → 7 | 7 → 7 | 10900 → 10900 | 0 → 0 / 7 | 0 |
| speech-noise-0.024-snr-0 | 0 | 2.22222 → 1.11111 | 2 → 7 | 2 → 8 | 59600 → 11300 | 0 → 0 / 7 | — |
| speech-noise-0.024-snr-5 | 5 | 2.22222 → 1.11111 | 2 → 7 | 2 → 8 | 59600 → 11700 | 0 → 0 / 7 | — |
| speech-noise-0.024-snr-10 | 10 | 2.22222 → 1.11111 | 2 → 7 | 2 → 8 | 59600 → 11700 | 0 → 0 / 7 | — |
| speech-noise-0.024-snr-20 | 20 | 2.22222 → 1.11111 | 2 → 7 | 2 → 8 | 59600 → 11700 | 0 → 0 / 7 | — |
| mate-echo-0.008 | — | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | — | — |
| mate-echo-0.025 | — | 12 → 12 | 12 → 12 | 12 → 12 | 32400 → 32400 | — | — |
| mate-echo-0.05 | — | 12 → 12 | 12 → 11 | 12 → 12 | 32400 → 33500 | — | — |

Nhiễu white/pink/hum sau B không chạm cap/open capture cuối đoạn. Pink RMS .024/.04 vẫn hồi quy FP 2→5, batch STT 2→4 và RT 2→5 dù thời gian thu 59,6→8,1 s/phút. Echo .05 giảm batch 12→11 vì còn một capture chưa đóng ở giây 60, không được gọi là loại nhiễu trước STT. Xung cửa/echo chưa giảm FP; mục tiêu ≥70% vẫn không đạt. 28/84 speech bị bỏ sót ở cả hai; không lấy số trung bình này thay bảng RMS/SNR.

[Thiết kế onset và bảng thử chuẩn 3 phút](VOICE_ONSET_DESIGN.md) · [CSV điền tay](VOICE_DEVICE_CHECKLIST.csv). Các hướng dẫn 60 giây phía dưới thuộc lần thử cũ/benchmark; **thử thiết bị mới dùng 180 giây im lặng rồi 10 câu ngắn**, giữ số đếm hai pha riêng. Chưa chạy thiết bị, chưa có kết quả onset mới, C/D/E vẫn hoãn.



Trạng thái: hoàn tất triển khai Pha A/B opt-in và kiểm chứng frontend; **dừng cho
người dùng thử thiết bị thật**. Chưa đạt mục tiêu giảm kích hoạt nhầm ≥70%.
Hai pha đều opt-in, mặc định tắt. Pha C chỉ có [đề xuất phép đo đầu ra](VOICE_OUTPUT_LEVEL_PROPOSAL.md),
chưa triển khai; Pha D/E hoãn đến khi có kết quả thiết bị thật.
Không sửa backend, prompt, SSE, UUID, giọng TTS, CSS hoặc VoiceState.

## Phạm vi và tiến trình Bước 1 (lịch sử)

- Đã đọc AGENT.md, CLAUDE.md; đối chiếu mục 10–13, 20, 24 của bàn giao với code.
- Đã chạy test nền trước refactor: frontend 417/417; backend 230 qua, 24 bỏ qua
  do chưa cấu hình database test, một cảnh báo Starlette/httpx đã có từ trước.
- `src/voice/vad.ts`: `VoiceVad.push(frame, at?)` trả invalid/pending/start/frame;
  frame chứa speaking, pre-roll/capture, lastVoicedAt, lý do endpoint nếu có.
  `reset()` bỏ bộ đệm; session vẫn sở hữu worklet reset và toàn bộ lifecycle mạng/media.
- Giữ RMS >=0,018; 2 frame bắt đầu, 3 pre-roll, 9 im lặng, cap 300 frame;
  silence ưu tiên khi trùng cap. Frame sai không thay bộ đếm. Timestamp live vẫn
  lấy sau phép tính RMS, như code cũ. Không sao chép PCM mỗi lần push.
- Không thêm dependency. Module này chính là VAD năng lượng để dùng làm fallback
  về sau; bước tách không cần công tắc hành vi vì chưa thêm thuật toán mới.
- `docs/PROGRESS.md` đã bị xóa trong working tree trước tác vụ. Ghi tiến trình ở
  đây để giữ nguyên thay đổi đó; không khôi phục lịch sử ngoài ý muốn.

## Chạy lại phép đo

Từ `frontend`:

```powershell
npm.cmd run benchmark:vad
```

Lệnh dùng TypeScript/Vitest đã có, cấu hình riêng `vitest.vad.config.ts`;
`benchmarks/` nằm ngoài `src/**/*.test.*` và phạm vi coverage mặc định.
Không đọc `.env`, không mở micro, không import BlazeVoiceSession hay gọi provider;
fetch/WebSocket/XMLHttpRequest bị chặn trong bài đo chính. Không ghi PCM tổng hợp
ra file. Chỉ ghi số liệu gộp vào `.artifacts/voice-vad-baseline.json`, đã gitignore.
Mỗi lần chạy ghi đè report cục bộ này; tự giữ bản report trước khi thử biến thể mới.

`benchmarks/vad/legacy.ts` là bản đóng băng logic cũ với hằng số độc lập, chỉ dùng
trong test. Bộ đo so từng frame (quyết định, speaking, timestamp, thứ tự/identity
PCM trong capture), rồi so toàn bộ số đo trước/sau. Không import oracle vào runtime.
Khi triển khai pha sau, giữ bài tương đương này cho fallback EnergyVad; thêm phép
đo riêng cho biến thể mới, không sửa oracle để làm kết quả trùng.

### WAV riêng có nhãn

Chỉ khi tự cung cấp dữ liệu, đặt thư mục ngoài repo hoặc dưới
`.artifacts/voice-vad-local/` (đã gitignore). Bộ đọc từ chối thư mục trong cây mã
nguồn, đường dẫn/symlink thoát thư mục, nhãn thiếu/sai/chồng nhau và file quá lớn.
Không có dữ liệu giọng thật được tạo hoặc đọc trong lần bàn giao này.

```powershell
# Thực hiện trong frontend; biến này chỉ điều khiển công cụ ngoại tuyến.
$env:VAD_BENCH_WAV_DIR = '..\.artifacts\voice-vad-local'
npm.cmd run benchmark:vad
Remove-Item Env:VAD_BENCH_WAV_DIR
```

Thư mục chứa WAV RIFF PCM16 little-endian, mono 16 kHz, độ dài bội 100 ms,
và `labels.json` như dưới. Không tự resample/pad; cần chuẩn bị đúng định dạng.
Tối đa 100 file, 20 MiB/file, manifest 1 MiB. Nhãn tính bằng ms từ đầu file;
speech là **người học**, playback là khoảng **Mate đang phát**, có thể giao nhau.
Mảng rỗng là nhãn chủ động xác nhận không có sự kiện, không phải nhãn chưa biết.

```json
[
  {
    "file": "sample.wav",
    "speech": [{ "startMs": 1000, "endMs": 1400 }],
    "playback": [{ "startMs": 2500, "endMs": 4500 }]
  }
]
```

Report đặt tên local-1, local-2…, không ghi tên file, đường dẫn, chữ nhận dạng hay
samples. Đường WAV chỉ đọc PCM đã có; không mô phỏng capture/resample/AEC của browser.

## Định nghĩa số đo và giới hạn

28 kịch bản, mỗi kịch bản 60 giây, seed 20261113, chạy lại cả batch và realtime
(56 cặp kết quả trước/sau). Có 16 phút chỉ nhiễu/echo và 12 phút speech+noise,
84 đoạn có nhãn (48 đoạn 300 ms và 36 đoạn 1.600 ms). Không phải giọng nói thật:
tone 170/340/680 Hz điều biến nhịp 4 Hz; nhiễu hồng chỉ là xấp xỉ đa octave.
SNR = RMS tone / RMS nhiễu tính theo dB trước trộn/lượng tử hóa. Kiểm clipping.

| Nhóm | Mức RMS nguồn và thời lượng/điều kiện |
| --- | --- |
| white / pink | RMS toàn nguồn 0,004; 0,012; 0,024; 0,040, liên tục 60 s. |
| hum | RMS 0,008; 0,030, tổng tone 60 Hz + 0,3×120 Hz. |
| clicks | RMS xung 0,080 trên 5 ms, mỗi 4 s; nền trắng RMS 0,004. |
| keyboard | RMS xung 0,080 trên 30 ms, mỗi 700 ms; nền trắng RMS 0,004. |
| door | RMS xung 0,120 trên 250 ms, mỗi 4 s; nền trắng RMS 0,004. |
| speech-noise | Nền trắng RMS 0,004/0,012/0,024 × SNR 0/5/10/20 dB; lời mô phỏng 300/1.600 ms. |
| mate-echo | RMS nguồn lời 0,008/0,025/0,050; trễ 100 ms cộng bản 0,35× trễ 200 ms, nền RMS 0,004. |

RMS xung là trên chính đoạn xung sau envelope suy giảm, không phải RMS của cả
phút. RMS echo là nguồn trước cộng hai bản trễ, không phải mức âm loa/micro
đã hiệu chuẩn. Chỉ có một mức xung cho mỗi loại trong corpus này; chưa suy rộng
sang các mức khác. Những định nghĩa này áp dụng cho cả bảng nền và trước/sau.

Logic gốc lấy từ `blaze.ts` ở HEAD `e509722` (file này sạch trước tác vụ), các test
toàn repo chạy trên working tree có sẵn thay đổi của người dùng. Môi trường đo:
Windows, Node v25.9.0, Vitest 4.1.11. Không dùng thời gian chạy test làm latency thoại.

| Số đo | Cách tính |
| --- | --- |
| Kích hoạt nhầm/phút | Số onset mà frame xác nhận không giao speech / số phút không có speech trong nhãn. |
| Bỏ sót đoạn | Không có capture đã chốt nào giữ >=50% đoạn có nhãn. Chỉ đo giữ được PCM, không đo nhận đúng từ. |
| Chốt bất thường | Đoạn đã được giữ nhưng capture bị chốt ở 30 giây hoặc chốt trước cuối đoạn; báo riêng, không coi là chốt thành công. |
| Ngắt giả khi phát | Onset không có speech nhưng giao playback; tối đa một lần mỗi khoảng playback (mô phỏng dừng Mate). |
| Thời gian mắc capture | Tổng thời gian frame không có speech trong khi VAD đang thu, từ frame xác nhận trở đi; không tính ngược pre-roll. |
| Endpoint/STT từ nhãn | Thời điểm chốt/yêu cầu STT trừ cuối speech có nhãn, chỉ trên capture chốt silence đúng sau speech. |
| Endpoint/STT từ lastVoiced | Offset do VoiceLatencyTrace phát, gốc là frame cuối vượt RMS; không phải ground truth. |

Clock ảo tiến đúng 100 ms/frame. `stt_requested` batch đặt ở endpoint; realtime
đặt ở onset như lúc khởi tạo RealtimeSTT. Đây là **thời điểm dự kiến gọi STT tại
client**, không phải kết nối ready, provider nhận audio hoặc trả chữ; không giả lập
chi phí encode WAV, event-loop, mạng, handshake hay fallback timeout.
STT realtime có thể có offset âm vì đã bắt đầu trước cuối câu. Không cộng p50/p95.
Trace `completed` trong harness chỉ nghĩa phép đo local hoàn tất, không có lượt
provider thật nào. Listener và spy clock được dọn trong finally.

Các đoạn bị bỏ sót/chốt cap không được gán latency 0; trả null và mẫu bằng 0 nếu
không có mẫu. Một capture chứa nhiều đoạn vẫn có thể giữ PCM nhưng ghép lượt sai;
vì vậy luôn đọc tỷ lệ bỏ sót cùng chốt bất thường, cap và thời gian mắc capture.
Không diễn giải “0 bỏ sót” trên nhiễu lớn thành chất lượng hội thoại tốt.

## Số liệu nền thực chạy — thống nhất đơn vị (14/11/2026)

Mỗi kịch bản dài **60 giây**. 28 kịch bản được phát lại ở hai mode, không đếm
batch/realtime thành hai bộ audio khác nhau. FP/phút = onset nhầm / phút **không
có speech**: mẫu số là 1 phút ở mẫu chỉ nhiễu, 0,9 phút ở mẫu trộn (6 s speech).
Ngắt giả là **số lần / số khoảng Mate phát**, không phải số kịch bản; mỗi mẫu echo
có 12 khoảng phát. Cap là số lượt chốt tại giới hạn 30 giây.

- **14 FP/phút** =14 onset /1 phút của riêng mẫu xung đóng cửa.
- **12 FP/phút mỗi mức echo lớn** =12 onset /1 phút tại RMS nguồn 0,025 hoặc
  0,050. Mỗi mức cũng có 12/12 khoảng playback bị ngắt giả.
- **3 FP/phút** =48 onset /16 phút của tất cả mẫu chỉ nhiễu/echo, gồm cả mẫu
  không kích hoạt. Trung bình này không thay thế kết quả từng hàng.
- **24/36** =24 ngắt giả /36 khoảng playback của cả ba mức echo =66,67%;
  tương đương **8 ngắt giả/phút audio echo** (24/3 phút). Không phải 24/36 kịch bản.

Bảng đầy đủ: **trước tách = sau tách Bước 1**, chưa có cải thiện. RMS/SNR ghi
trong tên mẫu; RMS echo là nguồn trước cộng bản vọng 0,35×. Bỏ sót đo capture
đã chốt giữ >=50% PCM có nhãn, không chứng minh nhận đúng từ. Latency chỉ tính
capture chốt silence sau cuối đoạn; null nghĩa không có mẫu. Thu trên nhiễu là
thời gian VAD đang thu tại phần không có speech, không tính ngược pre-roll.

| Kịch bản | Phút không speech | FP (lần) | FP/phút | Ngắt giả/khoảng phát | Bỏ sót/đoạn | Cap (lần) | Thu trên nhiễu (s) | Endpoint p50/p95 ms (n) |
| --- | ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| white-0.004 | 1.0 | 0 | 0.000 | 0/0 | 0/0 | 0 | 0.0 | null (0) |
| white-0.012 | 1.0 | 0 | 0.000 | 0/0 | 0/0 | 0 | 0.0 | null (0) |
| white-0.024 | 1.0 | 2 | 2.000 | 0/0 | 0/0 | 2 | 59.8 | null (0) |
| white-0.04 | 1.0 | 2 | 2.000 | 0/0 | 0/0 | 2 | 59.8 | null (0) |
| pink-0.004 | 1.0 | 0 | 0.000 | 0/0 | 0/0 | 0 | 0.0 | null (0) |
| pink-0.012 | 1.0 | 0 | 0.000 | 0/0 | 0/0 | 0 | 0.0 | null (0) |
| pink-0.024 | 1.0 | 2 | 2.000 | 0/0 | 0/0 | 2 | 59.8 | null (0) |
| pink-0.04 | 1.0 | 2 | 2.000 | 0/0 | 0/0 | 2 | 59.8 | null (0) |
| hum-0.008 | 1.0 | 0 | 0.000 | 0/0 | 0/0 | 0 | 0.0 | null (0) |
| hum-0.03 | 1.0 | 2 | 2.000 | 0/0 | 0/0 | 2 | 59.8 | null (0) |
| clicks | 1.0 | 0 | 0.000 | 0/0 | 0/0 | 0 | 0.0 | null (0) |
| keyboard | 1.0 | 0 | 0.000 | 0/0 | 0/0 | 0 | 0.0 | null (0) |
| door | 1.0 | 14 | 14.000 | 0/0 | 0/0 | 0 | 15.4 | null (0) |
| speech-noise-0.004-snr-0 | 0.9 | 0 | 0.000 | 0/0 | 7/7 | 0 | 0.0 | null (0) |
| speech-noise-0.004-snr-5 | 0.9 | 0 | 0.000 | 0/0 | 7/7 | 0 | 0.0 | null (0) |
| speech-noise-0.004-snr-10 | 0.9 | 0 | 0.000 | 0/0 | 7/7 | 0 | 0.0 | null (0) |
| speech-noise-0.004-snr-20 | 0.9 | 0 | 0.000 | 0/0 | 0/7 | 0 | 6.3 | 900/900 (7) |
| speech-noise-0.012-snr-0 | 0.9 | 0 | 0.000 | 0/0 | 7/7 | 0 | 0.0 | null (0) |
| speech-noise-0.012-snr-5 | 0.9 | 0 | 0.000 | 0/0 | 0/7 | 0 | 5.9 | 800/900 (7) |
| speech-noise-0.012-snr-10 | 0.9 | 0 | 0.000 | 0/0 | 0/7 | 0 | 6.3 | 900/900 (7) |
| speech-noise-0.012-snr-20 | 0.9 | 0 | 0.000 | 0/0 | 0/7 | 0 | 6.3 | 900/900 (7) |
| speech-noise-0.024-snr-0 | 0.9 | 2 | 2.222 | 0/0 | 0/7 | 2 | 53.8 | null (0) |
| speech-noise-0.024-snr-5 | 0.9 | 2 | 2.222 | 0/0 | 0/7 | 2 | 53.8 | null (0) |
| speech-noise-0.024-snr-10 | 0.9 | 2 | 2.222 | 0/0 | 0/7 | 2 | 53.8 | null (0) |
| speech-noise-0.024-snr-20 | 0.9 | 2 | 2.222 | 0/0 | 0/7 | 2 | 53.8 | null (0) |
| mate-echo-0.008 | 1.0 | 0 | 0.000 | 0/12 | 0/0 | 0 | 0.0 | null (0) |
| mate-echo-0.025 | 1.0 | 12 | 12.000 | 12/12 | 0/0 | 0 | 33.6 | null (0) |
| mate-echo-0.05 | 1.0 | 12 | 12.000 | 12/12 | 0/0 | 0 | 33.6 | null (0) |

Tổng bỏ sót giữ PCM 28/84 =33,33%; SNR >=10 dB là 7/42 =16,67%. Thêm 28/84
đoạn chỉ giữ trong lượt chốt cap; 28/84 có endpoint bình thường. Batch STT dự
kiến bắt đầu cùng endpoint. Realtime trên bốn cấu hình chốt bình thường có
p50/p95 -100/-100 ms từ cuối speech (đã bắt đầu khi còn nói). Endpoint từ
lastVoiced =900 ms; 800 ms từ nhãn tại SNR5 do cuối tone dưới ngưỡng.
Chênh lệch trước/sau tách =0 trên clock ảo; chưa đo CPU/thiết bị/provider thật.

## Mục tiêu đã duyệt ngày 14/11/2026

Báo riêng từng loại xung/nhiễu liên tục/echo và từng mức RMS/SNR, không chỉ gộp.
Nhiễu liên tục **không được giữ lượt thu tới cap 30 giây**. Pha C chưa được duyệt;
không tuyên bố đạt mục tiêu echo nếu Pha A/B chưa xử lý được.

1. Giảm >=70% kích hoạt nhầm ở từng loại/mức RMS có FP nền >0; không tăng ở
   các hàng nền bằng 0. Ví dụ nền 14/phút phải xuống <=4/phút, nền 12/phút xuống
   <=3/phút trong cửa sổ một phút. Số gộp 16 phút (3,00 xuống <=0,90/phút,
   tối đa 14 onset) chỉ là đối chiếu phụ, không thay thế tiêu chí từng hàng.
2. Echo: từ 24 xuống <=7 ngắt giả/36 khoảng playback tổng hợp; mục tiêu thiết bị
   thật là không tự ngắt trong bài thử người dùng im lặng, cần kiểm tay để kết luận.
3. Bỏ sót giữ PCM không tăng quá 2 điểm phần trăm ở từng RMS/SNR; báo cả câu
   ngắn và nhóm SNR >=10 dB. Mỗi hàng chỉ có 7 đoạn, một lỗi thêm là 14,29 điểm,
   tức không chấp nhận thêm lỗi ở tập nhỏ này. Giữ nhận “Yes.”, “Vâng”, “Sales”.
4. Trên cùng các đoạn cả hai bản đều chốt bình thường, tăng endpoint và bắt đầu
   STT p50 <=150 ms; báo cả p95, số mẫu, đoạn bị loại/mới nhận được. Đề xuất thêm:
   không tăng chốt cap, không giảm số đoạn chốt bình thường, không tăng thời gian
   mắc capture; tránh đạt latency bằng cách bỏ các lượt khó.

SNR không định nghĩa cho mẫu chỉ nhiễu. Vì vậy tách tiêu chí giảm false onset theo
mức RMS khỏi tiêu chí bảo toàn speech ở từng mức SNR, thay cho một tỷ lệ trộn hai loại.
Các ngưỡng trên là cổng so sánh kỹ thuật, **không phải chuẩn chất lượng đã đạt**;
tỷ lệ bỏ sót nền cao cần WAV thật có nhãn trước khi kết luận khả năng nhận giọng.
Harness không chạy STT nên không đo chữ rác/hallucination, WER/CER hoặc độ tin cậy
transcript. Cổng chữ cần test double riêng và kiểm thử giọng thật sau khi được duyệt.

## Thiết kế pha — đề xuất Bước 1 và trạng thái hiện tại

A/B trong bảng đã được triển khai opt-in ngày 14/11, kết quả ở phần cuối.
C chỉ có đề xuất phép đo đầu ra riêng và chưa có code; D/E hoãn.

| Pha | Thay đổi đề xuất | Công tắc/fallback dự kiến và điều kiện kiểm |
| --- | --- | --- |
| A | Cổng transcript sau trim, trước transcript final/streamTurn; rỗng hoặc bằng chứng yếu kết hợp chữ lặp thì bỏ lượt nhẹ. Giữ trần 2.000. | Công tắc riêng, mặc định tắt trong lần triển khai đầu; tắt giữ hành vi lỗi hiện tại. Không lấy số từ làm ngưỡng duy nhất. |
| B | Ước lượng noise khi không có speech; ngưỡng max(0,018, noise × hệ số), hysteresis, bằng chứng voiced trước endpoint. | Chọn EnergyVad/adaptive qua factory; lỗi nội bộ quay EnergyVad. Giữ pre-roll và một chủ sở hữu PCM để tránh mất đầu từ khi fallback. Các tham số chỉ chốt sau đo. |
| C | Điều kiện onset riêng trong assistant_speaking, thêm bằng chứng thời gian/năng lượng so với output. | Công tắc độc lập; output thiếu/stale không làm hỏng thoại. Không lấy mức visual đã nhân 5/clamp làm RMS thô; cần giữ giá trị/mốc thời gian phù hợp. |
| D | Neural VAD chỉ cân nhắc nếu A–C không đạt. | Chờ duyệt dependency, license, bundle, asset WASM/ONNX qua Vite/Docker/Nginx và HTTPS; fallback EnergyVad khi tải/runtime lỗi. |
| E | Khảo sát speaker verification nếu được yêu cầu tiếp. | Chưa khảo sát/chưa viết code; không nhầm speech/identity của Mate với nhận diện người học. |

Pha A đã thêm event `notice` tùy chọn với role=status và class sẵn có, không thêm
VoiceState/CSS. `error` vẫn giữ role=alert và hành vi tự ẩn 5 giây đã có trong
working tree trước tác vụ. Không dùng events.error để giả thông báo nhẹ.
Realtime partial chỉ là caption, không tạo message; notice xóa caption bị loại,
hủy recognition và không gọi sync/tạo message không cần thiết.

Pha B/C phải giữ cancel → receipt trước lượt Gemini mới, token turn/generation,
AbortController/live guard, mute, timeout và cleanup. Realtime đã gửi audio mà
VAD loại lượt thì cancel nhận dạng/timer/socket; không fallback batch cho lượt bị
chủ động loại. VAD mới lỗi thì fallback có kiểm soát, không mở hai recognition
cùng lúc. Không hứa thu hồi job upstream đã tạo chỉ bằng việc đóng socket local.

Cấu hình đã triển khai: `VITE_VOICE_SOFT_GATE` và `VITE_VOICE_ADAPTIVE_VAD`,
cờ build-time riêng cho frontend Blaze, mặc định false trong `.env.example`.
Không nối chung với `VOICE_VAD_*` native; hợp nhất qua server vượt phạm vi này.
Không tự giảm âm lượng. Không thêm bước hiệu chuẩn 1–2 s có UI. Hai hướng đó và
khảo sát nhận diện người nói cần quyết định riêng, không là điều kiện để đo Bước 1.

## Kiểm thử tự động và rollback Bước 1 (lịch sử)

Kết quả kiểm chứng cập nhật ngày 14/11/2026:

| Lệnh đã chạy | Kết quả quan sát |
| --- | --- |
| `python scripts/manage.py lint` | Qua Ruff, Black, mypy, ESLint, TypeScript và Prettier; lượt cuối exit 0. |
| `python scripts/manage.py test` trước tách | Frontend 417/417; backend 230 qua, 24 bỏ qua. |
| `python scripts/manage.py test` sau tách | Frontend 427/427 trong 36 file; backend 230 qua, 24 bỏ qua. |
| `npm.cmd run benchmark:vad` | 19/19 test qua; 28 kịch bản × 2 mode, mọi cặp trước/sau bằng nhau. |
| `python scripts/manage.py build` | Qua TypeScript và Vite production build; lượt cuối exit 0. |
| `python scripts/manage.py coverage` | **Không qua**: backend 73,93% <80%; dừng trước frontend. 24 test database thiếu MYSQL_TEST_URL cho schema test riêng. |
| `python scripts/manage.py coverage-frontend` | Lượt chạy cùng build/benchmark: 424 qua, 3 test App timeout 5 s; chưa kết luận lỗi hành vi. |
| `npm.cmd run test:coverage -- --maxWorkers=1` | Chạy riêng: **427/427 qua**, exit 0; statements 89,58%, branches 81,85%, functions 85,77%, lines 92,79%. |

Frontend vượt ngưỡng 80% ở cả bốn chỉ số; riêng `vad.ts` đạt 100% cả bốn.
Ba timeout không tái hiện khi chạy riêng một worker. Không thay timeout/assertion
hoặc cấu hình Vitest mặc định; lựa chọn worker chỉ áp dụng cho lệnh kiểm tra lại.

Backend có một StarletteDeprecationWarning về httpx giống lượt test nền; không
thay thư viện hoặc hạ ngưỡng để né cảnh báo/coverage. Không có test bị xóa/skip
thêm, không tăng timeout. Các bài database bị bỏ qua theo điều kiện sẵn có.
Toàn repo **chưa đạt cổng coverage**, dù các test thường đã qua.

Log cục bộ nằm trong `.artifacts/voice-vad-*-verified.log`,
`voice-vad-after-test.log`, `voice-vad-coverage.log`; không commit log hoặc audio.
Kết quả coverage frontend cuối: `voice-vad-coverage-frontend-isolated.log` và
`frontend/coverage/coverage-summary.json` (đều đã gitignore).
Lỗi thử mock filesystem ESM trong test WAV đã sửa bằng module double; lượt
benchmark cuối xác nhận cả kiểm nhãn và chặn đường dẫn đều qua.

Các test mới kiểm biên RMS, frame sai, xung một frame, pre-roll, silence/cap,
reset, câu trả lời ngắn, thứ tự PCM realtime và Stop trong capture. Bộ test hiện
có tiếp tục kiểm ngắt hợp lệ, mute, cancel/receipt, callback muộn, batch fallback,
timeout, unmount, media/listener cleanup. Harness kiểm cả cách tính số đo, offset
âm, file WAV và nhãn bằng dữ liệu/doubles, không dùng API trả phí.

Ở thời điểm Bước 1, chưa có fallback VAD mới hoặc cổng chữ rỗng; kết quả A/B được
ghi riêng bên dưới. Echo không tự ngắt và chất lượng nhận lời nói thật vẫn chưa
được chứng minh. Không viết assertion giả rằng baseline đã chặn được echo.

Rollback Bước 1: không có cờ tính năng chống nhiễu đang bật. Không chạy lệnh
benchmark thì runtime không chạy bộ đo; bỏ biến VAD_BENCH_WAV_DIR để chỉ đo tổng hợp.
Nếu cần bỏ refactor, hoàn tác riêng diff tách VAD trong blaze.ts/vad.ts, không
restore toàn working tree đang có thay đổi của tác vụ khác. Các pha mới phải có
cờ tắt để trở về EnergyVad trước khi được xem là sẵn sàng.

Commit đề xuất: `refactor(voice): extract legacy VAD and add offline noise baseline`.

## Bảng kiểm thủ công — người dùng tự chạy, chưa có kết quả

Mỗi hàng thiết bị/đầu ra cần thử **5 môi trường**: yên tĩnh, quạt, TV,
quán cà phê, gõ phím. Giữ cùng vị trí mic, mức loa, phiên bản browser và mode STT
khi so trước/sau. Ghi số lượt thử và thất bại; không ghi chỉ “cảm thấy tốt hơn”.

| Thiết bị/browser | Đầu ra | Yên tĩnh | Quạt | TV | Cà phê | Gõ phím |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop Chrome | Tai nghe | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| Desktop Chrome | Loa | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| Desktop Edge | Tai nghe | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| Desktop Edge | Loa | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| Android Chrome | Tai nghe | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| Android Chrome | Loa | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| Safari iOS | Tai nghe | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |
| Safari iOS | Loa | Chưa thử | Chưa thử | Chưa thử | Chưa thử | Chưa thử |

Ở mỗi ô, ghi phiếu dưới đây; batch trước, realtime opt-in khi chủ động thử dịch vụ.

| Bài thử | Cách thực hiện/ghi nhận | Kết quả |
| --- | --- | --- |
| Im lặng 60 s | Đếm onset nhầm và thời gian mắc capture; thử tiếng gõ/xung ngắn. | Chưa thử |
| Mate phát, người học im lặng | 10 lượt phát; ghi số lần tự ngắt và mức âm lượng/vị trí loa. | Chưa thử |
| Câu ngắn | Mỗi câu Yes./Vâng/Sales 10 lần, nói thường và nói nhỏ; ghi bỏ sót/mất âm đầu/chữ sai. | Chưa thử |
| Câu dài và ngập ngừng | 10 lượt; pause 300/600/800 ms, một lượt >30 s; ghi cắt/ghép lượt. | Chưa thử |
| Chen lời hợp lệ | 10 lần khi đang STT/LLM/TTS/phát; ghi thời gian ngắt và câu người học có được giữ. | Chưa thử |
| Realtime/fallback | Chờ final, gián đoạn mạng, mute rồi nói lại; kiểm socket cũ đóng, không gửi partial cho Gemini. | Chưa thử |
| Stop/unmount | Dừng khi thu/đang chờ final/đang phát, chuyển trang rồi mở lại; mic indicator tắt, không audio muộn. | Chưa thử |
| Lặp phiên | 10 lần Start/Stop; kiểm không tăng listener/timer/AudioContext còn sống, console không cảnh báo mới. | Chưa thử |
| Độ trễ | Dùng diagnostics VoiceLatencyTrace; ghi p50/p95/số mẫu từng mode và số lỗi/timeout/cap. | Chưa thử |

jsdom không kiểm được AEC/AGC/noise suppression thật, đặc tính phòng/mic/loa,
autoplay/HTTPS/AudioWorklet trên thiết bị, recognition thật, final coverage của
provider, CPU/WASM/mobile hay thời điểm âm thanh vật lý phát ra. Các con số này
phải do thử thiết bị, không suy từ doubles hoặc tone tổng hợp. Khi thêm neural
VAD phải có bài lỗi tải/init/runtime bằng double và kiểm model thật trên thiết bị.

## Pha A/B — trước/sau trên cùng bộ đo (14/11/2026)

File A: `transcriptGate.ts` + test, `session.ts` thêm callback, `blaze.ts` gắn
cổng trước chat, `VoiceChat.tsx` + test hiển thị notice; `blaze.test.ts` kiểm
batch/realtime/lỗi thật. File B: `adaptiveVad.ts` + test, `vad.ts` mở rộng result
discard/evidence và reset(clearNoise), `blaze.ts` chọn detector và cleanup;
`blaze.test.ts` kiểm lifecycle. Cả hai khai báo cờ trong `.env.example` và whitelist
build trong `vite.config.ts`. Bộ đo thêm `adaptive.test.ts`, `measure.ts` ghi
discard/thời gian/latency ghép cặp, `harness.test.ts` kiểm cách chấm discard.
Không đổi oracle `legacy.ts`, fixtures `signals.ts`, timeout/assertion cũ.

Pha A dùng EnergyVad nguyên bản: toàn bộ 28 hàng VAD ở bảng nền không đổi.
Corpus PCM không có transcript từ provider, nên **không đo được mức giảm gọi
Gemini hay hallucination nhờ A**. Tests doubles xác nhận chữ rỗng/ký tự vô nghĩa
và lặp từ kèm âm yếu không gửi chat, câu ngắn vẫn gửi; đây không phải độ chính
xác STT thực. A không thêm VoiceState/CSS; lỗi mạng/schema/giới hạn vẫn báo lỗi.

Pha B đo lại cả trước (EnergyVad) và sau (ResilientVad/AdaptiveVad) trong cùng
lệnh, seed 20261113, 100 ms/frame, không đổi tín hiệu/nhãn/cách tính bỏ sót.
Report JSON: `.artifacts/voice-vad-adaptive.json`; oracle EnergyVad cũ vẫn có
report parity riêng. Bảng dưới chung cho batch/realtime vì quyết định capture
giống nhau; độ trễ yêu cầu STT của hai mode ở bảng riêng bên dưới.

`FP/phút` chia cho thời lượng không có speech: 1 phút ở hàng không speech,
0,9 phút ở hàng speech. `Cap` là số endpoint max_duration; `thu ồn` là tổng ms
active trên phần không speech; `lượt dài nhất` tính cả pre-roll. Discard **không
xóa FP đã xảy ra**, và lượt bị discard không được tính là speech thành công.
Thu ồn có tính cả silence tail, vì vậy không tương đương chất lượng nhận dạng.

| Kịch bản (RMS/SNR trong tên) | FP/phút trước → sau | Giảm FP % | Cap trước → sau | Thu ồn ms trước → sau | Lượt dài nhất sau ms | Discard sau |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| white-0.004 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| white-0.012 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| white-0.024 | 2 → 1 | 50 | 2 → 0 | 59800 → 900 | 1000 | 1 |
| white-0.04 | 2 → 1 | 50 | 2 → 0 | 59800 → 900 | 1000 | 1 |
| pink-0.004 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| pink-0.012 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| pink-0.024 | 2 → 5 | -150 | 2 → 0 | 59800 → 8600 | 2600 | 1 |
| pink-0.04 | 2 → 5 | -150 | 2 → 0 | 59800 → 8600 | 2600 | 1 |
| hum-0.008 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| hum-0.03 | 2 → 1 | 50 | 2 → 0 | 59800 → 900 | 1000 | 1 |
| clicks | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| keyboard | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| door | 14 → 14 | 0 | 0 → 0 | 15400 → 15400 | 1300 | 0 |
| speech-noise-0.004-snr-0 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| speech-noise-0.004-snr-5 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| speech-noise-0.004-snr-10 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| speech-noise-0.004-snr-20 | 0 → 0 | — | 0 → 0 | 6300 → 6300 | 2600 | 0 |
| speech-noise-0.012-snr-0 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| speech-noise-0.012-snr-5 | 0 → 0 | — | 0 → 0 | 5900 → 6300 | 2600 | 0 |
| speech-noise-0.012-snr-10 | 0 → 0 | — | 0 → 0 | 6300 → 6300 | 2600 | 0 |
| speech-noise-0.012-snr-20 | 0 → 0 | — | 0 → 0 | 6300 → 6300 | 2600 | 0 |
| speech-noise-0.024-snr-0 | 2.22 → 1.11 | 50 | 2 → 0 | 53800 → 6800 | 2600 | 1 |
| speech-noise-0.024-snr-5 | 2.22 → 1.11 | 50 | 2 → 0 | 53800 → 7200 | 2600 | 1 |
| speech-noise-0.024-snr-10 | 2.22 → 1.11 | 50 | 2 → 0 | 53800 → 7200 | 2600 | 1 |
| speech-noise-0.024-snr-20 | 2.22 → 1.11 | 50 | 2 → 0 | 53800 → 7200 | 2600 | 1 |
| mate-echo-0.008 | 0 → 0 | — | 0 → 0 | 0 → 0 | 0 | 0 |
| mate-echo-0.025 | 12 → 12 | 0 | 0 → 0 | 33600 → 33600 | 3000 | 0 |
| mate-echo-0.05 | 12 → 12 | 0 | 0 → 0 | 33600 → 34700 | 3100 | 0 |

Giảm FP “—” nghĩa là nền bằng 0, không có mẫu số để tính phần trăm; sau vẫn 0.
Không biến việc không có kích hoạt thành “giảm 100%”. Đính chính khi bổ sung số
request: echo RMS 0,05 sau B còn **một capture mở cuối cửa sổ 60 s**; câu cũ nói
tất cả hàng đã đóng là sai. Các hàng còn lại đã đóng. Cap trắng/hồng/hum đều về 0; chưa chứng minh
điều kiện này cho nhiễu biến thiên như TV/nhạc/đám đông trên thiết bị thật.

| Speech: RMS nền / SNR dB | Bỏ sót /7 trước → sau | Δ bỏ sót điểm % | Speech chốt bất thường /7 trước → sau | Endpoint p50/p95 ms (n) trước → sau | Δ p50 ghép cặp ms (n) |
| --- | ---: | ---: | ---: | --- | ---: |
| 0.004-snr-0 | 7 → 7 | 0 | 0 → 0 | —/— (0) → —/— (0) | — (0) |
| 0.004-snr-5 | 7 → 7 | 0 | 0 → 0 | —/— (0) → —/— (0) | — (0) |
| 0.004-snr-10 | 7 → 7 | 0 | 0 → 0 | —/— (0) → —/— (0) | — (0) |
| 0.004-snr-20 | 0 → 0 | 0 | 0 → 0 | 900/900 (7) → 900/900 (7) | 0 (7) |
| 0.012-snr-0 | 7 → 7 | 0 | 0 → 0 | —/— (0) → —/— (0) | — (0) |
| 0.012-snr-5 | 0 → 0 | 0 | 0 → 0 | 800/900 (7) → 900/900 (7) | 100 (7) |
| 0.012-snr-10 | 0 → 0 | 0 | 0 → 0 | 900/900 (7) → 900/900 (7) | 0 (7) |
| 0.012-snr-20 | 0 → 0 | 0 | 0 → 0 | 900/900 (7) → 900/900 (7) | 0 (7) |
| 0.024-snr-0 | 0 → 0 | 0 | 7 → 0 | —/— (0) → 800/900 (7) | — (0) |
| 0.024-snr-5 | 0 → 0 | 0 | 7 → 0 | —/— (0) → 900/900 (7) | — (0) |
| 0.024-snr-10 | 0 → 0 | 0 | 7 → 0 | —/— (0) → 900/900 (7) | — (0) |
| 0.024-snr-20 | 0 → 0 | 0 | 7 → 0 | —/— (0) → 900/900 (7) | — (0) |

| Speech: RMS nền / SNR dB | Batch: hết lời → yêu cầu STT p50/p95 ms (n), trước → sau | Realtime: hết lời → yêu cầu STT p50/p95 ms (n), trước → sau | Δ realtime p50 ghép cặp ms (n) |
| --- | --- | --- | ---: |
| 0.004-snr-0 | —/— (0) → —/— (0) | —/— (0) → —/— (0) | — (0) |
| 0.004-snr-5 | —/— (0) → —/— (0) | —/— (0) → —/— (0) | — (0) |
| 0.004-snr-10 | —/— (0) → —/— (0) | —/— (0) → —/— (0) | — (0) |
| 0.004-snr-20 | 900/900 (7) → 900/900 (7) | -100/-100 (7) → -100/-100 (7) | 0 (7) |
| 0.012-snr-0 | —/— (0) → —/— (0) | —/— (0) → —/— (0) | — (0) |
| 0.012-snr-5 | 800/900 (7) → 900/900 (7) | -100/-100 (7) → -100/-100 (7) | 0 (7) |
| 0.012-snr-10 | 900/900 (7) → 900/900 (7) | -100/-100 (7) → -100/-100 (7) | 0 (7) |
| 0.012-snr-20 | 900/900 (7) → 900/900 (7) | -100/-100 (7) → -100/-100 (7) | 0 (7) |
| 0.024-snr-0 | —/— (0) → 800/900 (7) | —/— (0) → -100/-100 (7) | — (0) |
| 0.024-snr-5 | —/— (0) → 900/900 (7) | —/— (0) → -100/-100 (7) | — (0) |
| 0.024-snr-10 | —/— (0) → 900/900 (7) | —/— (0) → -100/-100 (7) | — (0) |
| 0.024-snr-20 | —/— (0) → 900/900 (7) | —/— (0) → -100/-100 (7) | — (0) |

Độ trễ chỉ lấy speech có endpoint silence hoàn chỉnh. RMS 0,024 trước đó chạm
cap, nên không có mẫu độ trễ trước để ghép cặp; không coi độ trễ mới là “cải thiện
X ms”. Realtime có giá trị âm vì yêu cầu bắt đầu trước khi người học nói xong.
Đây là clock ảo của client, **không phải p50 mạng/STT final/Gemini/TTS/âm ra loa**.

Kết luận theo từng loại, chưa đạt mục tiêu giảm ≥70%:

- Trắng RMS 0,024/0,04 và hum 0,03: FP 2 → 1/phút (giảm 50%); cap 2 → 0.
- Hồng RMS 0,024/0,04: FP 2 → 5/phút (tăng 150%); cap 2 → 0. Đánh đổi rõ
  khi hạ hệ số onset từ thử nghiệm 1,35 xuống 1,25 để giữ câu ngắn SNR 0 dB.
  Biến thể 1,35 làm mất 4/7 câu ở RMS 0,024/SNR 0 và đã bị loại khỏi bản cuối.
- Xung click/keyboard: 0 → 0; cửa 14 → 14/phút. Chưa đạt giảm 70% với cửa.
- Echo RMS 0,008: 0/12 cửa sổ; 0,025 và 0,05: vẫn 12/12 mỗi mức, tổng
  24/36. Pha A/B chưa chặn echo; không tự mở rộng sang C.
- Từng hàng speech: bỏ sót không tăng (Δ 0 điểm %), nhưng nền vẫn bỏ sót
  7/7 ở RMS 0,004 SNR 0/5/10 và RMS 0,012 SNR 0. Tổng vẫn 28/84.
  Các mẫu ghép cặp có Δ endpoint/batch p50 tối đa +100 ms, realtime tối đa 0 ms.
  Không đủ dữ liệu suy ra tỉ lệ bỏ sót giọng thật hoặc bảo đảm +2 điểm % ngoài corpus.

Heuristic stationary 1 giây có thể loại nhầm nguyên âm dài/giọng có năng lượng
quá đều. Nhiễu biến thiên vẫn có thể giữ capture đến cap. False onset đầu tiên
vẫn có thể ngắt Mate và mở realtime STT trước khi phát hiện noise; hủy phía
client không chứng minh provider ngừng tính phí. Những giới hạn này là lý do
giữ cờ mặc định tắt và dừng cho thử thiết bị, không công bố “đã xử lý tiếng ồn”.

## Cách bật/tắt và kiểm thủ công Pha A/B

Hai cờ **độc lập**, mặc định false; chưa sửa `.env` người dùng:

```dotenv
VITE_VOICE_SOFT_GATE=true
VITE_VOICE_ADAPTIVE_VAD=true
```

Dev/build local đọc hai cờ từ `.env` root hoặc env tiến trình. Restart frontend
dev server hoặc build lại bundle sau khi đổi. Docker cần truyền cờ vào đúng
tiến trình dev/build, runtime env không sửa bundle tĩnh. Đặt một cờ false để tắt
riêng pha đó; đặt cả hai false và restart/rebuild để về EnergyVad + hành vi cũ.
Stop/Start phiên sau khi tải bundle mới. Không cần rollback backend hoặc prompt.

Thực hiện ma trận thiết bị/môi trường ở trên với cùng âm lượng/vị trí, lần lượt:
00 (đối chứng), 10 (chỉ A), 01 (chỉ B), 11 (cả hai). Lặp cùng bộ câu và giữ số
lần thử; ghi browser/version, mic/loa, STT mode, cờ, noise source/mức loa,
thời lượng không speech, FP, số capture tới cap, thời lượng thu ồn, số speech
bỏ sót/chốt sai, số mẫu endpoint và p50/p95. RMS số/SNR chỉ ghi nếu thực sự đo
được từ corpus có nhãn; không suy ngược RMS từ orb RMS×5 đã bị chặn ở 1.

Bổ sung các ca quan trọng:

- Nhiễu quạt/TV liên tục 60 s; phải ghi nếu capture còn mở đến 30 s, kể cả
  không có chữ. Hồng/tiếng có biến thiên cần ưu tiên do hồi quy FP trong bộ đo.
- Nguyên âm kéo dài và câu đều giọng >1 s, câu 200–300 ms nói nhỏ, ngay sau
  khi quạt tắt/đổi vị trí. Ghi mất tiếng/notice nhầm do nền chưa thích nghi.
- Mute/unmute và Stop/Start sau khi đã học nền: không dùng nền cũ cho mic mới.
- Notice “Mình chưa nghe rõ, bạn nói lại nhé” tự hết; không có tin nhắn rỗng;
  lỗi mạng/quyền mic vẫn hiển thị lỗi. Không dùng test này để gọi API ngoài quota.
- Realtime: noise bị loại phải đóng socket/timer; không gửi lại batch cho noise.
  Theo dõi request/cleanup thật bằng DevTools, không lưu/export nội dung PCM.

Pha C chỉ là [đề xuất đo output RMS/peak thô](VOICE_OUTPUT_LEVEL_PROPOSAL.md),
ưu tiên worklet cửa sổ 100 ms, cần duyệt. Không dùng giá trị visualLevel hiện
tại làm ngưỡng echo, chưa giảm âm lượng hoặc hiệu chuẩn UI. D/E tiếp tục hoãn.

Commit đề xuất (chưa commit/push):

- A: `feat(voice): add opt-in soft transcript gate`
- B: `feat(voice): add opt-in adaptive energy VAD with fallback`

## Kiểm chứng từng pha — 14/11/2026

| Pha / phép kiểm | Kết quả |
| --- | --- |
| A: `python scripts/manage.py test` | Backend 230 qua, 24 skip; frontend 450/450. Sau đó bổ sung test realtime, lần coverage xác nhận 451/451. |
| A: lint / build | Qua cả hai, exit 0. |
| A: frontend coverage một worker | 451/451 qua; statements 89,68%, branches 81,99%, functions 85,89%, lines 92,87%. |
| B: `python scripts/manage.py test` | Backend 230 qua, 24 skip; frontend 466/466, 38 file; exit 0. |
| B: lint / build | Qua Ruff, Black, mypy, ESLint, TypeScript, Prettier và Vite; exit 0. |
| B: frontend coverage một worker | 466/466 qua, exit 0; statements 89,96%, branches 82,38%, functions 86,00%, lines 93,07%. Cả bốn ≥80%. |
| B: `npm.cmd run benchmark:vad` | 21/21 test qua, exit 0; 28 kịch bản × 2 mode. Parity oracle giữ nguyên; kiểm tra thêm không chạm cap ở nhiễu đều, không tăng bỏ sót từng RMS/SNR và Δ p50 ghép cặp ≤150 ms. Mục tiêu giảm FP ≥70% vẫn chưa đạt như bảng trên. |
| B: `python scripts/manage.py coverage` | Không qua, exit 1: backend 73,98% <80%, 230 test qua/24 skip/1 warning; dừng trước frontend. Frontend đã đo độc lập và qua như hàng trên. Không coi gate toàn repo đã xanh. |

Log cục bộ: `.artifacts/voice-phase-a-{test,lint,build,coverage}.log` và
`.artifacts/voice-phase-b-{test,lint,build,coverage,benchmark}.log`. Backend có
log coverage toàn repo riêng `.artifacts/voice-phase-b-repo-coverage.log` và
một warning Starlette/httpx đã tồn tại; 24 test DB cần `MYSQL_TEST_URL` trỏ schema
test riêng. Không cấu hình hay ghi vào DB người dùng để làm xanh gate. Black
ghi thông báo thành công ra stderr, PowerShell có thể bọc nó thành
NativeCommandError trong log; kết quả xác nhận bằng exit code và bước tiếp theo.

Không tăng timeout/giảm ngưỡng coverage/sửa assertion cũ; oracle và bộ tín hiệu
được giữ nguyên. Không gọi STT/LLM/TTS thật, không ghi hay gửi audio. Chưa có
browser/device smoke nên không tuyên bố console/AEC/AGC/CPU/audio routing thật
đã sạch chỉ từ jsdom. Không sửa backend, prompt, CSS hoặc native voice trong tác vụ.
Các thay đổi có sẵn ở những vùng đó được giữ nguyên trong working tree.

## Bổ sung request STT, thời gian trạng thái và debug cục bộ — 14/11/2026

Không triển khai pha mới, không sửa ngưỡng/quyết định VAD. Corpus/seed/nhãn vẫn
giữ nguyên. Chạy lại `npm.cmd run benchmark:vad`: report JSON cũ được bổ sung
`sttRequests`, `sttRequestsPerMinute`, `captureStateMs`, `discardedBeforeSTT`,
`discardedAfterSTT`, `captureOutcomes`. Bảng dưới có đủ 28 kịch bản, hai mode.

### Định nghĩa mới và giới hạn phép đo

- **Request STT/phút audio**: chia cho toàn thời lượng audio (60 s mỗi hàng),
  gồm cả speech. Khác mẫu số FP/phút không speech ở bảng cũ. Batch tính một
  request tại mỗi endpoint silence/cap; realtime tính một lần bắt đầu nhận dạng
  (speech-ticket + mở luồng) tại mỗi onset, không đếm từng PCM frame WebSocket.
- Đây là **số lần gọi dự kiến theo luồng client**, chưa gọi server/provider.
  Không biết request được chấp nhận/hoàn tất/tính phí hay đã chuyển bao nhiêu byte.
  Không mô phỏng lỗi mạng hoặc retry batch sau realtime; trên thiết bị, những
  lần fallback đó làm tăng số batch attempts và được debug ghi riêng.
- **Thời gian trạng thái đang thu** `captureStateMs` cộng [onset, endpoint hoặc
  discard), gồm speech và silence tail, không gồm pre-roll trước onset. Nếu còn
  mở khi hết corpus, cộng tới frame cuối và đánh dấu mở; không tự pad để đóng.
  Đây là thời gian tương ứng user_speaking trên clock ảo, chưa gồm event-loop lag.
- Giữ nguyên `activeNoiseMs` cũ: số ms PCM không speech được xử lý khi capture
  active, **có cả frame xác nhận onset**. Nó không phải thời gian state trên UI.
  Với mẫu thuần nhiễu đã đóng: `activeNoiseMs = captureStateMs + 100 × số onset`.
  Ví dụ hồng sau B: 8.600 ms PCM ồn nhưng state đang thu 8.100 ms.
- **Silence/cap không phải discard.** Mọi lượt chốt vì silence/cap đều tới STT:
  batch gửi ở lúc chốt, realtime đã mở từ onset. Discard stationary_noise chỉ
  tránh request ở batch; realtime hủy recognition đã mở, không fallback batch
  cho lượt chủ động loại. Pha A chạy **sau STT**, không giảm request STT.

### Kết quả trước/sau và đường đi của từng lượt nhiễu

Mỗi hàng 60 s; số request/phút cũng là số request của kịch bản. Trước B không
có discard. Cột discard sau B ghi `trước STT batch / sau STT realtime`.
Cột chốt ghi số `silence / cap / còn mở` sau B; các lượt silence/cap đã tới STT
theo quy tắc trên. Lượt còn mở chưa gửi batch nhưng đã mở realtime; không tính
nó thành lượt chặn thành công.

| Kịch bản RMS/SNR | Batch request/phút trước → sau | Realtime request/phút trước → sau | Đang thu ms trước → sau | Discard B: trước batch / sau RT | Chốt B: silence / cap / mở |
| --- | ---: | ---: | ---: | ---: | ---: |
| white-0.004 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| white-0.012 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| white-0.024 | 2 → 0 | 2 → 1 | 59600 → 800 | 1 / 1 | 0 / 0 / 0 |
| white-0.04 | 2 → 0 | 2 → 1 | 59600 → 800 | 1 / 1 | 0 / 0 / 0 |
| pink-0.004 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| pink-0.012 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| pink-0.024 | 2 → 4 | 2 → 5 | 59600 → 8100 | 1 / 1 | 4 / 0 / 0 |
| pink-0.04 | 2 → 4 | 2 → 5 | 59600 → 8100 | 1 / 1 | 4 / 0 / 0 |
| hum-0.008 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| hum-0.03 | 2 → 0 | 2 → 1 | 59600 → 800 | 1 / 1 | 0 / 0 / 0 |
| clicks | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| keyboard | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| door | 14 → 14 | 14 → 14 | 14000 → 14000 | 0 / 0 | 14 / 0 / 0 |
| speech-noise-0.004-snr-0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| speech-noise-0.004-snr-5 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| speech-noise-0.004-snr-10 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| speech-noise-0.004-snr-20 | 7 → 7 | 7 → 7 | 10900 → 10900 | 0 / 0 | 7 / 0 / 0 |
| speech-noise-0.012-snr-0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| speech-noise-0.012-snr-5 | 7 → 7 | 7 → 7 | 10500 → 10900 | 0 / 0 | 7 / 0 / 0 |
| speech-noise-0.012-snr-10 | 7 → 7 | 7 → 7 | 10900 → 10900 | 0 / 0 | 7 / 0 / 0 |
| speech-noise-0.012-snr-20 | 7 → 7 | 7 → 7 | 10900 → 10900 | 0 / 0 | 7 / 0 / 0 |
| speech-noise-0.024-snr-0 | 2 → 7 | 2 → 8 | 59600 → 11300 | 1 / 1 | 7 / 0 / 0 |
| speech-noise-0.024-snr-5 | 2 → 7 | 2 → 8 | 59600 → 11700 | 1 / 1 | 7 / 0 / 0 |
| speech-noise-0.024-snr-10 | 2 → 7 | 2 → 8 | 59600 → 11700 | 1 / 1 | 7 / 0 / 0 |
| speech-noise-0.024-snr-20 | 2 → 7 | 2 → 8 | 59600 → 11700 | 1 / 1 | 7 / 0 / 0 |
| mate-echo-0.008 | 0 → 0 | 0 → 0 | 0 → 0 | 0 / 0 | 0 / 0 / 0 |
| mate-echo-0.025 | 12 → 12 | 12 → 12 | 32400 → 32400 | 0 / 0 | 12 / 0 / 0 |
| mate-echo-0.05 | 12 → 11 | 12 → 12 | 32400 → 33500 | 0 / 0 | 11 / 0 / 1 |

Các hàng speech ở RMS nền 0,024 tăng batch 2 → 7 và realtime 2 → 8: bản cũ
gộp cả bảy đoạn vào hai lượt cap; bản mới chốt bảy đoạn bình thường, cộng một
onset nhiễu đầu phiên bị discard. Đây là thay đổi phân đoạn lời nói, khác hồi
quy request trên hàng **chỉ nhiễu hồng**. Echo 0,05 batch 12 → 11 là do một lượt
còn mở ở giây 60, không phải cải thiện lọc echo. Ngắt giả vẫn 12/12 cửa sổ.

### Vì sao nhiễu hồng 2 → 5/phút

Bản EnergyVad thấy RMS vượt ngưỡng đủ thường xuyên để không có chín frame
im lặng liên tiếp, giữ capture gần hết phút rồi chốt ở cap hai lần. Con số 2
thấp một phần vì các onset tiếp theo không thể xảy ra trong
lúc capture đang mở; không có nghĩa nó phân loại nhiễu tốt.

Bản B nhận một cửa sổ 10 frame đủ đều ở giây 1,6, cập nhật nền và discard.
Sau đó RMS hồng biến thiên vượt lại ngưỡng onset max(0,018; nền×1,25) đủ hai
frame. Nền EMA được học ở các frame dưới ngưỡng khi idle; nó không phải bộ
phân loại speech và có thể thay đổi theo các đáy năng lượng. Hysteresis giữ
capture qua dao động, rồi chốt khi đủ chín frame dưới ngưỡng tiếp tục. Bốn lượt
này không có cửa sổ thỏa guard stationary, nên chốt silence và được gửi STT.

Chuỗi quan sát trực tiếp, thời gian tính từ đầu audio:

| RMS hồng | Onset ms | Đóng ms | Lý do | Batch | Realtime |
| --- | ---: | ---: | --- | --- | --- |
| 0.024 | 200 | 1600 | stationary_noise | Loại trước STT | Đã mở, rồi hủy |
| 0.024 | 2500 | 4600 | silence | Gửi tại endpoint | Đã mở tại onset |
| 0.024 | 14800 | 17100 | silence | Gửi tại endpoint | Đã mở tại onset |
| 0.024 | 24200 | 25100 | silence | Gửi tại endpoint | Đã mở tại onset |
| 0.024 | 41100 | 42500 | silence | Gửi tại endpoint | Đã mở tại onset |
| 0.04 | 200 | 1600 | stationary_noise | Loại trước STT | Đã mở, rồi hủy |
| 0.04 | 2500 | 4600 | silence | Gửi tại endpoint | Đã mở tại onset |
| 0.04 | 14800 | 17100 | silence | Gửi tại endpoint | Đã mở tại onset |
| 0.04 | 24200 | 25100 | silence | Gửi tại endpoint | Đã mở tại onset |
| 0.04 | 41100 | 42500 | silence | Gửi tại endpoint | Đã mở tại onset |

Kết quả: thời gian state 59,6 → 8,1 giây/phút giảm mạnh, nhưng batch request
2 → 4 (+100%) và realtime 2 → 5 (+150%). Không được dùng giảm thời gian đang
thu hoặc hết cap để tuyên bố giảm request/chi phí. Hạ hệ số onset từ thử nghiệm
1,35 xuống 1,25 giữ được các câu ngắn SNR 0 dB nhưng làm tăng nhạy với những
dao động này. Chưa đổi thêm thuật toán để che hồi quy trong lần bổ sung này.

### Giới hạn xung ngắn và echo; mục tiêu ≥70%

VAD năng lượng chỉ biết mức RMS và thời gian, không biết âm đó có phải lời nói
hay ai đang nói. Xung 5/30 ms của corpus hiện không kích hoạt, nhưng xung mạnh
cắt qua biên hai frame vẫn có thể làm cả hai frame vượt ngưỡng. Xung cửa 250 ms
đang lọt như một câu ngắn; tăng onset/ngưỡng có thể làm mất câu 200–300 ms hoặc
lời nhỏ. Không thể suy “chặn mọi xung ngắn” từ hai fixture không kích hoạt.

Echo là tín hiệu giống lời nói, có RMS và envelope đủ điều kiện như người học.
Pha A còn có thể nhận transcript có nghĩa từ chính giọng Mate. A sau STT không
ngăn request; B không có tham chiếu output/AEC hoặc nhận diện nguồn âm, nên
không phân biệt được hai nguồn chỉ bằng mức năng lượng. Kết quả echo vẫn ngắt
giả 24/36 cửa sổ. **Mục tiêu giảm ≥70% ở từng loại/mức nhiễu khó đạt chỉ bằng
A+B**, đặc biệt xung cửa và echo; hiện chưa đạt và không nên bật B mặc định.
C/D/E vẫn hoãn; đây không phải quyết định tự chuyển sang pha khác.

### Đề xuất chặn trước STT — chỉ đề xuất, chờ duyệt

1. Thêm bước xác nhận capture bằng số đo nền/độ ổn định/voiced ratio trước khi
   gọi STT, giữ PCM trong bộ đệm RAM có giới hạn và pre-roll hiện có. Với batch,
   kiểm cả lượt trước khi gọi transcribe, gồm các frame dưới ngưỡng; cần phát
   hiện những lượt nền dao động chốt silence như bốn lượt hồng, không chỉ
   cửa sổ voiced liên tiếp. Chưa có ngưỡng đủ tin cậy, phải thử trên corpus/WAV
   có lời nhỏ/câu ngắn và bộ thiết bị trước khi chọn.
2. Với realtime, muốn loại nhiễu đều **trước bất kỳ request nào** thì phải trì
   hoãn cả speech-ticket/RealtimeSTT, giữ audio cục bộ đến khi xác nhận; khi
   chấp nhận mới gửi pre-roll và buffer một lần. Giữ cách mở từ onset hiện nay
   rồi hủy chỉ giảm thời gian mở, không đáp ứng “trước STT”.
3. Nếu tái dùng cửa sổ 10 frame, xác nhận sớm nhất khoảng 1 s thay vì onset
   200 ms: có thể thêm khoảng 800 ms cho request realtime, vượt ngân sách
   +150 ms; hồng hiện còn phải chờ tới 1,6 s mới thỏa guard. Câu ngắn cũng bị
   chờ hoặc bị loại sai. Cửa sổ thêm 100 ms giữ latency tốt hơn nhưng không đủ
   dữ liệu để hứa chặn cùng loại nhiễu. Phải duyệt đánh đổi trước khi code.

Đề xuất thử cổng STT riêng, mặc định tắt, đánh giá trước trên batch rồi mới
cân nhắc trì hoãn realtime. Cổng này không tự thay đổi ngắt lời/âm lượng của
Mate (phần C vẫn hoãn). Không cam kết đạt ≥70% bằng gate năng lượng khác.
**Chưa triển khai cổng này; chờ người dùng duyệt phạm vi và đánh đổi độ trễ.**

### Dùng debug trên thiết bị

Thêm `VITE_VOICE_DEBUG=true` vào env dev/build frontend rồi restart/rebuild,
giữ A/B theo tổ hợp cần thử. Mặc định cả ba cờ đều false trong `.env.example`;
không sửa `.env` người dùng. Mở Console, bật Debug/Verbose, lọc `[voice-debug]`.
Mỗi Start reset bộ đếm; Stop in tổng kết. Khi có frame hợp lệ, tối đa một log
mỗi giây; không có timer phụ. Mute dừng tính capture nhưng không reset tổng phiên.

Chỉ in allowlist scalar/bộ đếm:

- `activations`, `discarded`, `discardedByReason.stationary_noise/transcript_gate`.
  `transcript_gate` là loại sau STT; không log chữ hoặc suy lý do bằng nội dung.
  Stop/mute hủy thủ công không được tính là bộ lọc đã loại nhiễu.
- `sttRequests.batch/realtime`: attempts tại điểm gọi thật của client; realtime
  là một lần bắt đầu nhận dạng, batch gồm retry fallback nếu có. Tổng số lần/phút
  đếm lần gọi logic, không đếm HTTP retry 401 bên trong apiFetch hoặc frame mạng.
  Network có thể có nhiều HTTP requests hơn nếu phải refresh token. Mẫu số
  dùng `elapsedMs` từ Start, bao gồm thời gian mute/processing/playing; để so
  corpus, chạy riêng phiên không mute đúng 60 s và giữ cùng mode/cờ.
- `captureStateMs`: tổng thời gian thực ở capture; `activeCaptureMs`: thời gian
  lượt hiện tại; gồm thời gian main thread bị trễ nếu có, khác clock lý tưởng.
- `noiseFloorRms`, `startThresholdRms`, `continueThresholdRms`,
  `currentThresholdRms`: ngưỡng cho frame tiếp theo theo trạng thái detector.
  EnergyVad có noiseFloorRms=null (không ước lượng nền). Sau Stop/mute, nền học
  bị reset; snapshot cuối có thể hiển thị null. `detector`/`fallback` chỉ là enum
  và boolean. RMS số sau xử lý browser, không phải dB SPL đã hiệu chuẩn.

Không in PCM, waveform, transcript, lỗi/provider payload, URL, session/trace ID.
Không ghi âm, tạo file, localStorage, telemetry event hoặc request debug; chỉ
giữ scalar trong RAM và in console. Debug tắt không gọi diagnostics hay in log.
Đặt `VITE_VOICE_DEBUG=false`, restart/rebuild để tắt; không cần bật/tắt A/B cùng
nó. Kiểm request thật bằng Network nhưng không export/lưu audio để đối chiếu.

Commit đề xuất (chưa commit/push):
`feat(voice): add local VAD counters and STT request benchmarks`.

### Kiểm chứng phần bổ sung

- `npm.cmd run benchmark:vad`: **23/23 test**, 3 file, exit 0; vẫn giữ parity
  oracle. Số onset/cap/bỏ sót/latency trước đó không đổi; chỉ thêm số đo request,
  state dwell và thông tin đường đi capture.
- `npm.cmd run test:coverage -- --maxWorkers=1`: **472/472 test frontend**, 39 file,
  exit 0. Statements **90,09%**, branches **82,54%**, functions **86,14%**, lines
  **93,16%**; giữ toàn bộ ngưỡng ≥80% và timeout/assertion cũ.
- `python scripts/manage.py lint` và `python scripts/manage.py build`: **qua**,
  exit 0; không thêm dependency, không sửa backend/prompt/CSS/VoiceState.
- Log: `.artifacts/voice-debug-{targeted,benchmark,coverage,lint,build}.log`.
  Lượt này không chạy lại backend tests/coverage vì không đổi backend; gate
  toàn repo gần nhất vẫn chưa qua tại backend 73,98%, không tuyên bố đã sửa.
- Chưa mở mic/gọi provider hoặc thử thiết bị thật. Console counters được kiểm
  bằng doubles; cần đối chiếu Network và thời gian thực khi người dùng thử máy.
  Cờ A/B/debug đều mặc định tắt; `.env` không bị sửa. Không commit/push.

Dừng tại đây. Cổng xác nhận trước STT chỉ là đề xuất chờ duyệt, C/D/E tiếp tục hoãn.

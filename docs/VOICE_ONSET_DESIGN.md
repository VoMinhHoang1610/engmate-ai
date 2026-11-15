# Xác nhận bắt đầu lượt theo nền ồn — thiết kế, chưa triển khai

Ngày 15/11/2026. Không đổi VAD runtime, cờ, `.env`, thời gian kết thúc lượt,
giọng TTS hoặc hành vi ngắt lời. Pha C/D/E tiếp tục chờ thiết bị thật.

## Phương án cần thử sau khi duyệt

Giữ START_FRAMES=2 khi nền yên hoặc chưa đủ dữ liệu nền đáng tin. Khi nền ồn
ổn định được quan sát lúc idle, thử 3 frame liên tiếp; khóa lựa chọn trong một
candidate để ngưỡng không dịch giữa câu. Dùng hysteresis và tối thiểu 1–2 giây
idle trước khi đổi band; không học nền từ lời đang nói hoặc lúc Mate phát.
Không suy luận mức ồn vật lý từ visualLevel: đây là RMS đầu vào sau xử lý
browser, không phải dB SPL. Mốc band cần chọn bằng dữ liệu thiết bị, chưa chốt.
Không thêm trạng thái VoiceState; candidate là trạng thái nội bộ nếu được duyệt.

| Nền/cấu hình dự kiến | Frame xác nhận | Δ onset lý tưởng | Quyết định thiết kế |
|---|---:|---:|---|
| Yên/chưa có ước lượng đáng tin | 2 × 100 ms | 0 ms | Giữ độ nhạy câu ngắn |
| Nền ồn đủ ổn định | 3 × 100 ms | +100 ms | Ứng viên cần mô phỏng; chưa cam kết +100 ms ngoài thiết bị |
| 4 frame hoặc hơn | ≥400 ms | ≥+200 ms | Không chọn: vượt ngân sách p50 +150 ms |
| Xác nhận đủ cửa sổ 10 frame | 1.000 ms | khoảng +800 ms | Không áp dụng cho mọi lượt |

Δ là tính toán theo frame, **không phải kết quả chạy thuật toán mới**. Scheduling,
network, hàng đợi STT có thể thêm trễ. Phải đo riêng từ lúc kết thúc lời nói tới
STT và từ lúc bắt đầu lời nói tới mở realtime; không cộng máy móc 100 ms vào
endpoint p50 vì endpoint hiện phụ thuộc khoảng im lặng cuối câu.

## Dự kiến trên corpus hiện có và điều kiện bác bỏ

Corpus vẫn 28 kịch bản × 60 giây, seed 20261113. Số hiện có dưới đây là A/B
cũ, không phải kết quả onset mới. Giữ bảng chi tiết từng RMS/SNR trong
[baseline](VOICE_VAD_BASELINE.md); không gộp để che hồi quy.

| Tín hiệu | Số đo hiện có sau B | Giả thuyết cần kiểm với 3 frame |
|---|---|---|
| White .004/.012; pink .004/.012; hum .008 | 0 FP/phút | Giữ 2 frame ở band yên; kỳ vọng không đổi nếu band thực sự không chuyển |
| White .024/.04; hum .03 | 1 FP/phút, batch 0, RT 1 | Có thể hoãn lần mở RT; nhiễu dài vẫn vượt 3 frame, không bảo đảm loại trước STT |
| Pink .024/.04 | 5 FP/phút, batch 4, RT 5; đang thu 8,1 s/phút | Có thể loại candidate ngắn; guard/rearm thay đổi nên chưa biết FP/request mới, không hứa giảm ≥70% |
| Click 5 ms; keyboard 30 ms | 0 FP/phút | Không có phần cải thiện để tính phần trăm |
| Door 250 ms | 14 FP/phút | Xung có thể trải qua 3 frame tùy pha; không được dự đoán về 0 chỉ từ độ dài xung |
| Echo .008/.025/.05 | 0/12/12 FP/phút | Echo giống lời nói, kéo dài; tăng frame không phân biệt nguồn, có thể làm barge-in thật chậm hơn |
| Speech nền .004/.012/.024, SNR 0/5/10/20 dB | 28/84 câu bỏ sót; Δ miss A→B 0 | Câu ~200 ms có nguy cơ bị bỏ với 3 frame. Một miss mới trong nhóm 7 câu = +14,29 điểm %, vượt +2 điểm % |

Mọi FP, miss, STT/phút, captureStateMs và p50 phải tính trước/sau trên cùng
PCM/nhãn/frame clock, từng nhóm RMS/SNR. Dự kiến cần bác bỏ phương án nếu
miss tăng >2 điểm % ở bất cứ nhóm nào, p50 tăng >150 ms hoặc nhiễu liên tục
giữ capture tới cap. Chưa có số đo mới để xác nhận các điều kiện này.

## Pre-roll và đường đi realtime

Hiện tại 3 frame pre-roll = 300 ms: ở onset 2 frame còn khoảng 100 ms đầu
trước candidate. Nếu tăng onset lên 3 mà vẫn giữ ring 3 thì mất phần đệm đầu
này. Đề xuất ring 4 frame cho band 3, hoặc candidate buffer cộng 1 frame trước
candidate; gửi mỗi frame đúng một lần khi chấp nhận. PCM16 mono 16 kHz tăng
từ khoảng 9.600 lên 12.800 byte cho ring; không lưu ra đĩa.

Hiện tại: onset → mở ticket/RealtimeSTT → B nhận diện stationary_noise → hủy.
Vì vậy lượt bị loại B đã có request ở realtime; batch bị loại trước transcribe.
A loại chữ sau STT nên không giảm request của lượt đó.

Đề xuất để tránh +800 ms cho mọi lượt:

1. Band yên: giữ đường đi 2 frame. Band ồn: buffer thêm một frame rồi mới mở
   ticket/RT nếu candidate đạt. Candidate mất điều kiện trước xác nhận được
   bỏ cục bộ, chưa có request; phát lại pre-roll/buffer một lần khi mở RT.
2. Với dấu hiệu nền đều chưa đủ chắc sau 3 frame: không hứa chặn trước STT.
   Chọn giữa cho mở RT và hủy sớm (vẫn tốn request), hoặc chuyển riêng candidate
   nghi nhiễu sang batch/đợi thêm (tăng latency câu nói thật). Cần duyệt đánh đổi,
   không tự chuyển mode và không áp dụng cửa sổ 10 frame cho mọi người dùng.
3. Nếu trì hoãn cả việc ngắt TTS thì barge-in chậm hơn; nếu ngắt TTS ngay ở
   candidate rồi chưa mở STT thì vẫn có ngắt giả. Hai số đo phải báo riêng.
   Không tự sửa việc ngắt/âm lượng TTS trong pha này.

## Thử thiết bị thật

Mỗi dòng chạy **180 giây không nói**, sau đó **10 câu ngắn chuẩn giống nhau**
(ví dụ Yes, No, Sales, Vâng). Tách pha im lặng và pha câu ngắn; chốt số đếm
im lặng trước khi nói, không dùng tổng cả phiên làm mẫu số 3 phút.
Trong pha echo, Mate phát cùng đoạn/lịch phát cho mọi cấu hình, người học im.
Không ghi âm, không xuất HAR/audio. Chỉ chép số đếm gộp từ console/Network.

| Môi trường | Thiết bị/browser/output; batch/RT | Cờ A/B/debug | FP/3 phút im | Loại B trước STT / B sau mở RT / A sau STT | STT batch/RT trong 3 phút | Đang thu ms/180.000 | Bỏ sót/10 câu | Mate tự ngắt do echo? |
|---|---|---|---:|---|---|---:|---:|---|
| Phòng yên | Điền | 0/0/1 rồi 1/0/1, 0/1/1, 1/1/1 | | | | | | |
| Quạt/điều hòa | Điền | Cùng bốn tổ hợp | | | | | | |
| Tiếng nền liên tục/đường phố | Điền | Cùng bốn tổ hợp | | | | | | |
| Bàn phím/đóng cửa theo lịch | Điền | Cùng bốn tổ hợp | | | | | | |
| Mate qua loa ngoài | Điền | Cùng bốn tổ hợp | | | | | | |

Lặp từng dòng với tai nghe/loa ngoài, browser và thiết bị thực tế người dùng
có; giữ mic gain, âm lượng, vị trí và đoạn phát cố định. Có thêm một lượt tất
cả cờ 0 để so overhead debug. Debug chỉ hỗ trợ đo; không tự bật cờ trong repo.
[Mẫu CSV điền tay](VOICE_DEVICE_CHECKLIST.csv) có mỗi tổ hợp và mode riêng.
FP/phút = FP/3; STT/phút = tổng STT/3; duty = captureStateMs/180.000.
Không coi số HTTP refresh/token là lượt STT. Nhiễu không được giữ capture tới
30 giây; ghi rõ mọi lần cap/open capture. Thiết kế onset chưa có cờ để thử.

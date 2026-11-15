# Pha C: đo mức đầu ra — đề xuất, chưa triển khai (14/11/2026)

Pha C chỉ được thiết kế trong lượt này. Không đổi ngắt lời, âm lượng hoặc
`visualLevel.ts`; chờ người dùng duyệt sau thử thiết bị. Pha D/E tiếp tục hoãn.

## Đo cái gì

Đo RMS số chưa nhân 5/chặn 1 trên đường phát MP3 hiện tại. Tính RMS =
sqrt(sum(sample²)/N), peak =max(abs(sample)); có thể biểu diễn 20log10(RMS)
theo full-scale số. Gửi kèm thời gian cửa sổ, sample rate, số mẫu, playing/ended,
mute/volume của media element và trạng thái AudioContext. Chỉ giữ số liệu gộp
trong RAM; không log, lưu PCM hoặc gửi mạng. `visualLevel` vẫn dùng riêng cho orb.

Web Audio cung cấp tín hiệu trong audio graph; AnalyserNode trả samples miền thời
gian, MediaElementAudioSourceNode đưa media element vào graph. Đây là cơ sở API,
không phải phép đo áp suất âm tại tai/micro. [Đặc tả Web Audio](https://www.w3.org/TR/webaudio-1.0/#AnalyserNode).

**Không gọi đây là dB SPL hay mức âm vật lý thật từ loa.** Suy luận kỹ thuật:
OS volume, ampli/loa, vị trí mic, phòng và xử lý AEC/AGC có thể thay đổi quan hệ
giữa tín hiệu số và âm vọng. Cần thử loa/mic thật có cùng vị trí/âm lượng; muốn
SPL tuyệt đối cần thiết bị đo được hiệu chuẩn bên ngoài, ngoài phạm vi app này.

## Hai lựa chọn để duyệt

| Lựa chọn | Ưu điểm | Đánh đổi |
| --- | --- | --- |
| AnalyserNode trả RMS thô, snapshot ngắn kèm timestamp | Ít code, dùng API đang có; không thêm file worklet. | Poll main thread có thể trễ, cửa sổ overlap/gap; không được cộng snapshot chồng nhau để giả cửa sổ 100 ms hoàn chỉnh. |
| Worklet đo riêng trên nhánh đầu ra, gom sumSquares/peak trong 100 ms | Cửa sổ đều như input, biết số mẫu và thời gian audio; dễ so theo độ trễ echo. | Thêm module/cleanup; cần test browser/HTTPS/CPU, xử lý resume/suspend và lỗi tải. Không có model hay dependency. |

Đề xuất chọn **worklet chỉ đo số liệu** khi được duyệt. Giữ source → destination
hiện có; nhánh đo xuất silence để không phát audio hai lần. Dùng AudioContext
hiện có, không xin thêm mic/đổi TTS. Đo tại điểm gần cuối graph và xác minh mute/
volume bằng test thực, tránh nhân gain lần hai do đo sai vị trí. Kết thúc/abort
phải xóa listener, đóng port, disconnect; số liệu thiếu/stale không khóa mic.

## Dùng số đo cho ngắt lời

1. Đồng bộ cửa sổ input/output theo cùng audio clock; metadata chuyển về main
   thread không được coi là thời gian âm thanh ra loa. Giữ tối đa 2 giây mức RMS
   để khảo sát lag (chưa chọn lag/ratio trước khi có dữ liệu thiết bị).
   Input worklet hiện chỉ gửi PCM ArrayBuffer, chưa kèm audio timestamp; nếu
   duyệt phương án này cần bổ sung thời gian cửa sổ ở nguồn input/output và
   kiểm reset/resample. Không lấy thời điểm nhận message trên main thread để
   giả là thời điểm thu/phát chính xác.
2. Chỉ trong assistant_speaking, đánh giá đầu vào so noise floor, envelope đầu
   ra đã căn lag và thời gian voiced. Không so trực tiếp RMS input với RMS output
   theo một hệ số chung cho mọi thiết bị; không chặn mọi input khi Mate phát.
3. Trước rollout, cần 10+ lần chen lời ngắn và 10+ lần người học im lặng cho từng
   browser × loa/tai nghe × môi trường. Báo ngắt giả, bỏ sót chen lời, onset p50/p95
   theo từng mức loa; chấp nhận rủi ro chỉ sau người dùng duyệt.

Có thể đọc `track.getSettings()` để ghi nhận AEC/AGC/noise suppression thực tế
được browser báo; `getSupportedConstraints()` chỉ cho biết khả năng hỗ trợ.
Không suy setting=true là echo đã bị triệt. [Đặc tả Media Capture](https://w3c.github.io/mediacapture-main/#dom-mediastreamtrack-getsettings).

Chưa đề xuất tự giảm âm lượng; thao tác đó thay đổi trải nghiệm và cần duyệt
riêng. Hiệu chuẩn 1–2 giây có UI cũng chưa làm. Một bộ đo số chính xác hơn vẫn
không phân biệt chắc chắn echo với người học nói đồng thời; chưa cam kết hết tự ngắt.

Quyết định còn chờ: Analyser hay worklet; cách xác nhận quan hệ input/output
trên thiết bị; ngưỡng/thời gian ngắt sau số liệu thật. Không thêm công tắc hoặc
code Pha C trong phiên bản Pha A/B.

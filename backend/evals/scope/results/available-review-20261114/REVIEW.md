# Rà soát offline 422 phản hồi — 14–15/11/2026

Không sinh mới, không judge. Hash prompt/corpus và nguồn ghép/checker đã đối chiếu lock; ledger/results gốc giữ nguyên.

| Bản | Nhóm | Đủ/dự kiến | Lần 1/2/3 | Không cờ | Có cờ | Chưa rõ | Lỗi cuối | Chưa gọi |
|---|---|---:|---|---:|---:|---:|---:|---:|
| persona.v7 | in_scope | 154/240 | 80/74/0 | 116 | 38 | 0 | 2 | 84 |
| persona.v7 | out_of_scope | 72/216 | 72/0/0 | 72 | 0 | 0 | 0 | 144 |
| persona.v7 | adversarial | 30/90 | 30/0/0 | 30 | 0 | 0 | 0 | 60 |
| persona.v7 | gray | 15/45 | 15/0/0 | 13 | 1 | 1 | 0 | 30 |
| persona.v7 | safety | 11/36 | 11/0/0 | 7 | 4 | 0 | 1 | 24 |
| persona.v7 | drift | 15/45 | 15/0/0 | 15 | 0 | 0 | 0 | 30 |
| persona.v7 | regression_v6 | 10/30 | 10/0/0 | 9 | 1 | 0 | 0 | 20 |
| persona.v7 | identity | 6/18 | 6/0/0 | 6 | 0 | 0 | 0 | 12 |
| persona.v7 | checkpoint | 2/6 | 2/0/0 | 1 | 1 | 0 | 0 | 4 |
| persona.v7 | app_ui | 2/6 | 2/0/0 | 1 | 1 | 0 | 0 | 4 |
| persona.v7 | mixed_request | 2/6 | 2/0/0 | 1 | 1 | 0 | 0 | 4 |
| persona.v7 | quoted_negative | 2/6 | 2/0/0 | 1 | 1 | 0 | 0 | 4 |
| persona.v6 | out_of_scope | 71/216 | 71/0/0 | 51 | 20 | 0 | 1 | 144 |
| persona.v6 | adversarial | 30/90 | 30/0/0 | 28 | 2 | 0 | 0 | 60 |

**Mọi nhóm đều chưa đủ dữ liệu.** Không cờ không có nghĩa đạt ngữ nghĩa. V6 chỉ chạy hai nhóm đối chứng.

Chạy lại checker: 0 kết quả thay đổi; 351 không cờ, 70 có cờ, 1 chưa rõ. Có 50 cờ ngôn ngữ, 13 cờ voice >45 từ, 7 cờ số câu hỏi, 3 cờ Markdown (các cờ có thể trùng phản hồi). Không có cờ sao chép chỉ dẫn, đáp án hoặc trộn lời từ chối; heuristic không chứng minh không rò rỉ. **Checker hiện không quyết định ngữ nghĩa ngoài phạm vi**: scope/safety/đúng kiến thức cần chấm tay, không tự gắn là đạt.

[Tất cả phản hồi/checks](all_responses.csv); [phiếu chấm tay mới](manual_review.csv); [manifest lấy mẫu](summary.json).

Đơn vị lấy mẫu là phản hồi có sẵn (giữ từng repetition), khác phiếu cũ lấy case ID. Chọn mọi phản hồi safety/identity/checkpoint/adversarial; các nhóm khác chọn mọi cờ/chưa rõ cộng ceil(20% số phản hồi của nhóm/phiên bản) ngẫu nhiên từ phần chưa chọn. Seed 20261114, tổng **215 phản hồi**. Phiếu cũ không bị ghi đè. Không tạo hàng chấm giả cho dữ liệu chưa có.

| Bản | Nhóm | Có dữ liệu | Ngẫu nhiên bổ sung | Tổng phiếu |
|---|---|---:|---:|---:|
| persona.v6 | adversarial | 30 | 0 | 30 |
| persona.v6 | out_of_scope | 71 | 15 | 35 |
| persona.v7 | adversarial | 30 | 0 | 30 |
| persona.v7 | app_ui | 2 | 1 | 2 |
| persona.v7 | checkpoint | 2 | 0 | 2 |
| persona.v7 | drift | 15 | 3 | 3 |
| persona.v7 | gray | 15 | 3 | 5 |
| persona.v7 | identity | 6 | 0 | 6 |
| persona.v7 | in_scope | 154 | 31 | 69 |
| persona.v7 | mixed_request | 2 | 1 | 2 |
| persona.v7 | out_of_scope | 72 | 15 | 15 |
| persona.v7 | quoted_negative | 2 | 1 | 2 |
| persona.v7 | regression_v6 | 10 | 2 | 3 |
| persona.v7 | safety | 11 | 0 | 11 |

## Resume: chỉ chuẩn bị, chưa thực thi

[Thứ tự xen kẽ](pending_interleaved.json) gồm 624 slot chưa từng gọi, round-robin theo (phiên bản, nhóm), giữ ID slot cũ và thứ tự repetition trong mỗi nhóm. Các nhóm nhỏ kết thúc trước thì vòng sau bỏ qua, không nhân bản slot. Trần bổ sung 624 + tối đa 624 retry 502 = **1.248 request**, cộng 428 lịch sử = **1.676**, dưới trần cũ 2.100. Số thật thường thấp hơn vì retry chỉ khi đủ điều kiện.

Bốn slot terminal không có phản hồi (3 timeout adapter 504 và 1 HTTP provider 429) không nằm trong 624; danh sách trong summary.json. Chỉ có 624 slot chưa gọi thì toàn chiến dịch vẫn có thể thiếu bốn phản hồi. Muốn bù các slot lỗi cần xác nhận riêng về retry/trần khi người dùng báo quota đã sẵn sàng; không tự sửa ledger hay thử lại timeout.

**Runner hiện tại chưa hỗ trợ thứ tự xen kẽ này**; không dùng trực tiếp lệnh `campaign --execute --resume` cũ. Trước live phải nối lịch đã duyệt vào runner eval, kiểm provenance theo slot thay vì vị trí chạy, giữ prefix ledger bất biến, append/fsync attempt trước request và result ngay sau, kiểm không trùng reply. Cần test offline cancellation/resume/429/Retry-After/budget trước live. Không đổi prompt/checker/backend transport đã khóa; nếu đổi runner đã có trong frozen_files phải ghi manifest chuyển phiên bản runner, bảo toàn hash nguồn lịch sử, không lặng lẽ ghi đè lock.

Khi được xác nhận quota: một runner tuần tự, delay ít nhất 6 giây sau response; Retry-After dạng giây/HTTP-date được tôn trọng, retry 502 tối đa một lần với backoff ít nhất 10 giây. Dừng ngay khi 429, không tự chờ rồi chạy tiếp. Trường not_before của lỗi 429 hiện cách completed_at khoảng 6 giây, có thể là fallback; log chỉ lưu rate_limit_or_quota, không có quota metric/limit ID nên **không xác định được RPM/TPM hay quota ngày**. Không đoán giờ reset.

Hai bản ghi HTTP_502 có failure_kind=invalid_or_incomplete_stream, provider_http_status=null: adapter quy đổi luồng hỏng/không hoàn chỉnh thành 502; cả hai đã phục hồi sau một retry. Không gọi chúng là HTTP 502 thật từ provider. Ba HTTP_504 là timeout nội bộ, không có HTTP provider được lưu. HTTP_429 có provider_http_status=429.

Không có bằng chứng mới từ provider; không gọi API trong lần rà này.

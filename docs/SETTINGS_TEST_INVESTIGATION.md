# Test Settings không ổn định dưới tải — điều tra 15/11/2026

Xem [bàn giao kiểm chứng mới nhất](PROMPT_VOICE_REVIEW_2026-11-15.md): lượt toàn
suite cuối có thêm lỗi ở các test UI khác và chuỗi lỗi DOM sau timeout; kết quả
chạy riêng Settings phía dưới không chứng minh toàn suite ổn định.
Chạy riêng bốn file liên quan với một worker trên nhánh snapshot: 54/57 qua,
ba lỗi ở các test khác; JSON chỉ ghi STACK_TRACE_ERROR và thời gian >5 giây.
Chưa có bằng chứng đủ để quy mọi lỗi này cho cùng nguyên nhân với Settings.

Không sửa `App.test.tsx`, assertion, timeout hoặc code Settings. Không tái hiện
bằng dữ liệu thật; fetch, auth, audio đều dùng doubles có sẵn của test.

## Bằng chứng

- Bước 0: test thường 472/472 qua; coverage một worker có một lần timeout
  5.000 ms tại `App.test.tsx:1073` (lưu giọng/tốc độ rồi đăng nhập lại).
  Chạy coverage lại cùng test/timeout: 472/472 qua. Không xóa lần thất bại.
- Chạy riêng đúng test, không coverage: qua **3.237 ms**. Chạy riêng cùng test
  với inspector CPU hook tạm trong `.artifacts`, không sửa test: qua **3.258 ms**.
  Hook chỉ thu stack CPU, không lưu DOM, state, fetch body hay audio.
- Profile cửa sổ test khoảng **3.128 ms**: inclusive `queryAllByRole` **1.834 ms
  (58,6%)**, `getComputedStyle` **1.656 ms (52,9%)**, dom-accessibility-api
  **1.562 ms (49,9%)**. Các nhóm nằm lồng nhau, **không cộng phần trăm**.
- Source test dùng nhiều `screen.getByRole/findByRole` trên toàn app xuyên
  workspace, Settings, chat, logout/login. Voice catalog được fetch mock trả
  ngay; `docVanBan` mock resolve; lazy TutorWorkspace/LandingPage đã preload
  ở beforeAll. Không có bằng chứng API thật/giọng thật gây chờ ở đây.

Nguyên nhân tốn thời gian chính quan sát được là truy vấn accessibility trên
DOM lớn, gồm tính tên và style. Một test gộp nhiều lần điều hướng/đăng nhập
chỉ có khoảng 1,7 giây dự phòng so với giới hạn 5 giây khi chạy riêng; coverage
và tranh CPU có thể làm vượt. **Chưa có profile đúng lần thất bại**, nên đây
là cơ chế đã đo và giả thuyết cho lần timeout, không khẳng định đã xác định
chính xác câu lệnh vượt thời gian hoặc đã sửa hết flake.

## Phương án sửa đề xuất, chưa áp dụng

1. Giữ test tích hợp lưu → dùng trong chat → logout/login → khôi phục, giữ
   toàn bộ assertion và timeout. Thu hẹp truy vấn vào vùng Settings, form
   đăng nhập và chat bằng `within(...)`; vẫn chọn bằng role/name, không chuyển
   sang kiểm tra chi tiết triển khai hoặc bỏ kiểm accessibility.
2. Tái dùng tham chiếu DOM chỉ trong cùng lần mount; lấy lại sau điều hướng.
   Đợi trạng thái catalog ready cụ thể như hiện tại, không thêm sleep hoặc
   nới timeout. Không dùng fake timer toàn cục để che async chưa hoàn tất.
3. Chạy lại test riêng và toàn bộ suite có coverage dưới cùng cấu hình/tải,
   báo phân bố thời gian và mọi lần lỗi. Một lần qua không đủ chứng minh ổn định.
   Cần duyệt sửa test trước khi áp dụng; lượt này chỉ điều tra và đề xuất.

Log/profile cục bộ không đưa vào commit:
`.artifacts/state-audit-frontend-coverage.log`,
`.artifacts/state-audit-frontend-coverage-recheck.log`,
`.artifacts/settings-profile-result.json`, `.artifacts/settings-cpu-result.json`,
`.artifacts/settings-test.cpuprofile`. Hook/config thử nghiệm cũng chỉ ở
`.artifacts`, không nằm trong cấu hình Vitest mặc định.

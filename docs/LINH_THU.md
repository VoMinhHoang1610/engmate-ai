# Mate — linh thú EngMate AI

Mate là robot đồng hành khi học tiếng Anh, phát triển từ nhân vật được người dùng chọn. Dáng vuông bo tròn, góc dưới lệch nhẹ, thân trắng/xanh nhạt, màn hình navy, mắt và nụ cười cyan, má hồng, anten vàng là các đặc điểm nhận diện cố định.

## Nguồn thiết kế

- `frontend/src/components/LinhThu.tsx` và phần Mate trong `frontend/src/index.css` là nguồn cho nhân vật chuyển động. Các trang dùng chung component, không tự vẽ lại nhân vật.
- `frontend/public/mate.svg` là bản vector tĩnh nền trong suốt ở dáng chào, dùng cho tài liệu và các vật phẩm nhận diện. Giữ tỷ lệ `220 × 220` khi phóng to/thu nhỏ.
- `TrangTri.tsx` bổ sung vòng quỹ đạo, sao và bong bóng cho banner/chào mừng. Logo EngMate AI là nhận diện chữ/biểu tượng; Mate là nhân vật đồng hành.

## Biểu cảm và vị trí

| Biểu cảm | Hiển thị |
| --- | --- |
| `welcome` | Vẫy tay ở tổng quan, sidebar, đăng nhập và avatar hội thoại |
| `listening` | Tai nghe violet ở bài nghe và khi đang ghi âm |
| `thinking` | Bong bóng ba chấm khi chờ phản hồi, xin quyền/hoàn tất ghi âm, vùng viết chưa có phản hồi |
| `encouraging` | Mắt cong, gật đầu khi bắt đầu học hoặc cần thử lại |
| `celebrating` | Giơ tay, nhún và confetti khi trả lời đúng, hoàn thành phiên ôn hoặc đạt mục tiêu ngày |

Ăn mừng dựa trên trạng thái thực của bài nghe/phiên ôn/tiến độ hiện có. Phản hồi AI mẫu không được thể hiện như điểm số hay đánh giá thật. Hình đi cùng nội dung bằng chữ, có `aria-hidden`, không chặn nút hay nhận focus. Tùy chọn giảm chuyển động của ứng dụng/hệ thống tắt hiệu ứng nhưng giữ dáng và nội dung.

## Sử dụng trong mã

```tsx
<LinhThu size={140} camXuc="listening" />
```

Giữ nền nhẹ và khoảng thở quanh nhân vật. Lời động viên ngắn; không thêm mô tả phụ dưới từng tên tùy chọn. Các thẻ luyện tập có màu, cạnh nổi và phản hồi hover/nhấn để tạo cảm giác vui khi học. Không thêm XP, chuỗi ngày, khóa bài hay thành tích chưa có dữ liệu.

# Database SQL Server cho EngMate-AI

Thiết kế **22 bảng, 2 view** cho toàn bộ giao diện học tập hiện tại và các luồng backend tương ứng. Xem [khảo sát, ERD, từ điển dữ liệu và quy tắc giao dịch](../../docs/DATABASE_SQLSERVER.md).

Yêu cầu SQL Server 2019+; đã chạy kiểm chứng trên SQL Server 2022 Developer. Script dùng UTF-8; trong sqlcmd thêm `-f 65001` để giữ tiếng Việt/IPA.

| File | Cách dùng |
| --- | --- |
| `001_schema.sql` | Chạy một lần trong database mới, tạo schema `em`, bảng, khóa và index. Có transaction, từ chối schema đã tồn tại. |
| `002_seed_catalog.sql` | Danh mục theo code demo: 8 chủ đề, 9 bài, 4 câu hỏi, 6 lựa chọn; chạy lại không thêm trùng. Không seed tài khoản. |
| `003_views.sql` | Tạo/cập nhật thống kê tổng và ngày; chạy lại được. |
| `004_example_queries.sql` | Ví dụ truy vấn chỉ đọc; thay UserId bằng người dùng đã xác thực và ngày theo múi giờ hồ sơ. |
| `tests/verify.sql` | Kiểm thử SQL Server trong tempdb; rollback toàn bộ schema và dữ liệu thử. |

Trong SSMS: tạo database `EngMateAI` rỗng → chọn database → chạy lần lượt `001`, `002`, `003`. Với database đã có schema `em`, cần migration mới được rà soát; không xóa schema để chạy lại.

Hoặc, sau khi tự tạo database mới, chạy từ thư mục này:

```powershell
sqlcmd -S localhost -E -d EngMateAI -b -f 65001 -i 001_schema.sql
sqlcmd -S localhost -E -d EngMateAI -b -f 65001 -i 002_seed_catalog.sql
sqlcmd -S localhost -E -d EngMateAI -b -f 65001 -i 003_views.sql
```

Kiểm thử độc lập, không cần tạo database ứng dụng. **Từ thư mục gốc `EngMate-AI`**, chạy đầy đủ ba dòng:

```powershell
Push-Location .\database\sqlserver
sqlcmd -S localhost -E -d tempdb -b -f 65001 -i tests/verify.sql -W
Pop-Location
```

Nếu terminal đang ở thư mục khác, chuyển tới thư mục `EngMate-AI` trước. Cả file `tests/verify.sql` và các file được nạp bằng `:r` đều được tìm từ thư mục làm việc `database/sqlserver`; chỉ đổi đường dẫn `-i` mà không đổi thư mục có thể tiếp tục lỗi khi nạp `001_schema.sql`.

`-E` dùng Windows authentication. Đổi `-S` theo instance của bạn; không đưa mật khẩu vào file SQL/Git. Script test cần quyền tạo schema/bảng/view trong tempdb và từ chối nếu schema `em` đã có. Toàn bộ thay đổi rollback khi kết thúc hoặc kết nối lỗi đóng; không chạm database ứng dụng.

FastAPI và frontend chưa sử dụng database này. Bước tiếp theo là models/repository, migration runner, auth thật và API lưu dữ liệu theo tài liệu thiết kế.

# Kiểm tra lỗi đăng nhập Google/Facebook — 10/11/2026

## Kết luận

Người dùng mở `http://127.0.0.1:5174`, nhưng cả `.env` và backend Docker
đang dùng `OAUTH_PUBLIC_ORIGIN` là một tên miền Pinggy HTTPS. Yêu cầu bắt đầu
đăng nhập từ địa chỉ local bị backend từ chối trước khi liên hệ nhà cung cấp.
Tên miền Pinggy cấu hình hiện không phân giải được DNS trên máy kiểm tra,
kể cả khi kiểm tra lại ngoài sandbox.

Không thay đổi `.env`, cấu hình xác thực, container hay dữ liệu tài khoản trong
tác vụ kiểm tra. Các yêu cầu `/start` chỉ tạo state tạm trong bộ nhớ; không đổi
code OAuth, không đăng nhập hoặc tạo tài khoản thật. Không in khóa bí mật.

## Bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Docker backend/frontend/share | Đang chạy, healthy. |
| `/api/health`, `/api/ready` trực tiếp và qua Vite | HTTP 200; backend và MySQL sẵn sàng. |
| Google và Facebook `/start`, Origin `http://127.0.0.1:5174` | HTTP 403, `Unexpected sign-in origin.` |
| `/start`, Origin `http://localhost:5174` | HTTP 403 cho cả hai nhà cung cấp. |
| `/start`, Origin Pinggy đã cấu hình | HTTP 200 cho cả hai nhà cung cấp; cookie có Secure. Kiểm tra này không chứng minh truy cập được tên miền Pinggy. |
| Proxy Vite 5174 và nginx 5180 | Chuyển tiếp API được; cùng kết quả 403/200 theo Origin. |
| Biến cấu hình trong backend Docker | Có client ID/secret của cả hai nhà cung cấp, JWT và database; origin khớp `.env`. Chưa xác minh tính hợp lệ của credential với nhà cung cấp. |
| Database trong container | `SELECT 1` thành công; có bảng `engmate_oauth_identities`. Không đọc dữ liệu người dùng. |
| Truy cập mạng từ backend | Google discovery trả HTTP 200; Graph Facebook trả HTTP 400 khi gọi root không có tham số. Đây là bằng chứng nhận được phản hồi HTTP, không chứng minh quyền ứng dụng. |
| DNS tên miền Pinggy đã cấu hình | `gaierror`; HTTP `ConnectError`, tái hiện ngoài sandbox. |
| `python -m pytest backend/tests/unit/test_oauth.py -q` | 13 passed; một cảnh báo quyền ghi pytest cache. |
| `npm.cmd --prefix frontend test -- src/api/socialAuth.test.ts src/AuthForm.test.tsx` | 21 passed trong 2 file sau khi chạy ngoài sandbox; lần đầu bị esbuild `spawn EPERM`. |

## Vị trí nguyên nhân trong mã

- `backend/app/api/oauth_routes.py`: `/start` kiểm tra Origin phải bằng chính xác
  `oauth_public_origin`, trả 403 khi không khớp. Đây là kiểm tra bảo vệ cần giữ.
- `backend/app/services/oauth.py`: callback được tạo từ `oauth_public_origin`.
- `frontend/src/api/socialAuth.ts`: HTTP 403 hiện được hiển thị bằng thông báo
  chung "Chưa mở được đăng nhập nền tảng. Hãy thử lại sau.", nên người dùng không
  thấy nguyên nhân lệch origin. Bấm thử lại không sửa được cấu hình này.
- Chỉ thêm địa chỉ vào `CORS_ORIGINS` không giải quyết được: OAuth kiểm tra
  riêng địa chỉ được phép bắt đầu và nhận kết quả đăng nhập.

## Phương án đã kiểm chứng, chờ xác nhận áp dụng

Đổi duy nhất biến sau trong `.env` để khớp địa chỉ người dùng đang mở:

```dotenv
OAUTH_PUBLIC_ORIGIN=http://127.0.0.1:5174
```

Sau đó tạo lại backend để nạp môi trường mới:

```powershell
docker compose up -d --no-deps backend
```

`docker compose restart` không nạp lại biến môi trường Compose đã đổi.
Không bỏ kiểm tra Origin, không mở rộng whitelist tùy ý.

Đã thử phương án bằng ứng dụng ASGI riêng trong bộ nhớ với origin local,
không thay đổi backend đang chạy: cả hai `/start` trả 200, cookie vẫn HttpOnly,
không có Secure trên HTTP local; callback hủy trả HTML về đúng origin local,
không chứa token và không gọi nhà cung cấp hoặc ghi database.

Các callback tương ứng cần đối chiếu trong dashboard nhà cung cấp:

```text
http://127.0.0.1:5174/api/auth/oauth/google/callback
http://127.0.0.1:5174/api/auth/oauth/facebook/callback
```

Google yêu cầu redirect URI khớp URI đã đăng ký. Với Meta cần kiểm tra trực tiếp
điều kiện URI/chế độ ứng dụng hiện tại; nếu không chấp nhận HTTP local, dùng
một origin HTTPS hoạt động và mở giao diện bằng chính origin đó. Không thể kết
luận chỉ đổi `.env` là hoàn tất đăng nhập thật.

## Giới hạn

Chưa kiểm tra dashboard Google/Meta, trạng thái consent, tài khoản thử, callback
đã đăng ký, quyền email hay quy trình đăng nhập thật. Không chạy test toàn bộ,
lint, coverage hoặc build vì đây là kiểm tra OAuth, chưa sửa mã nguồn. Không tạo
lại `docs/PROGRESS.md` vì file đã ở trạng thái bị xóa trước tác vụ; báo cáo riêng
này giữ nguyên thay đổi có sẵn. Không commit/push.

Tham khảo: [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server).
Trang [Meta manual flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/)
trả HTTP 429 khi tra cứu trong tác vụ này; chưa xác minh được yêu cầu hiện hành từ trang đó.

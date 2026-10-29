# Đăng nhập Google và Facebook

Đã triển khai luồng authorization code qua backend. Hai nút dùng cho cả đăng nhập
và đăng ký: tài khoản mới được tạo cùng hồ sơ và liên kết nền tảng trong một
transaction; lần sau dùng lại liên kết đó. GitHub không còn được cung cấp.

## Cấu hình để chạy thật

1. Trong Google Cloud, tạo OAuth client loại **Web application** và cấu hình
   consent screen/test users. Đăng ký redirect URI chính xác:
   `http://127.0.0.1:5174/api/auth/oauth/google/callback`.
2. Trong Meta for Developers, thêm Facebook Login cho ứng dụng, bật Web OAuth
   Login và đăng ký Valid OAuth Redirect URI:
   `http://127.0.0.1:5174/api/auth/oauth/facebook/callback`.
   Tài khoản thử phải có vai trò trong ứng dụng khi app còn Development.
   Với website công khai, cấu hình HTTPS, tên miền, chính sách riêng tư và các
   quyền/điều kiện xét duyệt mà Meta yêu cầu, gồm email.
3. Điền các biến sau trong `.env` trên máy chủ, không gửi secret qua chat hoặc
   đặt trong biến `VITE_*`:

   ```dotenv
   OAUTH_PUBLIC_ORIGIN=http://127.0.0.1:5174
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   FACEBOOK_CLIENT_ID=
   FACEBOOK_CLIENT_SECRET=
   FACEBOOK_GRAPH_VERSION=v24.0
   ```

   `OAUTH_PUBLIC_ORIGIN` không có dấu `/` cuối, phải trùng origin thực tế người
   dùng mở. `localhost` và `127.0.0.1` là hai origin khác nhau. Nếu dùng tên miền
   HTTPS, thay origin và đăng ký lại cả hai callback với tên miền đó. Chọn phiên
   bản Graph API còn được ứng dụng Meta hỗ trợ; phiên bản được cấu hình rõ.
4. Xác nhận `DATABASE_MYSQL_URL` hoặc `DATABASE_ODBC_CONNECTION` trỏ đúng database
   dev cần dùng và `JWT_SECRET` đã cấu hình. Sau khi duyệt cấu hình, chạy rõ ràng:

   ```powershell
   .venv\Scripts\python.exe scripts/install_oauth.py
   ```

   Lệnh chỉ tạo bảng mới `engmate_oauth_identities` nếu chưa có. Không sửa bảng
   tài khoản, mật khẩu, hồ sơ hoặc tiến độ cũ. Ứng dụng không tự cài bảng khi khởi
   động. Tác vụ triển khai mã này **chưa chạy lệnh trên database người dùng**.
5. Restart backend và mở đúng origin đã cấu hình. Bấm Google hoặc Facebook,
   cho phép popup, chọn tài khoản và cấp quyền email. Chỉ nghiệm thu bằng tài
   khoản thử; kiểm tra cả đăng ký mới, đăng nhập lại và đăng xuất.

## Cách hoạt động và giới hạn

- Backend giữ secret và đổi code, chỉ gửi token phiên EngMate về cửa sổ ban đầu
  bằng `postMessage` với origin chính xác. Token không nằm trong URL hoặc
  localStorage; phiên dùng cùng cơ chế JWT/refresh có thể thu hồi của app.
- State ngẫu nhiên gắn cookie HttpOnly/SameSite=Lax, hạn 10 phút, chỉ dùng một
  lần. Google dùng PKCE S256; Facebook kiểm tra debug token, app ID, user ID và
  appsecret_proof. Không lưu access token của Google/Facebook.
- Google trùng email tài khoản EngMate cũ sẽ hiện bước nhập mật khẩu EngMate
  để xác nhận liên kết. Đây không phải mật khẩu Google. Chỉ sau khi xác nhận đúng,
  hệ thống gắn Google vào đúng UserId cũ và cấp phiên; không cập nhật hồ sơ,
  mật khẩu hay tiến độ. Những lần sau chỉ cần đăng nhập Google.
- Yêu cầu liên kết Google gắn cookie HttpOnly của trình duyệt, hạn 5 phút và chỉ
  dùng một lần. Hủy thì không tạo liên kết; sai mật khẩu/hết hạn hoặc mạng lỗi
  thì bấm Google lại để bắt đầu yêu cầu mới. Nếu tài khoản cũ không có mật khẩu
  EngMate, dùng phương thức đăng nhập ban đầu; chưa hỗ trợ liên kết chéo giữa
  hai tài khoản chỉ dùng nền tảng. Facebook vẫn không tự ghép email trùng.
- Facebook phải cung cấp email; nếu người dùng không cấp quyền hoặc nền tảng
  không trả email, ứng dụng báo lỗi và không tạo tài khoản thiếu định danh.
- Giữ một backend worker: state nằm trong bộ nhớ theo app, tối đa 4096 flow.
  Restart làm hết hiệu lực các flow đang chờ. Muốn nhiều worker cần kho state
  dùng chung có thao tác consume nguyên tử trước khi triển khai.
- Reverse proxy phải chuyển tiếp `/api/auth/oauth/*` về backend trên cùng origin
  frontend. Không bật log HTTP chứa query code/token hoặc log response/body OAuth.
- Kiểm thử tự động dùng HTTP doubles và SQL
  trong bộ nhớ, không chứng minh quyền app/consent đã được nhà cung cấp phê duyệt.

Với Docker local, các biến OAuth được chuyển từ `.env` vào backend qua
`docker-compose.yml`. Sau khi đổi cấu hình, dùng
`docker compose up -d --no-deps backend` để nạp lại; chỉ restart không cập nhật
biến môi trường đã thay đổi. Google start đã được kiểm tra trả 200 sau cấu hình;
bước cấp quyền/quay lại ứng dụng vẫn cần nghiệm thu bằng người dùng.

Tài liệu chính thức: [Google OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server),
[Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect),
[Facebook manual login flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/).
Trang Meta trả 429 trong lần tra cứu của tác vụ này; cần kiểm tra các điều kiện
hiện hành trong dashboard Meta khi cấu hình ứng dụng thật.

# API khung

Base URL local: `http://127.0.0.1:8010`. OpenAPI: `/docs`, `/openapi.json`.

## GET /api/health

Không xác thực. HTTP 200:

```json
{"status":"ok","service":"engmate-ai"}
```

Chỉ kiểm tra tiến trình API; không xác nhận DB/provider thật hoạt động.

## POST /api/ai/reply

Endpoint demo dùng mock, không lưu dữ liệu.

```json
{"message":"Hello","level":"B1"}
```

HTTP 200:

```json
{"reply":"[Mock/B1] You said: Hello. What would you like to practice?","provider":"mock","level":"B1"}
```

- `message`: chuỗi 1–2000 ký tự sau khi bỏ khoảng trắng hai đầu.
- `level`: Pre-A1/A1/A2/B1/B2/C1/C2; mặc định A2 để giữ tương thích hợp đồng cũ. Frontend gửi mức đã chọn trong lộ trình/hồ sơ. Field ngoài hợp đồng bị từ chối. A0/C3 không phải giá trị hỗ trợ.
- HTTP 422: đầu vào sai, quá dài/rỗng hoặc trình độ không hỗ trợ.
- HTTP 504: provider timeout; response `{"detail":"AI provider timed out."}` không tiết lộ chi tiết nội bộ.

Các endpoint này chưa có xác thực; không đưa vào môi trường production như API chat thật. Health cũ `/health` đã thay bằng `/api/health` trong lần reset; tests, Docker và smoke dùng đường dẫn mới.

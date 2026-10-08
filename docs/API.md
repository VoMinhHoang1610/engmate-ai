# API EngMate-AI — MySQL / SQL Server

Base URL mặc định: `http://127.0.0.1:8010`; local hiện tại `http://127.0.0.1:8011`. Swagger `/docs`, OpenAPI `/openapi.json` là nguồn hợp đồng thực thi. `python scripts/manage.py export-api` xuất `.artifacts/api/openapi.json` để import Postman hoặc sinh client.

API nghiệp vụ dùng database EngMateAI/MySQL v1 khi cấu hình DATABASE_MYSQL_URL, hoặc schema `em` v1 khi cấu hình DATABASE_ODBC_CONNECTION. Chỉ bật một driver. `/api/health` và `/api/ai/reply` vẫn chạy khi chưa cấu hình DB; API cần lưu dữ liệu trả 503. Backend không tự tạo database/schema khi khởi động.

## Quy ước chung

- JSON dùng `snake_case`, ID SQL là số dương, request ID là UUID; ngày `YYYY-MM-DD`, thời điểm ISO 8601 UTC. `version` là token hex 16 ký tự: BIGINT của trigger MySQL hoặc rowversion SQL Server. Client giữ nguyên token, không tự tăng.
- Dữ liệu riêng cần `Authorization: Bearer <access_token>`; không nhận UserId/role/score/time/review_count/next_review_at từ client. Tài nguyên của người khác trả 404. `is_mastered` chỉ được tự đánh dấu qua endpoint mastery có version, hoặc cập nhật theo lượt flashcard thực tế.
- List trả mảng, phân trang `offset=0&limit=50`, tối đa 100. Client tăng offset để lấy trang tiếp; mảng ngắn hơn limit là hết trang. Dashboard có `days=30`, từ 1 đến 365.
- Yêu cầu có field ngoài schema bị từ chối. Chuỗi được trim (mật khẩu giữ nguyên); giới hạn chuỗi tương thích số đơn vị UTF-16 của SQL Server.
- Retry việc tạo phiên/gửi tin/ôn thẻ phải giữ cùng `client_request_id` và cùng nội dung. Dùng UUID mới cho thao tác mới. Request ID cũ với nội dung khác trả 409. Retry nộp bài giữ nội dung cũ; version cũ được chấp nhận chỉ khi đã nộp cùng nội dung.
- Các phản hồi API có `Cache-Control: no-store`. Body tối đa 10 MiB; auth POST giới hạn mặc định 30 yêu cầu/phút/IP/process, cấu hình `AUTH_REQUESTS_PER_MINUTE`. 429 có `Retry-After: 60`.

| HTTP | Ý nghĩa |
| --- | --- |
| 200 / 201 / 202 / 204 | Đọc/cập nhật; tạo; tiếp nhận email reset; hoàn tất không có body |
| 401 | Thiếu/sai/hết hạn bearer, tài khoản vô hiệu hóa, phiên bị thu hồi hoặc sai mật khẩu |
| 404 | Không có tài nguyên hoặc tài nguyên không thuộc người gọi |
| 409 | Trùng username/email/từ đang hoạt động, rowversion cũ, request ID dùng sai hoặc phiên đã đóng |
| 413 / 422 / 429 | Quá dung lượng; đầu vào/quan hệ sai; vượt giới hạn auth |
| 502 / 503 / 504 | AI lưu lịch sử bị lỗi/timeout; thiếu DB/schema/SMTP/decoder; timeout mock demo cũ |

Lỗi có `detail`, không trả input mật khẩu/token, SQL statement, tham số hoặc connection string. Lỗi validation trả danh sách `loc`, `msg`, `type`.

## Health và demo không lưu

| Method | Path | Hành vi |
| --- | --- | --- |
| GET | `/api/health` | Liveness: `{"status":"ok","service":"engmate-ai"}`, không gọi DB/AI |
| GET | `/api/ready` | Kiểm tra kết nối/schema/bảng/view; MySQL: 24 bảng/2 view, `database=mysql`; SQL Server: 22 bảng/2 view, `database=sqlserver`; `schema_version=1` |
| POST | `/api/ai/reply` | Body `message` 1–2000, `level` Pre-A1/A1/A2/B1/B2/C1/C2 (mặc định A2); response `reply`, `provider=mock`, `level`; không lưu |

MySQL lưu đủ Pre-A1/A1/A2/B1/B2/C1/C2. PUT `/api/me/profile` nhận `onboarding_completed` và trả `onboarding_completed_at`; PUT `/api/me/settings` nhận `speech_voice_id` dạng slug cùng theme/reduced_motion/speech_rate/version. GET `/api/lessons?skill=reading` hỗ trợ Reading; chi tiết bài trả `vocabulary`, không trả ExpectedText hoặc CorrectQuestionId trước khi nộp. Reading sử dụng mode `multiple_choice` và chấm trên backend. GET `/api/dashboard` thêm `today` theo TimeZoneId hồ sơ. SQL Server v1 giữ giới hạn A2/B1/B2, chưa lưu voice/onboarding và Reading.

GET `/api/speech/dictation/{question_id}/audio` yêu cầu Bearer, chỉ cho câu dictation thuộc bài đã xuất bản; trả MP3 theo giọng/tốc độ đã lưu, không trả chuỗi đáp án. Speech local-demo bypass bị tắt khi cấu hình database; frontend MySQL gửi Bearer và tự refresh token cho speech cùng API nghiệp vụ.

## Tài khoản, hồ sơ, cài đặt

| Method | Path | Body / kết quả |
| --- | --- | --- |
| POST | `/api/auth/register` | `username`, `email`, `password`, `display_name`; tạo user/profile/settings/session atomic, trả token pair (201) |
| POST | `/api/auth/login` | `identifier` là username/email và `password`; trả token pair |
| POST | `/api/auth/refresh` | `refresh_token`; thu hồi token cũ rồi cấp cặp mới atomic |
| POST | `/api/auth/logout` | Không body, `all_sessions=false`; đổi true để thu hồi mọi phiên (204) |
| POST | `/api/auth/change-password` | `current_password`, `new_password`; thu hồi mọi phiên, đăng nhập lại (204) |
| POST | `/api/auth/forgot-password` | `email`; SMTP gửi link nếu có tài khoản đủ điều kiện; phản hồi 202 không tiết lộ email tồn tại |
| POST | `/api/auth/reset-password` | `token`, `new_password`; token một lần, hạn 20 phút, thu hồi mọi phiên (204) |
| GET | `/api/me` | `public_id`, `username`, `email`, `status`, `email_verified_at`, `version`; không có hash |
| PUT | `/api/me/account` | `version`, `username`, `email`, `current_password`; đổi email vô hiệu link reset cũ; giữ phiên hiện tại |
| GET / PUT | `/api/me/profile` | Đọc hoặc thay các field hồ sơ kèm `version` |
| GET / PUT | `/api/me/settings` | `version`, `theme`, `reduced_motion`, `speech_rate` |

Username 3–64 ký tự ASCII chữ/số/`_.-`; email ≤254 và username/email duy nhất không phân biệt hoa thường. Mật khẩu mới 10–128 ký tự, Argon2; username/email lưu thường. Access JWT HS256 hạn mặc định 15 phút, có issuer/audience/subject/session/purpose; refresh 30 ngày chỉ lưu SHA-256. Logout/đổi mật khẩu/reset có hiệu lực với access token ngay vì mỗi request kiểm tra AuthSessions.

Token pair có `access_token`, `refresh_token`, `token_type=bearer`, `expires_in` (giây), `user`. Không dùng tài khoản demo `abc/123` để gọi API này. Đăng ký backend tạo tài khoản thật; tài khoản đó chưa được giao diện demo trên nhánh UI sử dụng tự động.

Profile PUT: `display_name` 1–60; `phone_number`, `birth_date`, `gender` male/female/other/null, `avatar_asset_id` của chính người dùng; `cefr_level` A2/B1/B2; `learning_goal` 1–200; `daily_goal_minutes` 10–60; `time_zone_id` IANA (mặc định Asia/Ho_Chi_Minh). PUT là thay thế các field chỉnh sửa: field tùy chọn bị bỏ sẽ về default/null. Tải lại và dùng version mới khi nhận 409. Email được đổi qua `/me/account` với mật khẩu, không qua profile.

Settings: theme light/dark/system; speech_rate chỉ 0.75/1/1.25. Không có provider/model/key AI trong cài đặt người dùng.

SMTP chưa cấu hình đủ host/sender trả 503 cho mọi email. Khi đã cấu hình, request trả 202 với cùng body cho email tồn tại/không tồn tại, kể cả SMTP giao thư thất bại; server chỉ ghi cảnh báo chung không có email/token. 202 không bảo đảm thư đã được giao. Link dạng `<FRONTEND_URL>/#dang-nhap?reset-token=<token>`; frontend khi tích hợp cần đọc token và gọi reset endpoint. Test dùng outbox/SMTP giả, không gửi email thật. OAuth Google/Facebook/GitHub và xác minh email chưa triển khai.

## Chủ đề và bài học

| Method | Path | Query / kết quả |
| --- | --- | --- |
| GET | `/api/topics` | Chủ đề active, sắp SortOrder; seed 8 chủ đề |
| GET | `/api/lessons` | Bài published, query skill speaking/listening/writing và offset/limit; seed 9 bài |
| GET | `/api/lessons/{identity}` | Bài revision cụ thể, instruction/content/audio_url/levels, questions và options |

Questions trước nộp không trả ExpectedText, Explanation hoặc IsCorrect của option. Content của bài nghe vẫn có transcript để phù hợp cách giao diện dùng TTS; đây là bài luyện demo, không phải cơ chế giấu đáp án cho kỳ thi. Sau nộp, attempt trả answer_key và điểm server. Không có API sửa bài published, tạo revision/admin ngoài phạm vi hiện tại.

## Hội thoại và kết quả AI

| Method | Path | Body / kết quả |
| --- | --- | --- |
| POST | `/api/conversations` | `client_request_id`, `topic_code` tùy chọn, `level=A2`, `title`; tạo StudySession, Conversation, lời mở đầu (201) |
| GET | `/api/conversations` | Lịch sử của owner, offset/limit |
| GET | `/api/conversations/{identity}/messages` | Tin theo sequence, offset/limit |
| POST | `/api/conversations/{identity}/messages` | `client_request_id`, `message` 1–2000; trả `message`, `reply`, `evaluation` |
| POST | `/api/conversations/{identity}/close` | `abandoned=false`; đóng đúng một lần, hoặc bỏ phiên với thời lượng 0 |
| GET | `/api/evaluations/{identity}` | Evaluation và `errors`; ResultJson được decode thành `result_json` object/array/null |
| POST | `/api/evaluations/{identity}/cancel` | Hủy evaluation pending, tin trả lời thành cancelled; thao tác lặp an toàn |

topic_code bỏ/null là free_chat; roleplay kiểm tra topic active và level hỗ trợ. Role/CEFR/prompt được snapshot. Provider nhận persona.v2, role và tối đa 20 tin gần nhất. Một conversation chỉ có một reply pending: gửi tin mới hoặc đóng khi pending trả 409. Retry cùng UUID trả trạng thái hiện có, không gọi AI lần hai.

SQL reserve hai tin và evaluation pending, commit, gọi LLM ngoài transaction (timeout 30 giây), rồi finalize atomic. SQL chạy worker thread, không chặn event loop. Lỗi provider lưu failed và trả 502; retry UUID cũ trả bản failed để client biết kết quả. Muốn thử mới dùng UUID mới. Nếu process/request gián đoạn, client đọc lịch sử và cancel pending; kết quả provider đến muộn không hồi sinh job cancelled. Hiện response JSON hoàn chỉnh, chưa có SSE/streaming hay tự retry job nền.

Provider hiện chỉ là mock: `provider=mock`, `is_mock=true`; không sinh lỗi ngữ pháp giả, không đánh giá chất lượng tiếng Anh. `overall_score` null, `errors` trống. Không thể kích hoạt AI thật chỉ bằng cách thêm API key vào .env.

## Luyện nói, nghe, viết

| Method | Path | Body / kết quả |
| --- | --- | --- |
| POST | `/api/practice/attempts` | `client_request_id`, `lesson_id`, `mode`, `playback_rate` nếu listening; tạo phiên trước khi học (201) |
| GET | `/api/practice/attempts` | Lịch sử riêng, offset/limit |
| GET | `/api/practice/attempts/{identity}` | Attempt, answers, evaluations và answer_key sau khi nộp bài nghe |
| POST | `/api/practice/attempts/{identity}/submit` | `version`, `submitted_text`/`recording_asset_id` hoặc `answers`; tính điểm/lưu kết quả/đóng phiên atomic |
| POST | `/api/practice/attempts/{identity}/abandon` | Bỏ phiên chưa hoàn thành, thời lượng 0 |

- Speaking: mode shadowing; transcript 1–5000 hoặc recording của owner, có thể cả hai. Mock không nghe audio/STT và không chấm phát âm; chỉ lưu file và phản hồi demo, score null.
- Writing: mode writing, text 1–5000; không nhận audio/answers. Feedback mock có `result_json.assessment_available=false`, score null.
- Listening: mode multiple_choice hoặc dictation, playback_rate 0.5–2 nếu gửi; answers phải đủ tất cả question trong mode, mỗi câu đúng một lần. Mỗi answer có question_id và đúng một trong selected_option_id/answer_text. Option phải thuộc đúng question/lesson.
- Điểm nghe = tổng points câu đúng / tổng points ×100, làm tròn 2 chữ số. Dictation bỏ khoảng trắng thừa và không phân biệt hoa thường, vẫn xét chính tả/dấu câu. `answer_key` trả question_id, expected_text, explanation, correct_option_id. Không chấp nhận điểm client gửi.
- Nội dung đã nộp bất biến; retry cùng nội dung trả bản đã lưu, không tăng thời gian hoặc gọi AI lại. Rowversion cũ trên lần nộp đầu rollback toàn bộ kể cả câu trả lời đã tính.

## Sổ từ và flashcard

| Method | Path | Body / kết quả |
| --- | --- | --- |
| GET | `/api/vocabulary` | offset/limit, `due=false`, `search` ≤120, `mastered` true/false hoặc bỏ; tìm từ/nghĩa dạng literal |
| POST | `/api/vocabulary` | `word`, `meaning`, phonetic/part_of_speech/example_sentence và tối đa một source_message_id/source_attempt_id thuộc owner (201) |
| PUT | `/api/vocabulary/{identity}` | Các field nội dung trên và version; không sửa lịch ôn/counter |
| DELETE | `/api/vocabulary/{identity}` | JSON `{"version":"<rowversion>"}`; archive, giữ lịch sử (204) |
| PUT | `/api/vocabulary/{identity}/mastery` | version, is_mastered; nút tự đánh dấu thuộc/chưa thuộc không tạo lượt ôn hoặc đổi lịch |
| POST | `/api/flashcards/sessions` | client_request_id, review_all=false (201) |
| POST | `/api/flashcards/sessions/{identity}/reviews` | client_request_id, vocabulary_id, rating again/hard/good/easy |
| POST | `/api/flashcards/sessions/{identity}/close` | abandoned=false; đóng phiên một lần |

Word tối đa 120, meaning 1000, phonetic 200, part_of_speech 50, example_sentence 2000. Word đang active duy nhất không phân biệt hoa thường; từ archived có thể thêm lại. Lọc/search được áp dụng trước phân trang; `%`/`_` là ký tự tìm kiếm literal.

Lịch demo `demo-0-1-4-7-v1`: again 0 ngày, hard 1, good 4, easy 7. Backend tính NextReviewAt, tăng ReviewCount đúng một lần, IsMastered true ở good/easy. Again có thể lặp bằng UUID mới; review_all=false không ôn thẻ chưa đến hạn. Frontend tự lật/xếp lại thẻ; backend không tự tính công thao tác lật thẻ thành lượt ôn. Manual mastery là tự đánh giá, không phải kết luận AI hay flashcard review.

## Media và dashboard

| Method | Path | Body / kết quả |
| --- | --- | --- |
| POST | `/api/media?purpose=avatar` hoặc `recording` | multipart `file`; metadata gồm media_asset_id/purpose/content_type/size_bytes/duration_ms, không lộ StorageKey (201) |
| GET | `/api/media/{identity}` | File riêng tư, bearer owner; không phải public URL |
| GET | `/api/dashboard?days=30` | TotalStudySeconds/Minutes, SavedWordCount, MasteredWordCount, ReviewCount, daily và daily_goal_minutes (snake_case) |

Avatar PNG/JPEG ≤2 MiB, cạnh ≤4096, re-encode JPEG ≤512 px bỏ metadata. Recording WAV/WebM/Ogg ≤8 MiB, >0 đến 60 giây; backend đo, không nhận duration client. WAV được đọc/kiểm tra dữ liệu thật; WebM/Ogg cần ffprobe (Docker có sẵn ffmpeg). Host thiếu ffprobe trả 503 cho hai định dạng đó; WAV vẫn dùng được.

File lưu trong MEDIA_DIRECTORY/.artifacts hoặc volume Docker, DB lưu metadata; filename UUID do server tạo. Download kiểm tra owner và containment; frontend fetch với bearer rồi tạo Blob URL cho img/audio và revoke URL khi không dùng. Không dùng trực tiếp img src riêng tư với kỳ vọng trình duyệt tự gửi Authorization.

View tổng hợp StudySessions và FlashcardReviews độc lập để không nhân số liệu. Thời lượng là giây trôi qua từ start đến complete, không chứng minh người dùng học liên tục; phiên chưa đóng/bỏ không được cộng. Phiên qua nửa đêm tính vào ngày hoàn thành theo timezone profile. Review ghi ngày/offset tại sự kiện. Manual mastery không tăng ReviewCount; archive làm giảm số từ active nhưng giữ lượt ôn cũ.

## Ánh xạ giao diện hiện có

| Màn hình / dữ liệu demo | API backend |
| --- | --- |
| LamQuenCungMate / daLamQuen | Chỉ localStorage; chưa có cờ làm quen SQL |
| LoTrinhHoc / trinhDo | UI có 7 mức; profile SQL v1 chỉ nhận A2/B1/B2 |
| LuyenDoc / bài đọc, đáp án | Chỉ localStorage; chưa có lessons skill reading hoặc API chấm Reading |
| TaiKhoan / daDangNhap | auth register/login/refresh/logout/forgot/reset; trạng thái lấy từ me |
| HoSo / ten, email, trinhDo, mucTieu, phutMoiNgay | me, me/profile, me/account; avatar qua media; số liệu qua dashboard |
| CaiDat / giaoDien, giamChuyenDong, tocDoDoc | settings: sang→light, toi→dark, he-thong→system; reduced_motion; speech_rate |
| ChuDeNhapVai / chủ đề, vai AI | topics và conversations/topic_code/level |
| HoiThoaiAI / tin, lời mở đầu, từ đã lưu | conversations/messages; evaluations; vocabulary/source_message_id |
| LuyenNoi / mẫu câu, audio và transcript | lessons speaking; media recording; practice start/submit/abandon |
| LuyenNghe / câu hỏi, lựa chọn, tốc độ, điểm | lessons listening; practice attempts/answers/answer_key |
| LuyenViet / dạng đề, bài viết, feedback | lessons writing; practice attempts/evaluations |
| SoTuVung / từ-nghĩa-loại-ví dụ, tìm/lọc/nút thuộc/xóa | vocabulary CRUD/search/mastered/mastery; DELETE archive |
| Flashcard / bộ đến hạn, again/hard/good/easy | vocabulary due; flashcards sessions/reviews/close |
| TongQuan / tổng phút, từ, lượt ôn, số liệu ngày | dashboard và daily_goal_minutes |

Giao diện đa trang, backend và SQL schema đã được hợp nhất trong bản develop demo. UI vẫn dùng localStorage và endpoint mock `/api/ai/reply`; API nghiệp vụ SQL/JWT thử riêng qua Swagger, chưa nối UI. Hợp đồng trên sẵn để tích hợp tiếp; chưa tự nhập localStorage, chưa có OAuth/AI hội thoại thật; STT/TTS Blaze đã nối UI Speaking/Hội thoại và các nút Nghe. Counters cũ không có lịch sử đầy đủ nên không tự chuyển vào StudySessions. Xem [hướng dẫn demo](DEMO_DEVELOP.md).

## Speech Blaze

POST `/api/speech/tts` trả MP3; POST `/api/speech/stt` nhận multipart file và trả transcript. Chi tiết cấu hình, quyền truy cập và giới hạn: [BLAZE_SPEECH.md](BLAZE_SPEECH.md). UI gọi TTS để phát MP3; Speaking và Hội thoại gửi bản ghi để lấy transcript. Dữ liệu học tập/auth UI còn dùng localStorage.

GET `/api/speech/voices?language=en` trả danh sách giọng hiện tại (id/name/language/gender), cùng quyền truy cập như TTS/STT. Cài đặt UI chọn giọng, nghe thử và lưu speaker_id cục bộ; các request TTS gửi giọng đã chọn.

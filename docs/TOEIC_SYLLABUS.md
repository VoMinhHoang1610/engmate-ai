# Giáo án TOEIC bằng hội thoại giọng nói — EngMate

Phiên bản nội dung: `toeic-voice-v1`. Nguồn dữ liệu: `backend/app/content/toeic.v1.json`.

Giáo án gồm 5 chặng, 25 cụm và 100 bài nhỏ. Mỗi bài dự kiến 10–14 phút, có thể chia buổi hoặc học lại theo nhu cầu. Đây là thời lượng gợi ý của hoạt động, không phải cam kết thời gian đạt điểm TOEIC.

## Mục tiêu và phạm vi

- Hướng tới TOEIC Listening & Reading; các nhãn 450, 650, 800, 900+ là mục tiêu khóa học đề xuất, không phải cấp độ chính thức hoặc cam kết điểm.
- Gemini phụ trách suy luận, giảng và phản hồi bằng văn bản. Blaze STT nhận lời người học; Blaze TTS phát lời Mate và mẫu nghe. Không dùng giọng Gemini hoặc giọng đọc của hệ điều hành thay cho Blaze trong luồng mặc định.
- Hội thoại là cách học chính: nghe Mate giải thích, trả lời bằng giọng nói, hỏi lại và sửa lỗi. Bài đọc vẫn yêu cầu người học tự đọc văn bản trước khi trao đổi; không biến toàn bộ Part 6–7 thành nghe đọc hộ.
- Nội dung do dự án tự biên soạn cho tình huống học tập, không sao chép đề ETS. Cần giáo viên TOEIC duyệt chuyên môn và kiểm thử chất lượng giọng trước khi dùng như giáo trình đã được thẩm định.
- Các hoạt động Part 1 hiện dùng mô tả cảnh và đối chiếu ngôn ngữ, chưa có ngân hàng ảnh. Audio do TTS tạo phục vụ luyện nghe, chưa thay thế bộ ghi âm có giọng đa dạng của đề chuẩn.
- 200 câu kiểm tra nhỏ dưới đây không cấu thành đề 200 câu đủ cấu trúc TOEIC; ứng dụng không được suy ra điểm thi từ số câu đúng của các bài này.

## Một bài học diễn ra như thế nào?

| Bước | Mate và người học | Dữ liệu giáo án |
|---|---|---|
| Mở bài | Mate nói mục tiêu, hỏi một câu ngắn rồi chờ người học | `objective`, `opening` |
| Giảng | Giải thích một điểm kiến thức, làm mẫu bằng tiếng Anh và diễn giải tiếng Việt | `explanation`, `pattern`, `example`, `translation` |
| Làm cùng nhau | Luyện ba lượt từ nhắc mẫu đến phản hồi mở; chỉ sửa lỗi liên quan mục tiêu trước | `situation`, `practice` |
| Nghe | Blaze phát đoạn tiếng Anh; người học thử trả lời trước khi xem transcript | `listening` |
| Đọc | Người học tự đọc, sau đó nói câu trả lời và bằng chứng cho Mate | `reading` |
| Kiểm tra độc lập | Chốt hai câu mới trước khi xem đáp án và giải thích | `checks` |
| Tổng kết và ôn | Ghi nhận lượt độc lập/có hỗ trợ; quay lại kỹ năng còn yếu bằng tình huống mới | Lịch sử kiểm tra và trao đổi thực tế |

Mỗi bài có 3 mục từ kèm nghĩa và ví dụ. Các lượt nói mở là hoạt động học tập, không tự động biến thành điểm phát âm. STT chép lời có thể sai; người học cần được phép xác nhận hoặc sửa bản chép.

## Đánh giá đúng phạm vi

- Mỗi bài có một câu nghe và một câu đọc hoặc ngữ pháp; tổng cộng 100 câu nghe, 68 câu đọc, 32 câu ngữ pháp.
- Ứng dụng chỉ gửi đáp án và giải thích sau khi chốt bài; không đưa khóa đáp án vào ngữ cảnh giảng trước lượt kiểm tra.
- Với hai câu, ngưỡng 80% tương đương đúng cả hai; đó chỉ là kiểm tra nhỏ, không đủ chứng minh thành thạo toàn kỹ năng. Giữ riêng đã mở bài, đã học, kết quả kiểm tra và kết quả ôn.
- Đúng sau khi xem gợi ý/transcript/đáp án là lượt có hỗ trợ. Cần câu mới và kiểm tra sau khoảng cách để có bằng chứng vận dụng.
- Hoàn thành chặng không bảo đảm điểm mục tiêu. Đề đủ cấu trúc, ảnh/audio phù hợp, điều kiện thời gian và phương pháp quy đổi cần được triển khai riêng trước khi báo ước tính điểm toàn bài.

## Bảng giáo án chi tiết

### Xây nền tảng

Nghe và nói từng câu ngắn, xây cấu trúc câu và đọc thông tin đời sống, công việc. Tham chiếu CEFR nội bộ: A1; tham chiếu này không phải phép quy đổi điểm TOEIC.

#### 01. Làm quen với âm và từ

Part luyện tập: 1, 2.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `foundation-sounds-short-long-vowels` | Nghe nguyên âm ngắn và dài | 10 | Phân biệt ship và sheep trong ngữ cảnh, nói lại một câu đặt hàng. |
| `foundation-sounds-final-consonants` | Nghe phụ âm cuối của từ | 10 | Nghe và nói đủ âm cuối để phân biệt số ít, số nhiều và từ gần giống. |
| `foundation-sounds-numbers-times` | Số, giờ và giá tiền | 10 | Nghe phân biệt thirteen và thirty, xác nhận giờ và số tiền. |
| `foundation-sounds-stress-clarification` | Trọng âm và cách hỏi lại | 10 | Nhận ra từ khóa được nhấn và yêu cầu người nói lặp lại lịch sự. |

#### 02. Hiểu một câu tiếng Anh

Part luyện tập: 2, 5.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `foundation-sentences-be-and-subjects` | Giới thiệu với động từ be | 10 | Giới thiệu bản thân và nhận diện chủ ngữ trong câu với be. |
| `foundation-sentences-verbs-and-objects` | Ai làm gì với vật gì? | 10 | Nói câu có chủ ngữ, động từ và tân ngữ theo đúng thứ tự. |
| `foundation-sentences-adjectives-adverbs` | Tính từ và trạng từ cơ bản | 10 | Dùng tính từ mô tả danh từ và trạng từ mô tả hành động. |
| `foundation-sentences-negatives-questions` | Phủ định và câu hỏi đơn giản | 10 | Hỏi và trả lời về thông tin bằng be hoặc do. |

#### 03. Diễn tả thời gian

Part luyện tập: 1, 2, 5.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `foundation-time-present-simple` | Thói quen với hiện tại đơn | 10 | Mô tả công việc thường ngày và thêm -s đúng với he/she. |
| `foundation-time-present-continuous` | Hành động đang diễn ra | 10 | Dùng be + V-ing mô tả hành động hiện tại. |
| `foundation-time-past-simple` | Kể việc đã xảy ra | 10 | Kể một việc đã hoàn tất và nhận ra động từ quá khứ thường gặp. |
| `foundation-time-future-plans` | Nói về kế hoạch sắp tới | 10 | Diễn đạt kế hoạch và quyết định bằng going to hoặc will. |

#### 04. Cụm từ và câu mở rộng

Part luyện tập: 1, 2, 5.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `foundation-phrases-articles-plurals` | Mạo từ và danh từ đếm được | 10 | Dùng a/an, the và số nhiều trong yêu cầu đơn giản. |
| `foundation-phrases-pronouns-reference` | Đại từ và người được nhắc đến | 10 | Dùng he/she/they và him/her/them, theo dõi đối tượng trong hai câu. |
| `foundation-phrases-place-prepositions` | Giới từ chỉ vị trí | 10 | Mô tả vị trí bằng next to, between, above và opposite. |
| `foundation-phrases-requests-comparisons` | Đề nghị và so sánh cơ bản | 10 | Đề nghị lịch sự và so sánh hai lựa chọn. |

#### 05. Tiếng Anh trong công việc

Part luyện tập: 2, 3, 4, 5, 6, 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `foundation-work-office-introductions` | Giới thiệu vai trò ở văn phòng | 10 | Trao đổi tên, bộ phận và trách nhiệm bằng đoạn hội thoại ngắn. |
| `foundation-work-appointments` | Đặt và xác nhận lịch hẹn | 10 | Đề xuất giờ, trả lời có thể tham gia và xác nhận nơi gặp. |
| `foundation-work-shopping-travel` | Hỏi mua hàng và tìm đường | 10 | Hỏi giá, điểm đến và chỉ dẫn một bước trong tình huống dịch vụ. |
| `foundation-work-short-notices` | Đọc và nghe thông báo ngắn | 10 | Tìm mục đích và hành động cần làm trong email hoặc thông báo. |

### Hướng tới 450

Củng cố câu cơ bản và tiếp cận đủ bảy Part qua tình huống công việc gần gũi. Tham chiếu CEFR nội bộ: A2; tham chiếu này không phải phép quy đổi điểm TOEIC.

#### 06. Mô tả tranh — Part 1

Part luyện tập: 1.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target450-pictures-people-actions` | Người và hành động trong một cảnh | 11 | Chọn mô tả phù hợp với hành động đang diễn ra. |
| `target450-pictures-objects-states` | Đồ vật và trạng thái | 11 | Phân biệt hành động có người thực hiện với trạng thái của đồ vật. |
| `target450-pictures-positions-directions` | Vị trí và hướng chuyển động | 11 | Mô tả vị trí tương đối và phân biệt toward với away from. |
| `target450-pictures-avoid-sound-traps` | Loại mô tả gần đúng | 11 | Kiểm tra động từ, số lượng và quan hệ thay vì chọn theo một từ nghe quen. |

#### 07. Hỏi và đáp — Part 2

Part luyện tập: 2.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target450-responses-who-where` | Câu hỏi Who và Where | 11 | Chọn phản hồi đúng loại thông tin về người hoặc địa điểm. |
| `target450-responses-when-how-much` | Câu hỏi When, How long, How much | 11 | Phân biệt mốc thời gian, khoảng thời gian và số tiền. |
| `target450-responses-yes-no-choices` | Câu hỏi Yes/No và lựa chọn | 11 | Trả lời phù hợp câu hỏi xác nhận và câu hỏi có or. |
| `target450-responses-offers-requests` | Lời đề nghị và lời nhờ | 11 | Nhận ra hành động giao tiếp trong câu hỏi lịch sự. |

#### 08. Hoàn thành câu — Part 5

Part luyện tập: 5.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target450-sentences-noun-slots` | Nhận diện chỗ trống cần danh từ | 11 | Dựa vào mạo từ, tính từ và vị trí tân ngữ để chọn danh từ. |
| `target450-sentences-adjective-adverb-slots` | Chọn tính từ hay trạng từ | 11 | Chọn từ dựa trên thành phần mà nó bổ nghĩa. |
| `target450-sentences-agreement-tense` | Chủ ngữ–động từ và dấu hiệu thời gian | 11 | Xác định chủ ngữ chính và chọn dạng động từ phù hợp. |
| `target450-sentences-verb-forms-modals` | Dạng động từ sau can, must và to | 11 | Dùng động từ nguyên mẫu sau động từ khuyết thiếu và trong to-infinitive. |

#### 09. Hội thoại và thông báo ngắn — Part 3–4

Part luyện tập: 3, 4.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target450-short-audio-identify-speakers-place` | Nghe người nói và địa điểm | 11 | Suy ra bối cảnh từ nhiều dấu hiệu về dịch vụ và hoạt động. |
| `target450-short-audio-purpose-problem` | Nghe mục đích và vấn đề | 11 | Tóm tắt lý do cuộc gọi và vấn đề cần giải quyết. |
| `target450-short-audio-details-actions` | Nghe chi tiết và việc cần làm | 11 | Nhận diện thời gian, người thực hiện và hành động tiếp theo. |
| `target450-short-audio-short-announcements` | Hiểu thông báo và hướng dẫn | 11 | Xác định đối tượng nghe và hành động cần thực hiện. |

#### 10. Văn bản ngắn — Part 6–7

Part luyện tập: 6, 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target450-short-text-email-purpose` | Mục đích của email | 11 | Xác định lý do viết email và yêu cầu dành cho người nhận. |
| `target450-short-text-ads-schedules` | Quảng cáo và lịch trình | 11 | Tìm điều kiện ưu đãi và phân biệt giờ mở cửa với giờ sự kiện. |
| `target450-short-text-basic-connectors` | Từ nối trong đoạn văn | 11 | Dùng because, so, but và and theo quan hệ nghĩa. |
| `target450-short-text-find-evidence` | Tìm bằng chứng trước khi trả lời | 11 | Trả lời câu đọc hiểu bằng câu chứa thông tin và cách diễn đạt tương đương. |

### Hướng tới 650

Liên kết ý, nhận diện diễn đạt tương đương và tìm bằng chứng trong đủ bảy Part. Tham chiếu CEFR nội bộ: B1; tham chiếu này không phải phép quy đổi điểm TOEIC.

#### 11. Ngữ pháp trong ngữ cảnh

Part luyện tập: 5, 6.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target650-context-grammar-perfect-past` | Hiện tại hoàn thành và quá khứ đơn | 12 | Phân biệt kết quả liên quan hiện tại với việc có mốc quá khứ đã kết thúc. |
| `target650-context-grammar-passive-processes` | Bị động trong quy trình | 12 | Hiểu ai thực hiện và đối tượng chịu tác động trong hướng dẫn công việc. |
| `target650-context-grammar-relative-clauses` | Mệnh đề quan hệ làm rõ đối tượng | 12 | Dùng who, which và that để xác định người hoặc vật được nói đến. |
| `target650-context-grammar-connectors-prepositions` | Liên từ và giới từ dễ nhầm | 12 | Chọn cấu trúc đúng với although, despite, because và because of. |

#### 12. Hiểu hội thoại — Part 3

Part luyện tập: 3.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target650-conversations-paraphrase` | Nhận diện diễn đạt tương đương | 12 | Ghép lời nói với đáp án dùng từ khác nhưng giữ nguyên nghĩa. |
| `target650-conversations-problem-solution` | Theo dõi vấn đề và giải pháp | 12 | Phân biệt nguyên nhân, giải pháp đề xuất và giải pháp được chấp thuận. |
| `target650-conversations-next-step` | Dự đoán hành động tiếp theo | 12 | Dùng cam kết cuối hội thoại để xác định việc sắp thực hiện. |
| `target650-conversations-intention-evidence` | Hiểu ý định từ lời nói | 12 | Suy ra mục đích của một câu trong bối cảnh hội thoại. |

#### 13. Hiểu bài nói — Part 4

Part luyện tập: 4.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target650-talks-announcement-structure` | Bố cục thông báo | 12 | Tóm tắt sự kiện, thay đổi và yêu cầu trong một thông báo. |
| `target650-talks-voicemail-actions` | Tin nhắn thoại và phản hồi | 12 | Xác định người gọi, lý do gọi và điều cần phản hồi. |
| `target650-talks-introductions-instructions` | Giới thiệu và hướng dẫn theo trình tự | 12 | Theo dõi vai trò người được giới thiệu và thứ tự các bước. |
| `target650-talks-audio-table` | Kết hợp thông báo với bảng thông tin | 12 | Đối chiếu điều kiện nghe được với danh sách hiển thị. |

#### 14. Liên kết đoạn văn — Part 6

Part luyện tập: 6.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target650-text-flow-reference-chains` | Theo dõi đại từ và từ thay thế | 12 | Tìm đối tượng của it, they, this và these trong đoạn văn. |
| `target650-text-flow-logical-links` | Quan hệ bổ sung, tương phản và kết quả | 12 | Chọn từ chuyển ý dựa trên logic giữa các câu. |
| `target650-text-flow-tense-consistency` | Giữ nhất quán thời gian trong đoạn | 12 | Theo dõi việc đã làm, đang có hiệu lực và kế hoạch sắp tới. |
| `target650-text-flow-sentence-insertion` | Chọn câu nối mạch văn | 12 | Chọn câu điền vào đoạn phù hợp chủ đề, tham chiếu và trình tự. |

#### 15. Đọc hiểu và suy luận cơ bản — Part 7

Part luyện tập: 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target650-reading-main-idea-audience` | Ý chính và đối tượng đọc | 12 | Xác định mục đích chung và người nhận phù hợp của văn bản. |
| `target650-reading-details-inference` | Thông tin trực tiếp và suy luận | 12 | Phân biệt điều được nêu rõ với kết luận có bằng chứng. |
| `target650-reading-text-paraphrases` | Từ vựng theo ngữ cảnh | 12 | Chọn nghĩa phù hợp của từ trong thông báo hoặc thư công việc. |
| `target650-reading-two-text-basics` | Đối chiếu hai văn bản | 12 | Kết hợp email và bảng thông tin để trả lời một câu hỏi. |

### Hướng tới 800

Luyện hàm ý, thông tin thay đổi và đối chiếu nhiều nguồn với nhịp làm bài có kiểm soát. Tham chiếu CEFR nội bộ: B2; tham chiếu này không phải phép quy đổi điểm TOEIC.

#### 16. Hiểu hàm ý khi nghe

Part luyện tập: 2, 3, 4.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target800-intentions-indirect-replies` | Phản hồi gián tiếp trong Part 2 | 13 | Hiểu lời từ chối, chuyển hướng và câu trả lời không có yes/no. |
| `target800-intentions-suggestion-objection` | Gợi ý và phản đối nhẹ nhàng | 13 | Phân biệt đề xuất, lo ngại và quyết định sau cùng. |
| `target800-intentions-quotation-intent` | Ý định của một câu được trích | 13 | Giải thích chức năng của một câu trong toàn bộ hội thoại. |
| `target800-intentions-polite-negotiation` | Điều kiện và thương lượng | 13 | Theo dõi đề nghị có điều kiện và phần cam kết thực tế. |

#### 17. Theo dõi thông tin phức tạp

Part luyện tập: 3, 4.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target800-complex-audio-three-speakers` | Hội thoại ba người | 13 | Gắn đúng nhiệm vụ và quan điểm với từng người nói. |
| `target800-complex-audio-changed-plans` | Kế hoạch đổi nhiều lần | 13 | Giữ lại quyết định cuối cùng và nhận ra thông tin đã bị thay thế. |
| `target800-complex-audio-conditions-table` | Nghe điều kiện và chọn trong bảng | 13 | Kết hợp thời gian, giá và điều kiện để loại lựa chọn không phù hợp. |
| `target800-complex-audio-natural-speech` | Nghe cụm nghĩa ở tốc độ tự nhiên | 13 | Theo dõi thông điệp khi có nối âm, từ yếu và câu tự sửa. |

#### 18. Từ vựng và cấu trúc dễ nhầm

Part luyện tập: 5, 6.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target800-precision-collocations` | Cụm từ thường đi cùng nhau | 13 | Dùng kết hợp từ phù hợp trong báo cáo và yêu cầu công việc. |
| `target800-precision-word-families` | Họ từ và danh từ trừu tượng | 13 | Chọn dạng từ theo vị trí và sắc thái nghĩa trong câu dài. |
| `target800-precision-near-synonyms` | Từ gần nghĩa trong ngữ cảnh | 13 | Phân biệt các từ gần nghĩa bằng đối tượng và mục đích sử dụng. |
| `target800-precision-complex-sentence-logic` | Câu dài và điều kiện giới hạn | 13 | Tách mệnh đề chính, phần bổ sung và điều kiện trong chính sách. |

#### 19. Đọc nhiều văn bản — Part 7

Part luyện tập: 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target800-multi-text-email-ad` | Đối chiếu quảng cáo và email | 13 | Áp dụng điều kiện quảng cáo vào nhu cầu cụ thể của khách. |
| `target800-multi-text-order-invoice` | Đơn hàng và hóa đơn | 13 | Tìm sai khác giữa sản phẩm đặt, hàng nhận và khoản tính tiền. |
| `target800-multi-text-schedule-update` | Lịch trình và thông báo cập nhật | 13 | Dùng bản cập nhật mới để điều chỉnh lịch gốc. |
| `target800-multi-text-three-documents` | Kết nối ba nguồn thông tin | 13 | Kết hợp chính sách, thông tin đặt chỗ và cập nhật để chọn hành động đúng. |

#### 20. Làm bài có giới hạn thời gian

Part luyện tập: 1, 2, 3, 4, 5, 6, 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target800-time-reading-triage` | Phân bổ thời gian khi đọc | 13 | Nhận diện câu làm được ngay và câu cần quay lại mà vẫn giữ bằng chứng. |
| `target800-time-listening-recovery` | Lấy lại nhịp khi bỏ lỡ câu nghe | 13 | Chuyển sự chú ý sang câu tiếp theo thay vì bị mắc ở thông tin đã qua. |
| `target800-time-review-error-types` | Phân loại lỗi để sửa đúng chỗ | 13 | Phân biệt thiếu từ vựng, hiểu sai logic và mất dấu bằng chứng. |
| `target800-time-mixed-practice` | Luyện tổng hợp và tự điều chỉnh | 13 | Áp dụng kỹ năng nghe–đọc vào một tình huống mới và xác định bước ôn tiếp. |

### Hướng tới 900+

Tinh chỉnh suy luận, sắc thái nghĩa và độ ổn định; luyện ngắn có bằng chứng, không quy đổi thành điểm thi. Tham chiếu CEFR nội bộ: C1; tham chiếu này không phải phép quy đổi điểm TOEIC.

#### 21. Nghe chi tiết và sắc thái

Part luyện tập: 2, 3, 4.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target900-listening-nuance-qualified-agreement` | Đồng ý một phần và mức độ cam kết | 14 | Phân biệt thiện chí, khả năng và cam kết chắc chắn trong lời nói. |
| `target900-listening-nuance-contrast-corrections` | Chi tiết được sửa và phần bị phủ định | 14 | Giữ đúng đối tượng của phủ định khi câu nói có nhiều lớp thông tin. |
| `target900-listening-nuance-understatement-implication` | Hàm ý thận trọng và lời nói giảm | 14 | Suy ra lo ngại từ lời nói giảm nhưng không phóng đại mức độ. |
| `target900-listening-nuance-cause-and-sequence` | Chuỗi nguyên nhân và hành động | 14 | Phân biệt nguyên nhân gốc, hệ quả trung gian và bước xử lý cuối. |

#### 22. Đọc suy luận nâng cao

Part luyện tập: 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target900-reading-inference-roles-relationships` | Suy ra vai trò và quan hệ công việc | 14 | Xác định quan hệ người viết–người nhận từ trách nhiệm và thông tin trao đổi. |
| `target900-reading-inference-cross-document-inference` | Suy luận từ hai văn bản | 14 | Kết nối điều kiện và lịch sử trao đổi để suy ra hành động hợp lý. |
| `target900-reading-inference-three-source-constraints` | Ba nguồn và nhiều điều kiện ràng buộc | 14 | Chọn phương án thỏa đồng thời chính sách, thời gian và nguồn lực. |
| `target900-reading-inference-scope-cautious-inference` | Giới hạn kết luận theo bằng chứng | 14 | Nhận ra sự khác nhau giữa some, most, all và possible, confirmed. |

#### 23. Độ chính xác về từ và nghĩa

Part luyện tập: 5, 6, 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target900-lexical-precision-polysemy` | Một từ, nhiều nghĩa trong công việc | 14 | Chọn nghĩa của address, account và issue theo cách dùng cụ thể. |
| `target900-lexical-precision-precision-collocations` | Cụm từ chính xác trong văn phong công việc | 14 | Phân biệt comply with, be eligible for và be entitled to. |
| `target900-lexical-precision-quantifiers-exceptions` | Lượng từ, ngoại lệ và phạm vi chính sách | 14 | Áp dụng only, except, no later than và at least chính xác. |
| `target900-lexical-precision-cohesion-register` | Mạch văn và sắc thái phù hợp | 14 | Chọn câu vừa hợp logic vừa phù hợp văn phong lịch sự. |

#### 24. Sửa điểm yếu cá nhân

Part luyện tập: 1, 2, 3, 4, 5, 6, 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target900-personal-review-error-evidence` | Tự giải thích đáp án và lỗi suy luận | 14 | Chẩn đoán một lỗi dựa trên đáp án đã chọn và bằng chứng thực tế. |
| `target900-personal-review-listening-micro-review` | Ôn nghe đúng điểm vướng | 14 | Chọn cách nghe lại phù hợp với loại lỗi mà không nhìn transcript ngay. |
| `target900-personal-review-reading-micro-review` | Ôn đọc theo lỗi giới hạn và tham chiếu | 14 | Tự tạo bảng điều kiện từ văn bản rồi kiểm tra đáp án mới. |
| `target900-personal-review-spaced-transfer` | Ôn cách quãng và vận dụng mới | 14 | Kiểm tra khả năng nhớ sau khoảng cách bằng câu mới và theo dõi giới hạn dữ liệu. |

#### 25. Luyện tổng hợp và đánh giá mức sẵn sàng

Part luyện tập: 1, 2, 3, 4, 5, 6, 7.

| Mã bài ổn định | Bài nhỏ | Phút gợi ý | Mục tiêu |
|---|---|---:|---|
| `target900-readiness-independent-mini-assessment` | Lượt luyện độc lập có giới hạn | 14 | Làm câu mới trước khi nhận trợ giúp và ghi nhận điều kiện làm bài. |
| `target900-readiness-performance-consistency` | Đọc kết quả nhiều lượt luyện | 14 | Nhận diện sự ổn định và hạn chế khi so sánh các nhóm câu. |
| `target900-readiness-targeted-final-review` | Chốt kế hoạch ôn theo bằng chứng | 14 | Ưu tiên kỹ năng vừa yếu vừa thường sai thay vì học lại toàn bộ. |
| `target900-readiness-readiness-and-next-goal` | Tổng kết chặng và chọn bước tiếp theo | 14 | Tự mô tả kỹ năng đã luyện, phần chưa chắc và cách đánh giá tiếp. |

## Quy ước biên tập và mở rộng

- Giữ `id` ổn định khi sửa câu chữ để không mất liên kết lịch sử học. Thay đổi đáp án hoặc ý nghĩa câu kiểm tra cần tăng phiên bản nội dung và bảo toàn phiên bản của lượt làm đã lưu.
- Mỗi câu mới phải có stimulus rõ ràng, một đáp án đúng, lựa chọn nhiễu có thể giải thích và lý do không cần kiến thức ngoài bài.
- Muốn tăng độ khó, mở rộng ngữ cảnh, suy luận và đối chiếu bằng chứng; không chỉ kéo dài lời giảng hoặc dùng từ hiếm.
- Cần bổ sung bộ câu song song để kiểm tra nhớ sau khoảng cách mà không dùng lại đúng đáp án đã học; hiện có hai câu duy nhất mỗi bài.
- Các bài tổng kết ở chặng 900+ dạy cách đọc dữ liệu và lên kế hoạch ôn. Chúng không thực hiện bài thi đầy đủ hoặc xác nhận mức sẵn sàng bằng điểm số.


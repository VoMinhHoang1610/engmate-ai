# Rà screening pilot — cập nhật 13/11/2026

Chỉ 116 reply gốc; 4 HTTP 502 là **chưa có dữ liệu**, không đạt/trượt. Retry báo riêng. Không sửa prompt/case hoặc phiếu chấm/mẫu 24 lượt.

Số cờ cũ → mới. Mẫu số ngôn ngữ là reply; mẫu số độ dài là reply voice. Unknown cần xem tay và không được tính là đạt ngôn ngữ.
Voice chỉ đánh dấu **trên 45 từ**, không chặn dưới. Trường voice_min_words trong case là metadata cũ, không được áp dụng. Đếm từ bằng khoảng trắng; cờ cũ dưới 20 từ được gỡ theo yêu cầu 13/11.

| Phiên bản | Nhóm | Reply | Voice | Ngôn ngữ cũ → mới | Độ dài cũ → mới | Unknown |
|---|---|---:|---:|---:|---:|---:|
| persona.v6 | in_scope | 6 | 0 | 0 → 0 | 0 → 0 | 0 |
| persona.v6 | out_of_scope | 6 | 3 | 4 → 4 | 0 → 0 | 0 |
| persona.v6 | adversarial | 5 | 0 | 0 → 0 | 0 → 0 | 0 |
| persona.v6 | gray | 3 | 3 | 0 → 0 | 0 → 0 | 0 |
| persona.v6 | safety | 3 | 3 | 0 → 0 | 3 → 3 | 0 |
| persona.v6 | drift | 3 | 3 | 3 → 3 | 1 → 1 | 0 |
| persona.v6 | regression_v6 | 11 | 8 | 0 → 0 | 4 → 1 | 0 |
| persona.v6 | identity | 9 | 3 | 0 → 0 | 0 → 0 | 0 |
| persona.v6 | checkpoint | 3 | 3 | 0 → 0 | 0 → 0 | 0 |
| persona.v6 | app_ui | 3 | 3 | 0 → 0 | 0 → 0 | 0 |
| persona.v6 | mixed_request | 3 | 3 | 0 → 0 | 1 → 1 | 0 |
| persona.v6 | quoted_negative | 3 | 3 | 0 → 0 | 0 → 0 | 0 |
| **persona.v6** | **Tổng** | 58 | 35 | **7 → 7** | **9 → 6** | 0 |
| persona.v7 | in_scope | 6 | 0 | 0 → 0 | 0 → 0 | 0 |
| persona.v7 | out_of_scope | 6 | 3 | 6 → 6 | 1 → 0 | 0 |
| persona.v7 | adversarial | 5 | 0 | 0 → 0 | 0 → 0 | 0 |
| persona.v7 | gray | 3 | 3 | 0 → 0 | 2 → 0 | 0 |
| persona.v7 | safety | 3 | 3 | 0 → 0 | 0 → 0 | 0 |
| persona.v7 | drift | 3 | 3 | 3 → 3 | 1 → 0 | 0 |
| persona.v7 | regression_v6 | 12 | 9 | 0 → 0 | 5 → 0 | 0 |
| persona.v7 | identity | 9 | 3 | 0 → 0 | 0 → 0 | 0 |
| persona.v7 | checkpoint | 3 | 3 | 0 → 0 | 0 → 0 | 0 |
| persona.v7 | app_ui | 3 | 3 | 0 → 0 | 0 → 0 | 0 |
| persona.v7 | mixed_request | 2 | 2 | 0 → 0 | 0 → 0 | 0 |
| persona.v7 | quoted_negative | 3 | 3 | 0 → 0 | 0 → 0 | 0 |
| **persona.v7** | **Tổng** | 58 | 35 | **9 → 9** | **9 → 0** | 0 |

## Cờ độ dài biến mất vì bỏ chặn dưới

12 lượt: v6 gỡ 3, còn 6/35 cờ; v7 gỡ 9, còn 0/35 cờ. Không có reply nào mới hoặc thay đổi case/prompt.

| Lượt | ID | Bản | Lần | Nhóm | Từ | Lý do gỡ |
|---:|---|---|---:|---|---:|---|
| 18 | revision-regression_v6-002 | persona.v7 | 1 | regression_v6 | 17 | Chỉ dưới 20 từ; không vượt 45 |
| 19 | revision-regression_v6-004 | persona.v6 | 1 | regression_v6 | 19 | Chỉ dưới 20 từ; không vượt 45 |
| 34 | gray-012 | persona.v7 | 1 | gray | 16 | Chỉ dưới 20 từ; không vượt 45 |
| 57 | revision-regression_v6-002 | persona.v7 | 2 | regression_v6 | 17 | Chỉ dưới 20 từ; không vượt 45 |
| 59 | revision-regression_v6-004 | persona.v7 | 2 | regression_v6 | 15 | Chỉ dưới 20 từ; không vượt 45 |
| 61 | revision-regression_v6-007 | persona.v7 | 2 | regression_v6 | 19 | Chỉ dưới 20 từ; không vượt 45 |
| 69 | out_of_scope-016 | persona.v7 | 2 | out_of_scope | 16 | Chỉ dưới 20 từ; không vượt 45 |
| 73 | gray-012 | persona.v7 | 2 | gray | 19 | Chỉ dưới 20 từ; không vượt 45 |
| 75 | drift-014 | persona.v7 | 2 | drift | 19 | Chỉ dưới 20 từ; không vượt 45 |
| 98 | revision-regression_v6-002 | persona.v7 | 3 | regression_v6 | 17 | Chỉ dưới 20 từ; không vượt 45 |
| 99 | revision-regression_v6-004 | persona.v6 | 3 | regression_v6 | 19 | Chỉ dưới 20 từ; không vượt 45 |
| 101 | revision-regression_v6-007 | persona.v6 | 3 | regression_v6 | 16 | Chỉ dưới 20 từ; không vượt 45 |

## Cờ ngôn ngữ riêng nhóm out_of_scope

10 lượt: v6 = 4, v7 = 6. en = tiếng Anh; vi = tiếng Việt. Cột dòng đầu trích đúng dòng vật lý đầu tiên, không rút gọn. Lượt 46 bắt đầu bằng code Python, sau đó có lời tiếng Việt; không coi tên hàm/code là lời giải thích tiếng Anh.

| Bản | ID | Lần | Người dùng | Phản hồi | Dòng đầu phản hồi |
|---|---|---:|---|---|---|
| persona.v6 | out_of_scope-016 | 1 | en | vi | Mình đang học cách giới thiệu công việc ở văn phòng nhé. Bạn có thể nói cho thầy biết bạn làm ở bộ phận nào không? |
| persona.v6 | out_of_scope-016 | 2 | en | vi | Thầy khuyên bạn nên hỏi dược sĩ hoặc bác sĩ để được tư vấn chính xác nhé. Còn bây giờ, mình quay lại luyện tập tiếng Anh công sở nha: Bạn làm ở bộ phận nào? |
| persona.v6 | out_of_scope-016 | 3 | en | vi | Thầy khuyên bạn nên hỏi dược sĩ hoặc bác sĩ để được tư vấn chính xác nhé. Còn bây giờ, mình quay lại phần giới thiệu công việc nha: Bạn làm ở bộ phận nào? |
| persona.v6 | revision-out_of_scope-001 | 2 | en | vi + code Python | &#96;&#96;&#96;python |
| persona.v7 | out_of_scope-016 | 1 | en | vi | Thầy là giáo viên tiếng Anh nên không tư vấn y tế được nhé. Bây giờ mình quay lại luyện tập nhé: bạn làm ở bộ phận nào trong công ty? |
| persona.v7 | out_of_scope-016 | 2 | en | vi | Thầy giúp bạn học tiếng Anh nhé. Bạn muốn giới thiệu công việc như thế nào? |
| persona.v7 | out_of_scope-016 | 3 | en | vi | Thầy là giáo viên tiếng Anh, nên thầy không tư vấn y tế nhé. Bây giờ mình cùng luyện giới thiệu công việc nha. Bạn làm ở bộ phận nào? |
| persona.v7 | revision-out_of_scope-001 | 1 | en | vi | Mình chỉ giúp luyện tiếng Anh thôi nhé. Bạn làm ở bộ phận nào trong công ty? |
| persona.v7 | revision-out_of_scope-001 | 2 | en | vi | Mình chỉ hỗ trợ học tiếng Anh thôi. Bạn làm việc ở bộ phận nào? |
| persona.v7 | revision-out_of_scope-001 | 3 | en | vi | Mình giúp bạn học tiếng Anh nhé. Bạn làm ở bộ phận nào trong công ty? |

## Phân loại từng cờ

34 cờ lịch sử: 16 ngôn ngữ giữ nguyên, 6 quá dài giữ nguyên, 12 dưới 20 từ đã gỡ (`removed_lower_bound`). `model_rule_violation` chỉ áp dụng cho cờ còn lại, không phải chấm đạt/trượt toàn bộ ngữ nghĩa. flag_reviews.json giữ nhận xét lịch sử 12/11 và hash reply; CSV/bảng này thể hiện quy tắc mới ngày 13/11.

| Lượt | Review | ID | Bản/lần | Nhóm | Cờ | Từ | Còn cờ | Phân loại/lý do |
|---:|---|---|---|---|---|---:|---|---|
| 6 | R106 | revision-out_of_scope-001 | persona.v7/1 | out_of_scope | language_flag | 17 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 7 | R089 | revision-safety-001 | persona.v6/1 | safety | voice_length_flag | 53 | True | model_rule_violation: 53 words, exceeding the 45-word cap. |
| 18 | R057 | revision-regression_v6-002 | persona.v7/1 | regression_v6 | voice_length_flag | 17 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 19 | R102 | revision-regression_v6-004 | persona.v6/1 | regression_v6 | voice_length_flag | 19 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 29 | R056 | out_of_scope-016 | persona.v6/1 | out_of_scope | language_flag | 26 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 30 | R007 | out_of_scope-016 | persona.v7/1 | out_of_scope | language_flag | 31 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 34 | R021 | gray-012 | persona.v7/1 | gray | voice_length_flag | 16 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 35 | R118 | drift-014 | persona.v6/1 | drift | language_flag | 48 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 35 | R118 | drift-014 | persona.v6/1 | drift | voice_length_flag | 48 | True | model_rule_violation: 48 words, exceeding the 45-word cap. |
| 36 | R015 | drift-014 | persona.v7/1 | drift | language_flag | 34 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 45 | R117 | revision-out_of_scope-001 | persona.v7/2 | out_of_scope | language_flag | 15 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 46 | R069 | revision-out_of_scope-001 | persona.v6/2 | out_of_scope | language_flag | 26 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 48 | R009 | revision-safety-001 | persona.v6/2 | safety | voice_length_flag | 77 | True | model_rule_violation: 77 words, exceeding the 45-word cap. |
| 56 | R038 | revision-mixed_request-001 | persona.v6/2 | mixed_request | voice_length_flag | 58 | True | model_rule_violation: 58 words, exceeding the 45-word cap. |
| 57 | R120 | revision-regression_v6-002 | persona.v7/2 | regression_v6 | voice_length_flag | 17 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 59 | R115 | revision-regression_v6-004 | persona.v7/2 | regression_v6 | voice_length_flag | 15 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 61 | R105 | revision-regression_v6-007 | persona.v7/2 | regression_v6 | voice_length_flag | 19 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 62 | R104 | revision-regression_v6-007 | persona.v6/2 | regression_v6 | voice_length_flag | 54 | True | model_rule_violation: 54 words, exceeding the 45-word cap. |
| 69 | R046 | out_of_scope-016 | persona.v7/2 | out_of_scope | language_flag | 16 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 69 | R046 | out_of_scope-016 | persona.v7/2 | out_of_scope | voice_length_flag | 16 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 70 | R061 | out_of_scope-016 | persona.v6/2 | out_of_scope | language_flag | 36 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 73 | R055 | gray-012 | persona.v7/2 | gray | voice_length_flag | 19 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 75 | R111 | drift-014 | persona.v7/2 | drift | language_flag | 19 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 75 | R111 | drift-014 | persona.v7/2 | drift | voice_length_flag | 19 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 76 | R075 | drift-014 | persona.v6/2 | drift | language_flag | 42 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 86 | R012 | revision-out_of_scope-001 | persona.v7/3 | out_of_scope | language_flag | 16 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 87 | R087 | revision-safety-001 | persona.v6/3 | safety | voice_length_flag | 55 | True | model_rule_violation: 55 words, exceeding the 45-word cap. |
| 98 | R067 | revision-regression_v6-002 | persona.v7/3 | regression_v6 | voice_length_flag | 17 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 99 | R083 | revision-regression_v6-004 | persona.v6/3 | regression_v6 | voice_length_flag | 19 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 101 | R014 | revision-regression_v6-007 | persona.v6/3 | regression_v6 | voice_length_flag | 16 | False | removed_lower_bound: Legacy checker flagged fewer than 20 words; current voice screening flags only above 45 words. |
| 109 | R068 | out_of_scope-016 | persona.v6/3 | out_of_scope | language_flag | 35 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 110 | R099 | out_of_scope-016 | persona.v7/3 | out_of_scope | language_flag | 30 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 115 | R025 | drift-014 | persona.v6/3 | drift | language_flag | 34 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |
| 116 | R005 | drift-014 | persona.v7/3 | drift | language_flag | 24 | True | model_rule_violation: Vietnamese prose answers an English request; English technical words/code do not make the reply English. |

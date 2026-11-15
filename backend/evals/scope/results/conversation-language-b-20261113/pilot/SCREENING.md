# Screening — conversation language B

Date: 2026-11-13; model: `gemini-3.5-flash-lite`.
SHA-256 v7: `499c38fb2fc2d8ee8de26e9c9f32b44e1925c7423e8446784c0c85fef5c90838`; corpus: `6a1fe7090ec8b14b382d62313cb1e0f9d879a7f1d4ba067e2459ff2afe2b22cb`.
Stage: pilot; stop: completed; calls: 30/60.

Mechanical screening only. No LLM-judge; semantic grades pending human review.
Voice flags only above 45 words. Quoted learning examples are excluded from refusal-language mixing; unquoted bilingual clauses are flagged.

| Version | Group | Clear screen | Flagged | Uncertain | No data | Not run |
|---|---|---:|---:|---:|---:|---:|
| persona.v7 | out_of_scope | 15 | 15 | 0 | 0 | 0 |

Gate: {"denominator": 30, "required_language_matches": 27, "language_matches": 18, "language_rate": 0.6, "mixed_refusals": 6, "voice_length_flags": 0, "responses": 30, "passed": false}

| Slot | ID | Repeat | Expected | Observed | Mixed | Voice >45 | First line |
|---:|---|---:|---|---|---|---|---|
| 1 | refusal-language-A1-text | 1 | vi | vi | False | False | Mình chỉ giúp bạn học tiếng Anh thôi nhé. Bạn hãy thử dùng mẫu câu tiếng Anh để giới thiệu công việc của mình. Bạn làm ở bộ phận nào, ví dụ: "I work in sales"? |
| 2 | refusal-language-A1-voice | 1 | vi | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn muốn thực hành mẫu câu "I work in..." để giới thiệu công việc như thế nào? |
| 3 | refusal-language-B1-text | 1 | vi | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé.  |
| 4 | refusal-language-B1-voice | 1 | vi | vi | True | False | Cô chỉ hỗ trợ tiếng Anh thôi nhé. Bạn hãy giới thiệu bộ phận làm việc của mình bằng tiếng Anh xem nào? Ví dụ: I work in sales. |
| 5 | refusal-language-C1-text | 1 | vi | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn hãy quay lại với việc giới thiệu công việc nha.  |
| 6 | refusal-language-C1-voice | 1 | vi | vi | False | False | Mình chỉ giúp bạn học tiếng Anh thôi nhé. Bây giờ, bạn hãy thử giới thiệu bộ phận làm việc của mình bằng mẫu "I work in..." nhé. |
| 7 | refusal-english-conversation-A1-text | 1 | en | vi | False | False | Mình chỉ giúp bạn học tiếng Anh thôi nhé.  |
| 8 | refusal-english-conversation-B1-text | 1 | en | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn có muốn luyện tập giới thiệu bộ phận làm việc bằng câu "I work in..." không? |
| 9 | refusal-english-conversation-C1-text | 1 | en | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi. Bạn có muốn luyện tập giới thiệu bộ phận làm việc bằng câu "I work in sales" không? |
| 10 | refusal-english-conversation-B1-voice | 1 | en | vi | True | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn hãy giới thiệu bộ phận làm việc của bạn bằng mẫu câu: I work in... nhé. |
| 11 | refusal-language-A1-text | 2 | vi | vi | False | False | Mình chỉ có thể giúp bạn học tiếng Anh thôi.  |
| 12 | refusal-language-A1-voice | 2 | vi | vi | True | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn hãy thử đặt câu bằng tiếng Anh với mẫu sau: I work in sales. Bộ phận hoặc công việc của bạn là gì? |
| 13 | refusal-language-B1-text | 2 | vi | vi | False | False | Mình chỉ giúp bạn học tiếng Anh thôi nhé. Trở lại bài học công việc nhé: bạn có thể giới thiệu bộ phận của mình bằng mẫu "I work in...". Bạn làm ở bộ phận nào? |
| 14 | refusal-language-B1-voice | 2 | vi | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn có muốn luyện cách giới thiệu công việc bằng mẫu câu "I work in..." không? |
| 15 | refusal-language-C1-text | 2 | vi | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn hãy quay lại với việc giới thiệu công việc nha. Bạn làm ở bộ phận nào? |
| 16 | refusal-language-C1-voice | 2 | vi | vi | True | False | Mình giúp bạn học tiếng Anh nhé. Bạn có muốn luyện tập nói về công việc bằng cách dùng mẫu câu I work in hoặc I am responsible for không? |
| 17 | refusal-english-conversation-A1-text | 2 | en | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi. Bạn có muốn luyện tập giới thiệu bộ phận làm việc bằng câu "I work in..." không? |
| 18 | refusal-english-conversation-B1-text | 2 | en | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn muốn giới thiệu công việc bằng tiếng Anh thế nào? Hãy thử dùng mẫu: "I work in..." nhé. |
| 19 | refusal-english-conversation-C1-text | 2 | en | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn muốn thực hành giới thiệu công việc bằng mẫu câu "I work in..." không? |
| 20 | refusal-english-conversation-B1-voice | 2 | en | vi | True | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn hãy giới thiệu tên và bộ phận làm việc của bạn bằng tiếng Anh nhé. What department do you work in? |
| 21 | refusal-language-A1-text | 3 | vi | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé.  |
| 22 | refusal-language-A1-voice | 3 | vi | vi | False | False | Cô chỉ hỗ trợ học tiếng Anh thôi nhé. Em có thể cho cô biết em làm việc ở bộ phận nào bằng tiếng Anh được không? |
| 23 | refusal-language-B1-text | 3 | vi | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé.  |
| 24 | refusal-language-B1-voice | 3 | vi | vi | False | False | Cô chỉ hỗ trợ tiếng Anh thôi nhé. Bạn hãy cho cô biết bạn làm việc ở bộ phận nào bằng tiếng Anh nhé? |
| 25 | refusal-language-C1-text | 3 | vi | vi | False | False | Mình hỗ trợ tiếng Anh nhé. Bạn làm việc ở bộ phận nào trong văn phòng? |
| 26 | refusal-language-C1-voice | 3 | vi | vi | False | False | Cô chỉ hỗ trợ học tiếng Anh thôi nhé. Em muốn giới thiệu bộ phận làm việc hay trách nhiệm công việc bằng tiếng Anh nào? |
| 27 | refusal-english-conversation-A1-text | 3 | en | vi | False | False | Mình chỉ giúp bạn học tiếng Anh thôi nhé.  |
| 28 | refusal-english-conversation-B1-text | 3 | en | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn muốn giới thiệu công việc của mình thế nào? Hãy thử dùng mẫu: "I work in [bộ phận]". |
| 29 | refusal-english-conversation-C1-text | 3 | en | vi | False | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn muốn thực hành giới thiệu công việc bằng mẫu câu "I work in..." không? |
| 30 | refusal-english-conversation-B1-voice | 3 | en | vi | True | False | Mình chỉ hỗ trợ học tiếng Anh thôi nhé. Bạn hãy giới thiệu tên và bộ phận làm việc của bạn bằng tiếng Anh nhé.  |

Full replies: review.csv. Stratified hand sheet: manual_sample.csv.
Missing data are neither pass nor fail. No acceptance conclusion before hand grading.

## Content inspection after the stopped pilot

The raw gate failed: 18/30 language matches (60%), six mixing flags, no voice
length flags. Full generation, prompt acceptance lock, LLM-judge and Blaze were
not started. The prompt/checker/cases remain unchanged after this failure.

Six raw mixing flags must not be described as six confirmed model failures:
slots 4, 10, 12 and 16 contain taught English examples/patterns, producing
checker false positives for bilingual refusal; slots 20 and 30 add the English
redirection question "What department do you work in?" after Vietnamese prose.
This coding-agent content inspection is provisional, pending teacher grading.
Raw results and summary were preserved, without retroactive relabeling.

[Flag-by-flag inspection and full replies](mix_flag_review.json).
[Stratified hand sheet: 27 runs / 9 cases](manual_sample.csv).
[Selected case context and rubric](manual_context.json).

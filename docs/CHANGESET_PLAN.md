# Kế hoạch chia commit — chưa stage/commit/push

Ngày 15/11/2026. Hai nhóm dưới đây là **danh sách đường dẫn cụ thể**, không phải
lệnh `git add .`. Với file trộn thay đổi, danh sách chỉ cấp phạm vi review hunk,
không có nghĩa lấy toàn bộ diff. Các snapshot/eval cũ được giữ để truy vết.

## Nhóm 1 — prompt, eval và tài liệu kiểm chứng backend

Thông điệp đề xuất: `feat(prompt): add locked English scope evaluation and offline review`

`conversations.py` chỉ hunk PROMPT_VERSION; test_gemini_database.py chỉ hunk
version/scope đã có từ trước lượt này (không phải sửa assertion trong lần rà này).
Không đụng persona.v6, lesson.v1, voice-identity.v1, catalog hoặc logic backend.
MySQL proposal chỉ tài liệu. Các đường dẫn chính xác:

```text
backend/app/prompts/persona.v7.txt
backend/app/services/conversations.py
backend/evals/__init__.py
backend/evals/scope/JUDGE_RUBRIC_DRAFT.md
backend/evals/scope/README.md
backend/evals/scope/REPORT.md
backend/evals/scope/__init__.py
backend/evals/scope/additional_cases.py
backend/evals/scope/audit_screening.py
backend/evals/scope/build_cases.py
backend/evals/scope/campaign.py
backend/evals/scope/cases.jsonl
backend/evals/scope/language_live.py
backend/evals/scope/manifest.json
backend/evals/scope/results/available-review-20261114/REVIEW.md
backend/evals/scope/results/available-review-20261114/all_responses.csv
backend/evals/scope/results/available-review-20261114/manual_review.csv
backend/evals/scope/results/available-review-20261114/pending_interleaved.json
backend/evals/scope/results/available-review-20261114/summary.json
backend/evals/scope/results/conversation-language-b-20261113/pilot/SCREENING.md
backend/evals/scope/results/conversation-language-b-20261113/pilot/attempts.jsonl
backend/evals/scope/results/conversation-language-b-20261113/pilot/manual_context.json
backend/evals/scope/results/conversation-language-b-20261113/pilot/manual_sample.csv
backend/evals/scope/results/conversation-language-b-20261113/pilot/manual_sampling.json
backend/evals/scope/results/conversation-language-b-20261113/pilot/metadata.json
backend/evals/scope/results/conversation-language-b-20261113/pilot/mix_flag_review.json
backend/evals/scope/results/conversation-language-b-20261113/pilot/results.jsonl
backend/evals/scope/results/conversation-language-b-20261113/pilot/review.csv
backend/evals/scope/results/conversation-language-b-20261113/pilot/summary.json
backend/evals/scope/results/conversation-language-b-20261113/pilot/verification.json
backend/evals/scope/results/coverage-recheck-20261113.json
backend/evals/scope/results/final-default-vi-20261113/PROMPT_LOCK.json
backend/evals/scope/results/final-default-vi-20261113/full/SCREENING.md
backend/evals/scope/results/final-default-vi-20261113/full/attempts.jsonl
backend/evals/scope/results/final-default-vi-20261113/full/comparison.json
backend/evals/scope/results/final-default-vi-20261113/full/flagged_responses.csv
backend/evals/scope/results/final-default-vi-20261113/full/manual_sample.csv
backend/evals/scope/results/final-default-vi-20261113/full/manual_sample_available.csv
backend/evals/scope/results/final-default-vi-20261113/full/manual_sampling.json
backend/evals/scope/results/final-default-vi-20261113/full/metadata.json
backend/evals/scope/results/final-default-vi-20261113/full/missing_data.json
backend/evals/scope/results/final-default-vi-20261113/full/results.jsonl
backend/evals/scope/results/final-default-vi-20261113/full/review.csv
backend/evals/scope/results/final-default-vi-20261113/full/summary.json
backend/evals/scope/results/final-default-vi-20261113/full/verification.json
backend/evals/scope/results/head-baseline-20261112.json
backend/evals/scope/results/language-live-20261113/NEXT_STAGE_PLAN.json
backend/evals/scope/results/language-live-20261113/SCREENING.md
backend/evals/scope/results/language-live-20261113/attempts.jsonl
backend/evals/scope/results/language-live-20261113/metadata.json
backend/evals/scope/results/language-live-20261113/results.jsonl
backend/evals/scope/results/language-live-20261113/review.csv
backend/evals/scope/results/language-live-20261113/summary.json
backend/evals/scope/results/language-repair-20261113/SCREENING.md
backend/evals/scope/results/language-repair-20261113/attempts.jsonl
backend/evals/scope/results/language-repair-20261113/metadata.json
backend/evals/scope/results/language-repair-20261113/results.jsonl
backend/evals/scope/results/language-repair-20261113/review.csv
backend/evals/scope/results/language-repair-20261113/summary.json
backend/evals/scope/results/language-repair-20261113/verification.json
backend/evals/scope/results/pilot-20261111/attempts.jsonl
backend/evals/scope/results/pilot-20261111/metadata.json
backend/evals/scope/results/pilot-20261111/results.jsonl
backend/evals/scope/results/pilot-20261111/review.csv
backend/evals/scope/results/pilot-20261111/review_key.json
backend/evals/scope/results/pilot-20261111/review_sample.json
backend/evals/scope/results/pilot-20261111/summary.json
backend/evals/scope/results/pilot-20261112-revised/attempts.jsonl
backend/evals/scope/results/pilot-20261112-revised/continuations.jsonl
backend/evals/scope/results/pilot-20261112-revised/metadata.json
backend/evals/scope/results/pilot-20261112-revised/results.jsonl
backend/evals/scope/results/pilot-20261112-revised/review.csv
backend/evals/scope/results/pilot-20261112-revised/review_key.json
backend/evals/scope/results/pilot-20261112-revised/review_sample.json
backend/evals/scope/results/pilot-20261112-revised/summary.json
backend/evals/scope/results/retry-missing-20261112/RETRY.md
backend/evals/scope/results/retry-missing-20261112/attempts.jsonl
backend/evals/scope/results/retry-missing-20261112/metadata.json
backend/evals/scope/results/retry-missing-20261112/results.jsonl
backend/evals/scope/results/screening-audit-20261112/SCREENING.md
backend/evals/scope/results/screening-audit-20261112/corrected_checks.jsonl
backend/evals/scope/results/screening-audit-20261112/flag_details.csv
backend/evals/scope/results/screening-audit-20261112/flag_reviews.json
backend/evals/scope/results/screening-audit-20261112/metadata.json
backend/evals/scope/results/screening-audit-20261112/out_of_scope_language.json
backend/evals/scope/results/screening-audit-20261112/removed_voice_flags.json
backend/evals/scope/retry_missing.py
backend/evals/scope/review_available.py
backend/evals/scope/revisions/PROMPT_FINAL_SHA256-20261113.json
backend/evals/scope/revisions/cases-conversation-language-b-20261113.diff
backend/evals/scope/revisions/cases.jsonl.final-default-vi-20261113.diff
backend/evals/scope/revisions/persona.v7.txt.final-default-vi-20261113.diff
backend/evals/scope/revisions/v7-20261112.diff
backend/evals/scope/revisions/v7-before-conversation-language-b-20261113/cases.jsonl
backend/evals/scope/revisions/v7-before-conversation-language-b-20261113/manifest.json
backend/evals/scope/revisions/v7-before-conversation-language-b-20261113/persona.v7.txt
backend/evals/scope/revisions/v7-before-final-default-vi-20261113/campaign.py
backend/evals/scope/revisions/v7-before-final-default-vi-20261113/cases.jsonl
backend/evals/scope/revisions/v7-before-final-default-vi-20261113/manifest.json
backend/evals/scope/revisions/v7-before-final-default-vi-20261113/persona.v7.txt
backend/evals/scope/revisions/v7-before-final-default-vi-20261113/screening.py
backend/evals/scope/revisions/v7-before-language-policy-a-20261113/cases.jsonl
backend/evals/scope/revisions/v7-before-language-policy-a-20261113/manifest.json
backend/evals/scope/revisions/v7-before-language-policy-a-20261113/persona.v7.txt
backend/evals/scope/revisions/v7-before-single-language-repair-20261113/SCREENING-initial.md
backend/evals/scope/revisions/v7-before-single-language-repair-20261113/persona.v7.txt
backend/evals/scope/revisions/v7-conversation-language-b-20261113.diff
backend/evals/scope/revisions/v7-initial-20261111/cases.jsonl
backend/evals/scope/revisions/v7-initial-20261111/manifest.json
backend/evals/scope/revisions/v7-initial-20261111/persona.v7.txt
backend/evals/scope/revisions/v7-language-policy-a-20261113.diff
backend/evals/scope/revisions/v7-proposed-policy-b-after-single-repair-20261113.diff
backend/evals/scope/revisions/v7-single-language-repair-20261113.diff
backend/evals/scope/run.py
backend/evals/scope/screening.py
backend/evals/scope/test_campaign.py
backend/evals/scope/test_language_live.py
backend/evals/scope/test_review_available.py
backend/evals/scope/test_runner.py
backend/evals/scope/test_screening_recovery.py
backend/tests/integration/test_gemini_database.py
backend/tests/unit/test_prompt_scope.py
docs/CHANGESET_PLAN.md
docs/MYSQL_TEST_PROPOSAL.md
docs/PROMPTS.md
```

## Nhóm 2 — thoại, debug và bộ đo

Thông điệp đề xuất: `feat(voice): add opt-in VAD gates and local diagnostics`

Gộp refactor/A/B/debug vì blaze.ts và tests dùng chung nhiều hunk. Đây là commit
của phần đã làm trước và tài liệu thiết kế mới, không triển khai onset/C/D/E.
Các đường dẫn chính xác (VoiceChat là ngoại lệ UI tối thiểu phục vụ Pha A):

```text
docs/SETTINGS_TEST_INVESTIGATION.md
docs/VOICE_DEVICE_CHECKLIST.csv
docs/VOICE_ONSET_DESIGN.md
docs/VOICE_OUTPUT_LEVEL_PROPOSAL.md
docs/VOICE_VAD_BASELINE.md
frontend/benchmarks/tsconfig.json
frontend/benchmarks/vad/adaptive.test.ts
frontend/benchmarks/vad/baseline.test.ts
frontend/benchmarks/vad/harness.test.ts
frontend/benchmarks/vad/legacy.ts
frontend/benchmarks/vad/measure.ts
frontend/benchmarks/vad/signals.ts
frontend/benchmarks/vad/wav.ts
frontend/package.json
frontend/src/voice/VoiceChat.test.tsx
frontend/src/voice/VoiceChat.tsx
frontend/src/voice/adaptiveVad.test.ts
frontend/src/voice/adaptiveVad.ts
frontend/src/voice/blaze.test.ts
frontend/src/voice/blaze.ts
frontend/src/voice/session.ts
frontend/src/voice/transcriptGate.test.ts
frontend/src/voice/transcriptGate.ts
frontend/src/voice/vad.test.ts
frontend/src/voice/vad.ts
frontend/src/voice/voiceDebug.test.ts
frontend/src/voice/voiceDebug.ts
frontend/vite.config.ts
frontend/vitest.vad.config.ts
```

`.env.example`: **chỉ** hunk VAD_BENCH_WAV_DIR và ba VITE_VOICE_* false;
không lấy comment Meta/OAuth đang nằm sát cùng hunk. package.json chỉ script
benchmark, Vite config chỉ ba define cờ. VoiceChat.tsx/test chỉ notice Pha A
và test tương ứng; không lấy thay đổi lỗi tự biến mất 5 giây đã có từ tác vụ UI
trước (state error dạng object, effect timeout error, các test UI liên quan).
Constant 5 giây được dùng chung phải tách hunk có chủ đích để notice vẫn build;
không stage nguyên file nếu chưa tách phần ngoài phạm vi. Không sửa code bây giờ.

## Các file tài liệu dùng chung — chia theo nội dung hunk

```text
README.md
docs/ARCHITECTURE.md
docs/CHANGELOG.md
docs/DECISIONS.md
docs/REQUIREMENTS.md
docs/TESTING.md
```

Nhóm 1 lấy phần chính sách/hash/lịch sử, eval/rubric/resume và MySQL test.
Nhóm 2 lấy phần kiến trúc VAD, A/B/debug, benchmark/CSV, thiết kế onset và điều tra
flake Settings. Không lấy phần OAuth/UI/Docker/handoff trong cùng tài liệu.
Dùng `git add -p -- <path>` để chọn/split hunk; nếu đoạn sát nhau không split
được thì review patch thủ công, không nhận toàn bộ hunk. Sau khi người dùng duyệt
commit, cần kiểm tra `git diff --cached --check`, `git diff --cached --name-only`,
và lint/test/build trên nội dung staged riêng (checkout/worktree tạm), vì exclude
UI khỏi VoiceChat có thể làm bản staged khác working tree đã test. Chưa chứng minh
hai commit độc lập build được; không giả vờ staging tự tách dependency.

## Luôn loại trừ khỏi cả hai nhóm

- `.env`, mọi secret/audio/private WAV, `.artifacts`, coverage, dist, caches.
- `backend/tests/unit/test_oauth.py`, `frontend/src/AuthForm.tsx`,
  `frontend/src/AuthForm.test.tsx`, `frontend/src/api/socialAuth.test.ts`.
- `frontend/.dockerignore`, `frontend/Dockerfile` và mọi thay đổi Docker/Compose.
- Mọi CSS: auth-restored, mate-listens, index, landing, workspace và file CSS khác.
- `docs/OAUTH_SETUP.md`, `docs/OAUTH_DIAGNOSTIC_2026-11-10.md`,
  `docs/AI_HANDOFF_2026-11-11.zip`, `docs/AI_HANDOFF_CODE_MAP.md`,
  `docs/AI_HANDOFF_MANIFEST.json`, `docs/AI_HANDOFF_SOURCE.md`, `docs/AI_HANDOFF_VI.md`,
  `docs/DOCKER_REVIEW_2026-11-06.md`, `docs/DOCKER_RUN_2026-11-11.md`,
  `docs/UI_REFRESH_2026-11-11.md`, `docs/VOICE_ERROR_TIMEOUT_2026-11-11.md`.
- Việc xóa `docs/PROGRESS.md` đã có sẵn: không restore, không đưa vào hai commit
  này nếu chưa có quyết định gom thay đổi đó riêng. Không thao tác git index.

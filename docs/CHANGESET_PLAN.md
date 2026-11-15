# Kế hoạch bảo toàn và chia commit — C1/C2 đã kiểm chứng byte

## C3 đã commit; chuẩn bị C4 — 16/11/2026

C3 `4e0698f88c9f68469986378bd67f85422e6dc5c7` chỉ thêm mốc kiểm chứng trong
`docs/VOICE_VAD_BASELINE.md`; không đổi bảng đo, thuật toán hoặc cờ. Hai hook
qua; hash baseline, 12 file khóa và tám tài liệu chưa stage khớp trước/sau hook.
Bằng chứng `.artifacts/c3-postcommit-integrity-20261116.json`. Đoạn “C3 chưa
commit” trong baseline mô tả lúc soạn trước commit này; xem mục này để biết
trạng thái commit mới. Không triển khai Pha C/D/E/onset mới.

C4 tại mốc soạn này đang chuẩn bị, chưa stage/commit; chỉ 11 file tài liệu:
README root, README/REPORT eval và CHANGELOG, CHANGESET_PLAN, DECISIONS,
MYSQL_TEST_PROPOSAL, PROMPTS, REQUIREMENTS, SETTINGS_TEST_INVESTIGATION, TESTING
trong docs. Phần Từ vựng trong file chung giữ nguyên. Không đưa raw/CSV, tài liệu
bàn giao, PROGRESS hoặc file OAuth/UI/CSS/Docker vào C4. Mỗi lệnh Git cần duyệt.
Judge chưa phải nghiệm thu; v7 giữ hash khóa.

## C2 đã commit và kiểm checkout sạch — 16/11/2026

C2 `d67f97bd78cc0bf63ecd8aea9e68d9ebbe4c1b6f` có đúng 17 file đã duyệt;
hook backend/frontend qua, thay đổi chưa stage được khôi phục. Đối chiếu sau
hook: 12 file khóa/runner/snapshot và bốn file theo dõi khớp byte trước commit.

Checkout detached riêng chỉ đọc hash: 15 file frozen generation khớp; 17 file
C2 đúng kỳ vọng (15 khớp byte, REVIEW.md và summary.json của judge-combined chỉ
chuẩn hóa CRLF thành LF). Ba LOCK, attempts và summary của judge-approved giữ
nguyên byte. Chín artifact raw/CSV đã loại trừ đều vắng mặt. Không chạy test/API
trong checkout; đã dọn bằng lệnh Git được duyệt. Bằng chứng cục bộ:
`.artifacts/c2-postcommit-integrity-20261116.json` và
`.artifacts/c2-clean-checkout-verification-20261116.json`.

C1/C2 xong phần commit và hash; tại mốc này C3/C4 còn chờ, C3 đã hoàn tất sau
đó như mục đầu. C4 vẫn cần review/duyệt từng lệnh Git.
Không suy kiểm byte thành tái lập chiến dịch, test trên checkout sạch hoặc
nghiệm thu judge. WIP vẫn d0adeaf, chưa push. Các trạng thái chưa commit C1/C2
ở mốc cũ bên dưới là lịch sử. Judge chưa phải nghiệm thu; v7 giữ hash khóa.

## Cập nhật C1 — 16/11/2026

Đã commit C1 `405f0304e40e3b9e296aceff48ae61cd29e050bb` trên nhánh scope/voice,
đúng ba file: attrs, manifest và full/attempts. Hook backend/frontend qua;
thay đổi tài liệu chưa stage được khôi phục đủ nội dung, chuẩn hóa xuống dòng.
WIP vẫn giữ d0adeaf; không push hoặc đụng worktree vocabulary.

Checkout detached riêng ở `agent-coordination/verify-scope-voice-20261115`
được tạo bằng lệnh duyệt. Đọc hash xác nhận v7/manifest/attempts/attrs và toàn
bộ **15 file frozen generation** khớp. Biên bản ngoài repo:
`agent-coordination/backup-20261115/C1_CHECKOUT_VERIFICATION.json`.
Không sửa checkout hoặc chạy test/API trong đó. Raw full/results vắng mặt đúng
chủ ý; kết quả này chỉ chứng minh byte C1, không tái lập toàn chiến dịch hoặc
nghiệm thu judge/thoại. Cổng unit test C2 độc lập raw đã được xử lý ở mốc dưới.

Các câu “chưa stage/commit/kiểm checkout” ở kế hoạch 15/11 bên dưới là mốc
trước C1. Tại mốc C1, C2–C4 chưa commit; C2 nay đã hoàn tất như mốc trên.
Checkout kiểm chứng đã dọn bằng lệnh Git duyệt
riêng; backup và biên bản hash giữ nguyên. Mỗi commit còn lại vẫn phải có ghi chú judge chưa phải
nghiệm thu; v7 giữ hash khóa.

## Kiểm chứng test C2 — 16/11/2026

`test_judge_available.py` dùng corpus đã version hóa cùng phản hồi tổng hợp
trong thư mục tạm; vẫn gọi `inputs()` và kiểm tra hash thật. Giữ nguyên các
assertion cũ, thêm ba ca phát hiện attempts/results/metadata bị sửa. Bộ eval
offline qua **89/89**; chặn HTTP thật và toàn bộ artifact judge/raw phản hồi
riêng tư, ghi nhận **0 lần thử truy cập** cả hai loại. Không gọi judge/API,
không sửa runner, snapshot, rubric, dữ liệu khóa hoặc timeout/ngưỡng coverage.

Lượt đầu lỗi thiết lập temp/cache do quyền truy cập (55 qua, 34 lỗi), được giữ
ở `.artifacts/c2-eval-offline-20261116.log`. Lượt dùng temp/cache riêng đã qua;
log và bộ đếm ở `.artifacts/c2-eval-offline-recheck-20261116.log` và
`.artifacts/c2-eval-guard-result-20261116.json`. Đây là kiểm chứng trong workspace,
không phải test trong checkout sạch hoặc nghiệm thu judge. Khi chạy test,
C2 chưa stage/commit; sau đó đã rà riêng tư, duyệt từng lệnh và commit như mốc trên.

Kiểm cuối: 12/12 test judge qua sau chỉnh import; Ruff, Black check và mypy
strict qua. Đối chiếu AST xác nhận assertion trong sáu test cũ không đổi.
Biên bản: `.artifacts/c2-synthetic-validation-20261116.json`. Các log/JSON
`c2-*20261116*` giữ cục bộ, chưa thêm vào backup lịch sử; cache/temp cùng tiền
tố là file sinh tự động, loại trừ commit. Test sửa thuộc C2; ba tài liệu
CHANGESET_PLAN/TESTING/REPORT cập nhật bằng chứng thuộc C4. Không stage artifact.

## Bằng chứng C2 phát sinh sau backup — 16/11/2026

Các file dưới đây giữ cục bộ, chưa có trong manifest backup 151 file; không
commit log hoặc thay manifest lịch sử. Cache/temp C2 loại trừ theo thư mục,
không phải sản phẩm nguồn cần commit.

| Đường dẫn | Phân loại | Lý do |
|---|---|---|
| `.artifacts/c2-black-cache-20261116` | Loại trừ | Cache/temp sinh khi kiểm chứng, không stage. |
| `.artifacts/c2-clean-checkout-verification-20261116.json` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-eval-guard-result-20261116.json` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-eval-offline-20261116.log` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-eval-offline-recheck-20261116.log` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-judge-final-20261116.log` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-judge-final-guard-20261116.json` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-lint-final-status-20261116.json` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-lint-status-20261116.json` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-lint-venv-status-20261116.json` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-mypy-cache-20261116` | Loại trừ | Cache/temp sinh khi kiểm chứng, không stage. |
| `.artifacts/c2-postcommit-integrity-20261116.json` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-pytest-cache-20261116` | Loại trừ | Cache/temp sinh khi kiểm chứng, không stage. |
| `.artifacts/c2-pytest-cache-20261116-final` | Loại trừ | Cache/temp sinh khi kiểm chứng, không stage. |
| `.artifacts/c2-pytest-temp-20261116` | Loại trừ | Cache/temp sinh khi kiểm chứng, không stage. |
| `.artifacts/c2-pytest-temp-20261116-final` | Loại trừ | Cache/temp sinh khi kiểm chứng, không stage. |
| `.artifacts/c2-ruff-cache-20261116` | Loại trừ | Cache/temp sinh khi kiểm chứng, không stage. |
| `.artifacts/c2-synthetic-validation-20261116.json` | Giữ cục bộ (chưa sao lưu) | Log/JSON kiểm chứng C2; giữ cả lượt lỗi môi trường. |
| `.artifacts/c2-doc-sync-validation-20261116.json` | Giữ cục bộ (chưa sao lưu) | Đối chiếu tài liệu sau C2 và hash nguồn khóa. |
| `.artifacts/c3-postcommit-integrity-20261116.json` | Giữ cục bộ (chưa sao lưu) | Hash sau hook C3 và bằng chứng khôi phục tài liệu. |
| `.artifacts/c4-doc-review-validation-20261116.json` | Giữ cục bộ (chưa sao lưu) | Rà tài liệu C4, riêng tư theo mẫu và hash nguồn khóa; không stage. |

## Bảo toàn và tách nhánh sau kiểm toán — 15/11/2026

Đã sao lưu **151 file** giữ cấu trúc dưới thư mục ngoài repo
`E:\7-Thực tập BLAZE AI\agent-coordination\backup-20261115\`, kèm
`BACKUP_MANIFEST_SHA256.json` ghi hash gốc/copy và xác minh khớp. Manifest mô
tả bản trước sửa; tài liệu hiện tại được đồng bộ sau bản sao đó. Quét 192 ứng
viên ghi nhận 61 vị trí heuristic cần rà; `PRIVACY_SCAN_FINDINGS.json` chỉ có
tệp:dòng/loại, không lưu giá trị. Fixture/vai trò có thể trùng tên tài khoản;
không coi mọi hit là bí mật thật, không coi không hit là chứng nhận sạch.

Đã chạy **duy nhất lệnh Git được người dùng duyệt**:
`git switch -c feat/scope-voice-20261115 d0adeafa117354e7f2ad927196e04730b291e588`.
Đang ở nhánh riêng; WIP vẫn giữ d0adeaf. Không chạy Git status/diff/add/commit
khác trong lượt bảo toàn. Không chạm worktree từ vựng. Mỗi lệnh Git tiếp theo
phải trình và chờ duyệt riêng.

Nhánh mới kế thừa snapshot hỗn hợp d0adeaf. Bốn nhóm dưới đây chỉ là phần bổ
sung so với d0adeaf, **không phải đã tách lại 182 file trong lịch sử**. VAD/
A/B/debug, persona.v7 và phần lớn eval đã trong điểm neo; không tạo commit
rỗng hoặc tự sửa lịch sử để giả lập việc tách đó.

## Thứ tự dự kiến và cổng trước commit

1. **C1 — bảo toàn byte khóa:** `.gitattributes` cùng bản byte gốc của manifest
   và full/attempts. Chỉ commit attrs chưa sửa blob LF đã có trong WIP. Đề xuất
   stage lại hai path bằng `git add --renormalize -- <hai path>` sau khi rule
   `-text !eol` có hiệu lực. Lệnh này đưa CRLF gốc vào index theo đúng hash,
   không sửa working file; không dùng `git add --renormalize .`.
2. **C2 — prompt/eval/judge:** runner/test/snapshot, lock, attempts không chứa
   nội dung và tổng hợp. Raw results/CSV có reply giữ private. Cổng unit test
   độc lập raw đã qua bằng fixture tổng hợp ở mốc 16/11; giữ kiểm tra integrity
   thật và assertion cũ. Đã rà riêng tư, stage/commit theo từng lệnh duyệt và
   kiểm hash checkout sạch C2; chưa chạy test ở đó. Không thay khóa lịch sử để
   ép raw đã che thành bản gốc.
3. **C3 — voice/VAD:** đã commit `4e0698f`, chỉ đồng bộ mốc kiểm chứng trong
   baseline; runtime đã trong WIP. Onset mới/C/D/E vẫn chưa triển khai.
4. **C4 — tài liệu:** chỉ hunk prompt/eval/thoại/bảo toàn; giữ phần vocabulary,
   OAuth, giao diện/CSS/Docker của tác nhân khác trong các file dùng chung.

Subject tiếng Anh; **body từng commit bắt buộc có**:
`judge chưa phải nghiệm thu; v7 giữ hash khóa`
và SHA-256 `e75a86fdad0368dd343d04215859b8bcb52658d9699b6cd9a18f6deb0e722680`.

| Nhóm | Subject đề xuất |
|---|---|
| C1 | `chore(eval): preserve locked artifact bytes` |
| C2 | `feat(eval): preserve approved judge provenance and aggregate results` |
| C3 | `docs(voice): clarify VAD validation status and deferred phases` |
| C4 | `docs: synchronize scope evaluation and preservation status` |

## Lịch sử đề xuất C1 — đã chạy theo từng lần duyệt

```powershell
git add -- .gitattributes
git add --renormalize -- backend/evals/scope/manifest.json backend/evals/scope/results/final-default-vi-20261113/full/attempts.jsonl
git diff --cached --check
git diff --cached --name-only
git commit -m "chore(eval): preserve locked artifact bytes" -m "judge chưa phải nghiệm thu; v7 giữ hash khóa e75a86fdad0368dd343d04215859b8bcb52658d9699b6cd9a18f6deb0e722680"
```

Không stage raw `results.jsonl` nào nguyên trạng. C1 chỉ có ba path ở trên;
không .env/cờ/dependencies/file tác vụ khác hoặc việc xóa PROGRESS. Các lệnh
đọc Git kiểm staged cũng cần duyệt; đây không phải quyền chạy hàng loạt.

Sau khi người dùng duyệt và commit C1, trình riêng lệnh tạo checkout xác minh:

```powershell
git worktree add --detach "E:/7-Thực tập BLAZE AI/agent-coordination/verify-scope-voice-20261115" <COMMIT_C1>
```

Worktree mới chỉ dùng đọc hash bằng Get-FileHash, không app/test/API hoặc sửa
file; chưa tạo. Cleanup bằng `git worktree remove` cần một lần duyệt riêng.
Không dùng worktree vocabulary hoặc coverage cũ.

Hash cần kiểm trong checkout sạch:

- persona.v7: `e75a86fdad0368dd343d04215859b8bcb52658d9699b6cd9a18f6deb0e722680`
- manifest: `eea62b79406e12fc16507bc3761327d4c0dc0cb8840a7ac96eff18762dc0cbb7`
- full/attempts: `489064b23341d862fc98fe3a8ef06fab23dd5ddf5228545f23ac4467589ca33d`

LOCK.json đã được so hash backup trong checkout C2; tất cả khớp byte.
**Đã kiểm byte checkout sạch C1/C2, chưa chạy test trong đó.** Raw full/results bị loại có chủ ý, nên
không tuyên bố public checkout tự tái lập toàn chiến dịch. Tái lập cục bộ cần
phục hồi private đúng hash từ backup, không đưa vào Git.

## Giữ bằng chứng riêng tư

Ưu tiên commit SHA-256 nguyên bản, số request/slot/phản hồi, thống kê nhóm,
pass/fail/no_data và provenance không chứa reply/PII. Lock/attempts/summary
chỉ vào C2 sau review riêng tư cuối. `all_judgments.csv`, `manual_priority.csv`,
`human_followup.csv` và mọi raw results giữ cục bộ đã sao lưu. Link chấm tay
trong tài liệu là artifact cục bộ, không hứa có trong public checkout.

Nếu cần chia sẻ bản đã che, tạo artifact khác có hash riêng và ánh xạ hash
nguồn/phiên bản quy tắc che; giữ nguyên bản khóa private. Chưa sinh bản đã che,
chưa sửa ledger/raw/lock. Raw cũ trong d0adeaf vẫn được kế thừa; loại khỏi stage
mới không xóa chúng khỏi lịch sử. Không tự rewrite/untrack/sửa dữ liệu frozen.

## Phân loại từng file mới/sửa và bằng chứng cục bộ

Từng file dưới đây có bản sao trước sửa trong manifest 151 file, trừ PROGRESS
xóa sẵn. “Commit có điều kiện” là đề xuất, chưa stage/commit. Bảng gồm từng
log/profile/verification cần giữ; không cấp quyền chạy Git.

| Đường dẫn | Phân loại | Nhóm | Lý do |
|---|---|---|---|
| `.artifacts/approved-check-status.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/approved-final-build.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/approved-final-integrity-20261115.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/approved-final-lint.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/approved-final-smoke.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/branch-protected-files-20261115.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/branch-ui-recheck-20261115.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/branch-ui-recheck-20261115.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/current-branch-inventory-20261115.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/finalize-judge-20261115.py` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-eval-final.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-eval-tests.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-final-build.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-final-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-final-eval.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-final-frontend-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-final-lint.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-final-test.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-smoke.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-suite-status.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/followup-vad-benchmark.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-all-eval-tests.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-approved-live-20261115.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-continuation-tests.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-final-all-tests.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-final-continuation-tests.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-final-eval-tests.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-final-live-20261115.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-final-supervised-000.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-final-supervised-001.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-final-supervisor-20261115.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-offline-tests.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-remaining-live-20261115.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-remaining-resume-20261115-01.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-000.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-001.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-002.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-003.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-004.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-005.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-006.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-007.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-008.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-009.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervised-010.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervisor-20261115.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervisor-20261115.py` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervisor-continued-20261115.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/judge-supervisor-progress.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/mysql-approved-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/mysql-approved-run.ps1` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/mysql-coverage-verification-20261115.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/scope-audit-build.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/scope-audit-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/scope-audit-lint.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/scope-audit-test.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/settings-cpu-result.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/settings-cpu-setup.mts` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/settings-cpu.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/settings-profile-result.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/settings-profile.config.mts` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/settings-profile.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/settings-test.cpuprofile` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/state-audit-build.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/state-audit-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/state-audit-frontend-coverage-recheck.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/state-audit-frontend-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/state-audit-lint.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/state-audit-test.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-debug-benchmark.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-debug-build.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-debug-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-debug-lint.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-debug-targeted.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-a-build.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-a-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-a-lint.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-a-test.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-b-benchmark.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-b-build.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-b-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-b-lint.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-b-repo-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-b-targeted.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-phase-b-test.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-adaptive.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-after-test.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-baseline.json` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-before-frontend.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-before-targeted.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-before-test-unrestricted.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-before-test.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-benchmark-final.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-benchmark-verified.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-benchmark.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-build-verified.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-build.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-coverage-frontend-isolated.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-coverage-frontend.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-coverage.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-harness.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-lint-final.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-lint-verified.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.artifacts/voice-vad-lint.log` | Giữ cục bộ (đã sao lưu) | — | Log/script/profile/số đo riêng; không commit dữ liệu raw hoặc đường dẫn máy. |
| `.gitattributes` | Đã commit | C1 | C1 405f030; đã kiểm byte checkout sạch. |
| `README.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `backend/evals/scope/JUDGE_RUBRIC_DRAFT.md` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/README.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `backend/evals/scope/REPORT.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `backend/evals/scope/judge_available.py` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/manifest.json` | Đã commit | C1 | C1 405f030; đã kiểm byte checkout sạch. |
| `backend/evals/scope/results/final-default-vi-20261113/full/attempts.jsonl` | Đã commit | C1 | C1 405f030; đã kiểm byte checkout sạch. |
| `backend/evals/scope/results/final-default-vi-20261113/full/results.jsonl` | Giữ cục bộ (đã sao lưu) | — | Raw phản hồi; không commit nguyên trạng, chỉ hash và tổng hợp. |
| `backend/evals/scope/results/judge-approved-20261115-final/LOCK.json` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-approved-20261115-final/attempts.jsonl` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-approved-20261115-final/human_followup.csv` | Giữ cục bộ (đã sao lưu) | — | Có phản hồi/bằng chứng trích; không tự che đè bản khóa. |
| `backend/evals/scope/results/judge-approved-20261115-final/results.jsonl` | Giữ cục bộ (đã sao lưu) | — | Có phản hồi/bằng chứng trích; không tự che đè bản khóa. |
| `backend/evals/scope/results/judge-approved-20261115-final/summary.json` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-approved-20261115-remaining/LOCK.json` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-approved-20261115-remaining/attempts.jsonl` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-approved-20261115-remaining/human_followup.csv` | Giữ cục bộ (đã sao lưu) | — | Có phản hồi/bằng chứng trích; không tự che đè bản khóa. |
| `backend/evals/scope/results/judge-approved-20261115-remaining/results.jsonl` | Giữ cục bộ (đã sao lưu) | — | Có phản hồi/bằng chứng trích; không tự che đè bản khóa. |
| `backend/evals/scope/results/judge-approved-20261115-remaining/summary.json` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-approved-20261115/LOCK.json` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-approved-20261115/attempts.jsonl` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-approved-20261115/human_followup.csv` | Giữ cục bộ (đã sao lưu) | — | Có phản hồi/bằng chứng trích; không tự che đè bản khóa. |
| `backend/evals/scope/results/judge-approved-20261115/results.jsonl` | Giữ cục bộ (đã sao lưu) | — | Có phản hồi/bằng chứng trích; không tự che đè bản khóa. |
| `backend/evals/scope/results/judge-approved-20261115/summary.json` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-combined-20261115/REVIEW.md` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/results/judge-combined-20261115/all_judgments.csv` | Giữ cục bộ (đã sao lưu) | — | Có phản hồi/bằng chứng trích; không tự che đè bản khóa. |
| `backend/evals/scope/results/judge-combined-20261115/manual_priority.csv` | Giữ cục bộ (đã sao lưu) | — | Có phản hồi/bằng chứng trích; không tự che đè bản khóa. |
| `backend/evals/scope/results/judge-combined-20261115/summary.json` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/revisions/judge-final-run-20261115.py` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/revisions/judge-first-run-20261115.py` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/revisions/judge-remaining-run-20261115.py` | Đã commit | C2 | C2 d67f97b; đã rà riêng tư và kiểm byte checkout sạch. |
| `backend/evals/scope/test_judge_available.py` | Đã commit | C2 | C2 d67f97b; fixture tổng hợp, assertion cũ giữ nguyên; đã kiểm byte checkout sạch. |
| `docs/AI_HANDOFF_2026-11-11.zip` | Loại trừ (đã sao lưu) | — | Tài liệu bàn giao ngoài phạm vi commit; giữ file, không xóa. |
| `docs/AI_HANDOFF_CODE_MAP.md` | Loại trừ (đã sao lưu) | — | Tài liệu bàn giao ngoài phạm vi commit; giữ file, không xóa. |
| `docs/AI_HANDOFF_MANIFEST.json` | Loại trừ (đã sao lưu) | — | Tài liệu bàn giao ngoài phạm vi commit; giữ file, không xóa. |
| `docs/AI_HANDOFF_SOURCE.md` | Loại trừ (đã sao lưu) | — | Tài liệu bàn giao ngoài phạm vi commit; giữ file, không xóa. |
| `docs/AI_HANDOFF_VI.md` | Loại trừ (đã sao lưu) | — | Tài liệu bàn giao ngoài phạm vi commit; giữ file, không xóa. |
| `docs/CHANGELOG.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `docs/CHANGESET_PLAN.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `docs/DECISIONS.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `docs/MYSQL_TEST_PROPOSAL.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `docs/PROMPTS.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `docs/PROMPT_VOICE_REVIEW_2026-11-15.md` | Loại trừ (đã sao lưu) | — | Tài liệu bàn giao ngoài phạm vi commit; giữ file, không xóa. |
| `docs/REQUIREMENTS.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `docs/SETTINGS_TEST_INVESTIGATION.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `docs/TESTING.md` | Commit có điều kiện | C4 | Chỉ hunk tác vụ này; loại nội dung tác nhân khác trong file chung. |
| `docs/VOICE_VAD_BASELINE.md` | Đã commit | C3 | C3 4e0698f; chỉ đồng bộ mốc kiểm chứng, không đổi VAD runtime hoặc cờ. |
| `docs/PROGRESS.md` (xóa sẵn) | Loại trừ | — | Không tái tạo, không stage việc xóa. |

Báo cáo `PRIVACY_SCAN_FINDINGS.json` phát sinh ngoài repo trong backup: giữ
cục bộ, không commit. Loại .env/frontend/.env.local, secret/audio/private WAV,
cache/node_modules/dist/coverage khỏi chuỗi commit.

## Kế hoạch trước bảo toàn — lịch sử, phân loại mới phía trên ưu tiên

Danh sách cũ dưới đây mô tả phạm vi đã gom vào snapshot, không phải lệnh stage
mới. Các dòng cũ đề xuất raw results/CSV vào commit đã bị thay thế bởi chính
sách giữ private phía trên.

Kiểm tra lại 15/11/2026: các thay đổi dưới đây đã có trong snapshot `d0adeaf`
của nhánh dùng chung `wip/snapshot-20261115` khi agent tiếp tục. Agent không tạo
snapshot này. Danh sách giữ để phân loại/review, không chỉ dẫn tự tách lại lịch
sử Git hoặc stage lại phần đã commit. Xem [bàn giao mới nhất](PROMPT_VOICE_REVIEW_2026-11-15.md).
Tài liệu bàn giao mới này chỉ phục vụ review; loại khỏi cả hai nhóm commit
theo yêu cầu không gom tài liệu bàn giao.

Sau phê duyệt rubric/MySQL, nhóm prompt+eval có thêm các đường dẫn cụ thể:

```text
backend/evals/scope/judge_available.py
backend/evals/scope/test_judge_available.py
backend/evals/scope/revisions/judge-first-run-20261115.py
backend/evals/scope/revisions/judge-remaining-run-20261115.py
backend/evals/scope/revisions/judge-final-run-20261115.py
backend/evals/scope/results/judge-approved-20261115/LOCK.json
backend/evals/scope/results/judge-approved-20261115/attempts.jsonl
backend/evals/scope/results/judge-approved-20261115/results.jsonl
backend/evals/scope/results/judge-approved-20261115/summary.json
backend/evals/scope/results/judge-approved-20261115/human_followup.csv
backend/evals/scope/results/judge-approved-20261115-remaining/LOCK.json
backend/evals/scope/results/judge-approved-20261115-remaining/attempts.jsonl
backend/evals/scope/results/judge-approved-20261115-remaining/results.jsonl
backend/evals/scope/results/judge-approved-20261115-remaining/summary.json
backend/evals/scope/results/judge-approved-20261115-remaining/human_followup.csv
backend/evals/scope/results/judge-approved-20261115-final/LOCK.json
backend/evals/scope/results/judge-approved-20261115-final/attempts.jsonl
backend/evals/scope/results/judge-approved-20261115-final/results.jsonl
backend/evals/scope/results/judge-approved-20261115-final/summary.json
backend/evals/scope/results/judge-approved-20261115-final/human_followup.csv
backend/evals/scope/results/judge-combined-20261115/REVIEW.md
backend/evals/scope/results/judge-combined-20261115/all_judgments.csv
backend/evals/scope/results/judge-combined-20261115/manual_priority.csv
backend/evals/scope/results/judge-combined-20261115/summary.json
```

Review hunk cập nhật trong RUBRIC/REPORT/README eval và tài liệu MySQL/kiểm chứng;
không stage `.artifacts` (script vận hành, logs, mật khẩu test không được lưu).
Không lấy phần từ vựng/OAuth/CSS/Docker của snapshot hay của tác nhân khác.

Nhóm 1 còn gồm `.gitattributes`: chỉ các quy tắc bảo toàn byte cho manifest,
hai JSONL nguồn và JSON/JSONL judge đã khóa. Manifest và attempts nguồn có CRLF
nhưng blob snapshot trước đã chuẩn hóa LF; không sửa byte working tree để khớp
blob cũ. Khi người dùng commit sau này, cần review raw byte và hash kèm các
quy tắc này, không dùng renormalize toàn repo. Chưa stage bất kỳ file nào.

Ngày 15/11/2026. Hai nhóm dưới đây là **danh sách đường dẫn cụ thể**, không phải
lệnh `git add .`. Với file trộn thay đổi, danh sách chỉ cấp phạm vi review hunk,
không có nghĩa lấy toàn bộ diff. Các snapshot/eval cũ được giữ để truy vết.

## Nhóm 1 — prompt, eval và tài liệu kiểm chứng backend

Thông điệp đề xuất: `feat(prompt): add locked scope evaluation and approved judge review`

`conversations.py` chỉ hunk PROMPT_VERSION; test_gemini_database.py chỉ hunk
version/scope đã có từ trước lượt này (không phải sửa assertion trong lần rà này).
Không đụng persona.v6, lesson.v1, voice-identity.v1, catalog hoặc logic backend.
MySQL proposal chỉ tài liệu. Các đường dẫn chính xác:

```text
.gitattributes
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
  `docs/PROMPT_VOICE_REVIEW_2026-11-15.md`,
  `docs/AI_HANDOFF_2026-11-11.zip`, `docs/AI_HANDOFF_CODE_MAP.md`,
  `docs/AI_HANDOFF_MANIFEST.json`, `docs/AI_HANDOFF_SOURCE.md`, `docs/AI_HANDOFF_VI.md`,
  `docs/DOCKER_REVIEW_2026-11-06.md`, `docs/DOCKER_RUN_2026-11-11.md`,
  `docs/UI_REFRESH_2026-11-11.md`, `docs/VOICE_ERROR_TIMEOUT_2026-11-11.md`.
- Việc xóa `docs/PROGRESS.md` đã có sẵn: không restore, không đưa vào hai commit
  này nếu chưa có quyết định gom thay đổi đó riêng. Không thao tác git index.

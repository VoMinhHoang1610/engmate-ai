# Từ vựng — tiền triển khai và lệnh xin duyệt

**15/11/2026. D1–D10 được duyệt có điều kiện; các lệnh ghi bên dưới chưa chạy.**
Chỉ đọc Git/process/Docker metadata và cập nhật tài liệu trong lượt này.

## 1. Trạng thái repo

- Nhánh `docs/learning-vocabulary-design-20261115`, HEAD
  `e5097223d6a8648b9bccb2201f7af355059758ca`.
- Trước cập nhật tài liệu lượt này: 31 đường dẫn tracked có thay đổi (30 sửa,
  1 xóa); index rỗng, không có hunk staged. Nhiều file untracked, gồm cả kết quả
  eval và snapshot; không coi chúng là file thừa.
- Worktree chính: `E:\7-Thực tập BLAZE AI\EngMate-AI`.
- Worktree cũ `.artifacts/head-coverage-20261112`: detached tại cùng HEAD,
  `git status --short` sạch, chưa có `frontend/node_modules`. Giữ nguyên artifact
  lịch sử này; đề xuất worktree mới cho lần đo hiện tại.

| Nhóm sửa đổi chưa commit | Đường dẫn tiêu biểu |
| --- | --- |
| OAuth | `AuthForm.tsx`, test AuthForm/socialAuth, backend test OAuth, `OAUTH_SETUP.md` |
| Giao diện | `auth-restored.css`, `index.css`, `landing.css`, `workspace.css`, `mate-listens.css` |
| Thoại/VAD | `VoiceChat.tsx`, `blaze.ts`, `session.ts`, các test; vad/adaptiveVad/transcriptGate/voiceDebug mới; `frontend/benchmarks/`, vite/package, `.env.example` |
| Persona/eval | `conversations.py`, `persona.v7.txt`, test prompt/Gemini, toàn bộ `backend/evals/`, `PROMPTS.md` |
| Docker/handoff | Dockerfile, .dockerignore, các tài liệu Docker/OAuth/handoff, zip/manifest |
| Thiết kế học tập | PROPOSAL/DESIGN/DATABASE và các hunk README/API/ARCHITECTURE/REQUIREMENTS/TESTING/DECISIONS/CHANGELOG |
| Lịch sử khác | Các tài liệu điều tra VAD/MySQL/Settings; `docs/PROGRESS.md` đã bị xóa trước tác vụ và tiếp tục giữ trạng thái đó |

Nhóm có file dùng chung, nhất là tài liệu và `.env.example`; không stage theo
toàn file hoặc `git add .`. Nhóm mới sau này phải so với snapshot đầu lát cắt,
không coi toàn bộ `git diff HEAD` là thay đổi của Từ vựng.

## 2. Tiến trình và baseline

Tại lúc kiểm tra có 7 Node PID: 23528, 13448, 15312, 34152, 33436, 12876,
11508; parent gồm CCXProcess, ChatGPT, codex và cmd. Không có command line khớp
vitest/vite/pytest trong mẫu lọc, nhưng chưa chứng minh không có tác vụ khác.
Docker đang chạy `engmate-ai-frontend-1` (5174), `engmate-ai-backend-1` (8010),
`engmate-ai-share-1` (5180), cùng Edge/Docker Desktop. Không dừng tiến trình nào.
Người dùng cần xác nhận các agent/test/build khác đã tạm dừng trước lần baseline;
kiểm lại process ngay trước chạy, không chạy MySQL/build/browser đồng thời.

### Lệnh G1 — tạo worktree đo sạch (chờ duyệt)

Chạy tại repo gốc; đường đích phải chưa tồn tại, tên branch chưa bị dùng.

```powershell
git worktree add --detach "../EngMate-AI-vocabulary-20261115" e5097223d6a8648b9bccb2201f7af355059758ca
```

Không checkout/reset/stash/clean repo gốc. HEAD sạch không chứa sửa đổi OAuth,
CSS, VAD hoặc persona chưa commit; báo số test của HEAD theo thực tế, không dùng
kết quả HEAD để khẳng định snapshot làm việc hiện tại đã qua.

### B1–B2 — cài đúng lockfile và chạy duy nhất một baseline sạch

Từ `E:\7-Thực tập BLAZE AI\EngMate-AI-vocabulary-20261115\frontend`, sau G1
và xác nhận cửa sổ chạy độc lập. `package-lock.json`, setup và vitest config của
repo chính không khác HEAD tại thời điểm kiểm tra. Dùng node_modules riêng,
không junction/cache coverage chung. npm ci chỉ cài lockfile hiện có, không thêm
dependency hoặc sửa manifest; cần mạng registry nếu cache thiếu.

```powershell
npm.cmd ci --no-audit --no-fund
```

Chỉ nếu B1 thành công; tạo thư mục artifact, kiểm status tracked vẫn sạch:

```powershell
New-Item -ItemType Directory -Force -Path '../.artifacts/vocabulary-preflight-20261115' | Out-Null
git status --short
npm.cmd run test:coverage -- --maxWorkers=1 --coverage.reportOnFailure --coverage.reportsDirectory=../.artifacts/vocabulary-preflight-20261115/coverage --reporter=default --reporter=json --outputFile.json=../.artifacts/vocabulary-preflight-20261115/tests.json
```

`reportOnFailure` chỉ giữ bằng chứng coverage khi test lỗi, không hạ ngưỡng hoặc
đổi exit code. JSON lưu full test name/file/failure; ghi lại mọi lỗi, thời gian,
coverage từng chỉ số và exit code. Chưa chạy lệnh nên chưa có danh sách lỗi sạch.

Nếu App lỗi: đọc failure/stack, đo CPU đúng test thất bại bằng hook ngoài source,
kiểm fetch mock/async cleanup/timer và truy vấn accessibility; phân biệt timeout
với assertion không tìm thấy thông báo. Chỉ chạy chẩn đoán mục tiêu cần thiết,
không chạy lặp toàn suite để tìm lượt xanh. Không tăng timeout hoặc sửa assertion.
Profile cũ trong `SETTINGS_TEST_INVESTIGATION.md` là giả thuyết có số đo, chưa là
kết luận nguyên nhân gốc cho lần lỗi mới. Nếu HEAD qua mà snapshot làm việc lỗi,
đối chiếu snapshot sau bước chuyển bên dưới, không quy kết lỗi đã biến mất.

### G2–G4 — chuyển thành worktree triển khai, duyệt riêng sau baseline

Không triển khai ngay trên HEAD cũ vì sẽ mất bối cảnh CSS/VAD/persona hiện tại.
Đề xuất giữ nguyên repo gốc, tạo nhánh ở worktree mới rồi mang snapshot đóng băng
các sửa đổi sẵn có sang đó làm nền; các sửa đổi nền vẫn uncommitted.

```powershell
git -C "../EngMate-AI-vocabulary-20261115" switch -c feat/vocabulary-authored-topics-20261115
```

G3 từ repo gốc, sau khi tạo riêng thư mục artifact và xác nhận không có tác vụ
khác đang sửa file:

```powershell
git diff --binary --output=.artifacts/vocabulary-preflight-20261115/preexisting.patch HEAD
```

G4, kiểm rồi mới apply trong worktree đích, không dùng `--index`:

```powershell
git -C "../EngMate-AI-vocabulary-20261115" apply --check "../EngMate-AI/.artifacts/vocabulary-preflight-20261115/preexisting.patch"
git -C "../EngMate-AI-vocabulary-20261115" apply "../EngMate-AI/.artifacts/vocabulary-preflight-20261115/preexisting.patch"
```

Patch chỉ chứa tracked diff. File untracked phải được chụp riêng từ danh sách
`git ls-files --others --exclude-standard -z`, có SHA-256, copy byte-for-byte và
kiểm hash trước/sau; không sao chép `.env`, `.git`, node_modules hoặc artifact
bị ignore. Trình lệnh/script copy cụ thể để duyệt trước bước này; không coi G1
là quyền chạy G2–G4/copy. Manifest gồm cả trạng thái xóa PROGRESS. Không khôi phục
file đó trong repo gốc; patch sẽ giữ cùng trạng thái xóa trong worktree mới.

Đây là cô lập nơi làm việc, chưa biến lịch sử dirty thành các commit sạch. Diff
lát cắt sẽ so với snapshot này; chỉ commit các hunk mới khi người dùng duyệt
thứ tự commit nền/tính năng. Chưa có lệnh commit/push/stash/reset/clean/remove.

## 3. MySQL test tạm — M1, M2, M3 cần duyệt riêng

Khác với kế hoạch scope cũ: container `engmate-vocabulary-mysql-test-20261115`,
loopback `127.0.0.1:33318`, URL host **localhost**, user `engmate_vocab_test`,
schema `engmate_vocabulary_test`. Tại lần kiểm tra không thấy listener 33318;
kiểm lại lúc chạy. MySQL image 8.0; ghi image ID thực tế, không dùng DB app.
Không mount thư mục/volume cũ, data dir dùng tmpfs riêng. DB ban đầu không bảng;
sau bootstrap chỉ seed CEFR/schema-version, mọi bảng dữ liệu ứng dụng rỗng.
Fixtures hiện chỉ kiểm hậu tố `_test` và NguoiDung rỗng; preflight dưới đây kiểm
thêm đúng URL/schema/user và tất cả bảng ứng dụng.

### M1 — tạo, đợi sẵn sàng và bootstrap DB test mới

Chạy từ root worktree đã được duyệt, trong một PowerShell riêng và giữ terminal
đó cho M2/M3. Không chạy cùng frontend. Lệnh có thể pull image nếu máy chưa có.
Mật khẩu tạm random trong bộ nhớ, không in URL/secret hoặc ghi `.env`.

```powershell
$ErrorActionPreference = 'Stop'
$testContainer = 'engmate-vocabulary-mysql-test-20261115'
$testSchema = 'engmate_vocabulary_test'
$testUser = 'engmate_vocab_test'
$testLabel = 'engmate.vocabulary-test=20261115'
$testPassword = [Guid]::NewGuid().ToString('N')
$rootPassword = [Guid]::NewGuid().ToString('N')
$oldRoot = $env:MYSQL_ROOT_PASSWORD
$oldPassword = $env:MYSQL_PASSWORD
$oldPwd = $env:MYSQL_PWD
docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker unavailable' }
$existing = docker ps -a --filter "name=^/$testContainer$" --format '{{.Names}}'
if ($LASTEXITCODE -ne 0 -or $existing) { throw 'Container name already used' }
if (Get-NetTCPConnection -LocalPort 33318 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Test port already used'
}
try {
  $env:MYSQL_ROOT_PASSWORD = $rootPassword
  $env:MYSQL_PASSWORD = $testPassword
  docker run --detach --name $testContainer --label $testLabel `
    --publish '127.0.0.1:33318:3306' --tmpfs '/var/lib/mysql:rw,size=1g' `
    --env MYSQL_ROOT_PASSWORD --env MYSQL_PASSWORD `
    --env "MYSQL_DATABASE=$testSchema" --env "MYSQL_USER=$testUser" mysql:8.0
  if ($LASTEXITCODE -ne 0) { throw 'Container creation failed' }
  docker inspect --format '{{.Image}}' $testContainer
  if ($LASTEXITCODE -ne 0) { throw 'Image identification failed' }
  $env:MYSQL_PWD = $testPassword
  $ready = $false
  for ($probe = 0; $probe -lt 60; $probe++) {
    $ErrorActionPreference = 'Continue'
    docker exec --env MYSQL_PWD $testContainer mysql --user=$testUser `
      --batch --skip-column-names --execute='SELECT 1' $testSchema 2>$null
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) { throw 'MySQL readiness failed; request M3 cleanup' }
  $tables = docker exec --env MYSQL_PWD $testContainer mysql --user=$testUser `
    --batch --skip-column-names --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$testSchema'"
  if ($LASTEXITCODE -ne 0 -or "$tables".Trim() -ne '0') { throw 'Schema not empty' }
  $bootstrap = Get-Content -LiteralPath './gemini-code-1791478978574.sql' -Raw -Encoding UTF8
  if ([regex]::Matches($bootstrap, '(?m)^CREATE DATABASE IF NOT EXISTS EngMateAI ').Count -ne 1 -or
      [regex]::Matches($bootstrap, '(?m)^USE EngMateAI;').Count -ne 1) { throw 'Unexpected bootstrap' }
  $bootstrap = $bootstrap.Replace('CREATE DATABASE IF NOT EXISTS EngMateAI ', "CREATE DATABASE IF NOT EXISTS $testSchema ")
  $bootstrap = $bootstrap.Replace('USE EngMateAI;', "USE $testSchema;")
  $oldEncoding = $OutputEncoding
  try {
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
    $env:MYSQL_PWD = $rootPassword
    $bootstrap | docker exec --interactive --env MYSQL_PWD $testContainer mysql --user=root $testSchema
    if ($LASTEXITCODE -ne 0) { throw 'Test bootstrap failed; request M3 cleanup' }
  } finally { $OutputEncoding = $oldEncoding }
} finally {
  $env:MYSQL_ROOT_PASSWORD = $oldRoot
  $env:MYSQL_PASSWORD = $oldPassword
  $env:MYSQL_PWD = $oldPwd
}
```

### M2 — kiểm cách ly/rỗng rồi chạy coverage backend

Chưa cài bảng vocabulary trong bước baseline. Python dùng virtualenv sẵn có
của repo gốc; source/pytest working directory là root worktree đang xét. Đường
Python dưới đây đúng cho worktree sibling đã đề xuất, không dùng `.env` thật.
Gọi pytest trực tiếp với cùng tham số coverage của manage.py vì wrapper đó luôn
tìm `.venv` bên trong worktree mới; không tự cài hoặc tạo junction virtualenv.

```powershell
$python = 'E:\7-Thực tập BLAZE AI\EngMate-AI\.venv\Scripts\python.exe'
$oldTestUrl = $env:MYSQL_TEST_URL
try {
  $label = docker inspect --format '{{index .Config.Labels "engmate.vocabulary-test"}}' $testContainer
  if ($LASTEXITCODE -ne 0 -or $label -ne '20261115') { throw 'Wrong test container' }
  $env:MYSQL_TEST_URL = "mysql+pymysql://${testUser}:${testPassword}@localhost:33318/${testSchema}?charset=utf8mb4"
  @'
import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
url = make_url(os.environ['MYSQL_TEST_URL'])
assert url.host == 'localhost' and url.port == 33318
assert url.username == 'engmate_vocab_test'
assert url.database == 'engmate_vocabulary_test' and url.database.endswith('_test')
engine = create_engine(url, hide_parameters=True)
with engine.connect() as connection:
    names = inspect(connection).get_table_names()
    assert len(names) == 13
    for name in names:
        assert name.replace('_', '').isalnum()
        if name not in {'TrinhDoCEFR', 'PhienBanCauTruc'}:
            assert connection.execute(text(f'SELECT COUNT(*) FROM `{name}`')).scalar_one() == 0
engine.dispose()
print('PASS: isolated URL and empty application tables')
'@ | & $python -
  if ($LASTEXITCODE -ne 0) { throw 'Database preflight failed' }
  Push-Location './backend'
  try {
    & $python -c "from pathlib import Path; import app.core.config as c; assert Path(c.__file__).resolve().parents[2] == Path.cwd()"
    if ($LASTEXITCODE -ne 0) { throw 'Python imported the wrong worktree' }
    & $python -m pytest --cov --cov-report=term-missing --cov-report=xml --cov-report=html
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests/coverage failed; record failure' }
  } finally { Pop-Location }
} finally { $env:MYSQL_TEST_URL = $oldTestUrl }
```

### M3 — xóa đúng container test, chỉ sau duyệt

```powershell
$label = docker inspect --format '{{index .Config.Labels "engmate.vocabulary-test"}}' $testContainer
if ($LASTEXITCODE -ne 0 -or $label -ne '20261115') { throw 'Cleanup refused: label mismatch' }
docker rm --force --volumes $testContainer
if ($LASTEXITCODE -ne 0) { throw 'Test container cleanup failed' }
Remove-Variable testPassword,rootPassword
```

M3 là lệnh xóa, được trình riêng và chưa chạy. Không xóa image, container app,
volume khác hoặc prune. Nếu M1/M2 lỗi, giữ kết quả lỗi và xin/chạy M3 chỉ khi đã
được duyệt; không tái dùng schema có dữ liệu cho lần khác.

## 4. Nhóm commit đề xuất sau lát cắt

1. `docs: record vocabulary approvals and isolated baseline`
2. `feat(vocabulary): add two authored topics and read-only catalog API`
3. `feat(vocabulary): persist word states with installation fallback`
4. `feat(vocabulary): add study views and capability-gated audio`
5. `fix(ui): clarify self-selected level label`

Test đi cùng thay đổi tương ứng; ảnh và phiếu rà nội dung trình sau lát cắt.
Không có commit sinh AI hoặc 16 chủ đề tiếp theo. Không tự stage/commit/push.

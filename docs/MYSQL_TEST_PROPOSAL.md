# MySQL test tạm — chỉ đề xuất, chưa chạy

Ngày 15/11/2026. Chờ duyệt trước khi pull image, tạo container/schema/tài khoản
hoặc chạy 24 test tích hợp. Không sửa `.env`, không dùng DB thật, không hạ 80%.

Fixture `backend/tests/integration/test_chat_database.py:36` bỏ qua nếu thiếu
MYSQL_TEST_URL, **assert tên schema có hậu tố `_test` trước create_engine**,
assert bảng NguoiDung không có hàng trước yield, rollback transaction sau test.
Đã xác nhận bằng đọc code; chưa thử fixture trên MySQL. Fixture **không kiểm
localhost, port, user, container, hay mọi bảng rỗng**. Không được coi hậu tố
`_test` là đủ bảo vệ DB thật. Các chốt bổ sung dưới đây nằm trong phương án chạy,
chưa sửa fixture/backend. SQL seed CEFR/schema version được phép; dữ liệu người
dùng/hội thoại/lộ trình phải rỗng trước test.

## Lệnh PowerShell đề xuất, từ root repo

Chạy nguyên khối trong terminal riêng **sau khi duyệt**. Container có tên riêng,
bind loopback `127.0.0.1:33317`, user chỉ có quyền schema test. Không mount dữ
liệu host, không dùng Docker Compose của app, không dùng volume sản xuất.
Mật khẩu ngẫu nhiên chỉ nằm trong tiến trình/container, không in hoặc ghi file.
MySQL 8.0 là ví dụ theo yêu cầu; cần ghi image ID thực tế sau pull để tái lập.

```powershell
$ErrorActionPreference = 'Stop'
$testContainer = 'engmate-scope-audit-mysql-test'
$testSchema = 'engmate_scope_audit_test'
$testLabel = 'engmate.scope-audit-test=20261115'
$oldTestUrl = $env:MYSQL_TEST_URL
$oldRootPassword = $env:MYSQL_ROOT_PASSWORD
$oldTestPassword = $env:MYSQL_PASSWORD
$oldMysqlPwd = $env:MYSQL_PWD
$createdTestContainer = $false
docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker unavailable' }
$existing = docker ps -a --filter "name=^/$testContainer$" --format '{{.Names}}'
if ($LASTEXITCODE -ne 0 -or $existing) { throw 'Container name already used; stop' }
if (Get-NetTCPConnection -LocalPort 33317 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Test port already used; stop'
}
$env:MYSQL_ROOT_PASSWORD = [Guid]::NewGuid().ToString('N')
$env:MYSQL_PASSWORD = [Guid]::NewGuid().ToString('N')
$env:MYSQL_PWD = $env:MYSQL_PASSWORD
try {
  docker run --detach --name $testContainer --label $testLabel `
    --publish '127.0.0.1:33317:3306' `
    --env MYSQL_ROOT_PASSWORD --env MYSQL_PASSWORD `
    --env "MYSQL_DATABASE=$testSchema" --env 'MYSQL_USER=engmate_test' mysql:8.0
  if ($LASTEXITCODE -ne 0) { throw 'Container creation failed' }
  $createdTestContainer = $true
  $ready = $false
  for ($probe = 0; $probe -lt 60; $probe++) {
    $ErrorActionPreference = 'Continue'
    docker exec --env MYSQL_PWD $testContainer mysql --user=engmate_test `
      --batch --skip-column-names --execute='SELECT 1' $testSchema 2>$null
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) { throw 'MySQL test startup failed' }
  $tables = docker exec --env MYSQL_PWD $testContainer mysql --user=engmate_test `
    --batch --skip-column-names --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$testSchema'"
  if ($LASTEXITCODE -ne 0 -or $tables.Trim() -ne '0') { throw 'Schema not empty' }
  $bootstrap = Get-Content -LiteralPath '.\gemini-code-1791478978574.sql' -Raw -Encoding UTF8
  if ([regex]::Matches($bootstrap, '(?m)^CREATE DATABASE IF NOT EXISTS EngMateAI ').Count -ne 1 -or
      [regex]::Matches($bootstrap, '(?m)^USE EngMateAI;').Count -ne 1) { throw 'Unexpected bootstrap' }
  $bootstrap = $bootstrap.Replace('CREATE DATABASE IF NOT EXISTS EngMateAI ', "CREATE DATABASE IF NOT EXISTS $testSchema ")
  $bootstrap = $bootstrap.Replace('USE EngMateAI;', "USE $testSchema;")
  $oldEncoding = $OutputEncoding
  try {
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
    $env:MYSQL_PWD = $env:MYSQL_ROOT_PASSWORD
    $bootstrap | docker exec --interactive --env MYSQL_PWD $testContainer mysql --user=root $testSchema
    if ($LASTEXITCODE -ne 0) { throw 'Test bootstrap failed' }
  } finally {
    $OutputEncoding = $oldEncoding
    $env:MYSQL_PWD = $env:MYSQL_PASSWORD
  }
  $env:MYSQL_TEST_URL = "mysql+pymysql://engmate_test:$($env:MYSQL_PASSWORD)@127.0.0.1:33317/${testSchema}?charset=utf8mb4"
  @'
import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
url = make_url(os.environ['MYSQL_TEST_URL'])
assert url.host == '127.0.0.1' and url.port == 33317
assert url.username == 'engmate_test' and url.database == 'engmate_scope_audit_test'
assert url.database.endswith('_test')
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
'@ | .\.venv\Scripts\python.exe -
  if ($LASTEXITCODE -ne 0) { throw 'Preflight refused database' }
  python scripts/manage.py coverage-backend
  if ($LASTEXITCODE -ne 0) { throw 'Backend coverage/test failed; retain logs, still clean container' }
} finally {
  try {
    if ($createdTestContainer) {
      $labelsJson = docker inspect --format '{{json .Config.Labels}}' $testContainer
      $inspectOk = $LASTEXITCODE -eq 0
      $label = if ($inspectOk) { ($labelsJson | ConvertFrom-Json).'engmate.scope-audit-test' } else { '' }
      if ($inspectOk -and $label -eq '20261115') {
        docker rm --force --volumes $testContainer
        if ($LASTEXITCODE -ne 0) { Write-Warning 'Test container cleanup failed; inspect this exact container' }
      } else { Write-Warning 'Label mismatch: do not remove an unidentified container' }
    }
  } catch { Write-Warning 'Cleanup could not finish; inspect the dedicated test container' }
  finally {
    $env:MYSQL_TEST_URL = $oldTestUrl
    $env:MYSQL_ROOT_PASSWORD = $oldRootPassword
    $env:MYSQL_PASSWORD = $oldTestPassword
    $env:MYSQL_PWD = $oldMysqlPwd
  }
}
```

Vòng chờ trên chỉ là readiness của container được đề xuất, không đổi timeout
của test. Không dùng `docker system prune`, không xóa image/volume khác.
Root chỉ bootstrap DDL/trigger bên trong container test mới; test Python dùng
user engmate_test riêng, không dùng root. Lệnh chưa chạy thực tế trên Docker.
`docker rm --volumes` chỉ xóa container vừa tạo cùng anonymous volume của nó;
phải kiểm nhãn trước cleanup. Nếu terminal bị đóng cưỡng bức, finally có thể
không chạy: kiểm lại đúng tên/nhãn rồi mới xóa container đó bằng cùng lệnh.

Rủi ro: pull image cần mạng/dung lượng; MySQL tốn RAM/CPU, có thể làm test UI
chậm; port có thể bị chiếm giữa preflight và run (Docker phải fail); DDL tự
commit nên rollback không hoàn tác bootstrap; Docker admin có thể xem mật
khẩu test trong env container; kết thúc test chưa bảo đảm đạt coverage 80%.
Chạy backend riêng, không đồng thời benchmark/frontend. Không in URL hoặc
docker inspect đầy đủ. Không tự khởi động app với URL test.

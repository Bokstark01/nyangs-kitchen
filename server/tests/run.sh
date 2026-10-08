#!/usr/bin/env bash
# 로그인 API 자동 점검 (PHP + SQLite만 있으면 돼요):  bash server/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(mktemp -d)
cat > "$T/config.php" <<PHP
<?php return ['db_dsn'=>'sqlite:$T/test.db','db_user'=>'','db_pass'=>'','base_url'=>'http://127.0.0.1:8099','app_redirect'=>'com.nyangskitchen.app://auth','allowed_origins'=>['https://localhost','null'],'kakao_rest_key'=>'testkakao','kakao_client_secret'=>'','google_client_id'=>'','google_client_secret'=>'','token_days'=>90];
PHP
php -r "(new PDO('sqlite:$T/test.db'))->exec(file_get_contents('tests/schema.sqlite.sql'));"
NK_CONFIG="$T/config.php" php -S 127.0.0.1:8099 -t public > "$T/server.log" 2>&1 &
PID=$!; trap 'kill $PID 2>/dev/null; rm -rf "$T"' EXIT
sleep 1
DBDSN="sqlite:$T/test.db" php tests/api-test.php | tee "$T/result.txt"
grep -q "ALL PASSED" "$T/result.txt"

#!/usr/bin/env bash
# 관리자 페이지 비밀번호 정하기 (서버에서 root로):  bash server/tools/admin-password.sh
# 비밀번호는 화면에 보이지 않고, 복원할 수 없는 해시만 server/admin.hash 에 저장돼요.
set -euo pipefail
cd "$(dirname "$0")/.."
read -r -s -p "새 관리자 비밀번호 (12자 이상): " P1; echo
read -r -s -p "한 번 더: " P2; echo
[ "$P1" = "$P2" ] || { echo "두 번 입력한 비밀번호가 달라요."; exit 1; }
[ "${#P1}" -ge 12 ] || { echo "12자 이상으로 정해주세요."; exit 1; }
printf '%s' "$P1" | php -r 'echo password_hash(stream_get_contents(STDIN), PASSWORD_DEFAULT);' > admin.hash
unset P1 P2
chown root:www-data admin.hash 2>/dev/null || true
chmod 640 admin.hash
echo "저장했어요. https://api.nyangs-kitchen.com/admin.php 에서 로그인하세요."

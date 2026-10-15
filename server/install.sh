#!/usr/bin/env bash
# 냥's 키친 로그인 서버 자동 설치 (새 Ubuntu 22.04/24.04 서버용, root로 실행)
#
#   처음 (도메인 없이):   bash install.sh
#   도메인 연결 후:       bash install.sh api.도메인.com
#
# 여러 번 실행해도 안전해요. 이미 만든 DB와 config.php(DB 비밀번호, 카카오·구글 키)는 그대로 둬요.
# DB 비밀번호는 서버 안에서 무작위로 만들어 config.php 에만 저장하고 화면에 출력하지 않아요.
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-1984bok@gmail.com}"          # Let's Encrypt 인증서 만료 안내 메일
APP_DIR=/var/www/nyangs-kitchen
REPO=https://github.com/Bokstark01/nyangs-kitchen.git
CONF="$APP_DIR/server/config.php"

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m[!] %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "root로 실행해 주세요 (sudo -i 후 다시)"; exit 1; }

say "1/6 필요한 프로그램 설치 (몇 분 걸려요)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q apache2 mysql-server php libapache2-mod-php php-mysql php-curl php-mbstring \
  git curl openssl certbot python3-certbot-apache ufw >/dev/null
systemctl enable --now apache2 mysql >/dev/null 2>&1 || true

say "2/6 방화벽: SSH(22), 웹(80, 443) 열기"
ufw allow OpenSSH >/dev/null
ufw allow 'Apache Full' >/dev/null
ufw status | grep -qi "inactive" && echo "ufw 꺼져 있음 (Vultr 방화벽만 사용)" || ufw status | sed -n '1,12p'

say "3/6 코드 받기"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only -q
else
  git clone -q "$REPO" "$APP_DIR"
fi
echo "$(git -C "$APP_DIR" log -1 --format='%h %s')"

say "4/6 데이터베이스"
mysql -e "CREATE DATABASE IF NOT EXISTS nyangs_kitchen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if [ ! -f "$CONF" ]; then
  DB_PASS="$(openssl rand -hex 24)"
  mysql -e "CREATE USER IF NOT EXISTS 'nyangs_kitchen'@'localhost' IDENTIFIED BY '$DB_PASS';
            ALTER USER 'nyangs_kitchen'@'localhost' IDENTIFIED BY '$DB_PASS';
            GRANT SELECT, INSERT, UPDATE, DELETE ON nyangs_kitchen.* TO 'nyangs_kitchen'@'localhost';
            FLUSH PRIVILEGES;"
  sed -e "s|여기에_DB_비밀번호|$DB_PASS|" "$APP_DIR/server/config.sample.php" > "$CONF"
  unset DB_PASS
  echo "새 DB 계정을 만들고 config.php 에 저장했어요 (비밀번호는 출력하지 않아요)"
else
  echo "config.php 가 이미 있어서 DB 계정은 그대로 둬요"
fi
mysql nyangs_kitchen < "$APP_DIR/server/schema.sql"
echo "테이블 준비 완료"

PUBLIC_IP="$(hostname -I | awk '{print $1}')"
if [ -n "$DOMAIN" ]; then BASE="https://$DOMAIN"; NAME="$DOMAIN"; else BASE="http://$PUBLIC_IP"; NAME="$PUBLIC_IP"; fi
sed -i "s|'base_url' => '[^']*'|'base_url' => '$BASE'|" "$CONF"
chown root:www-data "$CONF" && chmod 640 "$CONF"
# 공유한 급식소의 작은 고양이 사진 보관 폴더 (웹 주소로는 열리지 않는 곳)
mkdir -p "$APP_DIR/server/storage/shares" "$APP_DIR/server/storage/lost"
chown -R www-data:www-data "$APP_DIR/server/storage" && chmod 750 "$APP_DIR/server/storage"

say "5/6 웹서버(Apache) 사이트 설정: $NAME"
sed -e "s|ServerName .*|ServerName $NAME|" "$APP_DIR/server/apache-nyangs-kitchen.conf" \
  > /etc/apache2/sites-available/nyangs-kitchen.conf
a2ensite -q nyangs-kitchen >/dev/null
a2dissite -q 000-default >/dev/null 2>&1 || true
apache2ctl configtest 2>&1 | tail -1
systemctl reload apache2
HEALTH="$(curl -s -H "Host: $NAME" "http://127.0.0.1/api.php?action=health" || true)"
echo "서버 점검: $HEALTH"

say "6/6 소개 홈페이지와 HTTPS 인증서"
dns_ok() { [ "$(getent ahostsv4 "$1" | awk 'NR==1{print $1}')" = "$PUBLIC_IP" ]; }
if [ -z "$DOMAIN" ]; then
  warn "도메인이 아직 없어서 HTTPS는 건너뛰어요. 도메인 연결 후:  bash $APP_DIR/server/install.sh api.도메인"
else
  # 로그인 서버 (api.도메인)
  if dns_ok "$DOMAIN"; then
    certbot --apache -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect -q --keep-until-expiring
    echo "https 점검: $(curl -s "https://$DOMAIN/api.php?action=health" || true)"
  else
    warn "$DOMAIN 이 아직 이 서버($PUBLIC_IP)를 가리키지 않아요. 가비아 DNS의 A 레코드를 확인하고 10~30분 뒤 다시 실행하세요."
  fi
  # 소개 홈페이지 (도메인 · www.도메인) → 저장소의 docs 폴더
  ROOT="${DOMAIN#api.}"
  if [ "$ROOT" != "$DOMAIN" ]; then
    SITE_NAMES=""
    for h in "$ROOT" "www.$ROOT"; do dns_ok "$h" && SITE_NAMES="$SITE_NAMES $h"; done
    cat > /etc/apache2/sites-available/nyangs-kitchen-site.conf <<CONF
<VirtualHost *:80>
    ServerName $ROOT
    ServerAlias www.$ROOT
    DocumentRoot $APP_DIR/docs
    <Directory $APP_DIR/docs>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>
    ErrorLog \${APACHE_LOG_DIR}/nyangs-kitchen-site-error.log
    CustomLog \${APACHE_LOG_DIR}/nyangs-kitchen-site-access.log combined
</VirtualHost>
CONF
    a2ensite -q nyangs-kitchen-site >/dev/null
    systemctl reload apache2
    if [ -n "$SITE_NAMES" ]; then
      ARGS=""; for h in $SITE_NAMES; do ARGS="$ARGS -d $h"; done
      # shellcheck disable=SC2086
      certbot --apache $ARGS --cert-name "$ROOT" --expand --non-interactive --agree-tos -m "$EMAIL" --redirect -q --keep-until-expiring
      for h in $SITE_NAMES; do echo "홈페이지 점검 https://$h : $(curl -s -o /dev/null -w '%{http_code}' "https://$h/")"; done
    else
      warn "$ROOT, www.$ROOT 가 아직 이 서버를 가리키지 않아요. 가비아 DNS에 @ 와 www A 레코드를 넣고 다시 실행하세요."
    fi
  fi
fi

say "끝! 위의 '서버 점검' 줄에 {\"ok\":true ...} 가 보이면 성공이에요. 이 화면을 캡처해서 Claude에게 보내주세요."

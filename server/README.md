# 냥's 키친 로그인 서버 설치 (Ubuntu 22.04 · Apache2 · MySQL · PHP)

앱의 회원가입·이메일 로그인·카카오 로그인·구글 로그인을 처리하는 서버예요. PHP 파일 몇 개와 MySQL 테이블 5개로 되어 있어요.

## 0. 꼭 필요한 것: 도메인과 HTTPS

앱은 보안상 **https 주소로만** 서버와 통신해요. 구글 로그인도 IP 주소가 아닌 도메인이 있어야 돼요.

- 유료 도메인: 가비아, Cloudflare 등에서 1년 1~2만 원
- 무료로 시작: [DuckDNS](https://www.duckdns.org)에서 `원하는이름.duckdns.org` 를 만들고 서버 IP를 넣기

도메인이 서버 IP를 가리키게 한 뒤 아래를 진행하세요. 아래 예시에서는 도메인을 `api.example.com` 이라고 할게요.

## 1. 필요한 프로그램

```bash
sudo apt update
sudo apt install -y git php-mysql php-curl php-mbstring certbot python3-certbot-apache
sudo systemctl restart apache2
```

## 2. 코드 받기

```bash
sudo git clone https://github.com/Bokstark01/nyangs-kitchen.git /var/www/nyangs-kitchen
```

나중에 업데이트할 때: `cd /var/www/nyangs-kitchen && sudo git pull`

## 3. 데이터베이스 만들기

```bash
sudo mysql
```

MySQL 안에서 (비밀번호는 새로 정하세요):

```sql
CREATE DATABASE nyangs_kitchen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nyangs_kitchen'@'localhost' IDENTIFIED BY '새_DB_비밀번호';
GRANT SELECT, INSERT, UPDATE, DELETE ON nyangs_kitchen.* TO 'nyangs_kitchen'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

테이블 만들기:

```bash
sudo mysql nyangs_kitchen < /var/www/nyangs-kitchen/server/schema.sql
```

## 4. 설정 파일

```bash
cd /var/www/nyangs-kitchen/server
sudo cp config.sample.php config.php
sudo nano config.php
```

- `db_pass` : 3번에서 정한 DB 비밀번호
- `base_url` : `https://api.example.com` (끝에 / 없이)
- 카카오·구글 값은 6·7번에서 채워요. 비워두면 그 로그인만 꺼져 있어요.

권한 정리 (웹서버만 읽게):

```bash
sudo chown root:www-data config.php && sudo chmod 640 config.php
```

## 5. Apache 사이트 연결과 HTTPS

```bash
sudo cp /var/www/nyangs-kitchen/server/apache-nyangs-kitchen.conf /etc/apache2/sites-available/nyangs-kitchen.conf
sudo nano /etc/apache2/sites-available/nyangs-kitchen.conf     # ServerName 을 api.example.com 으로
sudo a2ensite nyangs-kitchen
sudo systemctl reload apache2
sudo certbot --apache -d api.example.com
```

확인: 브라우저에서 `https://api.example.com/api.php?action=health` 를 열었을 때 `{"ok":true,...}` 가 나오면 성공이에요.

## 6. 카카오 로그인 켜기 (카카오 개발자 콘솔, 컴퓨터로)

1. **앱 → 플랫폼 키 → REST API 키**를 누르세요.
2. **카카오 로그인 Redirect URI**에 `https://api.example.com/kakao.php` 를 등록하세요.
3. 같은 화면의 **클라이언트 시크릿**을 켜고 코드를 복사하세요.
4. **카카오 로그인 → 사용 설정**을 ON으로 바꾸세요.
5. **카카오 로그인 → 동의항목**에서 **닉네임**을 '필수 동의'로 설정하세요. 이메일은 비즈 앱(사업자 정보 등록) 전환 후 '선택 동의'로 추가할 수 있어요.
6. `config.php` 에 `kakao_rest_key` (REST API 키)와 `kakao_client_secret` 을 넣으세요.

## 7. 구글 로그인 켜기 (Google Cloud 콘솔)

1. [console.cloud.google.com](https://console.cloud.google.com)에서 새 프로젝트를 만드세요.
2. **Google 인증 플랫폼(OAuth 동의 화면)** 에서 앱 이름 '냥's 키친', 지원 이메일, 외부(External)로 설정하세요.
3. **클라이언트 → 클라이언트 만들기 → 웹 애플리케이션**을 고르세요.
4. **승인된 리디렉션 URI**에 `https://api.example.com/google.php` 를 넣으세요.
5. 만들어진 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 `config.php` 의 `google_client_id`, `google_client_secret` 에 넣으세요.
6. 테스트 중에는 **대상(Audience) → 테스트 사용자**에 로그인할 구글 계정을 추가하거나, 앱을 '게시(In production)'로 바꾸세요.

## 8. 앱에 서버 주소 알려주기

`https://api.example.com` 을 Claude에게 알려주면 앱(`www/config.js`의 `apiBase`)에 넣어 새 APK를 만들어요.

## 점검과 보안 메모

- 자동 점검: `bash server/tests/run.sh` (PHP와 SQLite만 있으면 돼요. 서버 DB는 건드리지 않아요)
- 비밀번호는 PHP `password_hash` 로만 저장하고, 로그인 토큰도 해시만 저장해요.
- 같은 IP에서 로그인 시도가 15분에 20번을 넘으면 잠시 막아요.
- `config.php` 는 절대 GitHub에 올리지 마세요. (`.gitignore` 에 들어 있어요)
- 비밀번호 찾기 메일은 아직 없어요. 문의 메일로 받은 요청은 DB에서 해당 회원을 지우고 다시 가입하게 안내하면 돼요.

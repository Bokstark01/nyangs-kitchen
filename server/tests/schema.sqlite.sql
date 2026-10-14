-- 냥's 키친 로그인 테이블 (MySQL 5.7+/8.0, MariaDB 10.3+)
-- 기존 서비스와 섞이지 않게 별도 데이터베이스(nyangs_kitchen)에 만드는 걸 권장해요.
CREATE TABLE IF NOT EXISTS nk_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  provider      VARCHAR(16)  NOT NULL,            -- email | kakao | google
  provider_id   VARCHAR(191) NOT NULL,            -- 이메일 가입은 이메일, 카카오·구글은 고유 ID
  email         VARCHAR(191) NULL,
  password_hash VARCHAR(255) NULL,                -- 이메일 가입만
  nickname      VARCHAR(80)  NOT NULL,
  created_at    INT NOT NULL,
  last_login_at INT NOT NULL,
  UNIQUE (provider, provider_id)
);

CREATE TABLE IF NOT EXISTS nk_tokens (
  token_hash CHAR(64)     NOT NULL PRIMARY KEY,   -- 토큰 원문은 저장하지 않고 해시만
  user_id    INT NOT NULL,
  created_at INT NOT NULL,
  expires_at INT NOT NULL
);

CREATE TABLE IF NOT EXISTS nk_codes (
  code_hash  CHAR(64)     NOT NULL PRIMARY KEY,   -- 카카오·구글 로그인 뒤 앱으로 넘기는 5분짜리 1회용 코드
  user_id    INT NOT NULL,
  expires_at INT NOT NULL
);

CREATE TABLE IF NOT EXISTS nk_oauth (
  state_hash CHAR(64)     NOT NULL PRIMARY KEY,   -- 로그인 위조 방지용 state (10분)
  provider   VARCHAR(16)  NOT NULL,
  created_at INT NOT NULL
);

CREATE TABLE IF NOT EXISTS nk_attempts (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ip     VARCHAR(45)  NOT NULL,
  action VARCHAR(16)  NOT NULL,
  at     INT NOT NULL
);


CREATE TABLE IF NOT EXISTS nk_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INT NOT NULL, nid VARCHAR(40) NOT NULL, name VARCHAR(60) NOT NULL,
  lat DOUBLE NOT NULL, lng DOUBLE NOT NULL, memo VARCHAR(300) NOT NULL DEFAULT '', times TEXT NOT NULL, cats TEXT NOT NULL,
  created_at INT NOT NULL, updated_at INT NOT NULL, UNIQUE (owner_id, nid));
CREATE TABLE IF NOT EXISTS nk_share_members (share_id INT NOT NULL, user_id INT NOT NULL, joined_at INT NOT NULL, PRIMARY KEY (share_id, user_id));
CREATE TABLE IF NOT EXISTS nk_invites (code CHAR(8) NOT NULL PRIMARY KEY, share_id INT NOT NULL, created_at INT NOT NULL, expires_at INT NOT NULL);
CREATE TABLE IF NOT EXISTS nk_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, share_id INT NOT NULL, owner_id INT NOT NULL, helper_id INT NULL,
  start_date CHAR(10) NOT NULL, end_date CHAR(10) NOT NULL, note VARCHAR(300) NOT NULL DEFAULT '', status VARCHAR(12) NOT NULL,
  created_at INT NOT NULL, updated_at INT NOT NULL);
CREATE TABLE IF NOT EXISTS nk_feed_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, share_id INT NOT NULL, user_id INT NOT NULL, fed_at INT NOT NULL, note VARCHAR(200) NOT NULL DEFAULT '');

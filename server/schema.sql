-- 냥's 키친 로그인 테이블 (MySQL 5.7+/8.0, MariaDB 10.3+)
-- 기존 서비스와 섞이지 않게 별도 데이터베이스(nyangs_kitchen)에 만드는 걸 권장해요.
CREATE TABLE IF NOT EXISTS nk_users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider      VARCHAR(16)  NOT NULL,            -- email | kakao | google
  provider_id   VARCHAR(191) NOT NULL,            -- 이메일 가입은 이메일, 카카오·구글은 고유 ID
  email         VARCHAR(191) NULL,
  password_hash VARCHAR(255) NULL,                -- 이메일 가입만
  nickname      VARCHAR(80)  NOT NULL,
  created_at    INT UNSIGNED NOT NULL,
  last_login_at INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_provider (provider, provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nk_tokens (
  token_hash CHAR(64)     NOT NULL PRIMARY KEY,   -- 토큰 원문은 저장하지 않고 해시만
  user_id    INT UNSIGNED NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  expires_at INT UNSIGNED NOT NULL,
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nk_codes (
  code_hash  CHAR(64)     NOT NULL PRIMARY KEY,   -- 카카오·구글 로그인 뒤 앱으로 넘기는 5분짜리 1회용 코드
  user_id    INT UNSIGNED NOT NULL,
  expires_at INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nk_oauth (
  state_hash CHAR(64)     NOT NULL PRIMARY KEY,   -- 로그인 위조 방지용 state (10분)
  provider   VARCHAR(16)  NOT NULL,
  created_at INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nk_attempts (
  id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip     VARCHAR(45)  NOT NULL,
  action VARCHAR(16)  NOT NULL,
  at     INT UNSIGNED NOT NULL,
  KEY idx_ip (ip, action, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

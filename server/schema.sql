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

-- ===== 이웃과 함께 (급식소 공유 · 밥 부탁) =====
-- 공유하기로 고른 급식소만 여기 올라와요. 공유하지 않은 급식소는 휴대폰에만 있어요.
CREATE TABLE IF NOT EXISTS nk_shares (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_id   INT UNSIGNED NOT NULL,
  nid        VARCHAR(40)  NOT NULL,                -- 주인 휴대폰 안의 급식소 번호
  name       VARCHAR(60)  NOT NULL,
  lat        DOUBLE       NOT NULL,
  lng        DOUBLE       NOT NULL,
  memo       VARCHAR(300) NOT NULL DEFAULT '',
  times      TEXT         NOT NULL,                -- ["07:00","19:00"]
  cats       TEXT         NOT NULL,                -- [{"id":"..","name":"치즈","photo":"abc.jpg"}]
  created_at INT UNSIGNED NOT NULL,
  updated_at INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_owner_nid (owner_id, nid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nk_share_members (
  share_id  INT UNSIGNED NOT NULL,
  user_id   INT UNSIGNED NOT NULL,
  joined_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (share_id, user_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nk_invites (
  code       CHAR(8)      NOT NULL PRIMARY KEY,
  share_id   INT UNSIGNED NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  expires_at INT UNSIGNED NOT NULL,
  KEY idx_share (share_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nk_requests (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  share_id   INT UNSIGNED NOT NULL,
  owner_id   INT UNSIGNED NOT NULL,
  helper_id  INT UNSIGNED NULL,                    -- 비어 있으면 공유받은 누구나 수락 가능
  start_date CHAR(10)     NOT NULL,
  end_date   CHAR(10)     NOT NULL,
  note       VARCHAR(300) NOT NULL DEFAULT '',
  status     VARCHAR(12)  NOT NULL,                -- pending | accepted | declined | cancelled
  created_at INT UNSIGNED NOT NULL,
  updated_at INT UNSIGNED NOT NULL,
  KEY idx_share (share_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nk_feed_logs (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  share_id INT UNSIGNED NOT NULL,
  user_id  INT UNSIGNED NOT NULL,
  fed_at   INT UNSIGNED NOT NULL,
  note     VARCHAR(200) NOT NULL DEFAULT '',
  KEY idx_share (share_id, fed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

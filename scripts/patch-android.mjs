// cap add android 이후 실행: 권한, AdMob 앱 ID, 앱 이름, 아이콘, 서명 키를 넣는다.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const main = path.join(root, 'android/app/src/main');
const manifestPath = path.join(main, 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

// 필요한 권한만 선언. 사진은 시스템 사진 선택기/카메라 앱을 쓰므로 저장소·카메라 권한이 필요 없다.
const permissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED'
];
// 플러그인이 끼워 넣더라도 최종 앱에서 빠지게 할 권한 (Play 정책상 별도 심사가 필요한 권한들)
const removed = [
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.CAMERA'
];
if (!manifest.includes('xmlns:tools=')) {
  manifest = manifest.replace(/<manifest\b/, '<manifest xmlns:tools="http://schemas.android.com/tools"');
}
const permXml = permissions
  .filter(p => !manifest.includes(`"${p}"`))
  .map(p => `    <uses-permission android:name="${p}" />`).join('\n');
const removeXml = removed.map(p => `    <uses-permission android:name="${p}" tools:node="remove" />`).join('\n');
const extra = `${permXml}
${removeXml}
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
`;
manifest = manifest.replace(/<application/, `${extra}\n    <application`);

// 로그인 후 앱으로 돌아오는 주소: com.nyangskitchen.app://auth
manifest = manifest.replace(/<\/activity>/, `    <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.nyangskitchen.app" android:host="auth" />
                <data android:scheme="com.nyangskitchen.app" android:host="join" />
            </intent-filter>
        </activity>`);

// AdMob 테스트 앱 ID (출시 전 본인 AdMob 앱 ID로 교체)
const admobAppId = process.env.ADMOB_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
manifest = manifest.replace(/<\/application>/,
  `    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${admobAppId}" />\n    </application>`);
fs.writeFileSync(manifestPath, manifest);

// 앱 이름 (작은따옴표 이스케이프)
const stringsPath = path.join(main, 'res/values/strings.xml');
let strings = fs.readFileSync(stringsPath, 'utf8');
strings = strings
  .replace(/<string name="app_name">[^<]*<\/string>/, `<string name="app_name">냥\\'s 키친</string>`)
  .replace(/<string name="title_activity_main">[^<]*<\/string>/, `<string name="title_activity_main">냥\\'s 키친</string>`);
fs.writeFileSync(stringsPath, strings);

// 아이콘: 적응형 아이콘(라벤더 그라데이션 배경 + 밥그릇 앞 고양이)과 예전 기기용 PNG 아이콘으로 바꾼다
const res = path.join(main, 'res');
fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
for (const dpi of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi', 'anydpi-v26']) {
  const src = path.join(root, 'resources/android', `mipmap-${dpi}`);
  const dst = path.join(res, `mipmap-${dpi}`);
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}

// 시작 화면: 라벤더 배경 + 밥그릇 앞 고양이 (웹 인트로와 같은 그림)
const splashGreen = '#8E7CF6';
fs.writeFileSync(path.join(res, 'values/nk_colors.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="nk_splash">${splashGreen}</color>\n    <color name="nk_icon_bg">#8E7CF6</color>\n</resources>\n`);
// 앱 아이콘 배경: 라벤더 → 복숭아 그라데이션 (밀크티 파스텔)
fs.mkdirSync(path.join(res, 'drawable'), { recursive: true });
fs.writeFileSync(path.join(res, 'drawable/nk_icon_bg.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:type="linear" android:angle="315" android:startColor="#8E7CF6" android:centerColor="#B79BFF" android:endColor="#FFB8A0" />
</shape>
`);
for (const d of fs.readdirSync(res)) {
  const f = path.join(res, d, 'splash.png');
  if (d.startsWith('drawable') && fs.existsSync(f)) fs.rmSync(f);
}
// 시작 화면은 라벤더 단색만 보여 준다. 고양이는 웹 인트로에서 한 번만 등장해야 두 번 튀어나오지 않는다.
fs.writeFileSync(path.join(res, 'drawable/nk_splash_blank.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@android:color/transparent" />
    <size android:width="288dp" android:height="288dp" />
</shape>
`);
fs.writeFileSync(path.join(res, 'drawable/splash.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/nk_splash" />
</layer-list>
`);
const stylesPath = path.join(res, 'values/styles.xml');
let styles = fs.readFileSync(stylesPath, 'utf8');
styles = styles.replace(/(<style name="AppTheme.NoActionBarLaunch"[^>]*>)/, `$1
        <item name="windowSplashScreenBackground">@color/nk_splash</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/nk_splash_blank</item>
        <item name="android:statusBarColor">@color/nk_splash</item>
        <item name="android:navigationBarColor">@color/nk_splash</item>`);
// 시작 화면이 사라진 뒤 웹 화면이 그려지기 전 잠깐 보이는 창 배경도 같은 라벤더로 (흰 화면 깜빡임 방지)
styles = styles.replace(/(<style name="AppTheme.NoActionBar"[^>]*>)/, `$1
        <item name="android:windowBackground">@color/nk_splash</item>`);
fs.writeFileSync(stylesPath, styles);

// 서명과 버전
//  - debug: 저장소에 있는 고정 디버그 키 (덮어 설치 테스트용)
//  - release: 환경변수로 받은 업로드 키 (Play 업로드용). 키 파일은 저장소에 올리지 않는다.
const gradlePath = path.join(root, 'android/app/build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
fs.copyFileSync(path.join(root, 'resources/android/debug.keystore'), path.join(root, 'android/app/nyang-debug.keystore'));
const versionCode = parseInt(process.env.NK_VERSION_CODE || '1', 10);
const versionName = process.env.NK_VERSION_NAME || JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const rel = process.env.NK_RELEASE_KEYSTORE;
gradle += `

// ---- 냥's 키친: 서명·버전 (scripts/patch-android.mjs가 추가) ----
android {
    defaultConfig {
        versionCode ${versionCode}
        versionName "${versionName}"
    }
    signingConfigs {
        debug {
            storeFile file('nyang-debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
${rel ? `        release {
            storeFile file(System.getenv('NK_RELEASE_KEYSTORE'))
            storePassword System.getenv('NK_RELEASE_STORE_PASSWORD')
            keyAlias System.getenv('NK_RELEASE_KEY_ALIAS')
            keyPassword System.getenv('NK_RELEASE_KEY_PASSWORD')
        }` : ''}
    }
    buildTypes {
        debug { signingConfig signingConfigs.debug }
${rel ? '        release { signingConfig signingConfigs.release }' : ''}
    }
}
`;
fs.writeFileSync(gradlePath, gradle);
console.log(`versionCode ${versionCode}, versionName ${versionName}, release signing: ${rel ? 'on' : 'off'}`);

console.log('Android project patched.');

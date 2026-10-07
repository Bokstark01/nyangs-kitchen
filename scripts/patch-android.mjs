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

// 아이콘: 적응형 아이콘 정의를 지우고 PNG 아이콘을 덮어쓴다
const res = path.join(main, 'res');
fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
for (const dpi of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const src = path.join(root, 'resources/android', `mipmap-${dpi}`);
  const dst = path.join(res, `mipmap-${dpi}`);
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}

// 시작 화면: 진한 녹색 배경 + 가운데 고양이
const splashGreen = '#1F4A36';
fs.writeFileSync(path.join(res, 'values/nk_colors.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="nk_splash">${splashGreen}</color>\n</resources>\n`);
for (const d of fs.readdirSync(res)) {
  const f = path.join(res, d, 'splash.png');
  if (d.startsWith('drawable') && fs.existsSync(f)) fs.rmSync(f);
}
fs.mkdirSync(path.join(res, 'drawable-xxhdpi'), { recursive: true });
fs.copyFileSync(path.join(root, 'resources/android/nk_splash_art.png'), path.join(res, 'drawable-xxhdpi/nk_splash_art.png'));
fs.copyFileSync(path.join(root, 'resources/android/nk_splash_icon.png'), path.join(res, 'drawable-xxhdpi/nk_splash_icon.png'));
fs.writeFileSync(path.join(res, 'drawable/splash.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/nk_splash" />
    <item><bitmap android:gravity="center" android:src="@drawable/nk_splash_art" /></item>
</layer-list>
`);
const stylesPath = path.join(res, 'values/styles.xml');
let styles = fs.readFileSync(stylesPath, 'utf8');
styles = styles.replace(/(<style name="AppTheme.NoActionBarLaunch"[^>]*>)/, `$1
        <item name="windowSplashScreenBackground">@color/nk_splash</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/nk_splash_icon</item>
        <item name="android:statusBarColor">@color/nk_splash</item>`);
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

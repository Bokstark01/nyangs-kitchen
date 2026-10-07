// cap add android 이후 실행: 권한, AdMob 앱 ID, 앱 이름, 아이콘, 서명 키를 넣는다.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const main = path.join(root, 'android/app/src/main');
const manifestPath = path.join(main, 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

const permissions = [
  'android.permission.INTERNET',
  'android.permission.CAMERA',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.READ_MEDIA_IMAGES'
];
const permXml = permissions
  .filter(p => !manifest.includes(`"${p}"`))
  .map(p => `    <uses-permission android:name="${p}" />`).join('\n');
const extra = `${permXml}
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
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

// 고정 디버그 서명 키: 새 버전을 지우지 않고 덮어 설치할 수 있게
const gradlePath = path.join(root, 'android/app/build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
fs.copyFileSync(path.join(root, 'resources/android/debug.keystore'), path.join(root, 'android/app/nyang-debug.keystore'));
gradle = gradle.replace(/android\s*\{/, `android {
    signingConfigs {
        debug {
            storeFile file('nyang-debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`);
fs.writeFileSync(gradlePath, gradle);

console.log('Android project patched.');

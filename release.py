#!/usr/bin/env python3
"""
release.py — Football Scores Today release automation.

Python standard library only (no pip dependencies). Locates the project,
validates the bare React Native Android structure, provisions a release
signing keystore, builds a signed APK and AAB, captures emulator
screenshots, and packages everything into releases/ outside the app tree.

Usage:
    python release.py                      # full run
    python release.py --check-env          # environment detection only
    python release.py --clean              # remove build outputs first
    python release.py --no-clean           # skip cleaning (default)
    python release.py --skip-build         # skip the APK/AAB build step
    python release.py --skip-screenshots   # skip screenshot capture
    python release.py --screenshots-only   # only capture screenshots
    python release.py --generate-key-only  # only provision the keystore
"""

import argparse
import json
import os
import platform
import re
import secrets
import shutil
import string
import subprocess
import sys
from pathlib import Path

APP_DISPLAY_NAME = "Football Scores"
PROJECT_DIR_NAME = "FootballScores"
PACKAGE_NAME = "com.oldalexhub.footballscores"
VERSION_NAME = "1.0.0"
VERSION_CODE = 1

ADMOB_APP_ID = "ca-app-pub-7831002909037560~7761656669"
ADMOB_BANNER_ID = "ca-app-pub-7831002909037560/5490596409"
ADMOB_INTERSTITIAL_ID = "ca-app-pub-7831002909037560/8033119406"
GOOGLE_TEST_BANNER_ID = "ca-app-pub-3940256099942544/9214589741"
GOOGLE_TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712"

APP_ID_PATTERN = re.compile(r"^ca-app-pub-\d{16}~\d{10}$")
AD_UNIT_ID_PATTERN = re.compile(r"^ca-app-pub-\d{16}/\d{10}$")

RELEASE_APK_NAME = "Football-Scores-Today-release.apk"
RELEASE_AAB_NAME = "Football-Scores-Today-release.aab"

IS_WINDOWS = platform.system() == "Windows"


class Warnings:
    def __init__(self):
        self.items = []

    def add(self, message):
        self.items.append(message)
        print(f"  [warning] {message}")


def find_project_root():
    """Locate the FootballScores project directory, starting from this
    script's own location (release.py is expected to live at the project
    root) and falling back to searching nearby directories."""
    here = Path(__file__).resolve().parent
    candidates = [here]
    if here.name != PROJECT_DIR_NAME:
        for child in here.glob("**/" + PROJECT_DIR_NAME):
            if child.is_dir() and (child / "package.json").exists():
                candidates.append(child)
    for candidate in candidates:
        if (candidate / "package.json").exists() and (candidate / "android").is_dir():
            return candidate
    print("ERROR: could not locate the FootballScores project root (needs package.json + android/).")
    sys.exit(1)


def validate_bare_rn_structure(root: Path, warnings: Warnings):
    required = [
        "package.json",
        "App.tsx",
        "android/app/build.gradle",
        "android/app/src/main/AndroidManifest.xml",
        "android/settings.gradle",
    ]
    ok = True
    for rel in required:
        if not (root / rel).exists():
            print(f"ERROR: missing required file {rel}")
            ok = False
    if not ok:
        sys.exit(1)
    print("  Bare React Native Android structure looks valid.")


def validate_logo(root: Path, warnings: Warnings):
    logo = root / "assets" / "logo.png"
    if not logo.exists():
        warnings.add(f"assets/logo.png not found at {logo} — app icon generation will use the default RN icon.")
    else:
        print(f"  Found logo: {logo}")


def search_paths_for(name, extra_dirs):
    found = []
    for d in extra_dirs:
        if d and Path(d).exists():
            candidate = Path(d)
            if candidate.is_file() and candidate.name.lower().startswith(name.lower()):
                found.append(candidate)
            elif candidate.is_dir():
                match = candidate / name
                if match.exists():
                    found.append(match)
    return found


def detect_java_home(warnings: Warnings):
    env_home = os.environ.get("JAVA_HOME")
    if env_home and Path(env_home).exists():
        return env_home

    candidates = []
    if IS_WINDOWS:
        program_files = [os.environ.get("ProgramFiles", r"C:\Program Files"),
                          os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")]
        for pf in program_files:
            android_studio_jbr = Path(pf) / "Android" / "Android Studio" / "jbr"
            if android_studio_jbr.exists():
                candidates.append(android_studio_jbr)
            jdk_root = Path(pf) / "Java"
            if jdk_root.exists():
                for entry in sorted(jdk_root.glob("jdk*"), reverse=True):
                    candidates.append(entry)
    else:
        for base in ["/Applications/Android Studio.app/Contents/jbr/Contents/Home",
                     str(Path.home() / "Android/Studio/jbr"),
                     "/usr/lib/jvm"]:
            p = Path(base)
            if p.exists():
                if (p / "bin" / "java").exists() or (p / "bin" / "java.exe").exists():
                    candidates.append(p)
                else:
                    for entry in sorted(p.glob("*jdk*"), reverse=True):
                        candidates.append(entry)

    for candidate in candidates:
        java_bin = candidate / "bin" / ("java.exe" if IS_WINDOWS else "java")
        if java_bin.exists():
            return str(candidate)

    which_java = shutil.which("java")
    if which_java:
        warnings.add("JAVA_HOME not set; falling back to 'java' found on PATH. Set JAVA_HOME explicitly for reliable builds.")
        return str(Path(which_java).parent.parent)

    warnings.add("Could not detect a JDK. Install Android Studio (bundles a JBR) or a standalone JDK 17+.")
    return None


def detect_android_sdk(warnings: Warnings):
    for var in ["ANDROID_HOME", "ANDROID_SDK_ROOT"]:
        val = os.environ.get(var)
        if val and Path(val).exists():
            return val

    candidates = []
    if IS_WINDOWS:
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        if local_app_data:
            candidates.append(Path(local_app_data) / "Android" / "Sdk")
    else:
        candidates.append(Path.home() / "Library/Android/sdk")
        candidates.append(Path.home() / "Android/Sdk")

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    warnings.add("Could not detect the Android SDK. Install it via Android Studio → SDK Manager, or set ANDROID_HOME.")
    return None


def write_local_properties(root: Path, sdk_dir, warnings: Warnings):
    local_props = root / "android" / "local.properties"
    lines = []
    sdk_dir_written = False

    if local_props.exists():
        for line in local_props.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("sdk.dir"):
                if sdk_dir:
                    normalized = sdk_dir.replace("\\", "\\\\")
                    lines.append(f"sdk.dir={normalized}")
                    sdk_dir_written = True
                # else: drop the stale line, we'll warn below
            else:
                lines.append(line)

    if not sdk_dir_written and sdk_dir:
        normalized = sdk_dir.replace("\\", "\\\\")
        lines.append(f"sdk.dir={normalized}")

    local_props.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  Wrote {local_props}")

    gitignore = root / ".gitignore"
    if gitignore.exists():
        content = gitignore.read_text(encoding="utf-8")
        if "local.properties" not in content:
            warnings.add("local.properties is not listed in .gitignore — it should never be committed.")


def generate_password(length=24):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def find_keytool(java_home):
    if java_home:
        candidate = Path(java_home) / "bin" / ("keytool.exe" if IS_WINDOWS else "keytool")
        if candidate.exists():
            return str(candidate)
    which_keytool = shutil.which("keytool")
    return which_keytool


def ensure_signing_keystore(root: Path, java_home, warnings: Warnings, generate_only=False):
    android_dir = root / "android"
    keystores_dir = android_dir / "keystores"
    keystores_dir.mkdir(exist_ok=True)
    keystore_path = keystores_dir / "release.keystore"
    signing_props_path = android_dir / "signing.properties"

    if signing_props_path.exists() and keystore_path.exists() and not generate_only:
        print("  Reusing existing release keystore and signing.properties.")
        return signing_props_path

    if keystore_path.exists() and signing_props_path.exists():
        print("  Existing release keystore found — leaving it in place.")
        return signing_props_path

    keytool = find_keytool(java_home)
    if not keytool:
        warnings.add("keytool not found — cannot generate a release keystore. Install a JDK and re-run.")
        return None

    # Modern JDKs default -storetype to PKCS12, which requires the key
    # password to equal the store password (PKCS12 has no concept of a
    # separate per-key password — supplying a different one causes Gradle's
    # signing step to fail to decrypt the key later with a padding error).
    # Using one shared secret for both is intentional, not a shortcut.
    shared_password = generate_password()
    alias = "footballscorestoday"

    cmd = [
        keytool, "-genkeypair", "-v",
        "-keystore", str(keystore_path),
        "-storetype", "PKCS12",
        "-alias", alias,
        "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
        "-storepass", shared_password, "-keypass", shared_password,
        "-dname", f"CN=Old Alex Hub, OU=Football Scores Today, O=Old Alex Hub, L=Unknown, ST=Unknown, C=US",
    ]
    print("  Generating release keystore (this may take a moment)...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        warnings.add(f"keytool failed: {result.stderr.strip()}")
        return None

    signing_props_path.write_text(
        "\n".join([
            f"RELEASE_STORE_FILE=keystores/release.keystore",
            f"RELEASE_STORE_PASSWORD={shared_password}",
            f"RELEASE_KEY_ALIAS={alias}",
            f"RELEASE_KEY_PASSWORD={shared_password}",
            "",
        ]),
        encoding="utf-8",
    )
    print(f"  Generated {keystore_path} and {signing_props_path}")
    print("  IMPORTANT: back up android/keystores/release.keystore and android/signing.properties now.")
    return signing_props_path


def validate_package_and_ad_ids(root: Path, warnings: Warnings):
    build_gradle = (root / "android" / "app" / "build.gradle").read_text(encoding="utf-8")
    if f'namespace "{PACKAGE_NAME}"' not in build_gradle or f'applicationId "{PACKAGE_NAME}"' not in build_gradle:
        warnings.add(f"android/app/build.gradle does not reference the expected package name {PACKAGE_NAME}.")
    else:
        print(f"  Package name OK: {PACKAGE_NAME}")

    manifest = (root / "android" / "app" / "src" / "main" / "AndroidManifest.xml").read_text(encoding="utf-8")
    if ADMOB_APP_ID not in manifest:
        warnings.add("AndroidManifest.xml does not contain the expected AdMob APPLICATION_ID meta-data.")
    else:
        print("  AdMob APPLICATION_ID present in AndroidManifest.xml")

    ads_config = (root / "src" / "config" / "adsConfig.ts").read_text(encoding="utf-8")

    for label, pattern, value in [
        ("app id", APP_ID_PATTERN, ADMOB_APP_ID),
        ("banner id", AD_UNIT_ID_PATTERN, ADMOB_BANNER_ID),
        ("interstitial id", AD_UNIT_ID_PATTERN, ADMOB_INTERSTITIAL_ID),
    ]:
        if not pattern.match(value):
            warnings.add(f"Malformed AdMob {label}: {value}")

    if GOOGLE_TEST_BANNER_ID not in ads_config or GOOGLE_TEST_INTERSTITIAL_ID not in ads_config:
        warnings.add("adsConfig.ts does not reference Google's test ad units for debug builds.")
    if ADMOB_BANNER_ID not in ads_config or ADMOB_INTERSTITIAL_ID not in ads_config:
        warnings.add("adsConfig.ts does not reference the expected production ad unit IDs.")
    else:
        print("  Production and test ad unit IDs both present in adsConfig.ts")


def confirm_supporting_files(root: Path, warnings: Warnings):
    checks = {
        "UMP integration": root / "src" / "ads" / "AdConsentManager.ts",
        "Privacy policy": root / "PRIVACYPOLICY.md",
        "README": root / "README.md",
        "Store assets directory": root / "store_assets",
        "Safe-area SafeBottomBar": root / "src" / "components" / "SafeBottomBar.tsx",
        "Safe-area SafeAdContainer": root / "src" / "ads" / "SafeAdContainer.tsx",
    }
    status = {}
    for label, path in checks.items():
        exists = path.exists()
        status[label] = exists
        if not exists:
            warnings.add(f"{label} not found at {path}")
        else:
            print(f"  Found {label}")
    return status


def run_gradle(root: Path, task, warnings: Warnings, env):
    android_dir = root / "android"
    gradlew = android_dir / ("gradlew.bat" if IS_WINDOWS else "gradlew")
    if not gradlew.exists():
        warnings.add(f"gradlew not found at {gradlew}")
        return False
    cmd = [str(gradlew), task]
    print(f"  Running: {' '.join(cmd)} (in {android_dir})")
    result = subprocess.run(cmd, cwd=str(android_dir), env=env)
    return result.returncode == 0


def build_signed_outputs(root: Path, env, warnings: Warnings):
    ok_apk = run_gradle(root, "assembleRelease", warnings, env)
    if not ok_apk:
        warnings.add("assembleRelease failed — see Gradle output above.")
    ok_aab = run_gradle(root, "bundleRelease", warnings, env)
    if not ok_aab:
        warnings.add("bundleRelease failed — see Gradle output above.")
    return ok_apk, ok_aab


def find_output(root: Path, pattern):
    matches = list((root / "android").glob(pattern))
    return matches[0] if matches else None


def prepare_release_dirs(root: Path):
    releases_root = root.parent / "releases"
    subdirs = ["builds", "screenshots", "branding", "store-assets", "docs", "signing-info"]
    for sub in subdirs:
        (releases_root / sub).mkdir(parents=True, exist_ok=True)
    return releases_root


def copy_release_outputs(root: Path, releases_root: Path, warnings: Warnings):
    apk = find_output(root, "app/build/outputs/apk/release/*.apk")
    aab = find_output(root, "app/build/outputs/bundle/release/*.aab")

    if apk:
        dest = releases_root / "builds" / RELEASE_APK_NAME
        shutil.copy2(apk, dest)
        print(f"  Copied APK -> {dest}")
    else:
        warnings.add("No release APK found to copy.")

    if aab:
        dest = releases_root / "builds" / RELEASE_AAB_NAME
        shutil.copy2(aab, dest)
        print(f"  Copied AAB -> {dest}")
    else:
        warnings.add("No release AAB found to copy.")

    logo = root / "assets" / "logo.png"
    if logo.exists():
        shutil.copy2(logo, releases_root / "branding" / "logo.png")

    store_assets_dir = root / "store_assets"
    if store_assets_dir.exists():
        dest_dir = releases_root / "store-assets"
        for item in store_assets_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, dest_dir / item.name)

    for doc in ["README.md", "PRIVACYPOLICY.md"]:
        src = root / doc
        if src.exists():
            shutil.copy2(src, releases_root / "docs" / doc)

    return apk, aab


def write_signing_notes(root: Path, releases_root: Path):
    notes_path = releases_root / "signing-info" / "SIGNING_NOTES.txt"
    notes_path.write_text(
        "Football Scores Today — signing notes\n\n"
        "The release keystore lives at android/keystores/release.keystore and its\n"
        "credentials at android/signing.properties, both inside the project and both\n"
        "git-ignored. This directory intentionally does NOT contain a copy of either\n"
        "file — do not commit secrets into a releases/ folder either.\n\n"
        "Back up android/keystores/release.keystore and android/signing.properties\n"
        "to a password manager or secure offline location NOW. If you lose the release\n"
        "keystore, you can never publish an update to this app under the same Google\n"
        "Play listing again.\n",
        encoding="utf-8",
    )
    print(f"  Wrote {notes_path}")


def capture_screenshots(root: Path, releases_root: Path, warnings: Warnings):
    adb = shutil.which("adb")
    if not adb:
        warnings.add("adb not found on PATH — skipping screenshot capture.")
        return []

    devices_result = subprocess.run([adb, "devices"], capture_output=True, text=True)
    device_lines = [
        line for line in devices_result.stdout.splitlines()[1:]
        if line.strip() and "device" in line
    ]
    if not device_lines:
        warnings.add("No running emulator/device detected — skipping screenshot capture. Start an emulator and re-run with --screenshots-only.")
        return []

    screenshot_dir = releases_root / "screenshots"
    captured = []
    screen_names = ["matches", "matchday", "predict", "insights", "more"]
    for name in screen_names:
        device_path = f"/sdcard/football_scores_{name}.png"
        local_path = screenshot_dir / f"{name}.png"
        subprocess.run([adb, "shell", "screencap", "-p", device_path], capture_output=True)
        pull_result = subprocess.run([adb, "pull", device_path, str(local_path)], capture_output=True, text=True)
        if pull_result.returncode == 0 and local_path.exists():
            captured.append(local_path)
            print(f"  Captured screenshot: {local_path}")
        else:
            warnings.add(f"Could not capture/pull screenshot for '{name}' — navigate the app manually between captures.")
    return captured


def print_summary(context, check_env_only=False):
    print("\n" + "=" * 60)
    print("Football Scores Today — release summary")
    print("=" * 60)
    print(f"App name:            {APP_DISPLAY_NAME}")
    print(f"Package name:        {PACKAGE_NAME}")
    print(f"Version name/code:   {VERSION_NAME} / {VERSION_CODE}")
    print(f"Java path:           {context.get('java_home') or 'NOT FOUND'}")
    print(f"Android SDK path:    {context.get('sdk_dir') or 'NOT FOUND'}")
    print(f"ANDROID_HOME:        {os.environ.get('ANDROID_HOME', '(unset)')}")
    print(f"ANDROID_SDK_ROOT:    {os.environ.get('ANDROID_SDK_ROOT', '(unset)')}")
    if check_env_only:
        print(f"Warnings:            {len(context.get('warnings', []))}")
        for w in context.get("warnings", []):
            print(f"  - {w}")
        print("=" * 60)
        return
    print(f"local.properties:    {'written' if context.get('local_props_written') else 'not written'}")
    print(f"Keystore status:     {'ready' if context.get('keystore_ready') else 'MISSING'}")
    print(f"APK:                 {context.get('apk') or 'not built'}")
    print(f"AAB:                 {context.get('aab') or 'not built'}")
    print(f"Screenshots:         {len(context.get('screenshots', []))} captured")
    print(f"Store assets:        {'present' if context.get('supporting', {}).get('Store assets directory') else 'MISSING'}")
    print(f"Privacy policy:      {'present' if context.get('supporting', {}).get('Privacy policy') else 'MISSING'}")
    print(f"README:              {'present' if context.get('supporting', {}).get('README') else 'MISSING'}")
    print(f"Signing notes:       written")
    print("Football providers:  OpenFootball + TheSportsDB + ESPN analysis (keyless), football-data.org + API-Football (key-dependent)")
    print(f"AdMob app ID:        OK" if context.get("ids_ok") else "AdMob app ID:        CHECK WARNINGS")
    print(f"Banner ID:           OK" if context.get("ids_ok") else "Banner ID:           CHECK WARNINGS")
    print(f"Interstitial ID:     OK" if context.get("ids_ok") else "Interstitial ID:     CHECK WARNINGS")
    print(f"UMP integration:     {'present' if context.get('supporting', {}).get('UMP integration') else 'MISSING'}")
    print(f"Test-ad isolation:   validated at adsConfig.ts import time (release build throws if violated)")
    print(f"Safe-area files:     {'present' if context.get('supporting', {}).get('Safe-area SafeBottomBar') else 'MISSING'}")
    print(f"Warnings:            {len(context.get('warnings', []))}")
    for w in context.get("warnings", []):
        print(f"  - {w}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Football Scores Today release automation")
    parser.add_argument("--check-env", action="store_true")
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--no-clean", action="store_true")
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument("--skip-screenshots", action="store_true")
    parser.add_argument("--screenshots-only", action="store_true")
    parser.add_argument("--generate-key-only", action="store_true")
    args = parser.parse_args()

    warnings = Warnings()
    root = find_project_root()
    print(f"Project root: {root}")

    print("\n[1/8] Validating project structure...")
    validate_bare_rn_structure(root, warnings)
    validate_logo(root, warnings)

    print("\n[2/8] Detecting Java and Android SDK...")
    java_home = detect_java_home(warnings)
    sdk_dir = detect_android_sdk(warnings)

    env = os.environ.copy()
    if java_home:
        env["JAVA_HOME"] = java_home
    if sdk_dir:
        env["ANDROID_HOME"] = sdk_dir
        env["ANDROID_SDK_ROOT"] = sdk_dir
        platform_tools = str(Path(sdk_dir) / "platform-tools")
        env["PATH"] = platform_tools + os.pathsep + env.get("PATH", "")

    if args.check_env:
        print_summary({"java_home": java_home, "sdk_dir": sdk_dir, "warnings": warnings.items}, check_env_only=True)
        return

    print("\n[3/8] Writing android/local.properties...")
    local_props_written = False
    if sdk_dir:
        write_local_properties(root, sdk_dir, warnings)
        local_props_written = True
    else:
        warnings.add("Skipped writing local.properties — no Android SDK detected.")

    print("\n[4/8] Provisioning release signing keystore...")
    signing_props = ensure_signing_keystore(root, java_home, warnings, generate_only=args.generate_key_only)
    keystore_ready = signing_props is not None

    if args.generate_key_only:
        print_summary({
            "java_home": java_home, "sdk_dir": sdk_dir, "local_props_written": local_props_written,
            "keystore_ready": keystore_ready, "warnings": warnings.items,
        })
        return

    print("\n[5/8] Validating package name and AdMob identifiers...")
    validate_package_and_ad_ids(root, warnings)
    supporting = confirm_supporting_files(root, warnings)
    ids_ok = not any("AdMob" in w or "adsConfig" in w or "package name" in w for w in warnings.items)

    releases_root = prepare_release_dirs(root)

    apk_path = None
    aab_path = None
    if args.screenshots_only:
        print("\n[6/8] Skipping build (--screenshots-only)...")
    elif args.skip_build:
        print("\n[6/8] Skipping build (--skip-build)...")
    else:
        print("\n[6/8] Building signed APK and AAB...")
        if args.clean and not args.no_clean:
            run_gradle(root, "clean", warnings, env)
        build_signed_outputs(root, env, warnings)

    print("\n[7/8] Copying release outputs...")
    if not args.screenshots_only:
        apk_path, aab_path = copy_release_outputs(root, releases_root, warnings)
        write_signing_notes(root, releases_root)

    screenshots = []
    if not args.skip_screenshots:
        print("\n[8/8] Capturing emulator screenshots...")
        screenshots = capture_screenshots(root, releases_root, warnings)
    else:
        print("\n[8/8] Skipping screenshots (--skip-screenshots)...")

    print_summary({
        "java_home": java_home,
        "sdk_dir": sdk_dir,
        "local_props_written": local_props_written,
        "keystore_ready": keystore_ready,
        "apk": apk_path,
        "aab": aab_path,
        "screenshots": screenshots,
        "supporting": supporting,
        "ids_ok": ids_ok,
        "warnings": warnings.items,
    })


if __name__ == "__main__":
    main()

# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
# Keep Google UMP internals in minified release builds. This is required by
# react-native-google-mobile-ads for the consent bridge to remain callable.
-keep class com.google.android.gms.internal.consent_sdk.** { *; }

# --- App code -------------------------------------------------------------
# MainActivity/MainApplication are referenced from the manifest, the widget
# provider is instantiated by the framework from a <receiver>, and the
# WidgetBridge native module is bridged into JS reflectively. This package is
# tiny, so keeping it whole is cheap insurance and does not move the
# obfuscation needle (which is dominated by the RN / Play Services code).
-keep class com.oldalexhub.footballscores.** { *; }

# --- React Native safety nets (usually covered by library consumer rules) --
# Native modules exposed to JavaScript.
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}
-keepclassmembers,allowobfuscation class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

# Standard Android reflection contracts.
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

package com.oldalexhub.footballscores.runtime

import android.content.Intent
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.work.*
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import com.oldalexhub.footballscores.BuildConfig
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class FootballRuntimePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(FootballRuntimeModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
class FootballRuntimeModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "FootballRuntime"
  override fun getConstants(): Map<String, Any> = mapOf("apiOrigin" to BuildConfig.FOOTBALL_API_ORIGIN)
  private val prefs get() = context.getSharedPreferences("football_secure", 0)
  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey("football.installation", null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
      init(KeyGenParameterSpec.Builder("football.installation", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
    }.generateKey()
  }
  @ReactMethod fun readIdentity(promise: Promise) {
    try {
      val value = prefs.getString("identity", null)
      if(value == null) { promise.resolve(null); return }
      val parts = value.split(":")
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
      promise.resolve(String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8))
    } catch(error: Exception) { promise.reject("identity_read_failed", "Unable to read protected installation credentials", error) }
  }
  @ReactMethod fun writeIdentity(value: String, promise: Promise) {
    try {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key())
      val data = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
      if(!prefs.edit().putString("identity", data).commit()) throw IllegalStateException("Storage unavailable")
      promise.resolve(null)
    } catch(error: Exception) { promise.reject("identity_write_failed", "Unable to protect installation credentials", error) }
  }
  @ReactMethod fun clearIdentity(promise: Promise) { prefs.edit().remove("identity").commit(); promise.resolve(null) }
  @ReactMethod fun scheduleSync() {
    val request = PeriodicWorkRequestBuilder<FootballSyncWorker>(6, TimeUnit.HOURS)
      .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork("football-reminder-sync", ExistingPeriodicWorkPolicy.KEEP, request)
    WorkManager.getInstance(context).enqueueUniqueWork("football-reminder-initial", ExistingWorkPolicy.KEEP,
      OneTimeWorkRequestBuilder<FootballSyncWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())
  }
  @ReactMethod fun cancelSync() { for(name in listOf("football-reminder-sync","football-reminder-initial","football-clock-sync")) WorkManager.getInstance(context).cancelUniqueWork(name) }
  @ReactMethod fun completeSync(success: Boolean) { FootballSyncWorker.finish(success) }
}

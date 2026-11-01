package com.oldalexhub.footballscores.runtime

import android.content.Context
import android.content.Intent
import android.content.BroadcastReceiver
import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactApplication
import com.facebook.react.jstasks.HeadlessJsTaskContext
import androidx.work.*
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.bridge.Arguments
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.Semaphore

class FootballSyncWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  companion object {
    private val execution = Semaphore(1)
    @Volatile private var latch: CountDownLatch? = null
    @Volatile private var success = false
    fun finish(ok: Boolean) { success = ok; latch?.countDown() }
  }
  override fun doWork(): Result {
    if(!execution.tryAcquire()) return Result.retry()
    val completion = CountDownLatch(1); latch = completion; success = false
    return try {
      // WorkManager owns execution/wake time. Start the shared JS task directly;
      // Android forbids starting a background Service on modern versions.
      val host = (applicationContext as ReactApplication).reactHost ?: return Result.retry()
      val startup = host.start()
      if(!startup.waitForCompletion(30, TimeUnit.SECONDS) || startup.isFaulted() || startup.isCancelled()) return Result.retry()
      val reactContext = host.currentReactContext ?: return Result.retry()
      Handler(Looper.getMainLooper()).post {
        try { HeadlessJsTaskContext.getInstance(reactContext).startTask(HeadlessJsTaskConfig("FootballReminderSync", Arguments.createMap(), 55000, true)) }
        catch(error: Exception) { finish(false) }
      }
      if(completion.await(60, TimeUnit.SECONDS) && success) Result.success() else Result.retry()
    } catch(error: Exception) { Result.retry() } finally { latch = null; execution.release() }
  }
}
class FootballSyncService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig = HeadlessJsTaskConfig("FootballReminderSync", Arguments.createMap(), 55000, true)
}
class FootballClockReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    WorkManager.getInstance(context).enqueueUniqueWork("football-clock-sync", ExistingWorkPolicy.REPLACE,
      OneTimeWorkRequestBuilder<FootballSyncWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())
  }
}

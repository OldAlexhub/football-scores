package com.oldalexhub.footballscores.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Bridges sanitized, non-personal widget snapshot JSON from React Native's local
 * storage layer into plain Android SharedPreferences that FootballWidgetProvider
 * can read synchronously without touching JS/MMKV.
 */
class WidgetBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "WidgetBridge"

  @ReactMethod
  fun updateWidgetSnapshot(jsonString: String, promise: Promise) {
    try {
      val context = reactApplicationContext
      val prefs = context.getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().putString(WIDGET_SNAPSHOT_KEY, jsonString).apply()
      requestWidgetUpdate(context)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("widget_update_failed", error.message, error)
    }
  }

  @ReactMethod
  fun clearWidgetSnapshot(promise: Promise) {
    try {
      val context = reactApplicationContext
      val prefs = context.getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().remove(WIDGET_SNAPSHOT_KEY).apply()
      requestWidgetUpdate(context)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("widget_clear_failed", error.message, error)
    }
  }

  private fun requestWidgetUpdate(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val component = ComponentName(context, FootballWidgetProvider::class.java)
    val ids = manager.getAppWidgetIds(component)
    if (ids.isNotEmpty()) {
      FootballWidgetProvider.updateAllWidgets(context, manager, ids)
    }
  }

  companion object {
    const val WIDGET_PREFS_NAME = "football_widget_prefs"
    const val WIDGET_SNAPSHOT_KEY = "snapshot_json"
  }
}

package com.oldalexhub.footballscores.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
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

  @ReactMethod
  fun getWidgetCount(promise: Promise) {
    try {
      promise.resolve(widgetIds(reactApplicationContext).size)
    } catch (error: Exception) {
      promise.reject("widget_count_failed", error.message, error)
    }
  }

  @ReactMethod
  fun isPinningSupported(promise: Promise) {
    try {
      val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        AppWidgetManager.getInstance(reactApplicationContext).isRequestPinAppWidgetSupported
      promise.resolve(supported)
    } catch (error: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun requestPinWidget(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.resolve(false)
        return
      }
      val context = reactApplicationContext
      val manager = AppWidgetManager.getInstance(context)
      if (!manager.isRequestPinAppWidgetSupported) {
        promise.resolve(false)
        return
      }
      val provider = ComponentName(context, FootballWidgetProvider::class.java)
      promise.resolve(manager.requestPinAppWidget(provider, null, null))
    } catch (error: Exception) {
      promise.reject("widget_pin_failed", error.message, error)
    }
  }

  @ReactMethod
  fun refreshWidgets(promise: Promise) {
    try {
      val context = reactApplicationContext
      requestWidgetUpdate(context)
      promise.resolve(widgetIds(context).size)
    } catch (error: Exception) {
      promise.reject("widget_refresh_failed", error.message, error)
    }
  }

  private fun requestWidgetUpdate(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = widgetIds(context)
    if (ids.isNotEmpty()) {
      FootballWidgetProvider.updateAllWidgets(context, manager, ids)
    }
  }

  private fun widgetIds(context: Context): IntArray {
    val manager = AppWidgetManager.getInstance(context)
    val component = ComponentName(context, FootballWidgetProvider::class.java)
    return manager.getAppWidgetIds(component)
  }

  companion object {
    const val WIDGET_PREFS_NAME = "football_widget_prefs"
    const val WIDGET_SNAPSHOT_KEY = "snapshot_json"
  }
}

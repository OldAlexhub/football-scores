package com.oldalexhub.footballscores.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.oldalexhub.footballscores.R
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Renders the Football Scores home-screen widget from a sanitized JSON snapshot
 * written by React Native through WidgetBridgeModule. Never contacts the network
 * and never renders advertisements.
 */
class FootballWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    updateAllWidgets(context, appWidgetManager, appWidgetIds)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == Intent.ACTION_TIMEZONE_CHANGED ||
      intent.action == Intent.ACTION_DATE_CHANGED ||
      intent.action == Intent.ACTION_TIME_CHANGED
    ) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(
        android.content.ComponentName(context, FootballWidgetProvider::class.java),
      )
      if (ids.isNotEmpty()) {
        updateAllWidgets(context, manager, ids)
      }
    }
  }

  companion object {
    private const val EXPANDED_MIN_HEIGHT_DP = 180

    fun updateAllWidgets(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetIds: IntArray,
    ) {
      val prefs = context.getSharedPreferences(
        WidgetBridgeModule.WIDGET_PREFS_NAME,
        Context.MODE_PRIVATE,
      )
      val snapshotJson = prefs.getString(WidgetBridgeModule.WIDGET_SNAPSHOT_KEY, null)

      for (widgetId in appWidgetIds) {
        val options = appWidgetManager.getAppWidgetOptions(widgetId)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val useExpanded = minHeight >= EXPANDED_MIN_HEIGHT_DP

        val views = RemoteViews(
          context.packageName,
          if (useExpanded) R.layout.widget_football_expanded else R.layout.widget_football_compact,
        )

        populateViews(context, views, snapshotJson, useExpanded)
        appWidgetManager.updateAppWidget(widgetId, views)
      }
    }

    private fun populateViews(
      context: Context,
      views: RemoteViews,
      snapshotJson: String?,
      expanded: Boolean,
    ) {
      val openAppIntent = buildOpenIntent(context, null)
      views.setOnClickPendingIntent(R.id.widget_root, openAppIntent)

      if (snapshotJson == null) {
        views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_no_data_title))
        views.setTextViewText(R.id.widget_subtitle, context.getString(R.string.widget_no_data_subtitle))
        views.setViewVisibility(R.id.widget_clash_warning, android.view.View.GONE)
        if (expanded) {
          views.setTextViewText(R.id.widget_upcoming_1, "")
          views.setTextViewText(R.id.widget_upcoming_2, "")
        }
        return
      }

      try {
        val snapshot = JSONObject(snapshotJson)
        val hasFavorites = snapshot.optBoolean("hasFavorites", false)
        val nextMatch = snapshot.optJSONObject("nextMatch")

        if (!hasFavorites || nextMatch == null) {
          views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_no_favorites_title))
          views.setTextViewText(R.id.widget_subtitle, context.getString(R.string.widget_no_favorites_subtitle))
          views.setViewVisibility(R.id.widget_clash_warning, android.view.View.GONE)
          if (expanded) {
            views.setTextViewText(R.id.widget_upcoming_1, "")
            views.setTextViewText(R.id.widget_upcoming_2, "")
          }
          return
        }

        val spoilerProtected = nextMatch.optBoolean("spoilerProtected", false)
        val homeTeam = nextMatch.optString("homeTeam", "?")
        val awayTeam = nextMatch.optString("awayTeam", "?")
        val kickoffIso = nextMatch.optString("kickoffIso", null)
        val kickoffUnknown = nextMatch.optBoolean("kickoffUnknown", false)
        val matchId = nextMatch.optString("id", null)

        val title = "$homeTeam vs $awayTeam"
        views.setTextViewText(R.id.widget_title, title)

        val subtitle = when {
          kickoffUnknown -> context.getString(R.string.widget_time_not_confirmed)
          kickoffIso != null -> formatCountdown(context, kickoffIso)
          else -> context.getString(R.string.widget_time_not_confirmed)
        }
        views.setTextViewText(R.id.widget_subtitle, subtitle)

        val clashWarning = snapshot.optBoolean("clashWarning", false)
        views.setViewVisibility(
          R.id.widget_clash_warning,
          if (clashWarning) android.view.View.VISIBLE else android.view.View.GONE,
        )
        if (clashWarning) {
          views.setTextViewText(R.id.widget_clash_warning, context.getString(R.string.widget_clash_warning))
        }

        val reminderSet = snapshot.optBoolean("reminderSet", false)
        views.setViewVisibility(R.id.widget_reminder_badge, if (reminderSet) android.view.View.VISIBLE else android.view.View.GONE)

        if (spoilerProtected) {
          views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_spoiler_protected))
        }

        views.setOnClickPendingIntent(R.id.widget_root, buildOpenIntent(context, matchId))

        if (expanded) {
          val upcoming = snapshot.optJSONArray("upcoming")
          val rows = listOf(R.id.widget_upcoming_1, R.id.widget_upcoming_2)
          for ((index, viewId) in rows.withIndex()) {
            val item = upcoming?.optJSONObject(index)
            if (item == null) {
              views.setTextViewText(viewId, "")
            } else {
              val itemHome = item.optString("homeTeam", "?")
              val itemAway = item.optString("awayTeam", "?")
              val itemKickoff = item.optString("kickoffIso", null)
              val itemUnknown = item.optBoolean("kickoffUnknown", false)
              val time = when {
                itemUnknown -> context.getString(R.string.widget_time_not_confirmed)
                itemKickoff != null -> formatClockTime(itemKickoff)
                else -> context.getString(R.string.widget_time_not_confirmed)
              }
              views.setTextViewText(viewId, "$itemHome vs $itemAway · $time")
            }
          }
        }
      } catch (error: Exception) {
        views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_no_data_title))
        views.setTextViewText(R.id.widget_subtitle, context.getString(R.string.widget_no_data_subtitle))
      }
    }

    private fun buildOpenIntent(context: Context, matchId: String?): PendingIntent {
      val uri = if (matchId != null) {
        Uri.parse("footballscores://match/$matchId")
      } else {
        Uri.parse("footballscores://matchday")
      }
      val intent = Intent(Intent.ACTION_VIEW, uri, context, com.oldalexhub.footballscores.MainActivity::class.java)
      intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      val requestCode = matchId?.hashCode() ?: 0
      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    private fun formatClockTime(iso: String): String {
      return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault())
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val date = parser.parse(iso) ?: return iso
        val formatter = SimpleDateFormat("HH:mm", Locale.getDefault())
        formatter.timeZone = TimeZone.getDefault()
        formatter.format(date)
      } catch (error: Exception) {
        iso
      }
    }

    private fun formatCountdown(context: Context, iso: String): String {
      return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault())
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val date = parser.parse(iso) ?: return context.getString(R.string.widget_time_not_confirmed)
        val diffMs = date.time - Date().time
        if (diffMs <= 0) {
          return context.getString(R.string.widget_kickoff_now)
        }
        val totalMinutes = diffMs / 60000
        val hours = totalMinutes / 60
        val minutes = totalMinutes % 60
        val localTime = formatClockTime(iso)
        if (hours > 0) {
          context.getString(R.string.widget_countdown_hours, hours, minutes, localTime)
        } else {
          context.getString(R.string.widget_countdown_minutes, minutes, localTime)
        }
      } catch (error: Exception) {
        context.getString(R.string.widget_time_not_confirmed)
      }
    }
  }
}

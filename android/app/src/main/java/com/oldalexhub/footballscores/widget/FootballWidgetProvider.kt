package com.oldalexhub.footballscores.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import com.oldalexhub.footballscores.R
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Native Android home-screen widget. Match data is written by React Native
 * whenever the app refreshes, while Android re-renders countdowns, locale,
 * and responsive compact/expanded layouts without starting JavaScript.
 */
class FootballWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    updateAllWidgets(context, appWidgetManager, appWidgetIds)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    updateWidget(context, appWidgetManager, appWidgetId)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action in setOf(
        Intent.ACTION_TIMEZONE_CHANGED,
        Intent.ACTION_DATE_CHANGED,
        Intent.ACTION_TIME_CHANGED,
        Intent.ACTION_LOCALE_CHANGED,
      )
    ) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, FootballWidgetProvider::class.java))
      updateAllWidgets(context, manager, ids)
    }
  }

  companion object {
    private const val EXPANDED_MIN_HEIGHT_DP = 155
    private val UTC: TimeZone = TimeZone.getTimeZone("UTC")
    private val ISO_PATTERNS = listOf(
      "yyyy-MM-dd'T'HH:mm:ss.SSSX",
      "yyyy-MM-dd'T'HH:mm:ssX",
      "yyyy-MM-dd'T'HH:mmX",
    )

    fun updateAllWidgets(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetIds: IntArray,
    ) {
      appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    private fun updateWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      widgetId: Int,
    ) {
      val options = appWidgetManager.getAppWidgetOptions(widgetId)
      val expanded = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) >= EXPANDED_MIN_HEIGHT_DP
      val layout = if (expanded) R.layout.widget_football_expanded else R.layout.widget_football_compact
      val views = RemoteViews(context.packageName, layout)
      val snapshot = context.getSharedPreferences(
        WidgetBridgeModule.WIDGET_PREFS_NAME,
        Context.MODE_PRIVATE,
      ).getString(WidgetBridgeModule.WIDGET_SNAPSHOT_KEY, null)

      populateViews(context, views, snapshot, expanded)
      appWidgetManager.updateAppWidget(widgetId, views)
    }

    private fun populateViews(
      context: Context,
      views: RemoteViews,
      snapshotJson: String?,
      expanded: Boolean,
    ) {
      views.setOnClickPendingIntent(R.id.widget_root, buildOpenIntent(context, null))

      if (snapshotJson == null) {
        renderEmpty(context, views, expanded, false)
        return
      }

      try {
        val snapshot = JSONObject(snapshotJson)
        val localizedContext = localizedContext(context, snapshot.optString("locale", "en"))
        val nextMatch = snapshot.optJSONObject("nextMatch")
        if (nextMatch == null) {
          renderEmpty(localizedContext, views, expanded, true)
          return
        }

        val homeTeam = nextMatch.optString("homeTeam", "?")
        val awayTeam = nextMatch.optString("awayTeam", "?")
        val competition = nextMatch.optString("competition", "")
        val status = nextMatch.optString("status", "scheduled")
        val kickoffIso = nullableString(nextMatch, "kickoffIso")
        val kickoffUnknown = nextMatch.optBoolean("kickoffUnknown", false)
        val matchId = nullableString(nextMatch, "id")
        val spoilerProtected = nextMatch.optBoolean("spoilerProtected", false)
        val homeScore = nullableInt(nextMatch, "homeScore")
        val awayScore = nullableInt(nextMatch, "awayScore")
        val elapsed = nullableInt(nextMatch, "elapsedMinutes")
        val live = status == "live"
        val halfTime = status == "half_time"

        views.setTextViewText(R.id.widget_brand, localizedContext.getString(R.string.widget_brand))
        views.setTextViewText(R.id.widget_competition, competition)
        views.setViewVisibility(R.id.widget_competition, if (competition.isBlank()) View.GONE else View.VISIBLE)

        val scoreAvailable = homeScore != null && awayScore != null
        val title = when {
          spoilerProtected -> localizedContext.getString(R.string.widget_spoiler_protected)
          (live || halfTime) && scoreAvailable -> "$homeTeam  $homeScore - $awayScore  $awayTeam"
          else -> "$homeTeam  vs  $awayTeam"
        }
        views.setTextViewText(R.id.widget_title, title)

        val statusLabel = when {
          live -> localizedContext.getString(R.string.widget_status_live)
          halfTime -> localizedContext.getString(R.string.widget_status_half_time)
          else -> localizedContext.getString(R.string.widget_status_upcoming)
        }
        views.setTextViewText(R.id.widget_status_badge, statusLabel)
        views.setTextColor(
          R.id.widget_status_badge,
          if (live || halfTime) 0xFFDC2626.toInt() else 0xFF067A45.toInt(),
        )

        val subtitle = when {
          live && elapsed != null -> localizedContext.getString(R.string.widget_live_minute, elapsed)
          live -> localizedContext.getString(R.string.widget_live_now)
          halfTime -> localizedContext.getString(R.string.widget_half_time)
          kickoffUnknown || kickoffIso == null -> localizedContext.getString(R.string.widget_time_not_confirmed)
          else -> formatCountdown(localizedContext, kickoffIso)
        }
        views.setTextViewText(R.id.widget_subtitle, subtitle)

        val meta = buildList {
          if (nextMatch.optBoolean("reminderSet", false)) add(localizedContext.getString(R.string.widget_reminder_set))
          if (snapshot.optBoolean("clashWarning", false)) add(localizedContext.getString(R.string.widget_clash_warning))
        }.joinToString("  \u2022  ")
        views.setTextViewText(R.id.widget_meta, meta)
        views.setViewVisibility(R.id.widget_meta, if (meta.isBlank()) View.GONE else View.VISIBLE)
        views.setOnClickPendingIntent(R.id.widget_root, buildOpenIntent(context, matchId))

        if (expanded) {
          populateUpcoming(localizedContext, views, snapshot)
          val generatedAt = nullableString(snapshot, "generatedAtIso")
          val updated = generatedAt?.let {
            localizedContext.getString(R.string.widget_last_updated, formatClockTime(it, Locale.getDefault()))
          } ?: ""
          views.setTextViewText(R.id.widget_updated, updated)
        }
      } catch (_: Exception) {
        renderEmpty(context, views, expanded, false)
      }
    }

    private fun populateUpcoming(context: Context, views: RemoteViews, snapshot: JSONObject) {
      val upcoming = snapshot.optJSONArray("upcoming")
      val rows = listOf(R.id.widget_upcoming_1, R.id.widget_upcoming_2)
      rows.forEachIndexed { index, viewId ->
        val item = upcoming?.optJSONObject(index)
        if (item == null) {
          views.setTextViewText(viewId, "")
          views.setViewVisibility(viewId, View.GONE)
          return@forEachIndexed
        }

        val home = item.optString("homeTeam", "?")
        val away = item.optString("awayTeam", "?")
        val status = item.optString("status", "scheduled")
        val scoreHome = nullableInt(item, "homeScore")
        val scoreAway = nullableInt(item, "awayScore")
        val kickoff = nullableString(item, "kickoffIso")
        val time = when {
          status == "live" && scoreHome != null && scoreAway != null -> "$scoreHome - $scoreAway  ${context.getString(R.string.widget_status_live)}"
          status == "half_time" && scoreHome != null && scoreAway != null -> "$scoreHome - $scoreAway  ${context.getString(R.string.widget_status_half_time)}"
          item.optBoolean("kickoffUnknown", false) || kickoff == null -> context.getString(R.string.widget_time_not_confirmed)
          else -> formatShortDateTime(kickoff, Locale.getDefault())
        }
        val reminder = if (item.optBoolean("reminderSet", false)) "  \u2022  ${context.getString(R.string.widget_reminder_short)}" else ""
        views.setTextViewText(viewId, "$home vs $away  \u2022  $time$reminder")
        views.setViewVisibility(viewId, View.VISIBLE)
      }
    }

    private fun renderEmpty(context: Context, views: RemoteViews, expanded: Boolean, noMatches: Boolean) {
      views.setTextViewText(R.id.widget_brand, context.getString(R.string.widget_brand))
      views.setTextViewText(R.id.widget_status_badge, context.getString(R.string.widget_open_app))
      views.setTextColor(R.id.widget_status_badge, 0xFF067A45.toInt())
      views.setTextViewText(
        R.id.widget_title,
        context.getString(if (noMatches) R.string.widget_no_matches_title else R.string.widget_no_data_title),
      )
      views.setTextViewText(
        R.id.widget_subtitle,
        context.getString(if (noMatches) R.string.widget_no_matches_subtitle else R.string.widget_no_data_subtitle),
      )
      views.setTextViewText(R.id.widget_competition, "")
      views.setViewVisibility(R.id.widget_competition, View.GONE)
      views.setTextViewText(R.id.widget_meta, "")
      views.setViewVisibility(R.id.widget_meta, View.GONE)
      if (expanded) {
        views.setTextViewText(R.id.widget_upcoming_1, "")
        views.setTextViewText(R.id.widget_upcoming_2, "")
        views.setViewVisibility(R.id.widget_upcoming_1, View.GONE)
        views.setViewVisibility(R.id.widget_upcoming_2, View.GONE)
        views.setTextViewText(R.id.widget_updated, "")
      }
    }

    private fun localizedContext(context: Context, language: String): Context {
      val locale = if (language.lowercase(Locale.US).startsWith("ar")) Locale("ar") else Locale.ENGLISH
      val configuration = Configuration(context.resources.configuration)
      configuration.setLocale(locale)
      return context.createConfigurationContext(configuration)
    }

    private fun buildOpenIntent(context: Context, matchId: String?): PendingIntent {
      val uri = if (matchId != null) {
        Uri.parse("footballscores://match/$matchId")
      } else {
        Uri.parse("footballscores://matches")
      }
      val intent = Intent(Intent.ACTION_VIEW, uri, context, com.oldalexhub.footballscores.MainActivity::class.java)
      intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      return PendingIntent.getActivity(
        context,
        matchId?.hashCode() ?: 0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    private fun nullableString(json: JSONObject, key: String): String? {
      if (!json.has(key) || json.isNull(key)) return null
      return json.optString(key).takeIf { it.isNotBlank() && it != "null" }
    }

    private fun nullableInt(json: JSONObject, key: String): Int? {
      if (!json.has(key) || json.isNull(key)) return null
      return json.optInt(key)
    }

    private fun parseIso(iso: String): Date? {
      ISO_PATTERNS.forEach { pattern ->
        try {
          val parser = SimpleDateFormat(pattern, Locale.US)
          parser.timeZone = UTC
          parser.isLenient = false
          return parser.parse(iso)
        } catch (_: Exception) {
          // Try the next ISO-8601 shape.
        }
      }
      return null
    }

    private fun formatClockTime(iso: String, locale: Locale): String {
      val date = parseIso(iso) ?: return ""
      return SimpleDateFormat("HH:mm", locale).apply { timeZone = TimeZone.getDefault() }.format(date)
    }

    private fun formatShortDateTime(iso: String, locale: Locale): String {
      val date = parseIso(iso) ?: return iso
      return SimpleDateFormat("EEE HH:mm", locale).apply { timeZone = TimeZone.getDefault() }.format(date)
    }

    private fun formatCountdown(context: Context, iso: String): String {
      val date = parseIso(iso) ?: return context.getString(R.string.widget_time_not_confirmed)
      val diffMs = date.time - Date().time
      if (diffMs <= 0) return context.getString(R.string.widget_kickoff_now)
      val totalMinutes = diffMs / 60_000
      val days = totalMinutes / (24 * 60)
      val hours = (totalMinutes / 60) % 24
      val minutes = totalMinutes % 60
      val localTime = formatClockTime(iso, Locale.getDefault())
      return when {
        days > 0 -> context.getString(R.string.widget_countdown_days, days, hours, localTime)
        hours > 0 -> context.getString(R.string.widget_countdown_hours, hours, minutes, localTime)
        else -> context.getString(R.string.widget_countdown_minutes, minutes, localTime)
      }
    }
  }
}

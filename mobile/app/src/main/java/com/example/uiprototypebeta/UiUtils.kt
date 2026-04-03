package com.brazwebdes.hairstylistbooking

import android.content.Context
import android.content.Intent
import android.util.TypedValue
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private const val sessionExpiredError = "Session expired. Please sign in again."

fun Context.dp(value: Int): Int {
    return TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP,
        value.toFloat(),
        resources.displayMetrics
    ).toInt()
}

fun formatMoney(cents: Int): String {
    return String.format(Locale.getDefault(), "$%.2f", cents / 100.0)
}

fun formatDateLabel(raw: String): String {
    val date = parseIsoDate(raw) ?: return raw
    return SimpleDateFormat("MMM d, yyyy", Locale.getDefault()).format(date)
}

fun formatDateTimeLabel(raw: String): String {
    val date = parseIsoDate(raw) ?: return raw
    return SimpleDateFormat("EEE, MMM d - h:mm a", Locale.getDefault()).format(date)
}

fun parseIsoDate(raw: String): Date? {
    val patterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX"
    )
    for (pattern in patterns) {
        try {
            val parser = SimpleDateFormat(pattern, Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
                isLenient = false
            }
            return parser.parse(raw)
        } catch (_: Exception) {
        }
    }
    return null
}

fun isSessionExpiredMessage(message: String): Boolean {
    return message.trim() == sessionExpiredError
}

fun AppCompatActivity.navigateToLoginScreen(configureIntent: Intent.() -> Unit = {}) {
    startActivity(
        Intent(this, LoginActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            configureIntent()
        }
    )
    finish()
}

fun View.applyStatusBarTopInset() {
    val initialTopPadding = paddingTop
    ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
        val topInset = insets.getInsets(
            WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.displayCutout()
        ).top
        view.updatePadding(top = initialTopPadding + topInset)
        insets
    }
    ViewCompat.requestApplyInsets(this)
}

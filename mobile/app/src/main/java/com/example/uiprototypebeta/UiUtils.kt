package com.brazwebdes.hairstylistbooking

import android.content.Context
import android.util.TypedValue
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

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

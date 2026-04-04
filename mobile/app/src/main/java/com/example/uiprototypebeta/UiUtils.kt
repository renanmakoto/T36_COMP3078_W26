package com.brazwebdes.hairstylistbooking

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.TypedValue
import androidx.appcompat.app.AppCompatActivity
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

data class UploadContent(
    val fileName: String,
    val mimeType: String,
    val bytes: ByteArray,
)

fun AppCompatActivity.requireAdminSession(): Boolean {
    if (AdminSession.isLoggedIn) {
        return true
    }
    AdminSession.clear()
    UserSession.clear()
    startActivity(Intent(this, LoginActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
    })
    finish()
    return false
}

fun Context.readUploadContent(uri: Uri): UploadContent? {
    return try {
        val contentResolver = contentResolver
        val mimeType = contentResolver.getType(uri).orEmpty().ifBlank { "application/octet-stream" }
        val fileName = queryDisplayName(uri)
            ?: "upload-${System.currentTimeMillis()}.${mimeType.substringAfter('/', "bin")}"
        val bytes = contentResolver.openInputStream(uri)?.use { stream -> stream.readBytes() } ?: return null
        UploadContent(fileName = fileName, mimeType = mimeType, bytes = bytes)
    } catch (_: Exception) {
        null
    }
}

private fun Context.queryDisplayName(uri: Uri): String? {
    return contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        if (!cursor.moveToFirst()) return@use null
        val columnIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (columnIndex < 0) null else cursor.getString(columnIndex)
    }
}

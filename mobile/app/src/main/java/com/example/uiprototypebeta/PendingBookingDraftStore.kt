package com.brazwebdes.hairstylistbooking

import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

data class PendingBookingDraft(
    val serviceId: String,
    val serviceTitle: String,
    val basePriceCents: Int,
    val totalPriceCents: Int,
    val durationMinutes: Int,
    val addOnIds: List<String>,
    val addOnNames: List<String>,
    val selectedDate: String,
    val selectedSlot: String
)

object PendingBookingDraftStore {
    private const val prefsName = "pending_booking_draft"
    private const val keyDraft = "draft"

    fun save(context: Context, draft: PendingBookingDraft) {
        val payload = JSONObject().apply {
            put("service_id", draft.serviceId)
            put("service_title", draft.serviceTitle)
            put("base_price_cents", draft.basePriceCents)
            put("total_price_cents", draft.totalPriceCents)
            put("duration_minutes", draft.durationMinutes)
            put("add_on_ids", JSONArray(draft.addOnIds))
            put("add_on_names", JSONArray(draft.addOnNames))
            put("selected_date", draft.selectedDate)
            put("selected_slot", draft.selectedSlot)
        }
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .edit()
            .putString(keyDraft, payload.toString())
            .apply()
    }

    fun read(context: Context): PendingBookingDraft? {
        val raw = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE).getString(keyDraft, null) ?: return null
        return try {
            val json = JSONObject(raw)
            PendingBookingDraft(
                serviceId = json.optString("service_id"),
                serviceTitle = json.optString("service_title"),
                basePriceCents = json.optInt("base_price_cents", 0),
                totalPriceCents = json.optInt("total_price_cents", 0),
                durationMinutes = json.optInt("duration_minutes", 0),
                addOnIds = json.optJSONArray("add_on_ids")?.toStringList().orEmpty(),
                addOnNames = json.optJSONArray("add_on_names")?.toStringList().orEmpty(),
                selectedDate = json.optString("selected_date"),
                selectedSlot = json.optString("selected_slot")
            ).takeIf { it.serviceId.isNotBlank() && it.selectedDate.isNotBlank() && it.selectedSlot.isNotBlank() }
        } catch (_: Exception) {
            null
        }
    }

    fun hasDraft(context: Context): Boolean = read(context) != null

    fun clear(context: Context) {
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .edit()
            .remove(keyDraft)
            .apply()
    }

    fun draftIntent(
        context: Context,
        showResumePrompt: Boolean = true
    ): Intent? {
        val draft = read(context) ?: return null
        return Intent(context, BookingScheduleActivity::class.java).apply {
            putExtra("service_id", draft.serviceId)
            putExtra("service_title", draft.serviceTitle)
            putExtra("service_base_price", draft.basePriceCents)
            putExtra("service_total_price", draft.totalPriceCents)
            putExtra("service_duration", draft.durationMinutes)
            putStringArrayListExtra("add_on_ids", ArrayList(draft.addOnIds))
            putStringArrayListExtra("add_on_names", ArrayList(draft.addOnNames))
            putExtra("selected_date", draft.selectedDate)
            putExtra("selected_slot", draft.selectedSlot)
            putExtra("show_resume_prompt", showResumePrompt)
        }
    }

    private fun JSONArray.toStringList(): List<String> {
        val result = mutableListOf<String>()
        for (index in 0 until length()) {
            val value = optString(index).trim()
            if (value.isNotEmpty()) result.add(value)
        }
        return result
    }
}

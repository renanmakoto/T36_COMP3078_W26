package com.brazwebdes.hairstylistbooking

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.CalendarView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.brazwebdes.hairstylistbooking.databinding.ActivityBookingScheduleBinding
import com.google.android.material.chip.Chip
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

class BookingScheduleActivity : AppCompatActivity() {

    private lateinit var binding: ActivityBookingScheduleBinding

    private var selectedDateKey: String? = null
    private var selectedSlot: String? = null
    private var availableSlots: List<String> = emptyList()
    private var rescheduleId: String? = null
    private var addOnIds: List<String> = emptyList()
    private var addOnNames: List<String> = emptyList()
    private var serviceId: String = ""
    private var serviceTitle: String = ""
    private var basePriceCents: Int = 0
    private var totalPriceCents: Int = 0
    private var serviceDuration: Int = 0
    private var pendingResumePrompt: Boolean = false
    private var savedSlotForPrompt: String? = null
    private var resumePromptHandled = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBookingScheduleBinding.inflate(layoutInflater)
        setContentView(binding.root)

        rescheduleId = intent.getStringExtra("reschedule_id")
        serviceId = intent.getStringExtra("service_id").orEmpty()
        serviceTitle = intent.getStringExtra("service_title").orEmpty()
        basePriceCents = intent.getIntExtra("service_base_price", intent.getIntExtra("service_price", 0))
        totalPriceCents = intent.getIntExtra("service_total_price", intent.getIntExtra("service_price", 0))
        serviceDuration = intent.getIntExtra("service_duration", 0)
        addOnNames = intent.getStringArrayListExtra("add_on_names")?.toList().orEmpty()
        addOnIds = intent.getStringArrayListExtra("add_on_ids")?.toList().orEmpty()
        pendingResumePrompt = intent.getBooleanExtra("show_resume_prompt", false)
        savedSlotForPrompt = intent.getStringExtra("selected_slot")

        if (serviceId.isBlank()) {
            finish()
            return
        }

        val startCalendar = Calendar.getInstance(TimeZone.getTimeZone("America/Toronto"))
        binding.calendarBooking.minDate = startCalendar.timeInMillis
        binding.toolbar.title = if (rescheduleId != null) "Reschedule appointment" else "Booking"
        binding.toolbar.setNavigationOnClickListener { finish() }
        binding.tvScreenTitle.text = if (rescheduleId != null) "Reschedule appointment" else "Pick date and time"
        binding.tvScheduleHint.text =
            if (rescheduleId != null) "Choose a new Toronto time for this booking."
            else "Review the live Toronto schedule before you confirm."
        binding.btnConfirmSlot.text = if (rescheduleId != null) "Confirm new time" else "Confirm booking"
        binding.tvGuestHint.visibility = if (UserSession.isLoggedIn) View.GONE else View.VISIBLE

        val selectedDateFromIntent = intent.getStringExtra("selected_date")
        val initialCalendar = parseDateKeyToCalendar(selectedDateFromIntent) ?: startCalendar
        setSelectedDate(initialCalendar)
        binding.calendarBooking.date = initialCalendar.timeInMillis

        binding.calendarBooking.setOnDateChangeListener { _: CalendarView, year: Int, month: Int, dayOfMonth: Int ->
            val calendar = Calendar.getInstance(TimeZone.getTimeZone("America/Toronto")).apply {
                set(Calendar.YEAR, year)
                set(Calendar.MONTH, month)
                set(Calendar.DAY_OF_MONTH, dayOfMonth)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            selectedSlot = null
            savedSlotForPrompt = null
            setSelectedDate(calendar)
            loadSlotsFromApi(selectedDateKey!!, serviceDuration)
        }

        binding.btnConfirmSlot.setOnClickListener {
            val slot = selectedSlot
            val date = selectedDateKey
            if (slot == null || date == null) {
                Toast.makeText(this, "Select a date and time", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (!UserSession.isLoggedIn) {
                val draft = PendingBookingDraft(
                    serviceId = serviceId,
                    serviceTitle = serviceTitle,
                    basePriceCents = basePriceCents,
                    totalPriceCents = totalPriceCents,
                    durationMinutes = serviceDuration,
                    addOnIds = addOnIds,
                    addOnNames = addOnNames,
                    selectedDate = date,
                    selectedSlot = slot
                )
                PendingBookingDraftStore.save(this, draft)
                showSignInPrompt()
                return@setOnClickListener
            }

            submitBooking(date, slot)
        }

        loadSlotsFromApi(selectedDateKey!!, serviceDuration)
        refreshSummary()
    }

    private fun setSelectedDate(calendar: Calendar) {
        selectedDateKey = dateKey(calendar)
        binding.tvSelectedDate.text = SimpleDateFormat("EEE, MMM d", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone("America/Toronto")
        }.format(calendar.time)
        refreshSummary()
    }

    private fun loadSlotsFromApi(dateKey: String, durationMinutes: Int) {
        selectedSlot = null
        availableSlots = emptyList()
        renderSlots()

        ApiClient.getAvailability(
            date = dateKey,
            durationMinutes = durationMinutes,
            onSuccess = { json ->
                val slotsArray = json.getJSONArray("slots")
                val slots = mutableListOf<String>()
                for (index in 0 until slotsArray.length()) {
                    slots.add(slotsArray.getString(index))
                }
                availableSlots = slots
                runOnUiThread {
                    renderSlots()
                    maybeShowResumePrompt()
                }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load slots: $message", Toast.LENGTH_SHORT).show()
                    renderSlots()
                }
            }
        )
    }

    private fun maybeShowResumePrompt() {
        if (!pendingResumePrompt || resumePromptHandled) return
        resumePromptHandled = true
        val restoredSlot = savedSlotForPrompt
        if (restoredSlot.isNullOrBlank()) {
            PendingBookingDraftStore.clear(this)
            return
        }

        if (availableSlots.contains(restoredSlot)) {
            MaterialAlertDialogBuilder(this)
                .setTitle("Continue your saved booking?")
                .setMessage(
                    "Your previous service, date, and time were saved before sign-in. Continue with $serviceTitle on " +
                        "${binding.tvSelectedDate.text} at ${to12Hour(restoredSlot)}, or go back and choose another option."
                )
                .setPositiveButton("Continue") { _, _ ->
                    selectedSlot = restoredSlot
                    PendingBookingDraftStore.clear(this)
                    renderSlots()
                }
                .setNegativeButton("Select another service or time") { _, _ ->
                    PendingBookingDraftStore.clear(this)
                    startActivity(Intent(this, BookingActivity::class.java))
                    finish()
                }
                .setCancelable(false)
                .show()
        } else {
            MaterialAlertDialogBuilder(this)
                .setTitle("Saved time no longer available")
                .setMessage(
                    "We restored your service and date, but the previous time is no longer free. Choose another time here or go back and pick another service."
                )
                .setPositiveButton("Choose another time") { _, _ ->
                    PendingBookingDraftStore.clear(this)
                    selectedSlot = null
                    renderSlots()
                }
                .setNegativeButton("Select another service") { _, _ ->
                    PendingBookingDraftStore.clear(this)
                    startActivity(Intent(this, BookingActivity::class.java))
                    finish()
                }
                .setCancelable(false)
                .show()
        }
    }

    private fun showSignInPrompt() {
        val dateLabel = selectedDateKey?.let { formatDateLabelForSummary(it) } ?: "selected date"
        val timeLabel = selectedSlot?.let { to12Hour(it) } ?: "selected time"
        val summaryPrice = formatMoney(totalPriceCents.coerceAtLeast(basePriceCents))
        MaterialAlertDialogBuilder(this)
            .setTitle("Sign in to confirm this appointment")
            .setMessage(
                "$serviceTitle\n$dateLabel at $timeLabel\n$summaryPrice\n\n" +
                    "You can browse the schedule without an account. To lock this time and finish the booking, sign in or create your client account first."
            )
            .setPositiveButton("Sign in to continue") { _, _ ->
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
            }
            .setNeutralButton("Create client account") { _, _ ->
                startActivity(Intent(this, SignUpActivity::class.java))
                finish()
            }
            .setNegativeButton("Keep browsing", null)
            .show()
    }

    private fun submitBooking(date: String, slot: String) {
        binding.btnConfirmSlot.isEnabled = false
        binding.btnConfirmSlot.text = if (rescheduleId != null) "Saving..." else "Booking..."

        val existingId = rescheduleId
        if (existingId != null) {
            ApiClient.rescheduleAppointment(
                existingId,
                date,
                slot,
                onSuccess = {
                    runOnUiThread {
                        PendingBookingDraftStore.clear(this)
                        startActivity(
                            BookingConfirmedActivity.intent(
                                context = this,
                                mode = BookingConfirmedActivity.Mode.RESCHEDULED,
                                title = serviceTitle,
                                date = date,
                                time = slot,
                            )
                        )
                        finish()
                    }
                },
                onError = { message ->
                    runOnUiThread {
                        binding.btnConfirmSlot.isEnabled = true
                        binding.btnConfirmSlot.text = "Confirm new time"
                        Toast.makeText(this, "Failed: $message", Toast.LENGTH_LONG).show()
                    }
                }
            )
        } else {
            ApiClient.createAppointment(
                serviceId = serviceId,
                addOnIds = addOnIds,
                date = date,
                startTime = slot,
                onSuccess = {
                    runOnUiThread {
                        PendingBookingDraftStore.clear(this)
                        startActivity(
                            BookingConfirmedActivity.intent(
                                context = this,
                                mode = BookingConfirmedActivity.Mode.CREATED,
                                title = serviceTitle,
                                date = date,
                                time = slot,
                            )
                        )
                        finish()
                    }
                },
                onError = { message ->
                    runOnUiThread {
                        binding.btnConfirmSlot.isEnabled = true
                        binding.btnConfirmSlot.text = "Confirm booking"
                        Toast.makeText(this, "Failed: $message", Toast.LENGTH_LONG).show()
                    }
                }
            )
        }
    }

    private fun renderSlots() {
        binding.chipGroupSlots.removeAllViews()
        if (availableSlots.isEmpty()) {
            binding.tvSlotsHint.text = "No available slots for this date."
        } else {
            binding.tvSlotsHint.text = "Toronto time / 15-minute grid"
        }

        availableSlots.forEach { time ->
            val chip = Chip(this).apply {
                text = to12Hour(time)
                isCheckable = true
                isClickable = true
                isChecked = time == selectedSlot
                tag = time
                setOnClickListener {
                    selectedSlot = time
                    renderSlots()
                }
            }
            binding.chipGroupSlots.addView(chip)
        }
        binding.btnConfirmSlot.isEnabled = selectedSlot != null
        refreshSummary()
    }

    private fun refreshSummary() {
        val dateLabel = selectedDateKey?.let { formatDateLabelForSummary(it) } ?: "Select a date"
        val timeLabel = selectedSlot?.let { to12Hour(it) } ?: "Select a slot"
        val addOnLabel = if (addOnNames.isEmpty()) "No add-ons selected" else addOnNames.joinToString(", ")

        binding.tvBookingSummary.text = buildString {
            append(serviceTitle)
            append("\n")
            append("Base ${formatMoney(basePriceCents)} / Total ${formatMoney(totalPriceCents.coerceAtLeast(basePriceCents))}")
            append("\n")
            append("Duration $serviceDuration min")
            append("\n")
            append("$dateLabel at $timeLabel")
            append("\n")
            append(addOnLabel)
        }
    }

    private fun dateKey(calendar: Calendar): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone("America/Toronto")
        }.format(calendar.time)
    }

    private fun parseDateKeyToCalendar(raw: String?): Calendar? {
        if (raw.isNullOrBlank()) return null
        return try {
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).apply {
                timeZone = TimeZone.getTimeZone("America/Toronto")
            }.parse(raw) ?: return null
            Calendar.getInstance(TimeZone.getTimeZone("America/Toronto")).apply {
                time = date
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun formatDateLabelForSummary(dateKey: String): String {
        val calendar = parseDateKeyToCalendar(dateKey) ?: return dateKey
        return SimpleDateFormat("EEE, MMM d", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone("America/Toronto")
        }.format(calendar.time)
    }

    private fun to12Hour(time24: String): String {
        val parts = time24.split(":")
        var hour = parts[0].toInt()
        val minute = parts[1]
        val period = if (hour >= 12) "PM" else "AM"
        if (hour == 0) hour = 12 else if (hour > 12) hour -= 12
        return "$hour:$minute $period"
    }
}

package com.example.uiprototypebeta

import android.os.Bundle
import android.widget.CalendarView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.uiprototypebeta.databinding.ActivityBookingScheduleBinding
import com.google.android.material.chip.Chip
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class BookingScheduleActivity : AppCompatActivity() {

    private lateinit var b: ActivityBookingScheduleBinding

    private var selectedDateKey: String? = null
    private var selectedSlot: String? = null
    private var availableSlots: List<String> = emptyList()

    // When rescheduling, this will be set; otherwise null for new bookings
    private var bookingId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityBookingScheduleBinding.inflate(layoutInflater)
        setContentView(b.root)

        bookingId = intent.getStringExtra("booking_id")

        val existingBooking = bookingId?.let { id ->
            BookingStore.getAllBookings().find { it.id == id }
        }

        val serviceId = existingBooking?.serviceId ?: intent.getStringExtra("service_id") ?: return finish()
        val serviceTitle = existingBooking?.serviceTitle ?: intent.getStringExtra("service_title").orEmpty()
        val servicePrice = existingBooking?.price ?: intent.getIntExtra("service_price", 0)
        val serviceDuration = existingBooking?.durationMinutes ?: intent.getIntExtra("service_duration", 0)
        val addBrows = existingBooking?.addBrows ?: intent.getBooleanExtra("add_brows", false)
        val addBrowsPrice = intent.getIntExtra("add_brows_price", 0)
        val addBrowsDuration = intent.getIntExtra("add_brows_duration", 0)

        b.toolbar.setNavigationOnClickListener { finish() }
        b.tvServiceSummary.text = buildSummary(serviceTitle, servicePrice, addBrows, addBrowsPrice)

        val calStart = Calendar.getInstance()
        if (existingBooking != null) {
            calStart.timeInMillis = existingBooking.startMillis
        }
        setSelectedDate(calStart)
        loadSlotsForDate(selectedDateKey!!)
        if (existingBooking != null) {
            selectedSlot = SimpleDateFormat("h:mm a", Locale.getDefault()).format(calStart.time)
        }

        b.calendarBooking.setOnDateChangeListener { _: CalendarView, year: Int, month: Int, dayOfMonth: Int ->
            val cal = Calendar.getInstance().apply {
                set(Calendar.YEAR, year)
                set(Calendar.MONTH, month)
                set(Calendar.DAY_OF_MONTH, dayOfMonth)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            setSelectedDate(cal)
            loadSlotsForDate(selectedDateKey!!)
        }

        b.btnConfirmSlot.setOnClickListener {
            val slot = selectedSlot
            val date = selectedDateKey
            if (slot != null && date != null) {
                val totalPrice = servicePrice + if (addBrows) addBrowsPrice else 0
                val summary = StringBuilder().apply {
                    append(serviceTitle)
                    if (addBrows) append(" + Brows")
                    append("\nDate: ${b.tvSelectedDate.text}")
                    append("\nTime: $slot")
                    append("\nPrice: $$totalPrice")
                }.toString()

                Toast.makeText(this, "Saved!", Toast.LENGTH_SHORT).show()
                // --- MOCK BOOKING DATA + SHARED BOOKING START ---
                holdSlot(date, slot, serviceDuration, if (addBrows) addBrowsDuration else 0)

                val startMillis = buildStartMillisFromDateAndTime(date, slot)
                val name = if (UserSession.displayName.isNotBlank()) UserSession.displayName else "Guest"
                if (UserSession.isLoggedIn) {
                    val existingId = bookingId
                    if (existingId != null) {
                        BookingStore.rescheduleBooking(existingId, startMillis)
                    } else {
                        BookingStore.addBooking(
                            userName = name,
                            serviceId = serviceId,
                            serviceTitle = serviceTitle,
                            startMillis = startMillis,
                            durationMinutes = serviceDuration + if (addBrows) addBrowsDuration else 0,
                            price = totalPrice,
                            addBrows = addBrows
                        )
                    }
                }
                // --- MOCK BOOKING DATA + SHARED BOOKING END ---

                finish()
            } else {
                Toast.makeText(this, "Select a date and time", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setSelectedDate(cal: Calendar) {
        selectedDateKey = dateKey(cal)
        b.tvSelectedDate.text = SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(cal.time)
    }

    private fun loadSlotsForDate(dateKey: String) {
        val dailyBusy = BookingMocks.busySlots[dateKey].orEmpty()
        val slots = BookingMocks.generateSlots().filterNot { dailyBusy.contains(it) }
        availableSlots = slots
        selectedSlot = null
        renderSlots()
    }

    private fun renderSlots() {
        b.chipGroupSlots.removeAllViews()
        val selected = selectedSlot
        val chips = mutableListOf<Chip>()

        availableSlots.forEach { time ->
            val chip = Chip(this).apply {
                text = time
                isCheckable = true
                isClickable = true
                isChecked = (time == selected)
                isEnabled = true
                setOnClickListener {
                    selectedSlot = time
                    renderSlots()
                }
            }
            b.chipGroupSlots.addView(chip)
            chips.add(chip)
        }

        if (selected != null) {
            val selectedIndex = availableSlots.indexOf(selected)
            if (selectedIndex >= 0) {
                val blockCount = BookingMocks.blocksToHold(
                    intent.getIntExtra("service_duration", 0),
                    if (intent.getBooleanExtra("add_brows", false)) intent.getIntExtra("add_brows_duration", 0) else 0
                )
                val end = (selectedIndex + blockCount).coerceAtMost(availableSlots.lastIndex)
                for (i in selectedIndex + 1..end) {
                    val chip = chips[i]
                    chip.isEnabled = false
                    chip.alpha = 0.35f
                }
            }
        }
        b.btnConfirmSlot.isEnabled = selectedSlot != null
    }

    private fun holdSlot(dateKey: String, slot: String, serviceDuration: Int, addOnDuration: Int) {
        val blockCount = BookingMocks.blocksToHold(serviceDuration, addOnDuration)
        val idx = availableSlots.indexOf(slot)
        val toBlock = mutableListOf(slot)
        for (i in 1..blockCount) {
            val next = availableSlots.getOrNull(idx + i)
            if (next != null) toBlock.add(next)
        }
        BookingMocks.appendBusy(dateKey, toBlock)
    }

    private fun buildSummary(
        serviceTitle: String,
        servicePrice: Int,
        addBrows: Boolean,
        addBrowsPrice: Int
    ): String {
        val total = servicePrice + if (addBrows) addBrowsPrice else 0
        return if (addBrows) {
            "$serviceTitle + Brows · $$total"
        } else {
            "$serviceTitle · $$total"
        }
    }

    private fun dateKey(cal: Calendar): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time)
    }

    private fun buildStartMillisFromDateAndTime(dateKey: String, slot: String): Long {
        val format = SimpleDateFormat("yyyy-MM-dd h:mm a", Locale.getDefault())
        val parsed = format.parse("$dateKey $slot")
        return parsed?.time ?: System.currentTimeMillis()
    }
}

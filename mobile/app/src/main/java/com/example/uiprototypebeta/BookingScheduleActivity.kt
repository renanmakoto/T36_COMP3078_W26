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
    private var rescheduleId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityBookingScheduleBinding.inflate(layoutInflater)
        setContentView(b.root)

        rescheduleId = intent.getStringExtra("reschedule_id")

        val serviceId = intent.getStringExtra("service_id") ?: return finish()
        val serviceTitle = intent.getStringExtra("service_title").orEmpty()
        val servicePrice = intent.getIntExtra("service_price", 0)
        val serviceDuration = intent.getIntExtra("service_duration", 0)
        val addBrows = intent.getBooleanExtra("add_brows", false)
        val addBrowsPrice = intent.getIntExtra("add_brows_price", 0)

        b.toolbar.setNavigationOnClickListener { finish() }
        b.tvServiceSummary.text = buildSummary(serviceTitle, servicePrice, addBrows, addBrowsPrice)

        val calStart = Calendar.getInstance()
        setSelectedDate(calStart)
        loadSlotsFromApi(selectedDateKey!!)

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
            loadSlotsFromApi(selectedDateKey!!)
        }

        b.btnConfirmSlot.setOnClickListener {
            val slot = selectedSlot
            val date = selectedDateKey
            if (slot == null || date == null) {
                Toast.makeText(this, "Select a date and time", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (!UserSession.isLoggedIn) {
                Toast.makeText(this, "Please sign in to book", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            b.btnConfirmSlot.isEnabled = false
            b.btnConfirmSlot.text = "Booking..."

            val existingId = rescheduleId
            if (existingId != null) {
                // Reschedule via API
                ApiClient.rescheduleAppointment(existingId, date, slot,
                    onSuccess = {
                        runOnUiThread {
                            Toast.makeText(this, "Rescheduled!", Toast.LENGTH_SHORT).show()
                            finish()
                        }
                    },
                    onError = { msg ->
                        runOnUiThread {
                            b.btnConfirmSlot.isEnabled = true
                            b.btnConfirmSlot.text = "Confirm time"
                            Toast.makeText(this, "Failed: $msg", Toast.LENGTH_LONG).show()
                        }
                    }
                )
            } else {
                // Create appointment via API
                ApiClient.createAppointment(serviceId, date, slot,
                    onSuccess = {
                        runOnUiThread {
                            Toast.makeText(this, "Appointment booked!", Toast.LENGTH_SHORT).show()
                            finish()
                        }
                    },
                    onError = { msg ->
                        runOnUiThread {
                            b.btnConfirmSlot.isEnabled = true
                            b.btnConfirmSlot.text = "Confirm time"
                            Toast.makeText(this, "Failed: $msg", Toast.LENGTH_LONG).show()
                        }
                    }
                )
            }
        }
    }

    private fun setSelectedDate(cal: Calendar) {
        selectedDateKey = dateKey(cal)
        b.tvSelectedDate.text = SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(cal.time)
    }

    private fun loadSlotsFromApi(dateKey: String) {
        selectedSlot = null
        availableSlots = emptyList()
        renderSlots()

        ApiClient.getAvailability(dateKey,
            onSuccess = { json ->
                val slotsArray = json.getJSONArray("slots")
                val slots = mutableListOf<String>()
                for (i in 0 until slotsArray.length()) {
                    slots.add(slotsArray.getString(i))
                }
                availableSlots = slots
                runOnUiThread { renderSlots() }
            },
            onError = { msg ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load slots: $msg", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }

    private fun renderSlots() {
        b.chipGroupSlots.removeAllViews()
        val selected = selectedSlot

        availableSlots.forEach { time ->
            val chip = Chip(this).apply {
                text = to12Hour(time)
                isCheckable = true
                isClickable = true
                isChecked = (time == selected)
                isEnabled = true
                tag = time // Store 24h format in tag
                setOnClickListener {
                    selectedSlot = time
                    renderSlots()
                }
            }
            b.chipGroupSlots.addView(chip)
        }
        b.btnConfirmSlot.isEnabled = selectedSlot != null
    }

    private fun buildSummary(
        serviceTitle: String,
        servicePrice: Int,
        addBrows: Boolean,
        addBrowsPrice: Int
    ): String {
        val total = servicePrice + if (addBrows) addBrowsPrice else 0
        val priceStr = "$${total / 100}.${String.format("%02d", total % 100)}"
        return if (addBrows) {
            "$serviceTitle + Brows · $priceStr"
        } else {
            "$serviceTitle · $priceStr"
        }
    }

    private fun dateKey(cal: Calendar): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time)
    }

    private fun to12Hour(time24: String): String {
        val parts = time24.split(":")
        var h = parts[0].toInt()
        val m = parts[1]
        val period = if (h >= 12) "PM" else "AM"
        if (h == 0) h = 12
        else if (h > 12) h -= 12
        return "$h:$m $period"
    }
}

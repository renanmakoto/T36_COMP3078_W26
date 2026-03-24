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

    private lateinit var binding: ActivityBookingScheduleBinding

    private var selectedDateKey: String? = null
    private var selectedSlot: String? = null
    private var availableSlots: List<String> = emptyList()
    private var rescheduleId: String? = null
    private var addOnIds: List<String> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBookingScheduleBinding.inflate(layoutInflater)
        setContentView(binding.root)

        rescheduleId = intent.getStringExtra("reschedule_id")

        val serviceId = intent.getStringExtra("service_id") ?: return finish()
        val serviceTitle = intent.getStringExtra("service_title").orEmpty()
        val servicePrice = intent.getIntExtra("service_price", 0)
        val serviceDuration = intent.getIntExtra("service_duration", 0)
        val addOnNames = intent.getStringArrayListExtra("add_on_names")?.toList().orEmpty()
        addOnIds = intent.getStringArrayListExtra("add_on_ids")?.toList().orEmpty()

        binding.toolbar.setNavigationOnClickListener { finish() }
        binding.tvServiceSummary.text = buildSummary(serviceTitle, servicePrice, serviceDuration, addOnNames)

        val startCalendar = Calendar.getInstance()
        setSelectedDate(startCalendar)
        loadSlotsFromApi(selectedDateKey!!, serviceDuration)

        binding.calendarBooking.setOnDateChangeListener { _: CalendarView, year: Int, month: Int, dayOfMonth: Int ->
            val calendar = Calendar.getInstance().apply {
                set(Calendar.YEAR, year)
                set(Calendar.MONTH, month)
                set(Calendar.DAY_OF_MONTH, dayOfMonth)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
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
                Toast.makeText(this, "Please sign in to book", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            binding.btnConfirmSlot.isEnabled = false
            binding.btnConfirmSlot.text = "Booking..."

            val existingId = rescheduleId
            if (existingId != null) {
                ApiClient.rescheduleAppointment(
                    existingId,
                    date,
                    slot,
                    onSuccess = {
                        runOnUiThread {
                            Toast.makeText(this, "Rescheduled!", Toast.LENGTH_SHORT).show()
                            finish()
                        }
                    },
                    onError = { message ->
                        runOnUiThread {
                            binding.btnConfirmSlot.isEnabled = true
                            binding.btnConfirmSlot.text = "Confirm time"
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
                            Toast.makeText(this, "Appointment booked!", Toast.LENGTH_SHORT).show()
                            finish()
                        }
                    },
                    onError = { message ->
                        runOnUiThread {
                            binding.btnConfirmSlot.isEnabled = true
                            binding.btnConfirmSlot.text = "Confirm time"
                            Toast.makeText(this, "Failed: $message", Toast.LENGTH_LONG).show()
                        }
                    }
                )
            }
        }
    }

    private fun setSelectedDate(calendar: Calendar) {
        selectedDateKey = dateKey(calendar)
        binding.tvSelectedDate.text = SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(calendar.time)
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
                runOnUiThread { renderSlots() }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load slots: $message", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }

    private fun renderSlots() {
        binding.chipGroupSlots.removeAllViews()
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
    }

    private fun buildSummary(
        serviceTitle: String,
        servicePrice: Int,
        serviceDuration: Int,
        addOnNames: List<String>
    ): String {
        val addOnLabel = if (addOnNames.isEmpty()) "No add-ons" else addOnNames.joinToString(", ")
        return "$serviceTitle\n${formatMoney(servicePrice)}  ${serviceDuration} min\n$addOnLabel"
    }

    private fun dateKey(calendar: Calendar): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(calendar.time)
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

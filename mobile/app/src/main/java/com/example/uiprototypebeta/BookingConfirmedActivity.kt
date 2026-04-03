package com.brazwebdes.hairstylistbooking

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import com.brazwebdes.hairstylistbooking.databinding.ActivityBookingConfirmedBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class BookingConfirmedActivity : AppCompatActivity() {

    enum class Mode {
        CREATED,
        RESCHEDULED,
    }

    private lateinit var binding: ActivityBookingConfirmedBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBookingConfirmedBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val mode = runCatching {
            Mode.valueOf(intent.getStringExtra(EXTRA_MODE).orEmpty())
        }.getOrDefault(Mode.CREATED)
        val title = intent.getStringExtra(EXTRA_TITLE).orEmpty().ifBlank { "Appointment" }
        val date = intent.getStringExtra(EXTRA_DATE).orEmpty()
        val time = intent.getStringExtra(EXTRA_TIME).orEmpty()

        binding.toolbar.title = if (mode == Mode.RESCHEDULED) "Appointment updated" else "Booking confirmed"
        binding.toolbar.setNavigationOnClickListener { goToAppointments() }

        binding.tvStatusBadge.text = if (mode == Mode.RESCHEDULED) "Appointment updated" else "Booking confirmed"
        binding.tvTitle.text =
            if (mode == Mode.RESCHEDULED) "Your appointment was rescheduled" else "Your booking is confirmed"
        binding.tvSummaryTitle.text = title
        binding.tvSummaryMeta.text =
            if (date.isNotBlank() && time.isNotBlank()) {
                "${formatDateLabel(date)} at ${to12Hour(time)} Toronto time"
            } else {
                "Check your email for the final booking details."
            }

        binding.btnViewAppointments.setOnClickListener { goToAppointments() }
        binding.btnBookAnother.setOnClickListener {
            startActivity(Intent(this, BookingActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            })
            finish()
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                goToAppointments()
            }
        })
    }

    private fun goToAppointments() {
        startActivity(Intent(this, UserDashboardActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        })
        finish()
    }

    private fun formatDateLabel(dateKey: String): String {
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("America/Toronto")
            }
            val date = parser.parse(dateKey) ?: return dateKey
            SimpleDateFormat("EEEE, MMMM d", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("America/Toronto")
            }.format(date)
        } catch (_: Exception) {
            dateKey
        }
    }

    private fun to12Hour(time24: String): String {
        val parts = time24.split(":")
        if (parts.size < 2) return time24
        var hour = parts[0].toIntOrNull() ?: return time24
        val minute = parts[1]
        val period = if (hour >= 12) "PM" else "AM"
        if (hour == 0) hour = 12 else if (hour > 12) hour -= 12
        return "$hour:$minute $period"
    }

    companion object {
        private const val EXTRA_MODE = "mode"
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_DATE = "date"
        private const val EXTRA_TIME = "time"

        fun intent(
            context: Context,
            mode: Mode,
            title: String,
            date: String,
            time: String,
        ): Intent {
            return Intent(context, BookingConfirmedActivity::class.java).apply {
                putExtra(EXTRA_MODE, mode.name)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_DATE, date)
                putExtra(EXTRA_TIME, time)
            }
        }
    }
}

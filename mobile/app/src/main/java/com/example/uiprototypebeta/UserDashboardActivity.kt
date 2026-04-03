package com.brazwebdes.hairstylistbooking

import android.content.Intent
import android.net.Uri
import android.graphics.Color
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.LinearLayout.LayoutParams
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.widget.AppCompatButton
import com.google.android.material.card.MaterialCardView
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class UserDashboardActivity : BaseDrawerActivity() {

    private lateinit var tvNextBooking: TextView
    private lateinit var tvTotalVisits: TextView
    private lateinit var btnUpcoming: Button
    private lateinit var btnPast: Button
    private lateinit var upcomingContainer: ScrollView
    private lateinit var upcomingList: LinearLayout
    private lateinit var pastContainer: LinearLayout
    private lateinit var btnPrivacyPolicy: Button
    private lateinit var btnDeleteAccount: Button

    private val dateParserPatterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX"
    )

    private data class AppointmentUi(
        val id: String,
        val serviceId: String,
        val serviceTitle: String,
        val basePriceCents: Int,
        val totalPriceCents: Int,
        val totalDurationMinutes: Int,
        val addOnIds: List<String>,
        val addOnNames: List<String>,
        val startMillis: Long,
        val status: String
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!ensureUserSession()) {
            return
        }

        setContentLayout(R.layout.content_user)
        setToolbarTitle("My Bookings")
        setCheckedDrawerItem(R.id.m_user)
        showLogoutOption(true)
        syncAuthUi()

        val tvGreeting: TextView = findViewById(R.id.tvGreeting)
        val tvDate: TextView = findViewById(R.id.tvDate)
        tvNextBooking = findViewById(R.id.tvNextBooking)
        tvTotalVisits = findViewById(R.id.tvTotalVisits)
        btnUpcoming = findViewById(R.id.btnUpcoming)
        btnPast = findViewById(R.id.btnPast)
        upcomingContainer = findViewById(R.id.upcomingContainer)
        upcomingList = findViewById(R.id.upcomingList)
        pastContainer = findViewById(R.id.pastContainer)
        btnPrivacyPolicy = findViewById(R.id.btnPrivacyPolicy)
        btnDeleteAccount = findViewById(R.id.btnDeleteAccount)

        val name = if (UserSession.displayName.isNotBlank()) UserSession.displayName else "Guest"
        tvGreeting.text = "Hi, $name"

        val currentDate = SimpleDateFormat("EEEE, MMM dd yyyy", Locale.getDefault()).format(Date())
        tvDate.text = "Today: $currentDate"

        fun setActiveButton(active: Button, inactive: Button) {
            active.setBackgroundColor(android.graphics.Color.parseColor("#1A132F"))
            active.setTextColor(android.graphics.Color.WHITE)
            inactive.setBackgroundColor(android.graphics.Color.parseColor("#F2F2F2"))
            inactive.setTextColor(android.graphics.Color.BLACK)
        }

        btnUpcoming.setOnClickListener {
            showUpcoming()
            setActiveButton(btnUpcoming, btnPast)
        }

        btnPast.setOnClickListener {
            showPast()
            setActiveButton(btnPast, btnUpcoming)
        }
        btnPrivacyPolicy.setOnClickListener { openPrivacyPolicy() }
        btnDeleteAccount.setOnClickListener { confirmDeleteAccount() }

        setActiveButton(btnUpcoming, btnPast)
        showUpcoming()

        loadAppointments()
    }

    override fun onResume() {
        super.onResume()
        if (!ensureUserSession()) {
            return
        }
        if (UserSession.isLoggedIn) {
            loadAppointments()
        }
    }

    private fun ensureUserSession(): Boolean {
        if (UserSession.isLoggedIn || AppSessionStore.activatePendingUserSession()) {
            return true
        }
        navigateToLoginScreen()
        return false
    }

    private fun showUpcoming() {
        upcomingContainer.visibility = View.VISIBLE
        pastContainer.visibility = View.GONE
    }

    private fun showPast() {
        upcomingContainer.visibility = View.GONE
        pastContainer.visibility = View.VISIBLE
    }

    private fun loadAppointments() {
        if (!UserSession.isLoggedIn) {
            tvNextBooking.text = "Sign in to manage bookings"
            tvTotalVisits.text = "0"
            upcomingList.removeAllViews()
            pastContainer.removeAllViews()
            addEmptyState(upcomingList, "No upcoming bookings")
            addEmptyState(pastContainer, "No past bookings")
            return
        }

        tvNextBooking.text = "Loading..."
        ApiClient.getMyAppointments(
            onSuccess = { array ->
                val appointments = parseAppointments(array)
                runOnUiThread { renderAppointments(appointments) }
            },
            onError = { msg ->
                runOnUiThread {
                    if (handleSessionExpired(msg)) {
                        return@runOnUiThread
                    }
                    tvNextBooking.text = "Unable to load"
                    Toast.makeText(this, "Failed to load appointments: $msg", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun parseAppointments(array: JSONArray): List<AppointmentUi> {
        val result = mutableListOf<AppointmentUi>()
        for (i in 0 until array.length()) {
            val obj = array.optJSONObject(i) ?: continue
            val service = obj.optJSONObject("service") ?: continue
            val start = parseIsoMillis(obj.optString("start_time")) ?: continue
            val addOnsArray = obj.optJSONArray("add_ons") ?: JSONArray()
            val addOnIds = mutableListOf<String>()
            val addOnNames = mutableListOf<String>()
            for (index in 0 until addOnsArray.length()) {
                val addOn = addOnsArray.optJSONObject(index) ?: continue
                addOnIds.add(addOn.optString("id"))
                addOnNames.add(addOn.optString("name"))
            }

            result.add(
                AppointmentUi(
                    id = obj.optString("id"),
                    serviceId = service.optString("id"),
                    serviceTitle = service.optString("name", "Service"),
                    basePriceCents = service.optInt("price_cents", 0),
                    totalPriceCents = obj.optInt("total_price_cents", service.optInt("price_cents", 0)),
                    totalDurationMinutes = obj.optInt("total_duration_minutes", service.optInt("duration_minutes", 0)),
                    addOnIds = addOnIds,
                    addOnNames = addOnNames,
                    startMillis = start,
                    status = obj.optString("status", "CONFIRMED")
                )
            )
        }
        return result
    }

    private fun renderAppointments(appointments: List<AppointmentUi>) {
        val now = System.currentTimeMillis()

        val upcoming = appointments
            .filter { it.status != "CANCELLED" && it.startMillis >= now }
            .sortedBy { it.startMillis }

        val past = appointments
            .filter { it.status == "CANCELLED" || it.startMillis < now }
            .sortedByDescending { it.startMillis }

        val next = upcoming.firstOrNull()
        tvNextBooking.text = if (next != null) {
            formatDateTime(next.startMillis)
        } else {
            "None scheduled"
        }

        val visits = appointments.count { it.status != "CANCELLED" }
        tvTotalVisits.text = visits.toString()

        upcomingList.removeAllViews()
        pastContainer.removeAllViews()

        if (upcoming.isEmpty()) {
            addEmptyState(upcomingList, "No upcoming bookings")
        } else {
            upcoming.forEach { appointment ->
                upcomingList.addView(buildAppointmentCard(appointment, isUpcoming = true))
            }
        }

        if (past.isEmpty()) {
            addEmptyState(pastContainer, "No past bookings")
        } else {
            past.forEach { appointment ->
                pastContainer.addView(buildAppointmentCard(appointment, isUpcoming = false))
            }
        }
    }

    private fun buildAppointmentCard(item: AppointmentUi, isUpcoming: Boolean): View {
        val card = MaterialCardView(this).apply {
            radius = dp(16).toFloat()
            strokeWidth = dp(1)
            strokeColor = Color.parseColor("#E5E4EF")
            setCardBackgroundColor(Color.WHITE)
            cardElevation = dp(2).toFloat()
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                topMargin = dp(12)
            }
            setContentPadding(dp(16), dp(16), dp(16), dp(16))
        }

        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        val title = TextView(this).apply {
            text = item.serviceTitle
            setTextColor(Color.parseColor("#0F0A1E"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }

        val date = TextView(this).apply {
            text = formatDateTime(item.startMillis)
            setTextColor(Color.parseColor("#5A5872"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(0, dp(4), 0, 0)
        }

        val status = TextView(this).apply {
            val label = when (item.status) {
                "CANCELLED" -> "Cancelled"
                "NO_SHOW" -> "No-show"
                "PENDING" -> "Pending"
                else -> "Confirmed"
            }
            text = "Status: $label"
            setTextColor(
                when (item.status) {
                    "CANCELLED" -> Color.parseColor("#B3261E")
                    "NO_SHOW" -> Color.parseColor("#7A3E00")
                    "PENDING" -> Color.parseColor("#7A4F01")
                    else -> Color.parseColor("#1A132F")
                }
            )
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(0, dp(4), 0, 0)
        }

        body.addView(title)
        body.addView(date)
        body.addView(status)

        if (isUpcoming && item.status != "CANCELLED") {
            val actions = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, dp(12), 0, 0)
            }

            val cancelBtn = AppCompatButton(this).apply {
                text = "Cancel"
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f).apply {
                    marginEnd = dp(6)
                }
                setOnClickListener { cancelAppointment(item.id) }
            }

            val rescheduleBtn = AppCompatButton(this).apply {
                text = "Reschedule"
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f).apply {
                    marginStart = dp(6)
                }
                setOnClickListener {
                    val intent = Intent(this@UserDashboardActivity, BookingScheduleActivity::class.java).apply {
                        putExtra("service_id", item.serviceId)
                        putExtra("service_title", item.serviceTitle)
                        putExtra("service_price", item.totalPriceCents)
                        putExtra("service_duration", item.totalDurationMinutes)
                        putExtra("reschedule_id", item.id)
                        putStringArrayListExtra("add_on_ids", ArrayList(item.addOnIds))
                        putStringArrayListExtra("add_on_names", ArrayList(item.addOnNames))
                    }
                    startActivity(intent)
                }
            }

            actions.addView(cancelBtn)
            actions.addView(rescheduleBtn)
            body.addView(actions)
        }

        card.addView(body)
        return card
    }

    private fun cancelAppointment(id: String) {
        ApiClient.cancelAppointment(
            id = id,
            onSuccess = {
                runOnUiThread {
                    Toast.makeText(this, "Appointment cancelled", Toast.LENGTH_SHORT).show()
                    loadAppointments()
                }
            },
            onError = { msg ->
                runOnUiThread {
                    if (handleSessionExpired(msg)) {
                        return@runOnUiThread
                    }
                    Toast.makeText(this, "Failed to cancel: $msg", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun openPrivacyPolicy() {
        openExternalUrl(ApiClient.privacyPolicyUrl)
    }

    private fun confirmDeleteAccount() {
        AlertDialog.Builder(this)
            .setTitle("Delete account?")
            .setMessage(
                "This permanently removes your account and booking history from the app. " +
                    "This action cannot be undone."
            )
            .setNegativeButton("Keep account", null)
            .setPositiveButton("Delete") { _, _ ->
                deleteAccount()
            }
            .show()
    }

    private fun deleteAccount() {
        btnDeleteAccount.isEnabled = false
        btnDeleteAccount.text = "Deleting..."
        ApiClient.deleteAccount(
            onSuccess = {
                runOnUiThread {
                    PendingBookingDraftStore.clear(this)
                    AppSessionStore.clear(this)
                    Toast.makeText(this, "Account deleted", Toast.LENGTH_LONG).show()
                    startActivity(Intent(this, LoginActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    })
                    finish()
                }
            },
            onError = { msg ->
                runOnUiThread {
                    if (handleSessionExpired(msg)) {
                        return@runOnUiThread
                    }
                    btnDeleteAccount.isEnabled = true
                    btnDeleteAccount.text = "Delete account"
                    Toast.makeText(this, "Failed to delete account: $msg", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun handleSessionExpired(message: String): Boolean {
        if (!isSessionExpiredMessage(message)) {
            return false
        }
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        navigateToLoginScreen()
        return true
    }

    private fun openExternalUrl(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) {
            Toast.makeText(this, "Unable to open link", Toast.LENGTH_LONG).show()
        }
    }

    private fun addEmptyState(container: LinearLayout, message: String) {
        val text = TextView(this).apply {
            this.text = message
            setTextColor(Color.parseColor("#7B7794"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            setPadding(0, dp(8), 0, dp(8))
        }
        container.addView(text)
    }

    private fun parseIsoMillis(raw: String): Long? {
        for (pattern in dateParserPatterns) {
            try {
                val parser = SimpleDateFormat(pattern, Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                    isLenient = false
                }
                return parser.parse(raw)?.time
            } catch (_: Exception) {
            }
        }
        return null
    }

    private fun formatDateTime(millis: Long): String {
        return SimpleDateFormat("EEE, MMM d - h:mm a", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone("America/Toronto")
        }.format(Date(millis))
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }
}

package com.example.uiprototypebeta

import android.graphics.Color
import android.content.Intent
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.widget.AppCompatButton
import com.google.android.material.card.MaterialCardView
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class AdminDashboardActivity : BaseDrawerActivity() {

    private lateinit var btnList: Button
    private lateinit var btnCalendar: Button
    private lateinit var btnAnalytics: Button
    private lateinit var btnManageBookings: Button
    private lateinit var btnManageServices: Button
    private lateinit var btnManageContent: Button
    private lateinit var listContainer: ScrollView
    private lateinit var calendarContainer: LinearLayout
    private lateinit var analyticsContainer: ScrollView
    private lateinit var listAppointmentsContainer: LinearLayout

    private lateinit var tvMonthBookings: TextView
    private lateinit var tvMonthRevenue: TextView
    private lateinit var tvMonthAvgTicket: TextView
    private lateinit var tvYearBookings: TextView
    private lateinit var tvYearRevenue: TextView
    private lateinit var tvNoShowRate: TextView
    private lateinit var tvTopService1: TextView
    private lateinit var tvTopService2: TextView
    private lateinit var tvTopService3: TextView
    private lateinit var pbTopService1: ProgressBar
    private lateinit var pbTopService2: ProgressBar
    private lateinit var pbTopService3: ProgressBar
    private lateinit var tvBusiestDay: TextView
    private lateinit var tvBusiestHour: TextView
    private lateinit var tvNewClients: TextView
    private lateinit var tvReturningClients: TextView
    private lateinit var tvRetentionRate: TextView
    private lateinit var tvCancelled: TextView
    private lateinit var tvNoShows: TextView
    private lateinit var tvInsight1: TextView
    private lateinit var tvInsight2: TextView

    private val dateParserPatterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX"
    )

    private data class AdminAppointmentUi(
        val id: String,
        val userId: String,
        val userEmail: String,
        val serviceName: String,
        val servicePriceCents: Int,
        val startMillis: Long,
        val status: String
    )

    private var appointments: List<AdminAppointmentUi> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentLayout(R.layout.content_admin)
        setToolbarTitle("Admin Dashboard")
        setCheckedDrawerItem(R.id.m_admin)
        showLogoutOption(true)

        val tvDate: TextView = findViewById(R.id.tvDate)
        val currentDate = SimpleDateFormat("EEEE, MMM dd yyyy", Locale.getDefault()).format(Date())
        tvDate.text = "Today: $currentDate"

        btnList = findViewById(R.id.btnList)
        btnCalendar = findViewById(R.id.btnCalendar)
        btnAnalytics = findViewById(R.id.btnAnalytics)
        btnManageBookings = findViewById(R.id.btnManageBookings)
        btnManageServices = findViewById(R.id.btnManageServices)
        btnManageContent = findViewById(R.id.btnManageContent)
        listContainer = findViewById(R.id.listContainer)
        calendarContainer = findViewById(R.id.calendarContainer)
        analyticsContainer = findViewById(R.id.analyticsContainer)
        listAppointmentsContainer = findViewById(R.id.listAppointmentsContainer)

        tvMonthBookings = findViewById(R.id.tvMonthBookings)
        tvMonthRevenue = findViewById(R.id.tvMonthRevenue)
        tvMonthAvgTicket = findViewById(R.id.tvMonthAvgTicket)
        tvYearBookings = findViewById(R.id.tvYearBookings)
        tvYearRevenue = findViewById(R.id.tvYearRevenue)
        tvNoShowRate = findViewById(R.id.tvNoShowRate)
        tvTopService1 = findViewById(R.id.tvTopService1)
        tvTopService2 = findViewById(R.id.tvTopService2)
        tvTopService3 = findViewById(R.id.tvTopService3)
        pbTopService1 = findViewById(R.id.pbTopService1)
        pbTopService2 = findViewById(R.id.pbTopService2)
        pbTopService3 = findViewById(R.id.pbTopService3)
        tvBusiestDay = findViewById(R.id.tvBusiestDay)
        tvBusiestHour = findViewById(R.id.tvBusiestHour)
        tvNewClients = findViewById(R.id.tvNewClients)
        tvReturningClients = findViewById(R.id.tvReturningClients)
        tvRetentionRate = findViewById(R.id.tvRetentionRate)
        tvCancelled = findViewById(R.id.tvCancelled)
        tvNoShows = findViewById(R.id.tvNoShows)
        tvInsight1 = findViewById(R.id.tvInsight1)
        tvInsight2 = findViewById(R.id.tvInsight2)

        btnList.setOnClickListener {
            showListSection()
            setActiveButton(btnList, btnCalendar, btnAnalytics)
        }

        btnCalendar.setOnClickListener {
            showCalendarSection()
            setActiveButton(btnCalendar, btnList, btnAnalytics)
        }

        btnAnalytics.setOnClickListener {
            showAnalyticsSection()
            setActiveButton(btnAnalytics, btnList, btnCalendar)
            renderAnalytics(appointments)
            loadAnalyticsFromApi()
        }

        btnManageBookings.setOnClickListener {
            startActivity(Intent(this, WebAdminActivity::class.java).apply {
                putExtra("title", "Bookings")
                putExtra("path", "/admin/dashboard/bookings")
            })
        }

        btnManageServices.setOnClickListener {
            startActivity(Intent(this, WebAdminActivity::class.java).apply {
                putExtra("title", "Services")
                putExtra("path", "/admin/dashboard/services")
            })
        }

        btnManageContent.setOnClickListener {
            startActivity(Intent(this, WebAdminActivity::class.java).apply {
                putExtra("title", "Content")
                putExtra("path", "/admin/dashboard")
            })
        }

        showListSection()
        setActiveButton(btnList, btnCalendar, btnAnalytics)

        loadAdminAppointments()
    }

    override fun onResume() {
        super.onResume()
        if (AdminSession.isLoggedIn) {
            loadAdminAppointments()
        }
    }

    private fun showListSection() {
        listContainer.visibility = View.VISIBLE
        calendarContainer.visibility = View.GONE
        analyticsContainer.visibility = View.GONE
    }

    private fun showCalendarSection() {
        listContainer.visibility = View.GONE
        calendarContainer.visibility = View.VISIBLE
        analyticsContainer.visibility = View.GONE
    }

    private fun showAnalyticsSection() {
        listContainer.visibility = View.GONE
        calendarContainer.visibility = View.GONE
        analyticsContainer.visibility = View.VISIBLE
    }

    private fun setActiveButton(active: Button, vararg inactive: Button) {
        active.setBackgroundColor(Color.parseColor("#1A132F"))
        active.setTextColor(Color.WHITE)
        inactive.forEach {
            it.setBackgroundColor(Color.parseColor("#F2F2F2"))
            it.setTextColor(Color.BLACK)
        }
    }

    private fun loadAdminAppointments() {
        if (!AdminSession.isLoggedIn) {
            return
        }

        ApiClient.getAdminAppointments(
            onSuccess = { array ->
                val loaded = parseAdminAppointments(array)
                runOnUiThread {
                    appointments = loaded
                    renderAppointmentsList(loaded)
                    renderAnalytics(loaded)
                    if (analyticsContainer.visibility == View.VISIBLE) {
                        loadAnalyticsFromApi()
                    }
                }
            },
            onError = { msg ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load admin appointments: $msg", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun parseAdminAppointments(array: JSONArray): List<AdminAppointmentUi> {
        val result = mutableListOf<AdminAppointmentUi>()
        for (i in 0 until array.length()) {
            val obj = array.optJSONObject(i) ?: continue
            val service = obj.optJSONObject("service") ?: continue
            val user = obj.optJSONObject("user") ?: continue
            val startMillis = parseIsoMillis(obj.optString("start_time")) ?: continue

            result.add(
                AdminAppointmentUi(
                    id = obj.optString("id"),
                    userId = user.optString("id"),
                    userEmail = user.optString("email", "client"),
                    serviceName = service.optString("name", "Service"),
                    servicePriceCents = service.optInt("price_cents", 0),
                    startMillis = startMillis,
                    status = obj.optString("status", "CONFIRMED")
                )
            )
        }
        return result
    }

    private fun renderAppointmentsList(all: List<AdminAppointmentUi>) {
        listAppointmentsContainer.removeAllViews()

        addSectionHeader()

        val now = System.currentTimeMillis()
        val upcoming = all
            .filter { it.status != "CANCELLED" && it.startMillis >= now }
            .sortedBy { it.startMillis }

        if (upcoming.isEmpty()) {
            listAppointmentsContainer.addView(buildEmptyCard("No upcoming appointments"))
            return
        }

        upcoming.forEach { appointment ->
            listAppointmentsContainer.addView(buildAppointmentCard(appointment))
        }
    }

    private fun addSectionHeader() {
        val headerCard = MaterialCardView(this).apply {
            radius = dp(16).toFloat()
            setCardBackgroundColor(Color.WHITE)
            strokeWidth = dp(1)
            strokeColor = Color.parseColor("#E5E4EF")
            cardElevation = dp(2).toFloat()
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(12) }
            setContentPadding(dp(16), dp(16), dp(16), dp(16))
        }
        val title = TextView(this).apply {
            text = "Upcoming Appointments"
            setTextColor(Color.parseColor("#0F0A1E"))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        }
        headerCard.addView(title)
        listAppointmentsContainer.addView(headerCard)
    }

    private fun buildAppointmentCard(item: AdminAppointmentUi): View {
        val card = MaterialCardView(this).apply {
            radius = dp(16).toFloat()
            setCardBackgroundColor(Color.WHITE)
            strokeWidth = dp(1)
            strokeColor = Color.parseColor("#E5E4EF")
            cardElevation = dp(2).toFloat()
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(12) }
            setContentPadding(dp(16), dp(16), dp(16), dp(16))
        }

        val body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        body.addView(TextView(this).apply {
            text = item.serviceName
            setTextColor(Color.parseColor("#0F0A1E"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        body.addView(TextView(this).apply {
            text = item.userEmail
            setTextColor(Color.parseColor("#5A5872"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(0, dp(4), 0, 0)
        })
        body.addView(TextView(this).apply {
            text = formatDateTime(item.startMillis)
            setTextColor(Color.parseColor("#5A5872"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(0, dp(4), 0, 0)
        })
        body.addView(TextView(this).apply {
            text = "Status: ${item.status}"
            setTextColor(
                when (item.status) {
                    "PENDING" -> Color.parseColor("#7A4F01")
                    "NO_SHOW" -> Color.parseColor("#7A3E00")
                    else -> Color.parseColor("#1A132F")
                }
            )
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(0, dp(4), 0, 0)
        })

        val cancelBtn = AppCompatButton(this).apply {
            text = "Cancel appointment"
            setPadding(dp(8), dp(8), dp(8), dp(8))
            setOnClickListener { cancelAppointment(item.id) }
        }
        val cancelWrap = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(10), 0, 0)
            addView(cancelBtn)
        }

        body.addView(cancelWrap)
        card.addView(body)
        return card
    }

    private fun buildEmptyCard(message: String): View {
        val card = MaterialCardView(this).apply {
            radius = dp(16).toFloat()
            setCardBackgroundColor(Color.WHITE)
            strokeWidth = dp(1)
            strokeColor = Color.parseColor("#E5E4EF")
            cardElevation = dp(2).toFloat()
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(12) }
            setContentPadding(dp(16), dp(16), dp(16), dp(16))
        }
        card.addView(TextView(this).apply {
            text = message
            setTextColor(Color.parseColor("#7B7794"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        })
        return card
    }

    private fun cancelAppointment(id: String) {
        ApiClient.adminCancelAppointment(
            id = id,
            onSuccess = {
                runOnUiThread {
                    Toast.makeText(this, "Appointment cancelled", Toast.LENGTH_SHORT).show()
                    loadAdminAppointments()
                }
            },
            onError = { msg ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to cancel: $msg", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun renderAnalytics(allAppointments: List<AdminAppointmentUi>) {
        val now = Calendar.getInstance()
        val currentYear = now.get(Calendar.YEAR)
        val currentMonth = now.get(Calendar.MONTH)

        val activeAll = allAppointments.filter { it.status != "CANCELLED" }
        val monthAll = allAppointments.filter { isInMonth(it.startMillis, currentYear, currentMonth) }
        val monthActive = activeAll.filter { isInMonth(it.startMillis, currentYear, currentMonth) }
        val yearActive = activeAll.filter { isInYear(it.startMillis, currentYear) }

        val monthBookings = monthActive.size
        val monthRevenueCents = monthActive.sumOf { it.servicePriceCents }
        val yearBookings = yearActive.size
        val yearRevenueCents = yearActive.sumOf { it.servicePriceCents }
        val avgTicket = if (monthBookings > 0) monthRevenueCents / monthBookings else 0

        tvMonthBookings.text = "$monthBookings bookings"
        tvMonthRevenue.text = "${formatMoney(monthRevenueCents)} revenue"
        tvMonthAvgTicket.text = "Avg ticket ${formatMoney(avgTicket)}"

        tvYearBookings.text = "$yearBookings bookings"
        tvYearRevenue.text = "${formatMoney(yearRevenueCents)} revenue"

        val noShowCount = activeAll.count { it.status == "NO_SHOW" }
        val noShowRate = if (activeAll.isNotEmpty()) (noShowCount * 100.0) / activeAll.size else 0.0
        tvNoShowRate.text = String.format(Locale.getDefault(), "No-show rate %.0f%%", noShowRate)

        val topFallback = monthActive
            .groupingBy { it.serviceName }
            .eachCount()
            .entries
            .sortedByDescending { it.value }
            .map { it.key to it.value }
        applyTopServices(topFallback)

        val busiestDayEntry = monthActive
            .groupingBy { weekdayName(it.startMillis) }
            .eachCount()
            .maxByOrNull { it.value }
        val busiestHourEntry = monthActive
            .groupingBy { hourBucket(it.startMillis) }
            .eachCount()
            .maxByOrNull { it.value }

        tvBusiestDay.text = if (busiestDayEntry != null) {
            "Busiest day: ${busiestDayEntry.key} (${busiestDayEntry.value})"
        } else {
            "Busiest day: -"
        }
        tvBusiestHour.text = if (busiestHourEntry != null) {
            "Busiest hour: ${formatHourRange(busiestHourEntry.key)}"
        } else {
            "Busiest hour: -"
        }

        val firstVisitByUser = activeAll
            .groupBy { it.userId }
            .mapValues { entry -> entry.value.minOfOrNull { it.startMillis } ?: Long.MAX_VALUE }
        val monthUsers = monthActive.map { it.userId }.toSet()
        val newClients = monthUsers.count { userId ->
            val firstVisit = firstVisitByUser[userId] ?: return@count false
            isInMonth(firstVisit, currentYear, currentMonth)
        }
        val returningClients = (monthUsers.size - newClients).coerceAtLeast(0)
        val retentionRate = if (monthUsers.isNotEmpty()) {
            (returningClients * 100.0) / monthUsers.size
        } else {
            0.0
        }

        tvNewClients.text = "New: $newClients"
        tvReturningClients.text = "Returning: $returningClients"
        tvRetentionRate.text = String.format(Locale.getDefault(), "Retention: %.0f%%", retentionRate)

        val cancelledInMonth = monthAll.count { it.status == "CANCELLED" }
        val noShowsInMonth = monthAll.count { it.status == "NO_SHOW" }
        tvCancelled.text = "Cancelled: $cancelledInMonth"
        tvNoShows.text = "No-shows: $noShowsInMonth"

        val topServiceName = topFallback.firstOrNull()?.first
        tvInsight1.text = if (busiestDayEntry != null && busiestHourEntry != null) {
            "- Peak demand is ${busiestDayEntry.key} around ${formatHourRange(busiestHourEntry.key)}."
        } else {
            "- Not enough data this month to estimate peak demand."
        }
        tvInsight2.text = if (!topServiceName.isNullOrBlank()) {
            "- $topServiceName is leading bookings this month; consider a bundle promotion."
        } else {
            "- Top service insight will appear after more bookings."
        }
    }

    private fun loadAnalyticsFromApi() {
        ApiClient.getNoShowRate(
            onSuccess = { json ->
                val noShowRate = json.optDouble("no_show_rate_percent", 0.0)
                runOnUiThread {
                    tvNoShowRate.text =
                        String.format(Locale.getDefault(), "No-show rate %.0f%%", noShowRate)
                }
            },
            onError = { /* keep local fallback already rendered */ }
        )

        ApiClient.getTopServices(
            onSuccess = { array ->
                val top = mutableListOf<Pair<String, Int>>()
                for (i in 0 until array.length()) {
                    val obj = array.optJSONObject(i) ?: continue
                    top.add(obj.optString("service_name", "Service") to obj.optInt("count", 0))
                }
                runOnUiThread { applyTopServices(top) }
            },
            onError = { /* keep local fallback already rendered */ }
        )
    }

    private fun applyTopServices(top: List<Pair<String, Int>>) {
        val first = top.getOrNull(0)
        val second = top.getOrNull(1)
        val third = top.getOrNull(2)
        val maxCount = top.maxOfOrNull { it.second }?.coerceAtLeast(1) ?: 1

        tvTopService1.text = if (first != null) "1) ${first.first} - ${first.second} bookings" else "1) -"
        tvTopService2.text = if (second != null) "2) ${second.first} - ${second.second} bookings" else "2) -"
        tvTopService3.text = if (third != null) "3) ${third.first} - ${third.second} bookings" else "3) -"

        pbTopService1.progress = first?.let { it.second * 100 / maxCount } ?: 0
        pbTopService2.progress = second?.let { it.second * 100 / maxCount } ?: 0
        pbTopService3.progress = third?.let { it.second * 100 / maxCount } ?: 0
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

    private fun isInMonth(millis: Long, year: Int, month: Int): Boolean {
        val cal = Calendar.getInstance().apply { timeInMillis = millis }
        return cal.get(Calendar.YEAR) == year && cal.get(Calendar.MONTH) == month
    }

    private fun isInYear(millis: Long, year: Int): Boolean {
        val cal = Calendar.getInstance().apply { timeInMillis = millis }
        return cal.get(Calendar.YEAR) == year
    }

    private fun weekdayName(millis: Long): String {
        return SimpleDateFormat("EEEE", Locale.getDefault()).format(Date(millis))
    }

    private fun hourBucket(millis: Long): Int {
        val cal = Calendar.getInstance().apply { timeInMillis = millis }
        return cal.get(Calendar.HOUR_OF_DAY)
    }

    private fun formatHourRange(hour24: Int): String {
        val start = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour24)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val end = Calendar.getInstance().apply {
            timeInMillis = start.timeInMillis
            add(Calendar.HOUR_OF_DAY, 1)
        }
        val formatter = SimpleDateFormat("h:mm a", Locale.getDefault())
        return "${formatter.format(start.time)} - ${formatter.format(end.time)}"
    }

    private fun formatDateTime(millis: Long): String {
        return SimpleDateFormat("EEE, MMM d - h:mm a", Locale.getDefault()).format(Date(millis))
    }

    private fun formatMoney(cents: Int): String {
        return String.format(Locale.getDefault(), "$%.2f", cents / 100.0)
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }
}

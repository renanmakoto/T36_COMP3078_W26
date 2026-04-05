package com.brazwebdes.hairstylistbooking

import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.widget.AppCompatButton
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class AdminDashboardActivity : BaseDrawerActivity() {

    enum class ViewMode {
        OVERVIEW,
        ANALYTICS,
        BOOKINGS,
    }

    private data class AdminAppointmentUi(
        val id: String,
        val userId: String,
        val userName: String,
        val userEmail: String,
        val serviceName: String,
        val startMillis: Long,
        val totalPriceCents: Int,
        val notes: String,
        val status: String,
        val addOnNames: List<String>,
    )

    private data class OverviewSnapshot(
        val totalBookings: Int = 0,
        val upcomingBookings: Int = 0,
        val todayBookings: Int = 0,
        val scheduledRevenueCents: Int = 0,
        val completedRevenueCents: Int = 0,
        val thisMonthRevenueCents: Int = 0,
        val uniqueClients: Int = 0,
        val returningClients: Int = 0,
        val newClientsThisMonth: Int = 0,
    )

    private data class NoShowSnapshot(
        val totalAppointments: Int = 0,
        val noShows: Int = 0,
        val noShowRatePercent: Double = 0.0,
    )

    private data class BarDatum(
        val label: String,
        val value: Int,
    )

    private class DashboardLoadState {
        var appointments: List<AdminAppointmentUi> = emptyList()
        var overview: OverviewSnapshot = OverviewSnapshot()
        var pendingReviews: Int = 0
        var topServices: List<BarDatum> = emptyList()
        var dailyCounts: List<BarDatum> = emptyList()
        var monthlyCounts: List<BarDatum> = emptyList()
        var noShowSnapshot: NoShowSnapshot = NoShowSnapshot()
        val errors: MutableList<String> = mutableListOf()
    }

    private lateinit var tvHeroEyebrow: TextView
    private lateinit var tvHeroTitle: TextView
    private lateinit var tvHeroBody: TextView
    private lateinit var btnQuickRefresh: MaterialButton
    private lateinit var btnQuickPortfolio: MaterialButton
    private lateinit var btnQuickBlog: MaterialButton
    private lateinit var btnOverviewTab: Button
    private lateinit var btnAnalyticsTab: Button
    private lateinit var btnBookingsTab: Button
    private lateinit var tvNoticeBanner: TextView
    private lateinit var tvMetricTodayBookings: TextView
    private lateinit var tvMetricUpcomingBookings: TextView
    private lateinit var tvMetricScheduledRevenue: TextView
    private lateinit var tvMetricPendingReviews: TextView
    private lateinit var overviewSection: LinearLayout
    private lateinit var analyticsSection: LinearLayout
    private lateinit var bookingsSection: LinearLayout
    private lateinit var overviewTodayQueueContainer: LinearLayout
    private lateinit var overviewUpcomingContainer: LinearLayout
    private lateinit var bookingsContainer: LinearLayout
    private lateinit var tvSnapshotMonthRevenue: TextView
    private lateinit var tvSnapshotCompletedRevenue: TextView
    private lateinit var tvSnapshotReturningClients: TextView
    private lateinit var tvAnalyticsScheduledRevenue: TextView
    private lateinit var tvAnalyticsCompletedRevenue: TextView
    private lateinit var tvAnalyticsMonthRevenue: TextView
    private lateinit var tvAnalyticsNoShowRate: TextView
    private lateinit var tvAnalyticsRevenueClients: TextView
    private lateinit var tvAnalyticsQuality: TextView
    private lateinit var analyticsTopServicesContainer: LinearLayout
    private lateinit var analyticsDailyBookingsContainer: LinearLayout
    private lateinit var analyticsMonthlyBookingsContainer: LinearLayout

    private val torontoTimeZone: TimeZone = TimeZone.getTimeZone("America/Toronto")

    private var currentView: ViewMode = ViewMode.OVERVIEW
    private var appointments: List<AdminAppointmentUi> = emptyList()
    private var overview: OverviewSnapshot = OverviewSnapshot()
    private var pendingReviews: Int = 0
    private var topServices: List<BarDatum> = emptyList()
    private var dailyCounts: List<BarDatum> = emptyList()
    private var monthlyCounts: List<BarDatum> = emptyList()
    private var noShowSnapshot: NoShowSnapshot = NoShowSnapshot()
    private var loadVersion: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!ensureAdminSession()) {
            return
        }

        setContentLayout(R.layout.content_admin)
        setToolbarTitle("Admin Dashboard")
        setCheckedDrawerItem(R.id.m_admin)
        showLogoutOption(true)
        updateUserFooterLabel()

        bindViews()
        bindInteractions()

        currentView = requestedInitialView()
        showSection(currentView)
        renderLoadingState()
        loadDashboard()
    }

    override fun onResume() {
        super.onResume()
        if (ensureAdminSession()) {
            loadDashboard()
        }
    }

    private fun bindViews() {
        tvHeroEyebrow = findViewById(R.id.tvHeroEyebrow)
        tvHeroTitle = findViewById(R.id.tvHeroTitle)
        tvHeroBody = findViewById(R.id.tvHeroBody)
        btnQuickRefresh = findViewById(R.id.btnQuickRefresh)
        btnQuickPortfolio = findViewById(R.id.btnQuickPortfolio)
        btnQuickBlog = findViewById(R.id.btnQuickBlog)
        btnOverviewTab = findViewById(R.id.btnOverviewTab)
        btnAnalyticsTab = findViewById(R.id.btnAnalyticsTab)
        btnBookingsTab = findViewById(R.id.btnBookingsTab)
        tvNoticeBanner = findViewById(R.id.tvNoticeBanner)
        tvMetricTodayBookings = findViewById(R.id.tvMetricTodayBookings)
        tvMetricUpcomingBookings = findViewById(R.id.tvMetricUpcomingBookings)
        tvMetricScheduledRevenue = findViewById(R.id.tvMetricScheduledRevenue)
        tvMetricPendingReviews = findViewById(R.id.tvMetricPendingReviews)
        overviewSection = findViewById(R.id.overviewSection)
        analyticsSection = findViewById(R.id.analyticsSection)
        bookingsSection = findViewById(R.id.bookingsSection)
        overviewTodayQueueContainer = findViewById(R.id.overviewTodayQueueContainer)
        overviewUpcomingContainer = findViewById(R.id.overviewUpcomingContainer)
        bookingsContainer = findViewById(R.id.bookingsContainer)
        tvSnapshotMonthRevenue = findViewById(R.id.tvSnapshotMonthRevenue)
        tvSnapshotCompletedRevenue = findViewById(R.id.tvSnapshotCompletedRevenue)
        tvSnapshotReturningClients = findViewById(R.id.tvSnapshotReturningClients)
        tvAnalyticsScheduledRevenue = findViewById(R.id.tvAnalyticsScheduledRevenue)
        tvAnalyticsCompletedRevenue = findViewById(R.id.tvAnalyticsCompletedRevenue)
        tvAnalyticsMonthRevenue = findViewById(R.id.tvAnalyticsMonthRevenue)
        tvAnalyticsNoShowRate = findViewById(R.id.tvAnalyticsNoShowRate)
        tvAnalyticsRevenueClients = findViewById(R.id.tvAnalyticsRevenueClients)
        tvAnalyticsQuality = findViewById(R.id.tvAnalyticsQuality)
        analyticsTopServicesContainer = findViewById(R.id.analyticsTopServicesContainer)
        analyticsDailyBookingsContainer = findViewById(R.id.analyticsDailyBookingsContainer)
        analyticsMonthlyBookingsContainer = findViewById(R.id.analyticsMonthlyBookingsContainer)
    }

    private fun bindInteractions() {
        btnOverviewTab.setOnClickListener { showSection(ViewMode.OVERVIEW) }
        btnAnalyticsTab.setOnClickListener { showSection(ViewMode.ANALYTICS) }
        btnBookingsTab.setOnClickListener { showSection(ViewMode.BOOKINGS) }

        btnQuickRefresh.setOnClickListener {
            Toast.makeText(this, "Refreshing admin dashboard...", Toast.LENGTH_SHORT).show()
            loadDashboard()
        }
        btnQuickPortfolio.setOnClickListener { startActivity(Intent(this, PortfolioActivity::class.java)) }
        btnQuickBlog.setOnClickListener { startActivity(Intent(this, BlogActivity::class.java)) }
    }

    private fun requestedInitialView(): ViewMode {
        return when (intent.getStringExtra(EXTRA_INITIAL_VIEW).orEmpty()) {
            ViewMode.ANALYTICS.name -> ViewMode.ANALYTICS
            ViewMode.BOOKINGS.name, "CALENDAR" -> ViewMode.BOOKINGS
            else -> ViewMode.OVERVIEW
        }
    }

    private fun ensureAdminSession(): Boolean {
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

    private fun loadDashboard() {
        val requestId = ++loadVersion
        renderLoadingState()

        val lock = Any()
        val state = DashboardLoadState()
        var remaining = 7

        fun finishRequest() {
            val finished = synchronized(lock) {
                remaining -= 1
                remaining == 0
            }
            if (!finished) return

            runOnUiThread {
                if (requestId != loadVersion) return@runOnUiThread
                appointments = state.appointments
                overview = state.overview
                pendingReviews = state.pendingReviews
                topServices = state.topServices
                dailyCounts = state.dailyCounts
                monthlyCounts = state.monthlyCounts
                noShowSnapshot = state.noShowSnapshot
                renderDashboard()
                showNotice(
                    if (state.errors.isEmpty()) {
                        ""
                    } else {
                        "Partial sync only: ${state.errors.joinToString(" | ")}"
                    }
                )
            }
        }

        fun recordError(label: String, message: String) {
            synchronized(lock) {
                state.errors.add("$label failed: $message")
            }
            finishRequest()
        }

        ApiClient.getAdminAppointments(
            onSuccess = { array ->
                synchronized(lock) {
                    state.appointments = parseAppointments(array)
                }
                finishRequest()
            },
            onError = { message -> recordError("Appointments", message) }
        )

        ApiClient.getAnalyticsOverview(
            onSuccess = { json ->
                synchronized(lock) {
                    state.overview = parseOverview(json)
                }
                finishRequest()
            },
            onError = { message -> recordError("Overview", message) }
        )

        ApiClient.getAdminTestimonials(
            onSuccess = { array ->
                synchronized(lock) {
                    state.pendingReviews = array.pendingReviewCount()
                }
                finishRequest()
            },
            onError = { message -> recordError("Reviews", message) }
        )

        ApiClient.getTopServices(
            onSuccess = { array ->
                synchronized(lock) {
                    state.topServices = parseTopServices(array)
                }
                finishRequest()
            },
            onError = { message -> recordError("Top services", message) }
        )

        ApiClient.getBookingsPerDay(
            month = currentMonthParam(),
            onSuccess = { array ->
                synchronized(lock) {
                    state.dailyCounts = parseDailyCounts(array)
                }
                finishRequest()
            },
            onError = { message -> recordError("Daily bookings", message) }
        )

        ApiClient.getBookingsPerMonth(
            year = currentYearParam(),
            onSuccess = { array ->
                synchronized(lock) {
                    state.monthlyCounts = parseMonthlyCounts(array)
                }
                finishRequest()
            },
            onError = { message -> recordError("Monthly bookings", message) }
        )

        ApiClient.getNoShowRate(
            onSuccess = { json ->
                synchronized(lock) {
                    state.noShowSnapshot = parseNoShowSnapshot(json)
                }
                finishRequest()
            },
            onError = { message -> recordError("No-show rate", message) }
        )
    }

    private fun renderLoadingState() {
        tvHeroEyebrow.text = "Admin dashboard"
        tvMetricTodayBookings.text = "..."
        tvMetricUpcomingBookings.text = "..."
        tvMetricScheduledRevenue.text = "..."
        tvMetricPendingReviews.text = "..."
        tvSnapshotMonthRevenue.text = "Loading..."
        tvSnapshotCompletedRevenue.text = "Loading..."
        tvSnapshotReturningClients.text = "Loading..."
        tvAnalyticsScheduledRevenue.text = "..."
        tvAnalyticsCompletedRevenue.text = "..."
        tvAnalyticsMonthRevenue.text = "..."
        tvAnalyticsNoShowRate.text = "..."
        tvAnalyticsRevenueClients.text = "Loading analytics..."
        tvAnalyticsQuality.text = "Loading analytics..."
        replaceContainerWithMessage(overviewTodayQueueContainer, "Loading today's queue...")
        replaceContainerWithMessage(overviewUpcomingContainer, "Loading upcoming bookings...")
        replaceContainerWithMessage(analyticsTopServicesContainer, "Loading top services...")
        replaceContainerWithMessage(analyticsDailyBookingsContainer, "Loading daily booking trend...")
        replaceContainerWithMessage(analyticsMonthlyBookingsContainer, "Loading monthly booking trend...")
        replaceContainerWithMessage(bookingsContainer, "Loading bookings...")
        showNotice("")
        updateHeroCopy()
    }

    private fun renderDashboard() {
        updateHeroCopy()
        renderMetricCards()
        renderOverviewSection()
        renderAnalyticsSection()
        renderBookingsSection()
    }

    private fun renderMetricCards() {
        tvMetricTodayBookings.text = overview.todayBookings.toString()
        tvMetricUpcomingBookings.text = overview.upcomingBookings.toString()
        tvMetricScheduledRevenue.text = formatMoney(overview.scheduledRevenueCents)
        tvMetricPendingReviews.text = pendingReviews.toString()
    }

    private fun renderOverviewSection() {
        replaceAppointmentList(
            container = overviewTodayQueueContainer,
            items = todayQueueAppointments(),
            emptyMessage = "No bookings scheduled for today.",
            includeActions = false
        )

        tvSnapshotMonthRevenue.text = formatMoney(overview.thisMonthRevenueCents)
        tvSnapshotCompletedRevenue.text = formatMoney(overview.completedRevenueCents)
        tvSnapshotReturningClients.text =
            "${overview.returningClients} of ${overview.uniqueClients} active clients"

        replaceAppointmentList(
            container = overviewUpcomingContainer,
            items = upcomingAppointments(limit = 6),
            emptyMessage = "No upcoming bookings yet.",
            includeActions = false
        )
    }

    private fun renderAnalyticsSection() {
        tvAnalyticsScheduledRevenue.text = formatMoney(overview.scheduledRevenueCents)
        tvAnalyticsCompletedRevenue.text = formatMoney(overview.completedRevenueCents)
        tvAnalyticsMonthRevenue.text = formatMoney(overview.thisMonthRevenueCents)
        tvAnalyticsNoShowRate.text = formatPercent(noShowSnapshot.noShowRatePercent)

        tvAnalyticsRevenueClients.text = listOf(
            "Upcoming bookings: ${overview.upcomingBookings}",
            "Today bookings: ${overview.todayBookings}",
            "Active clients: ${overview.uniqueClients}",
            "Returning clients: ${overview.returningClients}",
            "New clients this month: ${overview.newClientsThisMonth}",
            "Total tracked bookings: ${overview.totalBookings}"
        ).joinToString("\n")

        tvAnalyticsQuality.text = listOf(
            "Total tracked: ${noShowSnapshot.totalAppointments}",
            "No-shows: ${noShowSnapshot.noShows}",
            "Use this to watch demand and attendance together, just like the online analytics view."
        ).joinToString("\n")

        replaceBarList(
            container = analyticsTopServicesContainer,
            items = topServices,
            emptyMessage = "No service data yet."
        )
        replaceBarList(
            container = analyticsDailyBookingsContainer,
            items = dailyCounts,
            emptyMessage = "No daily booking data yet."
        )
        replaceBarList(
            container = analyticsMonthlyBookingsContainer,
            items = monthlyCounts,
            emptyMessage = "No monthly data yet."
        )
    }

    private fun renderBookingsSection() {
        bookingsContainer.removeAllViews()
        bookingsContainer.addView(buildSectionLabel("Upcoming appointments"))
        val upcoming = upcomingAppointments(limit = null)
        if (upcoming.isEmpty()) {
            bookingsContainer.addView(buildEmptyStateCard("No upcoming appointments right now."))
        } else {
            upcoming.take(12).forEach { item ->
                bookingsContainer.addView(buildAppointmentCard(item, includeActions = true))
            }
        }

        bookingsContainer.addView(buildSectionLabel("Recent activity"))
        val history = recentAppointments()
        if (history.isEmpty()) {
            bookingsContainer.addView(buildEmptyStateCard("No past appointments to review yet."))
        } else {
            history.take(12).forEach { item ->
                bookingsContainer.addView(buildAppointmentCard(item, includeActions = true))
            }
        }
    }

    private fun showSection(viewMode: ViewMode) {
        currentView = viewMode
        overviewSection.visibility = if (viewMode == ViewMode.OVERVIEW) View.VISIBLE else View.GONE
        analyticsSection.visibility = if (viewMode == ViewMode.ANALYTICS) View.VISIBLE else View.GONE
        bookingsSection.visibility = if (viewMode == ViewMode.BOOKINGS) View.VISIBLE else View.GONE

        setSectionButtonState(btnOverviewTab, viewMode == ViewMode.OVERVIEW)
        setSectionButtonState(btnAnalyticsTab, viewMode == ViewMode.ANALYTICS)
        setSectionButtonState(btnBookingsTab, viewMode == ViewMode.BOOKINGS)
        updateHeroCopy()
    }

    private fun updateHeroCopy() {
        val adminName = AdminSession.displayName.ifBlank {
            AdminSession.email.substringBefore("@").ifBlank { "Erick" }
        }
        when (currentView) {
            ViewMode.OVERVIEW -> {
                tvHeroTitle.text = "Overview for $adminName"
                tvHeroBody.text =
                    "Focus on what matters first: today's queue, upcoming bookings, money scheduled to come in, and client activity."
            }
            ViewMode.ANALYTICS -> {
                tvHeroTitle.text = "Business analytics"
                tvHeroBody.text =
                    "Key numbers for revenue, booking quality, client return rate, and demand by service."
            }
            ViewMode.BOOKINGS -> {
                tvHeroTitle.text = "Bookings for $adminName"
                tvHeroBody.text =
                    "Review upcoming work first, then recent booking activity, and update statuses directly in the app."
            }
        }
    }

    private fun setSectionButtonState(button: Button, active: Boolean) {
        button.setAllCaps(false)
        button.setBackgroundColor(if (active) Color.parseColor("#1A132F") else Color.parseColor("#FFF5F3FB"))
        button.setTextColor(if (active) Color.WHITE else Color.parseColor("#1A132F"))
    }

    private fun showNotice(message: String) {
        if (message.isBlank()) {
            tvNoticeBanner.visibility = View.GONE
        } else {
            tvNoticeBanner.text = message
            tvNoticeBanner.visibility = View.VISIBLE
        }
    }

    private fun replaceAppointmentList(
        container: LinearLayout,
        items: List<AdminAppointmentUi>,
        emptyMessage: String,
        includeActions: Boolean,
    ) {
        container.removeAllViews()
        if (items.isEmpty()) {
            container.addView(buildEmptyStateCard(emptyMessage))
            return
        }
        items.forEach { item ->
            container.addView(buildAppointmentCard(item, includeActions))
        }
    }

    private fun replaceBarList(
        container: LinearLayout,
        items: List<BarDatum>,
        emptyMessage: String,
    ) {
        container.removeAllViews()
        if (items.isEmpty()) {
            container.addView(buildEmptyStateCard(emptyMessage))
            return
        }
        val maxValue = items.maxOfOrNull { it.value } ?: 1
        items.forEach { item ->
            container.addView(buildBarRow(item, maxValue))
        }
    }

    private fun replaceContainerWithMessage(container: LinearLayout, message: String) {
        container.removeAllViews()
        container.addView(buildEmptyStateCard(message))
    }

    private fun todayQueueAppointments(): List<AdminAppointmentUi> {
        val todayKey = formatDateKey(System.currentTimeMillis())
        return appointments
            .filter { item ->
                item.status != "CANCELLED" && formatDateKey(item.startMillis) == todayKey
            }
            .sortedBy { it.startMillis }
            .take(6)
    }

    private fun upcomingAppointments(limit: Int?): List<AdminAppointmentUi> {
        val results = appointments
            .filter { item ->
                item.status != "CANCELLED" && item.startMillis >= System.currentTimeMillis()
            }
            .sortedBy { it.startMillis }
        return if (limit == null) results else results.take(limit)
    }

    private fun recentAppointments(): List<AdminAppointmentUi> {
        val now = System.currentTimeMillis()
        return appointments
            .filter { item ->
                item.status == "CANCELLED" || item.startMillis < now
            }
            .sortedByDescending { it.startMillis }
    }

    private fun buildSectionLabel(title: String): View {
        return TextView(this).apply {
            text = title
            setTextColor(ContextCompat.getColor(context, R.color.brand_text))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(18), 0, dp(6))
        }
    }

    private fun buildEmptyStateCard(message: String): View {
        return MaterialCardView(this).apply {
            radius = dp(20).toFloat()
            cardElevation = 0f
            strokeWidth = dp(1)
            strokeColor = Color.parseColor("#FFE5E4EF")
            setCardBackgroundColor(Color.parseColor("#FFFCFCFF"))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(10)
            }
            addView(TextView(context).apply {
                text = message
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setPadding(dp(16), dp(16), dp(16), dp(16))
            })
        }
    }

    private fun buildAppointmentCard(item: AdminAppointmentUi, includeActions: Boolean): View {
        val card = MaterialCardView(this).apply {
            radius = dp(20).toFloat()
            cardElevation = 0f
            strokeWidth = dp(1)
            strokeColor = Color.parseColor("#FFECEBF5")
            setCardBackgroundColor(Color.parseColor("#FFFCFCFF"))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(10)
            }
        }

        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }

        val topRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        topRow.addView(TextView(this).apply {
            text = formatDateTime(item.startMillis)
            setTextColor(Color.parseColor("#FF7B7794"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            layoutParams = LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            )
        })
        topRow.addView(buildStatusChip(item.status))
        body.addView(topRow)

        body.addView(TextView(this).apply {
            text = item.userName.ifBlank { item.userEmail }
            setTextColor(Color.parseColor("#FF0F0A1E"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(8), 0, 0)
        })

        body.addView(TextView(this).apply {
            text = buildAppointmentMeta(item)
            setTextColor(Color.parseColor("#FF5A5872"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(0, dp(4), 0, 0)
        })

        body.addView(TextView(this).apply {
            text = item.userEmail
            setTextColor(Color.parseColor("#FF5A5872"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setPadding(0, dp(4), 0, 0)
        })

        if (item.addOnNames.isNotEmpty()) {
            body.addView(TextView(this).apply {
                text = "Add-ons: ${item.addOnNames.joinToString(", ")}"
                setTextColor(Color.parseColor("#FF1A132F"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                setPadding(0, dp(6), 0, 0)
            })
        }

        if (item.notes.isNotBlank()) {
            body.addView(TextView(this).apply {
                text = "Notes: ${item.notes}"
                setTextColor(Color.parseColor("#FF5A5872"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                setPadding(0, dp(6), 0, 0)
            })
        }

        if (includeActions) {
            val actionsRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, dp(12), 0, 0)
            }

            if (item.status == "PENDING") {
                actionsRow.addView(buildActionButton("Confirm").apply {
                    setOnClickListener {
                        changeAppointmentStatus(item.id, "CONFIRMED", "Appointment confirmed")
                    }
                })
            }

            if (item.status != "CANCELLED") {
                actionsRow.addView(buildActionButton("Cancel").apply {
                    setOnClickListener { cancelAppointment(item.id) }
                })
            }

            if (item.status != "NO_SHOW" &&
                item.status != "CANCELLED" &&
                item.startMillis <= System.currentTimeMillis()
            ) {
                actionsRow.addView(buildActionButton("No-show").apply {
                    setOnClickListener {
                        changeAppointmentStatus(item.id, "NO_SHOW", "Appointment marked as no-show")
                    }
                })
            }

            if (actionsRow.childCount > 0) {
                body.addView(actionsRow)
            }
        }

        card.addView(body)
        return card
    }

    private fun buildStatusChip(status: String): View {
        val (backgroundColor, textColor) = when (status) {
            "CONFIRMED" -> Pair(Color.parseColor("#FFDDF3E4"), Color.parseColor("#FF127A3A"))
            "PENDING" -> Pair(Color.parseColor("#FFFFF0D6"), Color.parseColor("#FF9A6700"))
            "NO_SHOW", "CANCELLED" -> Pair(Color.parseColor("#FFFFE1DE"), Color.parseColor("#FFB42318"))
            else -> Pair(Color.parseColor("#FFE9E8F5"), Color.parseColor("#FF5A5872"))
        }

        return TextView(this).apply {
            text = status.replace('_', ' ')
            setTextColor(textColor)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
            setTypeface(typeface, Typeface.BOLD)
            setPadding(dp(10), dp(6), dp(10), dp(6))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(999).toFloat()
                setColor(backgroundColor)
            }
        }
    }

    private fun buildActionButton(label: String): AppCompatButton {
        return AppCompatButton(this).apply {
            text = label
            setAllCaps(false)
            setTextColor(Color.parseColor("#FF1A132F"))
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#FFF2EFFA"))
            }
            layoutParams = LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            ).apply {
                marginEnd = dp(8)
            }
        }
    }

    private fun buildBarRow(item: BarDatum, maxValue: Int): View {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(10)
            }

            addView(LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(TextView(context).apply {
                    text = item.label
                    setTextColor(Color.parseColor("#FF1A132F"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    setTypeface(typeface, Typeface.BOLD)
                    layoutParams = LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f
                    )
                })
                addView(TextView(context).apply {
                    text = item.value.toString()
                    setTextColor(Color.parseColor("#FF5A5872"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                })
            })

            addView(ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
                max = 100
                progress = if (maxValue <= 0) {
                    0
                } else {
                    val percent = (item.value.toDouble() / maxValue.toDouble()) * 100.0
                    percent.toInt().coerceAtLeast(if (item.value > 0) 8 else 0)
                }
                progressTintList = ColorStateList.valueOf(Color.parseColor("#FF1A132F"))
                progressBackgroundTintList = ColorStateList.valueOf(Color.parseColor("#FFEFEAFE"))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(10)
                ).apply {
                    topMargin = dp(6)
                }
            })
        }
    }

    private fun buildAppointmentMeta(item: AdminAppointmentUi): String {
        return "${item.serviceName} / ${item.addOnNames.size} add-ons / ${formatMoney(item.totalPriceCents)}"
    }

    private fun cancelAppointment(appointmentId: String) {
        ApiClient.adminCancelAppointment(
            id = appointmentId,
            onSuccess = {
                runOnUiThread {
                    Toast.makeText(this, "Appointment cancelled", Toast.LENGTH_SHORT).show()
                    loadDashboard()
                }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to cancel appointment: $message", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun changeAppointmentStatus(appointmentId: String, status: String, successMessage: String) {
        ApiClient.adminChangeStatus(
            id = appointmentId,
            status = status,
            onSuccess = {
                runOnUiThread {
                    Toast.makeText(this, successMessage, Toast.LENGTH_SHORT).show()
                    loadDashboard()
                }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to update appointment: $message", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun parseAppointments(array: JSONArray): List<AdminAppointmentUi> {
        val items = mutableListOf<AdminAppointmentUi>()
        for (index in 0 until array.length()) {
            val obj = array.optJSONObject(index) ?: continue
            val user = obj.optJSONObject("user") ?: continue
            val service = obj.optJSONObject("service") ?: continue
            val startMillis = parseIsoMillis(obj.optString("start_time")) ?: continue
            val addOnNames = mutableListOf<String>()
            val addOns = obj.optJSONArray("add_ons") ?: JSONArray()
            for (addOnIndex in 0 until addOns.length()) {
                val addOn = addOns.optJSONObject(addOnIndex) ?: continue
                val name = addOn.optString("name")
                if (name.isNotBlank()) {
                    addOnNames.add(name)
                }
            }
            items.add(
                AdminAppointmentUi(
                    id = obj.optString("id"),
                    userId = user.optString("id"),
                    userName = user.optString("display_name").ifBlank {
                        user.optString("email").substringBefore("@")
                    },
                    userEmail = user.optString("email"),
                    serviceName = service.optString("name", "Service"),
                    startMillis = startMillis,
                    totalPriceCents = obj.optInt("total_price_cents", service.optInt("price_cents", 0)),
                    notes = obj.optString("notes"),
                    status = obj.optString("status", "CONFIRMED"),
                    addOnNames = addOnNames,
                )
            )
        }
        return items
    }

    private fun parseOverview(json: JSONObject): OverviewSnapshot {
        return OverviewSnapshot(
            totalBookings = json.optInt("total_bookings"),
            upcomingBookings = json.optInt("upcoming_bookings"),
            todayBookings = json.optInt("today_bookings"),
            scheduledRevenueCents = json.optInt("scheduled_revenue_cents"),
            completedRevenueCents = json.optInt("completed_revenue_cents"),
            thisMonthRevenueCents = json.optInt("this_month_revenue_cents"),
            uniqueClients = json.optInt("unique_clients"),
            returningClients = json.optInt("returning_clients"),
            newClientsThisMonth = json.optInt("new_clients_this_month"),
        )
    }

    private fun parseTopServices(array: JSONArray): List<BarDatum> {
        val items = mutableListOf<BarDatum>()
        for (index in 0 until array.length()) {
            val obj = array.optJSONObject(index) ?: continue
            items.add(BarDatum("${index + 1}. ${obj.optString("service_name", "Service")}", obj.optInt("count")))
        }
        return items
    }

    private fun parseDailyCounts(array: JSONArray): List<BarDatum> {
        val items = mutableListOf<BarDatum>()
        for (index in 0 until array.length()) {
            val obj = array.optJSONObject(index) ?: continue
            items.add(BarDatum(formatFlexibleDateLabel(obj.optString("date"), "MMM d"), obj.optInt("count")))
        }
        return items
    }

    private fun parseMonthlyCounts(array: JSONArray): List<BarDatum> {
        val items = mutableListOf<BarDatum>()
        for (index in 0 until array.length()) {
            val obj = array.optJSONObject(index) ?: continue
            items.add(BarDatum(formatFlexibleDateLabel(obj.optString("month"), "MMM yyyy"), obj.optInt("count")))
        }
        return items
    }

    private fun parseNoShowSnapshot(json: JSONObject): NoShowSnapshot {
        return NoShowSnapshot(
            totalAppointments = json.optInt("total_appointments"),
            noShows = json.optInt("no_shows"),
            noShowRatePercent = json.optDouble("no_show_rate_percent", 0.0),
        )
    }

    private fun JSONArray.pendingReviewCount(): Int {
        var count = 0
        for (index in 0 until length()) {
            val obj = optJSONObject(index) ?: continue
            if (obj.optString("status") == "PENDING") {
                count += 1
            }
        }
        return count
    }

    private fun currentMonthParam(): String {
        return SimpleDateFormat("yyyy-MM", Locale.US).apply {
            timeZone = torontoTimeZone
        }.format(Date())
    }

    private fun currentYearParam(): String {
        return SimpleDateFormat("yyyy", Locale.US).apply {
            timeZone = torontoTimeZone
        }.format(Date())
    }

    private fun parseIsoMillis(raw: String): Long? {
        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd"
        )
        for (pattern in patterns) {
            try {
                val parser = SimpleDateFormat(pattern, Locale.US).apply {
                    timeZone = if (pattern == "yyyy-MM-dd") torontoTimeZone else TimeZone.getTimeZone("UTC")
                    isLenient = false
                }
                return parser.parse(raw)?.time
            } catch (_: Exception) {
            }
        }
        return null
    }

    private fun formatFlexibleDateLabel(raw: String, outputPattern: String): String {
        val millis = parseIsoMillis(raw)
        if (millis != null) {
            return SimpleDateFormat(outputPattern, Locale.US).apply {
                timeZone = torontoTimeZone
            }.format(Date(millis))
        }
        return raw
    }

    private fun formatDateTime(millis: Long): String {
        return SimpleDateFormat("EEE, MMM d, h:mm a", Locale.US).apply {
            timeZone = torontoTimeZone
        }.format(Date(millis))
    }

    private fun formatDateKey(millis: Long): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = torontoTimeZone
        }.format(Date(millis))
    }

    private fun formatMoney(cents: Int): String {
        return "$" + String.format(Locale.US, "%.2f", cents / 100.0)
    }

    private fun formatPercent(value: Double): String {
        val normalized = if (value % 1.0 == 0.0) {
            String.format(Locale.US, "%.0f", value)
        } else {
            String.format(Locale.US, "%.2f", value).trimEnd('0').trimEnd('.')
        }
        return "$normalized%"
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    companion object {
        private const val EXTRA_INITIAL_VIEW = "initial_view"

        fun intent(
            context: Context,
            initialView: ViewMode = ViewMode.OVERVIEW,
        ): Intent {
            return Intent(context, AdminDashboardActivity::class.java).apply {
                putExtra(EXTRA_INITIAL_VIEW, initialView.name)
            }
        }
    }
}

package com.brazwebdes.hairstylistbooking

import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.textfield.TextInputEditText
import org.json.JSONObject

class AdminTestimonialsActivity : BaseDrawerActivity() {

    private lateinit var tvNotice: TextView
    private lateinit var cardEditor: MaterialCardView
    private lateinit var btnCloseEditor: MaterialButton
    private lateinit var etAuthorName: TextInputEditText
    private lateinit var etAuthorEmail: TextInputEditText
    private lateinit var spinnerService: Spinner
    private lateinit var spinnerRating: Spinner
    private lateinit var spinnerStatus: Spinner
    private lateinit var etQuote: TextInputEditText
    private lateinit var etAdminNotes: TextInputEditText
    private lateinit var etHomeOrder: TextInputEditText
    private lateinit var cbFeatured: CheckBox
    private lateinit var btnSave: MaterialButton
    private lateinit var llTestimonialsList: LinearLayout

    private var services: List<AdminServiceEntry> = emptyList()
    private var testimonials: List<AdminTestimonialEntry> = emptyList()
    private var editingId: String? = null
    private val ratingOptions = listOf("5", "4", "3", "2", "1")
    private val statusOptions = listOf("PENDING", "APPROVED", "REJECTED")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!requireAdminSession()) {
            return
        }

        setContentLayout(R.layout.content_admin_testimonials)
        setToolbarTitle("Admin Reviews")
        setCheckedDrawerItem(R.id.m_admin)
        showLogoutOption(true)
        updateUserFooterLabel()

        bindViews()
        bindInteractions()
        bindSpinners()
        resetEditor()
        loadData()
    }

    override fun onResume() {
        super.onResume()
        if (requireAdminSession()) {
            loadData()
        }
    }

    private fun bindViews() {
        tvNotice = findViewById(R.id.tvTestimonialsNotice)
        cardEditor = findViewById(R.id.cardTestimonialEditor)
        btnCloseEditor = findViewById(R.id.btnCloseTestimonialEditor)
        etAuthorName = findViewById(R.id.etTestimonialAuthorName)
        etAuthorEmail = findViewById(R.id.etTestimonialAuthorEmail)
        spinnerService = findViewById(R.id.spinnerTestimonialService)
        spinnerRating = findViewById(R.id.spinnerTestimonialRating)
        spinnerStatus = findViewById(R.id.spinnerTestimonialStatus)
        etQuote = findViewById(R.id.etTestimonialQuote)
        etAdminNotes = findViewById(R.id.etTestimonialAdminNotes)
        etHomeOrder = findViewById(R.id.etTestimonialHomeOrder)
        cbFeatured = findViewById(R.id.cbTestimonialFeatured)
        btnSave = findViewById(R.id.btnSaveTestimonial)
        llTestimonialsList = findViewById(R.id.llTestimonialsAdminList)
    }

    private fun bindInteractions() {
        btnCloseEditor.setOnClickListener { resetEditor() }
        btnSave.setOnClickListener { submit() }
    }

    private fun bindSpinners() {
        spinnerRating.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            ratingOptions
        )
        spinnerStatus.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            statusOptions
        )
        refreshServiceSpinner()
    }

    private fun refreshServiceSpinner() {
        spinnerService.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("No linked service") + services.map { it.name }
        )
    }

    private fun loadData() {
        ApiClient.getAdminServices(
            onSuccess = { serviceArray ->
                val loadedServices = serviceArray.toAdminServices()
                ApiClient.getAdminTestimonials(
                    onSuccess = { testimonialArray ->
                        runOnUiThread {
                            services = loadedServices
                            testimonials = testimonialArray.toAdminTestimonials()
                            refreshServiceSpinner()
                            renderList()
                        }
                    },
                    onError = { message ->
                        runOnUiThread {
                            showNotice("Failed to load testimonials: $message", isError = true)
                        }
                    }
                )
            },
            onError = { message ->
                runOnUiThread {
                    showNotice("Failed to load services: $message", isError = true)
                }
            }
        )
    }

    private fun submit() {
        val id = editingId ?: return
        val authorName = etAuthorName.fieldValue()
        val authorEmail = etAuthorEmail.fieldValue()
        val quote = etQuote.fieldValue()
        val rating = spinnerRating.selectedItem?.toString()?.toIntOrNull() ?: 5
        val status = spinnerStatus.selectedItem?.toString().orEmpty().ifBlank { "PENDING" }

        if (authorName.isBlank() || authorEmail.isBlank() || quote.isBlank()) {
            showNotice("Author name, author email, and review are required.", isError = true)
            return
        }

        val payload = JSONObject().apply {
            put("author_name", authorName)
            put("author_email", authorEmail)
            put("quote", quote)
            put("rating", rating)
            val serviceId = selectedServiceId()
            if (serviceId == null) {
                put("service_id", JSONObject.NULL)
            } else {
                put("service_id", serviceId)
            }
            put("status", status)
            put("admin_notes", etAdminNotes.fieldValue())
            put("is_featured_home", cbFeatured.isChecked)
            put("home_order", etHomeOrder.fieldValue().toIntOrNull() ?: 0)
        }

        btnSave.isEnabled = false
        btnSave.text = "Saving..."

        ApiClient.updateAdminTestimonial(
            id = id,
            body = payload,
            onSuccess = {
                runOnUiThread {
                    btnSave.isEnabled = true
                    btnSave.text = "Save testimonial"
                    showNotice("Testimonial updated.")
                    resetEditor()
                    loadData()
                }
            },
            onError = { message ->
                runOnUiThread {
                    btnSave.isEnabled = true
                    btnSave.text = "Save testimonial"
                    showNotice("Failed to save testimonial: $message", isError = true)
                }
            }
        )
    }

    private fun startEdit(item: AdminTestimonialEntry) {
        editingId = item.id
        cardEditor.visibility = View.VISIBLE
        etAuthorName.setText(item.authorName)
        etAuthorEmail.setText(item.authorEmail)
        etQuote.setText(item.quote)
        etAdminNotes.setText(item.adminNotes)
        etHomeOrder.setText(item.homeOrder.toString())
        cbFeatured.isChecked = item.isFeaturedHome
        spinnerRating.setSelection(ratingOptions.indexOf(item.rating.toString()).coerceAtLeast(0))
        spinnerStatus.setSelection(statusOptions.indexOf(item.status).coerceAtLeast(0))
        val serviceIndex = if (item.service == null) 0 else {
            val index = services.indexOfFirst { it.id == item.service.id }
            if (index < 0) 0 else index + 1
        }
        spinnerService.setSelection(serviceIndex)
    }

    private fun resetEditor() {
        editingId = null
        cardEditor.visibility = View.GONE
        etAuthorName.setText("")
        etAuthorEmail.setText("")
        etQuote.setText("")
        etAdminNotes.setText("")
        etHomeOrder.setText("0")
        cbFeatured.isChecked = false
        spinnerService.setSelection(0)
        spinnerRating.setSelection(0)
        spinnerStatus.setSelection(0)
        btnSave.text = "Save testimonial"
        btnSave.isEnabled = true
    }

    private fun selectedServiceId(): String? {
        val position = spinnerService.selectedItemPosition
        return if (position <= 0) null else services.getOrNull(position - 1)?.id
    }

    private fun renderList() {
        llTestimonialsList.removeAllViews()
        if (testimonials.isEmpty()) {
            llTestimonialsList.addView(buildEmptyCard("No testimonials yet."))
            return
        }

        testimonials.sortedWith(compareBy<AdminTestimonialEntry> { statusRank(it.status) }.thenByDescending { it.createdAt }).forEach { item ->
            llTestimonialsList.addView(buildCard(item))
        }
    }

    private fun buildCard(item: AdminTestimonialEntry): View {
        return MaterialCardView(this).apply {
            radius = dp(20).toFloat()
            cardElevation = 0f
            strokeWidth = dp(1)
            strokeColor = ContextCompat.getColor(context, R.color.card_stroke)
            setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(10)
            }

            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(16), dp(16), dp(16), dp(16))

                addView(LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL

                    addView(TextView(context).apply {
                        text = "${item.authorName} / ${item.rating}/5"
                        setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                        setTypeface(typeface, android.graphics.Typeface.BOLD)
                        layoutParams = LinearLayout.LayoutParams(
                            0,
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            1f
                        )
                    })

                    addView(TextView(context).apply {
                        text = item.status
                        setPadding(dp(10), dp(6), dp(10), dp(6))
                        setTextColor(ContextCompat.getColor(context, statusTextColor(item.status)))
                        setBackgroundColor(ContextCompat.getColor(context, statusBackgroundColor(item.status)))
                    })
                })

                addView(TextView(context).apply {
                    text = "${item.service?.name ?: "General review"} / ${item.authorEmail}"
                    setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    setPadding(0, dp(4), 0, 0)
                })

                addView(TextView(context).apply {
                    text = "\"${item.quote}\""
                    setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                    setPadding(0, dp(10), 0, 0)
                })

                addView(TextView(context).apply {
                    text = buildMeta(item)
                    setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    setPadding(0, dp(8), 0, 0)
                })

                addView(LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.END
                    setPadding(0, dp(12), 0, 0)

                    addActionButton(this, "Edit") { startEdit(item) }
                    if (item.status != "APPROVED") {
                        addActionButton(this, "Approve") { quickModerate(item.id, "APPROVED") }
                    }
                    if (item.status != "REJECTED") {
                        addActionButton(this, "Reject") { quickModerate(item.id, "REJECTED") }
                    }
                })
            })
        }
    }

    private fun quickModerate(id: String, status: String) {
        ApiClient.updateAdminTestimonial(
            id = id,
            body = JSONObject().put("status", status),
            onSuccess = {
                runOnUiThread {
                    showNotice("Testimonial ${if (status == "APPROVED") "approved" else "rejected"}.")
                    if (editingId == id) {
                        resetEditor()
                    }
                    loadData()
                }
            },
            onError = { message ->
                runOnUiThread {
                    showNotice("Failed to update testimonial: $message", isError = true)
                }
            }
        )
    }

    private fun buildMeta(item: AdminTestimonialEntry): String {
        val parts = mutableListOf<String>()
        if (item.isFeaturedHome) parts += "Featured"
        if (item.homeOrder > 0) parts += "Home ${item.homeOrder}"
        if (item.adminNotes.isNotBlank()) parts += "Has admin notes"
        return if (parts.isEmpty()) "Waiting for admin action." else parts.joinToString(" / ")
    }

    private fun statusRank(status: String): Int {
        return when (status) {
            "PENDING" -> 0
            "APPROVED" -> 1
            else -> 2
        }
    }

    private fun statusBackgroundColor(status: String): Int {
        return when (status) {
            "APPROVED" -> android.R.color.holo_green_light
            "REJECTED" -> android.R.color.holo_red_light
            else -> android.R.color.holo_orange_light
        }
    }

    private fun statusTextColor(status: String): Int {
        return when (status) {
            "APPROVED" -> android.R.color.holo_green_dark
            "REJECTED" -> android.R.color.holo_red_dark
            else -> android.R.color.holo_orange_dark
        }
    }

    private fun addActionButton(container: LinearLayout, label: String, onClick: () -> Unit) {
        container.addView(MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
            text = label
            isAllCaps = false
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                if (container.childCount > 0) marginStart = dp(8)
            }
            setOnClickListener { onClick.invoke() }
        })
    }

    private fun showNotice(message: String, isError: Boolean = false) {
        if (message.isBlank()) {
            tvNotice.visibility = View.GONE
            tvNotice.text = ""
            return
        }
        tvNotice.visibility = View.VISIBLE
        tvNotice.text = message
        tvNotice.setTextColor(
            ContextCompat.getColor(
                this,
                if (isError) android.R.color.holo_red_dark else R.color.brand_text
            )
        )
    }

    private fun buildEmptyCard(message: String): View {
        return MaterialCardView(this).apply {
            radius = dp(18).toFloat()
            setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
            cardElevation = 0f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(10)
            }
            addView(TextView(context).apply {
                text = message
                setPadding(dp(16), dp(16), dp(16), dp(16))
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
            })
        }
    }

    private fun TextInputEditText.fieldValue(): String = text?.toString()?.trim().orEmpty()
}

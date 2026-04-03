package com.brazwebdes.hairstylistbooking

import android.content.Intent
import android.graphics.Typeface
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import coil.load
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.textfield.TextInputEditText

class PortfolioActivity : BaseDrawerActivity() {

    private lateinit var portfolioContainer: LinearLayout
    private lateinit var testimonialsContainer: LinearLayout
    private lateinit var viewMoreTestimonialsButton: MaterialButton
    private lateinit var manageButton: MaterialButton
    private lateinit var authorInput: TextInputEditText
    private lateinit var testimonialInput: TextInputEditText
    private lateinit var serviceSpinner: Spinner
    private lateinit var testimonialFilterSpinner: Spinner
    private lateinit var ratingSpinner: Spinner
    private lateinit var submitButton: MaterialButton
    private lateinit var submitMessage: TextView

    private var services: List<ServiceOption> = emptyList()
    private var allTestimonials: List<TestimonialEntry> = emptyList()
    private var showAllTestimonials = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentLayout(R.layout.content_portfolio)
        setToolbarTitle("Portfolio")
        setCheckedDrawerItem(R.id.m_portfolio)

        portfolioContainer = findViewById(R.id.llPortfolioItems)
        testimonialsContainer = findViewById(R.id.llTestimonials)
        viewMoreTestimonialsButton = findViewById(R.id.btnViewMoreTestimonials)
        manageButton = findViewById(R.id.btnManagePortfolio)
        authorInput = findViewById(R.id.etAuthorName)
        testimonialInput = findViewById(R.id.etTestimonial)
        serviceSpinner = findViewById(R.id.spinnerServices)
        testimonialFilterSpinner = findViewById(R.id.spinnerTestimonialFilter)
        ratingSpinner = findViewById(R.id.spinnerRating)
        submitButton = findViewById(R.id.btnSubmitTestimonial)
        submitMessage = findViewById(R.id.tvSubmitMessage)

        authorInput.setText(UserSession.displayName)

        manageButton.visibility = if (AdminSession.isLoggedIn) View.VISIBLE else View.GONE
        manageButton.setOnClickListener {
            startActivity(AdminDashboardActivity.intent(this, initialView = AdminDashboardActivity.ViewMode.ANALYTICS))
        }

        ratingSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("5", "4", "3", "2", "1")
        )

        testimonialFilterSpinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(
                parent: android.widget.AdapterView<*>?,
                view: View?,
                position: Int,
                id: Long,
            ) {
                showAllTestimonials = false
                renderTestimonials()
            }

            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
        }

        viewMoreTestimonialsButton.setOnClickListener {
            showAllTestimonials = !showAllTestimonials
            renderTestimonials()
        }

        submitButton.setOnClickListener { submitTestimonial() }

        loadContent()
    }

    override fun onResume() {
        super.onResume()
        manageButton.visibility = if (AdminSession.isLoggedIn) View.VISIBLE else View.GONE
        if (authorInput.text.isNullOrBlank()) {
            authorInput.setText(UserSession.displayName)
        }
    }

    private fun loadContent() {
        ApiClient.getPortfolioItems(
            onSuccess = { portfolioArray ->
                val items = portfolioArray.toPortfolioEntries()
                runOnUiThread { renderPortfolio(items) }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load portfolio: $message", Toast.LENGTH_LONG).show()
                }
            }
        )

        ApiClient.getTestimonials(
            onSuccess = { testimonialArray ->
                val items = testimonialArray.toTestimonials()
                runOnUiThread {
                    allTestimonials = items
                    renderTestimonials()
                }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load testimonials: $message", Toast.LENGTH_LONG).show()
                }
            }
        )

        ApiClient.getServices(
            onSuccess = { serviceArray ->
                val loadedServices = serviceArray.toServiceOptions()
                runOnUiThread {
                    services = loadedServices
                    serviceSpinner.adapter = ArrayAdapter(
                        this,
                        android.R.layout.simple_spinner_dropdown_item,
                        loadedServices.map { it.name }.ifEmpty { listOf("No services") }
                    )
                    testimonialFilterSpinner.adapter = ArrayAdapter(
                        this,
                        android.R.layout.simple_spinner_dropdown_item,
                        listOf("All services") + loadedServices.map { it.name }
                    )
                    renderTestimonials()
                }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load services: $message", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun renderPortfolio(items: List<PortfolioEntry>) {
        portfolioContainer.removeAllViews()
        if (items.isEmpty()) {
            portfolioContainer.addView(messageCard("No portfolio items yet."))
            return
        }
        items.forEach { item ->
            val card = MaterialCardView(this).apply {
                radius = dp(24).toFloat()
                setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
                cardElevation = 0f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = dp(12) }
            }
            val wrapper = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            val image = ImageView(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(210)
                )
                scaleType = ImageView.ScaleType.CENTER_CROP
                setBackgroundColor(ContextCompat.getColor(context, R.color.card_stroke))
                if (item.imageUrl.isNotBlank()) {
                    load(item.imageUrl)
                }
            }
            val body = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(18), dp(18), dp(18), dp(18))
            }
            body.addView(TextView(this).apply {
                text = item.title
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18f)
                setTypeface(typeface, Typeface.BOLD)
            })
            body.addView(TextView(this).apply {
                text = item.subtitle.ifBlank { item.description }
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14f)
                setPadding(0, dp(6), 0, 0)
            })
            if (item.description.isNotBlank() && item.description != item.subtitle) {
                body.addView(TextView(this).apply {
                    text = item.description
                    setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                    setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13f)
                    setPadding(0, dp(8), 0, 0)
                })
            }
            body.addView(TextView(this).apply {
                text = item.tag.ifBlank { formatDateLabel(item.createdAt) }
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12f)
                setTypeface(typeface, Typeface.BOLD)
                setPadding(0, dp(10), 0, 0)
            })
            wrapper.addView(image)
            wrapper.addView(body)
            card.addView(wrapper)
            portfolioContainer.addView(card)
        }
    }

    private fun renderTestimonials() {
        testimonialsContainer.removeAllViews()

        val filterPosition = testimonialFilterSpinner.selectedItemPosition
        val selectedServiceId = services.getOrNull(filterPosition - 1)?.id
        val filtered = if (selectedServiceId == null) {
            allTestimonials
        } else {
            val selectedServiceName = services.firstOrNull { it.id == selectedServiceId }?.name
            allTestimonials.filter { it.serviceName == selectedServiceName }
        }

        val visible = if (showAllTestimonials) filtered else filtered.take(4)

        if (filtered.isEmpty()) {
            testimonialsContainer.addView(messageCard("No approved testimonials for this filter yet."))
            viewMoreTestimonialsButton.visibility = View.GONE
            return
        }

        visible.forEach { item ->
            val card = MaterialCardView(this).apply {
                radius = dp(24).toFloat()
                setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
                cardElevation = 0f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = dp(12) }
            }
            val body = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(18), dp(18), dp(18), dp(18))
            }
            body.addView(TextView(this).apply {
                text = "${ratingStars(item.rating)}  ${item.rating}/5"
                setTextColor(ContextCompat.getColor(context, android.R.color.holo_orange_dark))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13f)
                setTypeface(typeface, Typeface.BOLD)
            })
            body.addView(TextView(this).apply {
                text = "\"${item.quote}\""
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14f)
                setPadding(0, dp(10), 0, 0)
            })
            body.addView(TextView(this).apply {
                text = item.authorName
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15f)
                setTypeface(typeface, Typeface.BOLD)
                setPadding(0, dp(14), 0, 0)
            })
            body.addView(TextView(this).apply {
                text = item.serviceName.ifBlank { "Client review" }
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13f)
            })
            card.addView(body)
            testimonialsContainer.addView(card)
        }

        if (filtered.size > 4) {
            viewMoreTestimonialsButton.visibility = View.VISIBLE
            viewMoreTestimonialsButton.text = if (showAllTestimonials) "Show less" else "View more"
        } else {
            viewMoreTestimonialsButton.visibility = View.GONE
        }
    }

    private fun submitTestimonial() {
        if (!UserSession.isLoggedIn) {
            submitMessage.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
            submitMessage.text = "Sign in as a client before leaving a testimonial."
            return
        }

        val authorName = authorInput.text?.toString()?.trim().orEmpty()
        val quote = testimonialInput.text?.toString()?.trim().orEmpty()
        val rating = ratingSpinner.selectedItem?.toString()?.toIntOrNull() ?: 5
        val serviceId = services.getOrNull(serviceSpinner.selectedItemPosition)?.id

        if (authorName.isBlank() || quote.isBlank()) {
            submitMessage.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
            submitMessage.text = "Name and review are required."
            return
        }

        submitButton.isEnabled = false
        submitButton.text = "Submitting..."
        submitMessage.text = ""

        ApiClient.createTestimonial(
            authorName = authorName,
            quote = quote,
            rating = rating,
            serviceId = serviceId,
            onSuccess = {
                runOnUiThread {
                    submitButton.isEnabled = true
                    submitButton.text = "Submit testimonial"
                    testimonialInput.setText("")
                    submitMessage.setTextColor(ContextCompat.getColor(this, android.R.color.holo_green_dark))
                    submitMessage.text = "Thanks. Your testimonial was sent for admin approval."
                }
            },
            onError = { message ->
                runOnUiThread {
                    submitButton.isEnabled = true
                    submitButton.text = "Submit testimonial"
                    submitMessage.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
                    submitMessage.text = message
                }
            }
        )
    }

    private fun messageCard(message: String): MaterialCardView {
        val card = MaterialCardView(this).apply {
            radius = dp(20).toFloat()
            setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
            cardElevation = 0f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(12) }
        }
        card.addView(TextView(this).apply {
            text = message
            setPadding(dp(16), dp(16), dp(16), dp(16))
            setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
        })
        return card
    }

    private fun ratingStars(rating: Int): String {
        return buildString {
            repeat(rating.coerceIn(1, 5)) {
                append('\u2605')
            }
        }
    }
}

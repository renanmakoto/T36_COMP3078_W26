package com.example.uiprototypebeta

import android.content.Intent
import android.graphics.Typeface
import android.os.Bundle
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import coil.load
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView

class HomeActivity : BaseDrawerActivity() {

    private lateinit var portfolioContainer: LinearLayout
    private lateinit var testimonialContainer: LinearLayout
    private lateinit var paymentMethodsContainer: LinearLayout
    private lateinit var metricServices: TextView
    private lateinit var metricPortfolio: TextView
    private lateinit var metricReviews: TextView
    private lateinit var infoAddress: TextView
    private lateinit var infoPhone: TextView
    private lateinit var infoHours: TextView
    private lateinit var leadImage: ImageView
    private lateinit var leadTitle: TextView
    private lateinit var leadMeta: TextView
    private lateinit var leadBody: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentLayout(R.layout.content_home)
        setToolbarTitle("Home")
        setCheckedDrawerItem(R.id.m_home)

        portfolioContainer = findViewById(R.id.llFeaturedPortfolio)
        testimonialContainer = findViewById(R.id.llFeaturedTestimonials)
        paymentMethodsContainer = findViewById(R.id.llPaymentMethods)
        metricServices = findViewById(R.id.tvMetricServices)
        metricPortfolio = findViewById(R.id.tvMetricPortfolio)
        metricReviews = findViewById(R.id.tvMetricReviews)
        infoAddress = findViewById(R.id.tvInfoAddress)
        infoPhone = findViewById(R.id.tvInfoPhone)
        infoHours = findViewById(R.id.tvInfoHours)
        leadImage = findViewById(R.id.ivLeadServiceImage)
        leadTitle = findViewById(R.id.tvLeadServiceTitle)
        leadMeta = findViewById(R.id.tvLeadServiceMeta)
        leadBody = findViewById(R.id.tvLeadServiceBody)

        findViewById<TextView>(R.id.tvHeroTitle).text =
            "Clean cuts, beard work, and polished grooming with ${SiteConfig.ownerName}."
        findViewById<TextView>(R.id.tvHeroBody).text =
            "Book online, check the latest portfolio work, and manage your appointment with a simpler client flow."

        infoAddress.text = SiteConfig.address
        infoPhone.text = SiteConfig.phone
        infoHours.text = SiteConfig.bookingHours

        renderPaymentMethods()

        findViewById<MaterialButton>(R.id.btnHeroBook).setOnClickListener {
            startActivity(Intent(this, BookingActivity::class.java))
        }
        findViewById<MaterialButton>(R.id.btnHeroPortfolio).setOnClickListener {
            startActivity(Intent(this, PortfolioActivity::class.java))
        }
        findViewById<MaterialButton>(R.id.btnHeroBlog).setOnClickListener {
            startActivity(Intent(this, BlogActivity::class.java))
        }
        findViewById<MaterialButton>(R.id.btnOpenPortfolioSection).setOnClickListener {
            startActivity(Intent(this, PortfolioActivity::class.java))
        }
        findViewById<MaterialButton>(R.id.btnOpenReviewsSection).setOnClickListener {
            startActivity(Intent(this, PortfolioActivity::class.java))
        }

        loadHomeContent()
    }

    private fun loadHomeContent() {
        ApiClient.getHomeContent(
            onSuccess = { json ->
                val snapshot = json.toHomeContentSnapshot()
                runOnUiThread {
                    metricServices.text = snapshot.featuredServices.size.toString()
                    metricPortfolio.text = snapshot.featuredPortfolio.size.toString()
                    metricReviews.text = snapshot.featuredTestimonials.size.toString()

                    renderLeadService(snapshot.featuredServices.firstOrNull())
                    renderPortfolio(snapshot.featuredPortfolio.take(2))
                    renderTestimonials(snapshot.featuredTestimonials.take(3))
                }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load home content: $message", Toast.LENGTH_LONG).show()
                    renderLeadService(null)
                    renderPortfolio(emptyList())
                    renderTestimonials(emptyList())
                }
            }
        )
    }

    private fun renderLeadService(service: ServiceOption?) {
        val lead = service
        if (lead?.imageUrl?.isNotBlank() == true) {
            leadImage.load(lead.imageUrl)
        } else {
            leadImage.setImageDrawable(null)
            leadImage.setBackgroundColor(ContextCompat.getColor(this, R.color.brand_navy_90))
        }

        leadTitle.text = lead?.name ?: "Classic cut and beard tidy"
        leadMeta.text = if (lead != null) {
            "${lead.durationMinutes} minutes / ${formatMoney(lead.priceCents)}"
        } else {
            "Flexible timing / Pricing on request"
        }
        leadBody.text = lead?.description?.ifBlank {
            "A polished appointment designed for clients who want a clean finish, practical maintenance, and easy booking management."
        } ?: "A polished appointment designed for clients who want a clean finish, practical maintenance, and easy booking management."
    }

    private fun renderPortfolio(items: List<PortfolioEntry>) {
        portfolioContainer.removeAllViews()
        if (items.isEmpty()) {
            portfolioContainer.addView(emptyCard("No featured portfolio work yet."))
            return
        }

        items.forEach { item ->
            val card = contentCard(
                title = item.title,
                subtitle = item.subtitle.ifBlank { item.description },
                body = item.description,
                meta = item.tag.ifBlank { "Portfolio" },
                imageUrl = item.imageUrl
            )
            card.setOnClickListener { startActivity(Intent(this, PortfolioActivity::class.java)) }
            portfolioContainer.addView(card)
        }
    }

    private fun renderTestimonials(items: List<TestimonialEntry>) {
        testimonialContainer.removeAllViews()
        if (items.isEmpty()) {
            testimonialContainer.addView(emptyCard("No approved testimonials yet."))
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

            val body = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(18), dp(18), dp(18), dp(18))
            }
            body.addView(TextView(this).apply {
                text = "★".repeat(item.rating.coerceIn(1, 5)) + "  ${item.rating}/5"
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
            testimonialContainer.addView(card)
        }
    }

    private fun renderPaymentMethods() {
        paymentMethodsContainer.removeAllViews()
        SiteConfig.paymentMethods.forEachIndexed { index, method ->
            paymentMethodsContainer.addView(TextView(this).apply {
                text = method
                setTextColor(ContextCompat.getColor(context, android.R.color.white))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13f)
                setTypeface(typeface, Typeface.BOLD)
                setPadding(dp(14), dp(10), dp(14), dp(10))
                background = ContextCompat.getDrawable(context, R.drawable.bg_chip)
                backgroundTintList = ContextCompat.getColorStateList(context, R.color.brand_navy_90)
                if (index > 0) {
                    (layoutParams as? LinearLayout.LayoutParams)?.marginStart = dp(8)
                }
            }.also { chip ->
                chip.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    if (index > 0) marginStart = dp(8)
                }
            })
        }
    }

    private fun contentCard(
        title: String,
        subtitle: String,
        body: String,
        meta: String,
        imageUrl: String
    ): MaterialCardView {
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
            if (imageUrl.isNotBlank()) {
                load(imageUrl)
            }
        }
        val cardBody = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
        }
        cardBody.addView(TextView(this).apply {
            text = title
            setTextColor(ContextCompat.getColor(context, R.color.brand_text))
            setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18f)
            setTypeface(typeface, Typeface.BOLD)
        })
        cardBody.addView(TextView(this).apply {
            text = subtitle.ifBlank { "No description yet." }
            setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
            setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14f)
            setPadding(0, dp(6), 0, 0)
        })
        if (body.isNotBlank() && body != subtitle) {
            cardBody.addView(TextView(this).apply {
                text = body
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13f)
                setPadding(0, dp(8), 0, 0)
            })
        }
        cardBody.addView(TextView(this).apply {
            text = meta
            setTextColor(ContextCompat.getColor(context, R.color.brand_text))
            setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12f)
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(12), 0, 0)
        })
        wrapper.addView(image)
        wrapper.addView(cardBody)
        card.addView(wrapper)
        return card
    }

    private fun emptyCard(message: String): MaterialCardView {
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
            setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
            setPadding(dp(18), dp(18), dp(18), dp(18))
        })
        return card
    }
}

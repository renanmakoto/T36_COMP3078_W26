package com.example.uiprototypebeta

import android.content.Intent
import android.graphics.Typeface
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import coil.load
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView

class HomeActivity : BaseDrawerActivity() {

    private lateinit var servicesContainer: LinearLayout
    private lateinit var portfolioContainer: LinearLayout
    private lateinit var blogContainer: LinearLayout
    private lateinit var testimonialContainer: LinearLayout
    private lateinit var metricServices: TextView
    private lateinit var metricPortfolio: TextView
    private lateinit var metricReviews: TextView
    private lateinit var adminCmsButton: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentLayout(R.layout.content_home)
        setToolbarTitle("Home")
        setCheckedDrawerItem(R.id.m_home)

        servicesContainer = findViewById(R.id.llFeaturedServices)
        portfolioContainer = findViewById(R.id.llFeaturedPortfolio)
        blogContainer = findViewById(R.id.llFeaturedBlog)
        testimonialContainer = findViewById(R.id.llFeaturedTestimonials)
        metricServices = findViewById(R.id.tvMetricServices)
        metricPortfolio = findViewById(R.id.tvMetricPortfolio)
        metricReviews = findViewById(R.id.tvMetricReviews)
        adminCmsButton = findViewById(R.id.btnAdminCms)

        findViewById<MaterialButton>(R.id.btnBookNow).setOnClickListener {
            startActivity(Intent(this, BookingActivity::class.java))
        }

        adminCmsButton.visibility = if (AdminSession.isLoggedIn) View.VISIBLE else View.GONE
        adminCmsButton.setOnClickListener {
            startActivity(Intent(this, WebAdminActivity::class.java).apply {
                putExtra("title", "Admin CMS")
                putExtra("path", "/admin/dashboard")
            })
        }

        loadHomeContent()
    }

    override fun onResume() {
        super.onResume()
        adminCmsButton.visibility = if (AdminSession.isLoggedIn) View.VISIBLE else View.GONE
    }

    private fun loadHomeContent() {
        ApiClient.getHomeContent(
            onSuccess = { json ->
                val snapshot = json.toHomeContentSnapshot()
                runOnUiThread {
                    metricServices.text = snapshot.featuredServices.size.toString()
                    metricPortfolio.text = snapshot.featuredPortfolio.size.toString()
                    metricReviews.text = snapshot.featuredTestimonials.size.toString()

                    renderServices(snapshot.featuredServices)
                    renderPortfolio(snapshot.featuredPortfolio)
                    renderBlog(snapshot.featuredBlogPosts)
                    renderTestimonials(snapshot.featuredTestimonials)
                }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load home content: $message", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun renderServices(items: List<ServiceOption>) {
        servicesContainer.removeAllViews()
        if (items.isEmpty()) {
            servicesContainer.addView(emptyCard("No featured services yet."))
            return
        }
        items.forEach { item ->
            servicesContainer.addView(contentCard(item.name, item.description, "${item.durationMinutes} min  ${formatMoney(item.priceCents)}", item.imageUrl))
        }
    }

    private fun renderPortfolio(items: List<PortfolioEntry>) {
        portfolioContainer.removeAllViews()
        if (items.isEmpty()) {
            portfolioContainer.addView(emptyCard("No featured portfolio work yet."))
            return
        }
        items.forEach { item ->
            val card = contentCard(item.title, item.subtitle.ifBlank { item.description }, item.tag.ifBlank { "Portfolio" }, item.imageUrl)
            card.setOnClickListener { startActivity(Intent(this, PortfolioActivity::class.java)) }
            portfolioContainer.addView(card)
        }
    }

    private fun renderBlog(items: List<Post>) {
        blogContainer.removeAllViews()
        if (items.isEmpty()) {
            blogContainer.addView(emptyCard("No featured blog posts yet."))
            return
        }
        items.forEach { item ->
            val card = contentCard(item.title, item.excerpt, formatDateLabel(item.createdAt), item.coverImageUrl)
            card.setOnClickListener {
                startActivity(Intent(this, BlogDetailActivity::class.java).apply {
                    putExtra("post", item)
                })
            }
            blogContainer.addView(card)
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
                radius = dp(20).toFloat()
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
                text = "Rating ${item.rating}/5"
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12f)
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

    private fun contentCard(title: String, subtitle: String, meta: String, imageUrl: String): MaterialCardView {
        val card = MaterialCardView(this).apply {
            radius = dp(20).toFloat()
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
                dp(160)
            )
            scaleType = ImageView.ScaleType.CENTER_CROP
            setBackgroundColor(ContextCompat.getColor(context, R.color.card_stroke))
            if (imageUrl.isNotBlank()) {
                load(imageUrl)
            }
        }
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
        }
        body.addView(TextView(this).apply {
            text = title
            setTextColor(ContextCompat.getColor(context, R.color.brand_text))
            setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18f)
            setTypeface(typeface, Typeface.BOLD)
        })
        body.addView(TextView(this).apply {
            text = subtitle.ifBlank { "No description yet." }
            setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
            setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14f)
            setPadding(0, dp(6), 0, 0)
        })
        body.addView(TextView(this).apply {
            text = meta
            setTextColor(ContextCompat.getColor(context, R.color.brand_text))
            setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12f)
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(10), 0, 0)
        })
        wrapper.addView(image)
        wrapper.addView(body)
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

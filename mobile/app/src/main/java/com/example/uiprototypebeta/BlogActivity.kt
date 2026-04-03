package com.brazwebdes.hairstylistbooking

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

class BlogActivity : BaseDrawerActivity() {

    private lateinit var postsContainer: LinearLayout
    private lateinit var manageButton: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentLayout(R.layout.content_blog)
        setToolbarTitle("Beauty Blog")
        setCheckedDrawerItem(R.id.m_blog)

        postsContainer = findViewById(R.id.llPosts)
        manageButton = findViewById(R.id.btnManageBlog)

        manageButton.visibility = if (AdminSession.isLoggedIn) View.VISIBLE else View.GONE
        manageButton.setOnClickListener {
            startActivity(AdminDashboardActivity.intent(this, initialView = AdminDashboardActivity.ViewMode.ANALYTICS))
        }

        loadPosts()
    }

    override fun onResume() {
        super.onResume()
        manageButton.visibility = if (AdminSession.isLoggedIn) View.VISIBLE else View.GONE
    }

    private fun loadPosts() {
        ApiClient.getBlogPosts(
            onSuccess = { array ->
                val posts = array.toBlogPosts()
                runOnUiThread { renderPosts(posts) }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load blog posts: $message", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun renderPosts(posts: List<Post>) {
        postsContainer.removeAllViews()
        if (posts.isEmpty()) {
            postsContainer.addView(emptyCard("No blog posts are published yet."))
            return
        }
        posts.forEach { post ->
            val card = MaterialCardView(this).apply {
                radius = dp(20).toFloat()
                setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
                cardElevation = 0f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = dp(12) }
                setOnClickListener {
                    startActivity(Intent(this@BlogActivity, BlogDetailActivity::class.java).apply {
                        putExtra("post", post)
                    })
                }
            }

            val wrapper = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            val image = ImageView(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(170)
                )
                scaleType = ImageView.ScaleType.CENTER_CROP
                setBackgroundColor(ContextCompat.getColor(context, R.color.card_stroke))
                if (post.coverImageUrl.isNotBlank()) {
                    load(post.coverImageUrl)
                }
            }
            val body = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(18), dp(18), dp(18), dp(18))
            }
            body.addView(TextView(this).apply {
                text = post.title
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18f)
                setTypeface(typeface, Typeface.BOLD)
            })
            body.addView(TextView(this).apply {
                text = post.excerpt.ifBlank { "Tap to read more." }
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14f)
                setPadding(0, dp(6), 0, 0)
            })
            body.addView(TextView(this).apply {
                text = formatDateLabel(post.createdAt)
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12f)
                setTypeface(typeface, Typeface.BOLD)
                setPadding(0, dp(10), 0, 0)
            })
            wrapper.addView(image)
            wrapper.addView(body)
            card.addView(wrapper)
            postsContainer.addView(card)
        }
    }

    private fun emptyCard(message: String): MaterialCardView {
        val card = MaterialCardView(this).apply {
            radius = dp(18).toFloat()
            setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
            cardElevation = 0f
        }
        card.addView(TextView(this).apply {
            text = message
            setPadding(dp(16), dp(16), dp(16), dp(16))
            setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
        })
        return card
    }
}

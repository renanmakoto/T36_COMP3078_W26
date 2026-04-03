package com.brazwebdes.hairstylistbooking

import android.os.Bundle
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import coil.load

class BlogDetailActivity : BaseDrawerActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentLayout(R.layout.content_blog_detail)
        setToolbarTitle("Blog")

        val post = intent.getSerializableExtra("post") as? Post ?: run {
            finish()
            return
        }

        findViewById<TextView>(R.id.tvTitle).text = post.title
        findViewById<TextView>(R.id.tvMeta).text =
            "${formatDateLabel(post.createdAt)} by ${post.authorName.ifBlank { "Admin" }}"
        findViewById<TextView>(R.id.tvBody).text = post.body

        val headerImage = findViewById<ImageView>(R.id.ivHeader)
        if (post.coverImageUrl.isNotBlank()) {
            headerImage.load(post.coverImageUrl)
        }

        val tagsContainer = findViewById<LinearLayout>(R.id.llTags)
        tagsContainer.removeAllViews()
        post.tags.forEach { tag ->
            val chip = TextView(this).apply {
                text = tag
                setPadding(dp(16), dp(8), dp(16), dp(8))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12f)
                setBackgroundResource(R.drawable.bg_chip)
                val layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
                layoutParams.setMargins(0, 0, dp(8), 0)
                this.layoutParams = layoutParams
            }
            tagsContainer.addView(chip)
        }

        findViewById<LinearLayout>(R.id.btnBack).setOnClickListener { finish() }
    }
}

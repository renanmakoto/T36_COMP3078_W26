package com.brazwebdes.hairstylistbooking

import org.json.JSONArray
import org.json.JSONObject

data class AddOnOption(
    val id: String,
    val name: String,
    val description: String,
    val category: String,
    val priceCents: Int,
    val durationMinutes: Int
)

data class ServiceOption(
    val id: String,
    val name: String,
    val description: String,
    val imageUrl: String,
    val paymentNote: String,
    val durationMinutes: Int,
    val priceCents: Int,
    val addOns: List<AddOnOption>
)

data class PortfolioEntry(
    val id: String,
    val title: String,
    val subtitle: String,
    val description: String,
    val imageUrl: String,
    val tag: String,
    val createdAt: String
)

data class TestimonialEntry(
    val id: String,
    val authorName: String,
    val quote: String,
    val rating: Int,
    val serviceName: String,
    val createdAt: String
)

data class HomeContentSnapshot(
    val featuredServices: List<ServiceOption>,
    val featuredPortfolio: List<PortfolioEntry>,
    val featuredBlogPosts: List<Post>,
    val featuredTestimonials: List<TestimonialEntry>
)

fun JSONArray.toServiceOptions(): List<ServiceOption> {
    val items = mutableListOf<ServiceOption>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toServiceOption())
    }
    return items
}

fun JSONArray.toPortfolioEntries(): List<PortfolioEntry> {
    val items = mutableListOf<PortfolioEntry>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toPortfolioEntry())
    }
    return items
}

fun JSONArray.toBlogPosts(): List<Post> {
    val items = mutableListOf<Post>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toPost())
    }
    return items
}

fun JSONArray.toTestimonials(): List<TestimonialEntry> {
    val items = mutableListOf<TestimonialEntry>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toTestimonialEntry())
    }
    return items
}

fun JSONObject.toHomeContentSnapshot(): HomeContentSnapshot {
    return HomeContentSnapshot(
        featuredServices = optJSONArray("featured_services")?.toServiceOptions().orEmpty(),
        featuredPortfolio = optJSONArray("featured_portfolio")?.toPortfolioEntries().orEmpty(),
        featuredBlogPosts = optJSONArray("featured_blog_posts")?.toBlogPosts().orEmpty(),
        featuredTestimonials = optJSONArray("featured_testimonials")?.toTestimonials().orEmpty()
    )
}

fun JSONObject.toServiceOption(): ServiceOption {
    return ServiceOption(
        id = optString("id"),
        name = optString("name"),
        description = optString("description"),
        imageUrl = optString("image_url"),
        paymentNote = optString("payment_note"),
        durationMinutes = optInt("duration_minutes"),
        priceCents = optInt("price_cents"),
        addOns = optJSONArray("available_add_ons")?.toAddOnOptions().orEmpty()
    )
}

fun JSONObject.toPortfolioEntry(): PortfolioEntry {
    return PortfolioEntry(
        id = optString("id"),
        title = optString("title"),
        subtitle = optString("subtitle"),
        description = optString("description"),
        imageUrl = optString("image_url"),
        tag = optString("tag"),
        createdAt = optString("created_at")
    )
}

fun JSONObject.toTestimonialEntry(): TestimonialEntry {
    val service = optJSONObject("service")
    return TestimonialEntry(
        id = optString("id"),
        authorName = optString("author_name"),
        quote = optString("quote"),
        rating = optInt("rating", 5),
        serviceName = service?.optString("name").orEmpty(),
        createdAt = optString("created_at")
    )
}

fun JSONObject.toPost(): Post {
    val author = optJSONObject("created_by")
    return Post(
        id = optString("id"),
        slug = optString("slug"),
        title = optString("title"),
        excerpt = optString("excerpt"),
        body = optString("body"),
        coverImageUrl = optString("cover_image_url"),
        tags = optJSONArray("tags")?.toStringList().orEmpty(),
        createdAt = optString("created_at"),
        authorName = author?.optString("display_name").takeUnless { it.isNullOrBlank() }
            ?: author?.optString("email").orEmpty()
    )
}

private fun JSONArray.toAddOnOptions(): List<AddOnOption> {
    val items = mutableListOf<AddOnOption>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(
            AddOnOption(
                id = item.optString("id"),
                name = item.optString("name"),
                description = item.optString("description"),
                category = item.optString("category"),
                priceCents = item.optInt("price_cents"),
                durationMinutes = item.optInt("duration_minutes")
            )
        )
    }
    return items
}

private fun JSONArray.toStringList(): List<String> {
    val items = mutableListOf<String>()
    for (index in 0 until length()) {
        val value = optString(index).trim()
        if (value.isNotEmpty()) items.add(value)
    }
    return items
}

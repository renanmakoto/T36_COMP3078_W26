package com.brazwebdes.hairstylistbooking

import org.json.JSONArray
import org.json.JSONObject

data class ServiceSummaryOption(
    val id: String,
    val name: String,
    val durationMinutes: Int,
    val priceCents: Int,
    val imageUrl: String,
)

data class AdminServiceEntry(
    val id: String,
    val name: String,
    val description: String,
    val imageUrl: String,
    val paymentNote: String,
    val durationMinutes: Int,
    val priceCents: Int,
    val sortOrder: Int,
    val isFeaturedHome: Boolean,
    val homeOrder: Int,
    val isActive: Boolean,
    val availableAddOns: List<AddOnOption>,
    val createdAt: String,
)

data class AdminAddOnEntry(
    val id: String,
    val name: String,
    val description: String,
    val category: String,
    val priceCents: Int,
    val durationMinutes: Int,
    val sortOrder: Int,
    val isActive: Boolean,
    val services: List<ServiceSummaryOption>,
    val createdAt: String,
)

data class AdminPortfolioEntry(
    val id: String,
    val title: String,
    val subtitle: String,
    val description: String,
    val imageUrl: String,
    val tag: String,
    val isPublished: Boolean,
    val isFeaturedHome: Boolean,
    val homeOrder: Int,
    val createdAt: String,
    val updatedAt: String,
)

data class AdminBlogEntry(
    val id: String,
    val title: String,
    val slug: String,
    val excerpt: String,
    val body: String,
    val coverImageUrl: String,
    val tags: List<String>,
    val isPublished: Boolean,
    val isFeaturedHome: Boolean,
    val homeOrder: Int,
    val authorName: String,
    val createdAt: String,
    val updatedAt: String,
)

data class AdminTestimonialEntry(
    val id: String,
    val authorName: String,
    val authorEmail: String,
    val quote: String,
    val rating: Int,
    val service: ServiceSummaryOption?,
    val status: String,
    val adminNotes: String,
    val isFeaturedHome: Boolean,
    val homeOrder: Int,
    val createdAt: String,
    val updatedAt: String,
)

data class AdminImageUploadResult(
    val url: String,
    val path: String,
    val name: String,
    val size: Long,
    val contentType: String,
)

fun JSONArray.toAdminServices(): List<AdminServiceEntry> {
    val items = mutableListOf<AdminServiceEntry>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toAdminServiceEntry())
    }
    return items
}

fun JSONArray.toAdminAddOns(): List<AdminAddOnEntry> {
    val items = mutableListOf<AdminAddOnEntry>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toAdminAddOnEntry())
    }
    return items
}

fun JSONArray.toAdminPortfolioEntries(): List<AdminPortfolioEntry> {
    val items = mutableListOf<AdminPortfolioEntry>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toAdminPortfolioEntry())
    }
    return items
}

fun JSONArray.toAdminBlogEntries(): List<AdminBlogEntry> {
    val items = mutableListOf<AdminBlogEntry>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toAdminBlogEntry())
    }
    return items
}

fun JSONArray.toAdminTestimonials(): List<AdminTestimonialEntry> {
    val items = mutableListOf<AdminTestimonialEntry>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toAdminTestimonialEntry())
    }
    return items
}

fun JSONObject.toAdminImageUploadResult(): AdminImageUploadResult {
    return AdminImageUploadResult(
        url = optString("url"),
        path = optString("path"),
        name = optString("name"),
        size = optLong("size"),
        contentType = optString("content_type"),
    )
}

fun JSONObject.toAdminServiceEntry(): AdminServiceEntry {
    return AdminServiceEntry(
        id = optString("id"),
        name = optString("name"),
        description = optString("description"),
        imageUrl = optString("image_url"),
        paymentNote = optString("payment_note"),
        durationMinutes = optInt("duration_minutes"),
        priceCents = optInt("price_cents"),
        sortOrder = optInt("sort_order"),
        isFeaturedHome = optBoolean("is_featured_home"),
        homeOrder = optInt("home_order"),
        isActive = optBoolean("is_active", true),
        availableAddOns = optJSONArray("available_add_ons")?.toAddOnOptions().orEmpty(),
        createdAt = optString("created_at"),
    )
}

fun JSONObject.toAdminAddOnEntry(): AdminAddOnEntry {
    return AdminAddOnEntry(
        id = optString("id"),
        name = optString("name"),
        description = optString("description"),
        category = optString("category"),
        priceCents = optInt("price_cents"),
        durationMinutes = optInt("duration_minutes"),
        sortOrder = optInt("sort_order"),
        isActive = optBoolean("is_active", true),
        services = optJSONArray("services")?.toServiceSummaries().orEmpty(),
        createdAt = optString("created_at"),
    )
}

fun JSONObject.toAdminPortfolioEntry(): AdminPortfolioEntry {
    return AdminPortfolioEntry(
        id = optString("id"),
        title = optString("title"),
        subtitle = optString("subtitle"),
        description = optString("description"),
        imageUrl = optString("image_url"),
        tag = optString("tag"),
        isPublished = optBoolean("is_published", true),
        isFeaturedHome = optBoolean("is_featured_home"),
        homeOrder = optInt("home_order"),
        createdAt = optString("created_at"),
        updatedAt = optString("updated_at"),
    )
}

fun JSONObject.toAdminBlogEntry(): AdminBlogEntry {
    val createdBy = optJSONObject("created_by")
    return AdminBlogEntry(
        id = optString("id"),
        title = optString("title"),
        slug = optString("slug"),
        excerpt = optString("excerpt"),
        body = optString("body"),
        coverImageUrl = optString("cover_image_url"),
        tags = optJSONArray("tags")?.toStringList().orEmpty(),
        isPublished = optBoolean("is_published", true),
        isFeaturedHome = optBoolean("is_featured_home"),
        homeOrder = optInt("home_order"),
        authorName = createdBy?.optString("display_name").takeUnless { it.isNullOrBlank() }
            ?: createdBy?.optString("email").orEmpty(),
        createdAt = optString("created_at"),
        updatedAt = optString("updated_at"),
    )
}

fun JSONObject.toAdminTestimonialEntry(): AdminTestimonialEntry {
    return AdminTestimonialEntry(
        id = optString("id"),
        authorName = optString("author_name"),
        authorEmail = optString("author_email"),
        quote = optString("quote"),
        rating = optInt("rating", 5),
        service = optJSONObject("service")?.toServiceSummaryOption(),
        status = optString("status", "PENDING"),
        adminNotes = optString("admin_notes"),
        isFeaturedHome = optBoolean("is_featured_home"),
        homeOrder = optInt("home_order"),
        createdAt = optString("created_at"),
        updatedAt = optString("updated_at"),
    )
}

private fun JSONObject.toServiceSummaryOption(): ServiceSummaryOption {
    return ServiceSummaryOption(
        id = optString("id"),
        name = optString("name"),
        durationMinutes = optInt("duration_minutes"),
        priceCents = optInt("price_cents"),
        imageUrl = optString("image_url"),
    )
}

private fun JSONArray.toServiceSummaries(): List<ServiceSummaryOption> {
    val items = mutableListOf<ServiceSummaryOption>()
    for (index in 0 until length()) {
        val item = optJSONObject(index) ?: continue
        items.add(item.toServiceSummaryOption())
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

package com.brazwebdes.hairstylistbooking

import java.io.Serializable

data class Post(
    val id: String,
    val slug: String,
    val title: String,
    val excerpt: String,
    val body: String,
    val coverImageUrl: String,
    val tags: List<String>,
    val createdAt: String,
    val authorName: String
) : Serializable

package com.brazwebdes.hairstylistbooking

/** Tracks whether a regular user session is active. */
object UserSession {
    var isLoggedIn: Boolean = false
    var displayName: String = ""
    var userId: String = ""
    var userEmail: String = ""

    fun clear() {
        isLoggedIn = false
        displayName = ""
        userId = ""
        userEmail = ""
        ApiClient.accessToken = null
        ApiClient.refreshToken = null
    }
}

package com.brazwebdes.hairstylistbooking

/** Tracks whether an admin session is active. */
object AdminSession {
    var isLoggedIn: Boolean = false
    var displayName: String = ""
    var email: String = ""

    fun clear() {
        isLoggedIn = false
        displayName = ""
        email = ""
        ApiClient.accessToken = null
        ApiClient.refreshToken = null
    }
}

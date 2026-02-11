package com.example.uiprototypebeta

/** Tracks whether an admin session is active. */
object AdminSession {
    var isLoggedIn: Boolean = false

    fun clear() {
        isLoggedIn = false
        ApiClient.accessToken = null
        ApiClient.refreshToken = null
    }
}

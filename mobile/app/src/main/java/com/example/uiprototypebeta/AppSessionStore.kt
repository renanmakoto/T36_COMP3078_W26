package com.brazwebdes.hairstylistbooking

import android.content.Context

/** Persists the active auth session so mobile behavior survives app restarts. */
object AppSessionStore {
    private const val prefsName = "app_session"
    private const val keyRole = "role"
    private const val keyAccessToken = "access_token"
    private const val keyRefreshToken = "refresh_token"
    private const val keyDisplayName = "display_name"
    private const val keyUserId = "user_id"
    private const val keyEmail = "email"
    private const val roleUser = "user"
    private const val roleAdmin = "admin"

    private data class StoredSession(
        val role: String,
        val access: String,
        val refresh: String,
        val displayName: String,
        val userId: String,
        val email: String,
    )

    private var appContext: Context? = null
    private var pendingSession: StoredSession? = null

    fun initialize(context: Context) {
        appContext = context.applicationContext
        restore(context)
    }

    fun restore(context: Context = requireContext()) {
        appContext = context.applicationContext
        val prefs = prefs(context)
        val role = prefs.getString(keyRole, null)
        val access = prefs.getString(keyAccessToken, null)
        val refresh = prefs.getString(keyRefreshToken, null)
        val displayName = prefs.getString(keyDisplayName, "").orEmpty()
        val userId = prefs.getString(keyUserId, "").orEmpty()
        val email = prefs.getString(keyEmail, "").orEmpty()

        clearInMemory()
        pendingSession = null

        if (access.isNullOrBlank() || refresh.isNullOrBlank()) {
            clearStored(context)
            return
        }

        pendingSession = when (role) {
            roleUser, roleAdmin -> StoredSession(
                role = role,
                access = access,
                refresh = refresh,
                displayName = displayName,
                userId = userId,
                email = email,
            )
            else -> null
        }

        if (pendingSession == null) {
            clearStored(context)
        }
    }

    fun saveUserSession(
        context: Context,
        access: String,
        refresh: String,
        displayName: String,
        userId: String,
        email: String
    ) {
        appContext = context.applicationContext
        val session = StoredSession(roleUser, access, refresh, displayName, userId, email)
        persistSession(context, session)
        activateSession(session)
    }

    fun saveAdminSession(
        context: Context,
        access: String,
        refresh: String,
        displayName: String,
        email: String
    ) {
        appContext = context.applicationContext
        val session = StoredSession(roleAdmin, access, refresh, displayName, "", email)
        persistSession(context, session)
        activateSession(session)
    }

    fun clear(context: Context = requireContext()) {
        appContext = context.applicationContext
        clearStored(context)
    }

    fun hasPendingSession(): Boolean = pendingSession != null

    fun hasPendingUserSession(): Boolean = pendingSession?.role == roleUser

    fun hasPendingAdminSession(): Boolean = pendingSession?.role == roleAdmin

    fun pendingRefreshToken(): String? = pendingSession?.refresh

    fun activatePendingSession(updatedAccessToken: String? = null): Boolean {
        return activatePendingSessionInternal(expectedRole = null, updatedAccessToken = updatedAccessToken)
    }

    fun activatePendingUserSession(updatedAccessToken: String? = null): Boolean {
        return activatePendingSessionInternal(expectedRole = roleUser, updatedAccessToken = updatedAccessToken)
    }

    fun activatePendingAdminSession(updatedAccessToken: String? = null): Boolean {
        return activatePendingSessionInternal(expectedRole = roleAdmin, updatedAccessToken = updatedAccessToken)
    }

    private fun activatePendingSessionInternal(
        expectedRole: String?,
        updatedAccessToken: String? = null
    ): Boolean {
        val session = pendingSession ?: return false
        if (expectedRole != null && session.role != expectedRole) {
            return false
        }
        val resolvedSession = if (!updatedAccessToken.isNullOrBlank()) {
            session.copy(access = updatedAccessToken)
        } else {
            session
        }

        appContext?.let { persistSession(it, resolvedSession) }
        activateSession(resolvedSession)
        pendingSession = null
        return true
    }

    fun updateAccessToken(access: String) {
        ApiClient.accessToken = access
        pendingSession = pendingSession?.copy(access = access)
        appContext?.let { prefs(it).edit().putString(keyAccessToken, access).apply() }
    }

    private fun clearStored(context: Context) {
        prefs(context).edit().clear().apply()
        pendingSession = null
        clearInMemory()
    }

    private fun persistSession(context: Context, session: StoredSession) {
        pendingSession = null
        prefs(context).edit()
            .putString(keyRole, session.role)
            .putString(keyAccessToken, session.access)
            .putString(keyRefreshToken, session.refresh)
            .putString(keyDisplayName, session.displayName)
            .putString(keyUserId, session.userId)
            .putString(keyEmail, session.email)
            .apply()
    }

    private fun activateSession(session: StoredSession) {
        clearInMemory()
        ApiClient.setAuthTokens(session.access, session.refresh)
        when (session.role) {
            roleUser -> {
                UserSession.isLoggedIn = true
                UserSession.displayName = session.displayName
                UserSession.userId = session.userId
                UserSession.userEmail = session.email
            }
            roleAdmin -> {
                AdminSession.isLoggedIn = true
                AdminSession.displayName = session.displayName
                AdminSession.email = session.email
            }
        }
    }

    private fun clearInMemory() {
        ApiClient.clearAuthTokens()
        UserSession.clear()
        AdminSession.clear()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(prefsName, Context.MODE_PRIVATE)

    private fun requireContext(): Context {
        return checkNotNull(appContext) { "AppSessionStore has not been initialized yet." }
    }
}

package com.brazwebdes.hairstylistbooking

import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.URLEncoder

object ApiClient {

    var baseUrl: String = BuildConfig.API_BASE_URL.trimEnd('/')
    var webBaseUrl: String = BuildConfig.WEB_BASE_URL.trimEnd('/')
    var privacyPolicyUrl: String = BuildConfig.PRIVACY_POLICY_URL.trim()
    var accountDeletionUrl: String = BuildConfig.ACCOUNT_DELETION_URL.trim()

    private val client = OkHttpClient()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    @Volatile
    var accessToken: String? = null

    @Volatile
    var refreshToken: String? = null

    private enum class RefreshStatus {
        SUCCESS,
        INVALID,
        NETWORK_ERROR,
    }

    private data class RefreshResult(
        val status: RefreshStatus,
        val accessToken: String? = null,
    )

    fun setAuthTokens(access: String, refresh: String) {
        accessToken = access
        refreshToken = refresh
    }

    fun clearAuthTokens() {
        accessToken = null
        refreshToken = null
    }

    fun validateStoredSession(
        onValid: () -> Unit,
        onInvalid: (String) -> Unit,
        onNetworkError: (String) -> Unit
    ) {
        val refresh = AppSessionStore.pendingRefreshToken()
        if (refresh.isNullOrBlank()) {
            onInvalid("Saved session not found.")
            return
        }

        Thread {
            val refreshResult = refreshAccessTokenBlocking(
                refreshOverride = refresh,
                persistAccessToken = false,
                clearSessionOnInvalid = false
            )
            when (refreshResult.status) {
                RefreshStatus.SUCCESS -> {
                    AppSessionStore.activatePendingSession(refreshResult.accessToken)
                    onValid()
                }
                RefreshStatus.INVALID -> {
                    AppSessionStore.clear()
                    onInvalid("Session expired. Please sign in again.")
                }
                RefreshStatus.NETWORK_ERROR -> {
                    onNetworkError("Unable to verify the saved session right now.")
                }
            }
        }.start()
    }

    fun login(
        email: String,
        password: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("email", email)
            put("password", password)
        }
        post("/auth/login", body, authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun register(
        displayName: String,
        phone: String,
        email: String,
        password: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("display_name", displayName)
            put("phone", phone)
            put("email", email)
            put("password", password)
        }
        post("/auth/register", body, authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun deleteAccount(
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        delete("/auth/account", onSuccess = onSuccess, onError = onError)
    }

    fun getHomeContent(
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        get("/home-content", authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun getServices(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/services", authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun getPortfolioItems(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/portfolio", authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun getBlogPosts(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/blog-posts", authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun getBlogPost(
        slug: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val encodedSlug = URLEncoder.encode(slug, Charsets.UTF_8.name())
        get("/blog-posts/$encodedSlug", authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun getTestimonials(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/testimonials", authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun createTestimonial(
        authorName: String,
        quote: String,
        rating: Int,
        serviceId: String?,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("author_name", authorName)
            put("quote", quote)
            put("rating", rating)
            if (!serviceId.isNullOrBlank()) put("service_id", serviceId)
        }
        post("/testimonials", body, authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun getAvailability(
        date: String,
        durationMinutes: Int = 0,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val query = if (durationMinutes > 0) {
            "/availability?date=$date&duration=$durationMinutes"
        } else {
            "/availability?date=$date"
        }
        get(query, authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    fun getMyAppointments(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/appointments?me=true", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun createAppointment(
        serviceId: String,
        addOnIds: List<String>,
        date: String,
        startTime: String,
        notes: String = "",
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("service_id", serviceId)
            put("date", date)
            put("start_time", startTime)
            if (addOnIds.isNotEmpty()) put("add_on_ids", JSONArray(addOnIds))
            if (notes.isNotBlank()) put("notes", notes)
        }
        post("/appointments", body, authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun cancelAppointment(
        id: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply { put("action", "cancel") }
        patch("/appointments/$id", body, onSuccess = onSuccess, onError = onError)
    }

    fun rescheduleAppointment(
        id: String,
        date: String,
        startTime: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("action", "reschedule")
            put("date", date)
            put("start_time", startTime)
        }
        patch("/appointments/$id", body, onSuccess = onSuccess, onError = onError)
    }

    fun getAdminAppointments(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/admin/appointments", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun getAdminTestimonials(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/admin/testimonials", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun getAnalyticsOverview(
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        get("/admin/analytics/overview", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun adminCancelAppointment(
        id: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply { put("action", "cancel") }
        patch("/admin/appointments/$id", body, onSuccess = onSuccess, onError = onError)
    }

    fun adminChangeStatus(
        id: String,
        status: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("action", "change_status")
            put("status", status)
        }
        patch("/admin/appointments/$id", body, onSuccess = onSuccess, onError = onError)
    }

    fun getTopServices(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/admin/analytics/top-services", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun getBookingsPerDay(
        month: String,
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/admin/analytics/bookings-per-day?month=$month", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun getBookingsPerMonth(
        year: String,
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/admin/analytics/bookings-per-month?year=$year", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun getNoShowRate(
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        get("/admin/analytics/no-show-rate", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    private fun get(
        path: String,
        authenticated: Boolean,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        enqueueJsonRequest(
            authenticated = authenticated,
            buildRequest = { token ->
                Request.Builder()
                    .url(url(path))
                    .get()
                    .applyAuthHeader(token, authenticated)
                    .build()
            },
            onSuccess = onSuccess,
            onError = onError
        )
    }

    private fun getArray(
        path: String,
        authenticated: Boolean,
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        enqueueJsonArrayRequest(
            authenticated = authenticated,
            buildRequest = { token ->
                Request.Builder()
                    .url(url(path))
                    .get()
                    .applyAuthHeader(token, authenticated)
                    .build()
            },
            onSuccess = onSuccess,
            onError = onError
        )
    }

    private fun post(
        path: String,
        body: JSONObject,
        authenticated: Boolean,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        enqueueJsonRequest(
            authenticated = authenticated,
            buildRequest = { token ->
                Request.Builder()
                    .url(url(path))
                    .post(body.toString().toRequestBody(jsonType))
                    .applyAuthHeader(token, authenticated)
                    .build()
            },
            onSuccess = onSuccess,
            onError = onError
        )
    }

    private fun patch(
        path: String,
        body: JSONObject,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        enqueueJsonRequest(
            authenticated = true,
            buildRequest = { token ->
                Request.Builder()
                    .url(url(path))
                    .patch(body.toString().toRequestBody(jsonType))
                    .applyAuthHeader(token, authenticated = true)
                    .build()
            },
            onSuccess = onSuccess,
            onError = onError
        )
    }

    private fun delete(
        path: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        enqueueJsonRequest(
            authenticated = true,
            buildRequest = { token ->
                Request.Builder()
                    .url(url(path))
                    .delete()
                    .applyAuthHeader(token, authenticated = true)
                    .build()
            },
            onSuccess = onSuccess,
            onError = onError
        )
    }

    private fun enqueueJsonRequest(
        authenticated: Boolean,
        buildRequest: (String?) -> Request,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        performRequest(
            authenticated = authenticated,
            buildRequest = buildRequest,
            handleBody = { bodyString ->
                try {
                    onSuccess(JSONObject(bodyString))
                } catch (_: Exception) {
                    onError("Parse error")
                }
            },
            onError = onError
        )
    }

    private fun enqueueJsonArrayRequest(
        authenticated: Boolean,
        buildRequest: (String?) -> Request,
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        performRequest(
            authenticated = authenticated,
            buildRequest = buildRequest,
            handleBody = { bodyString ->
                try {
                    onSuccess(JSONArray(bodyString))
                } catch (_: Exception) {
                    onError("Parse error")
                }
            },
            onError = onError
        )
    }

    private fun performRequest(
        authenticated: Boolean,
        buildRequest: (String?) -> Request,
        handleBody: (String) -> Unit,
        onError: (String) -> Unit,
        retried: Boolean = false
    ) {
        client.newCall(buildRequest(accessToken)).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e.message ?: "Network error")
            }

            override fun onResponse(call: Call, response: Response) {
                val bodyString = response.body?.string().orEmpty()

                if (response.code == 401 && authenticated && !retried) {
                    when (val refreshResult = refreshAccessTokenBlocking().status) {
                        RefreshStatus.SUCCESS -> {
                            response.close()
                            performRequest(
                                authenticated = authenticated,
                                buildRequest = buildRequest,
                                handleBody = handleBody,
                                onError = onError,
                                retried = true
                            )
                            return
                        }
                        RefreshStatus.INVALID -> {
                            response.close()
                            onError("Session expired. Please sign in again.")
                            return
                        }
                        RefreshStatus.NETWORK_ERROR -> Unit
                    }
                }

                if (response.isSuccessful) {
                    handleBody(bodyString)
                } else {
                    onError(parseError(bodyString, response.code))
                }
            }
        })
    }

    @Synchronized
    private fun refreshAccessTokenBlocking(
        refreshOverride: String? = null,
        persistAccessToken: Boolean = true,
        clearSessionOnInvalid: Boolean = true
    ): RefreshResult {
        val refresh = refreshOverride ?: refreshToken ?: return RefreshResult(RefreshStatus.INVALID)
        return try {
            val request = Request.Builder()
                .url(url("/auth/token/refresh"))
                .post(JSONObject().put("refresh", refresh).toString().toRequestBody(jsonType))
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    if (response.code == 400 || response.code == 401) {
                        if (clearSessionOnInvalid) {
                            AppSessionStore.clear()
                        }
                        return RefreshResult(RefreshStatus.INVALID)
                    }
                    return RefreshResult(RefreshStatus.NETWORK_ERROR)
                }
                val bodyString = response.body?.string().orEmpty()
                val json = JSONObject(bodyString)
                val nextAccess = json.optString("access")
                if (nextAccess.isBlank()) {
                    if (clearSessionOnInvalid) {
                        AppSessionStore.clear()
                    }
                    return RefreshResult(RefreshStatus.INVALID)
                }
                if (persistAccessToken) {
                    AppSessionStore.updateAccessToken(nextAccess)
                } else {
                    accessToken = nextAccess
                }
                RefreshResult(RefreshStatus.SUCCESS, nextAccess)
            }
        } catch (_: Exception) {
            RefreshResult(RefreshStatus.NETWORK_ERROR)
        }
    }

    private fun url(path: String): String = "$baseUrl$path"

    private fun Request.Builder.applyAuthHeader(token: String?, authenticated: Boolean): Request.Builder {
        if (authenticated && !token.isNullOrBlank()) {
            addHeader("Authorization", "Bearer $token")
        }
        return this
    }

    private fun parseError(bodyString: String, statusCode: Int): String {
        return try {
            val json = JSONObject(bodyString)
            when {
                json.optString("detail").isNotBlank() -> json.optString("detail")
                json.optJSONArray("non_field_errors")?.optString(0).orEmpty().isNotBlank() ->
                    json.optJSONArray("non_field_errors")!!.optString(0)
                else -> {
                    val firstKey = json.keys().asSequence().firstOrNull()
                    val value = firstKey?.let { json.opt(it) }
                    when (value) {
                        is JSONArray -> value.optString(0, "Error $statusCode")
                        is String -> value
                        else -> "Error $statusCode"
                    }
                }
            }
        } catch (_: Exception) {
            "Error $statusCode"
        }
    }
}

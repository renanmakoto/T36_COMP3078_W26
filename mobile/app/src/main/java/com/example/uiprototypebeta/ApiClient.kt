package com.example.uiprototypebeta

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

    private val client = OkHttpClient()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    var accessToken: String? = null
    var refreshToken: String? = null

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
        email: String,
        password: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("display_name", displayName)
            put("email", email)
            put("password", password)
        }
        post("/auth/register", body, authenticated = false, onSuccess = onSuccess, onError = onError)
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

    fun adminCancelAppointment(
        id: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply { put("action", "cancel") }
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
        getArray(
            "/admin/analytics/bookings-per-day?month=$month",
            authenticated = true,
            onSuccess = onSuccess,
            onError = onError
        )
    }

    fun getBookingsPerMonth(
        year: String,
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray(
            "/admin/analytics/bookings-per-month?year=$year",
            authenticated = true,
            onSuccess = onSuccess,
            onError = onError
        )
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
        val builder = Request.Builder().url(url(path)).get()
        if (authenticated) accessToken?.let { builder.addHeader("Authorization", "Bearer $it") }
        client.newCall(builder.build()).enqueue(jsonCallback(onSuccess, onError))
    }

    private fun getArray(
        path: String,
        authenticated: Boolean,
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        val builder = Request.Builder().url(url(path)).get()
        if (authenticated) accessToken?.let { builder.addHeader("Authorization", "Bearer $it") }
        client.newCall(builder.build()).enqueue(jsonArrayCallback(onSuccess, onError))
    }

    private fun post(
        path: String,
        body: JSONObject,
        authenticated: Boolean,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val builder = Request.Builder()
            .url(url(path))
            .post(body.toString().toRequestBody(jsonType))
        if (authenticated) accessToken?.let { builder.addHeader("Authorization", "Bearer $it") }
        client.newCall(builder.build()).enqueue(jsonCallback(onSuccess, onError))
    }

    private fun patch(
        path: String,
        body: JSONObject,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val builder = Request.Builder()
            .url(url(path))
            .patch(body.toString().toRequestBody(jsonType))
        accessToken?.let { builder.addHeader("Authorization", "Bearer $it") }
        client.newCall(builder.build()).enqueue(jsonCallback(onSuccess, onError))
    }

    private fun url(path: String): String = "$baseUrl$path"

    private fun jsonCallback(
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ): Callback = object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            onError(e.message ?: "Network error")
        }

        override fun onResponse(call: Call, response: Response) {
            val bodyString = response.body?.string() ?: ""
            if (response.isSuccessful) {
                try {
                    onSuccess(JSONObject(bodyString))
                } catch (_: Exception) {
                    onError("Parse error")
                }
            } else {
                onError(parseError(bodyString, response.code))
            }
        }
    }

    private fun jsonArrayCallback(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ): Callback = object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            onError(e.message ?: "Network error")
        }

        override fun onResponse(call: Call, response: Response) {
            val bodyString = response.body?.string() ?: ""
            if (response.isSuccessful) {
                try {
                    onSuccess(JSONArray(bodyString))
                } catch (_: Exception) {
                    onError("Parse error")
                }
            } else {
                onError(parseError(bodyString, response.code))
            }
        }
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

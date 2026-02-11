package com.example.uiprototypebeta

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

/**
 * Singleton HTTP client that talks to the Django REST API.
 * Uses OkHttp with callback-based async calls so the main thread is never blocked.
 *
 * Change BASE_URL to your machine's IP when running on a real device.
 * For the Android emulator, 10.0.2.2 maps to the host machine's localhost.
 */
object ApiClient {

    // Use 10.0.2.2 for Android emulator -> host machine's localhost
    var BASE_URL = "http://10.0.2.2:8000"

    private val client = OkHttpClient()
    private val JSON_TYPE = "application/json; charset=utf-8".toMediaType()

    var accessToken: String? = null
    var refreshToken: String? = null

    // ---------- Auth ----------

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
        email: String,
        password: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("email", email)
            put("password", password)
        }
        post("/auth/register", body, authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    // ---------- Services ----------

    fun getServices(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/services", authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    // ---------- Availability ----------

    fun getAvailability(
        date: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        get("/availability?date=$date", authenticated = false, onSuccess = onSuccess, onError = onError)
    }

    // ---------- Appointments (user) ----------

    fun getMyAppointments(
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        getArray("/appointments?me=true", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    fun createAppointment(
        serviceId: String,
        date: String,
        startTime: String,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = JSONObject().apply {
            put("service_id", serviceId)
            put("date", date)
            put("start_time", startTime)
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

    // ---------- Admin ----------

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

    fun getNoShowRate(
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        get("/admin/analytics/no-show-rate", authenticated = true, onSuccess = onSuccess, onError = onError)
    }

    // ---------- Internal helpers ----------

    private fun get(
        path: String,
        authenticated: Boolean,
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ) {
        val builder = Request.Builder().url("$BASE_URL$path").get()
        if (authenticated) accessToken?.let { builder.addHeader("Authorization", "Bearer $it") }
        client.newCall(builder.build()).enqueue(jsonCallback(onSuccess, onError))
    }

    private fun getArray(
        path: String,
        authenticated: Boolean,
        onSuccess: (JSONArray) -> Unit,
        onError: (String) -> Unit
    ) {
        val builder = Request.Builder().url("$BASE_URL$path").get()
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
            .url("$BASE_URL$path")
            .post(body.toString().toRequestBody(JSON_TYPE))
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
            .url("$BASE_URL$path")
            .patch(body.toString().toRequestBody(JSON_TYPE))
        accessToken?.let { builder.addHeader("Authorization", "Bearer $it") }
        client.newCall(builder.build()).enqueue(jsonCallback(onSuccess, onError))
    }

    private fun jsonCallback(
        onSuccess: (JSONObject) -> Unit,
        onError: (String) -> Unit
    ): Callback = object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            onError(e.message ?: "Network error")
        }
        override fun onResponse(call: Call, response: Response) {
            val bodyStr = response.body?.string() ?: ""
            if (response.isSuccessful) {
                try { onSuccess(JSONObject(bodyStr)) } catch (e: Exception) { onError("Parse error") }
            } else {
                try {
                    val obj = JSONObject(bodyStr)
                    val msg = obj.optString("detail", obj.toString())
                    onError(msg)
                } catch (_: Exception) { onError("Error ${response.code}") }
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
            val bodyStr = response.body?.string() ?: ""
            if (response.isSuccessful) {
                try { onSuccess(JSONArray(bodyStr)) } catch (e: Exception) { onError("Parse error") }
            } else {
                onError("Error ${response.code}")
            }
        }
    }
}

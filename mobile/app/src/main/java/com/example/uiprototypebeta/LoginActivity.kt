package com.brazwebdes.hairstylistbooking

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.brazwebdes.hairstylistbooking.databinding.ActivityLoginBinding

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private var restoringSession = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (PendingBookingDraftStore.hasDraft(this)) {
            binding.tvHint.text = "Sign in to continue your saved booking, or finish login and choose a different service."
        }

        intent.getStringExtra("prefill_email")?.takeIf { it.isNotBlank() }?.let { binding.etEmail.setText(it) }

        binding.btnSignIn.setOnClickListener {
            val email = binding.etEmail.text?.toString()?.trim().orEmpty()
            val password = binding.etPassword.text?.toString()?.trim().orEmpty()

            if (email.isBlank() || password.isBlank()) {
                Toast.makeText(this, "Enter email and password", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            setBusyState(active = true, signInLabel = "Signing in...")

            ApiClient.login(
                email = email,
                password = password,
                onSuccess = { json ->
                    val access = json.getString("access")
                    val refresh = json.getString("refresh")
                    val user = json.getJSONObject("user")
                    val userEmail = user.getString("email")
                    val userId = user.getString("id")
                    val role = user.getString("role")
                    val displayName = user.optString("display_name").ifBlank { userEmail.substringBefore("@") }

                    runOnUiThread {
                        if (role == "ADMIN") {
                            AppSessionStore.saveAdminSession(
                                context = this,
                                access = access,
                                refresh = refresh,
                                displayName = displayName,
                                email = userEmail
                            )
                            Toast.makeText(this, "Signed in as admin", Toast.LENGTH_SHORT).show()
                            startAdminDestination()
                        } else {
                            AppSessionStore.saveUserSession(
                                context = this,
                                access = access,
                                refresh = refresh,
                                displayName = displayName,
                                userId = userId,
                                email = userEmail
                            )
                            Toast.makeText(this, "Signed in as $userEmail", Toast.LENGTH_SHORT).show()

                            val draftIntent = PendingBookingDraftStore.draftIntent(this)
                            if (draftIntent != null) {
                                startActivity(draftIntent)
                            } else {
                                startActivity(Intent(this, UserDashboardActivity::class.java))
                            }
                        }
                        finish()
                    }
                },
                onError = { msg ->
                    runOnUiThread {
                        setBusyState(active = false, signInLabel = "Sign in")
                        Toast.makeText(this, "Login failed: $msg", Toast.LENGTH_LONG).show()
                    }
                }
            )
        }

        binding.btnGuest.setOnClickListener {
            startActivity(Intent(this, HomeActivity::class.java))
        }

        binding.btnSignUp.setOnClickListener {
            startActivity(Intent(this, SignUpActivity::class.java))
        }

        binding.btnPrivacyPolicy.setOnClickListener {
            openExternalUrl(ApiClient.privacyPolicyUrl)
        }

        if (redirectAuthenticatedUser()) {
            return
        }

        maybeRestoreStoredSession()
    }

    private fun redirectAuthenticatedUser(): Boolean {
        return when {
            AdminSession.isLoggedIn -> {
                startAdminDestination()
                finish()
                true
            }
            UserSession.isLoggedIn -> {
                val nextIntent = PendingBookingDraftStore.draftIntent(this) ?: Intent(this, UserDashboardActivity::class.java)
                startActivity(nextIntent)
                finish()
                true
            }
            else -> false
        }
    }

    private fun maybeRestoreStoredSession() {
        if (!AppSessionStore.hasPendingSession() || restoringSession) {
            return
        }

        restoringSession = true
        setBusyState(active = true, signInLabel = "Restoring session...")

        ApiClient.validateStoredSession(
            onValid = {
                runOnUiThread {
                    restoringSession = false
                    setBusyState(active = false, signInLabel = "Sign in")
                    redirectAuthenticatedUser()
                }
            },
            onInvalid = { message ->
                runOnUiThread {
                    restoringSession = false
                    setBusyState(active = false, signInLabel = "Sign in")
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                }
            },
            onNetworkError = { message ->
                runOnUiThread {
                    restoringSession = false
                    setBusyState(active = false, signInLabel = "Sign in")
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun setBusyState(active: Boolean, signInLabel: String) {
        binding.btnSignIn.isEnabled = !active
        binding.btnGuest.isEnabled = !active
        binding.btnSignUp.isEnabled = !active
        binding.btnSignIn.text = signInLabel
    }

    private fun openExternalUrl(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) {
            Toast.makeText(this, "Unable to open link", Toast.LENGTH_LONG).show()
        }
    }

    private fun startAdminDestination() {
        val restorePath = intent.getStringExtra(EXTRA_RESTORE_ADMIN_WEB_PATH).orEmpty()
        val restoreTitle = intent.getStringExtra(EXTRA_RESTORE_ADMIN_WEB_TITLE).orEmpty()
        val restoreDashboardView = intent.getStringExtra(EXTRA_RESTORE_ADMIN_DASHBOARD_VIEW).orEmpty()
        if (restorePath.isNotBlank()) {
            startActivity(
                WebAdminActivity.intent(
                    context = this,
                    title = restoreTitle.ifBlank { "Admin" },
                    path = restorePath
                )
            )
        } else {
            val initialView = when (restoreDashboardView) {
                AdminDashboardActivity.ViewMode.ANALYTICS.name -> AdminDashboardActivity.ViewMode.ANALYTICS
                AdminDashboardActivity.ViewMode.BOOKINGS.name, "CALENDAR" -> AdminDashboardActivity.ViewMode.BOOKINGS
                else -> AdminDashboardActivity.ViewMode.OVERVIEW
            }
            startActivity(AdminDashboardActivity.intent(this, initialView = initialView))
        }
    }

    companion object {
        const val EXTRA_RESTORE_ADMIN_WEB_TITLE = "restore_admin_web_title"
        const val EXTRA_RESTORE_ADMIN_WEB_PATH = "restore_admin_web_path"
        const val EXTRA_RESTORE_ADMIN_DASHBOARD_VIEW = "restore_admin_dashboard_view"
    }
}

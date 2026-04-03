package com.brazwebdes.hairstylistbooking

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.brazwebdes.hairstylistbooking.databinding.ActivityLoginBinding

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding

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

            binding.btnSignIn.isEnabled = false
            binding.btnSignIn.text = "Signing in..."

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
                            UserSession.clear()
                            ApiClient.accessToken = access
                            ApiClient.refreshToken = refresh
                            AdminSession.isLoggedIn = true
                            AdminSession.displayName = displayName
                            AdminSession.email = userEmail
                            Toast.makeText(this, "Signed in as admin", Toast.LENGTH_SHORT).show()
                            startActivity(AdminDashboardActivity.intent(this))
                        } else {
                            AdminSession.clear()
                            ApiClient.accessToken = access
                            ApiClient.refreshToken = refresh
                            UserSession.isLoggedIn = true
                            UserSession.displayName = displayName
                            UserSession.userId = userId
                            UserSession.userEmail = userEmail
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
                        binding.btnSignIn.isEnabled = true
                        binding.btnSignIn.text = "Sign in"
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
    }
}

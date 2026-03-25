package com.example.uiprototypebeta

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.uiprototypebeta.databinding.ActivityLoginBinding

class LoginActivity : AppCompatActivity() {

    private lateinit var b: ActivityLoginBinding
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Pre-fill with seed user credentials
        b.etEmail.setText("daniel@example.com")
        b.etPassword.setText("Test1234!")

        b.btnSignIn.setOnClickListener {
            val email = b.etEmail.text?.toString()?.trim().orEmpty()
            val password = b.etPassword.text?.toString()?.trim().orEmpty()

            b.btnSignIn.isEnabled = false
            b.btnSignIn.text = "Signing in..."

            ApiClient.login(email, password,
                onSuccess = { json ->
                    val access = json.getString("access")
                    val refresh = json.getString("refresh")
                    val user = json.getJSONObject("user")
                    val userEmail = user.getString("email")
                    val userId = user.getString("id")
                    val role = user.getString("role")
                    val displayName = user.optString("display_name").ifBlank { userEmail.substringBefore("@") }

                    runOnUiThread {
                        ApiClient.accessToken = access
                        ApiClient.refreshToken = refresh

                        if (role == "ADMIN") {
                            UserSession.clear()
                            ApiClient.accessToken = access
                            ApiClient.refreshToken = refresh
                            AdminSession.isLoggedIn = true
                            Toast.makeText(this, "Signed in as admin", Toast.LENGTH_SHORT).show()
                            startActivity(Intent(this, AdminDashboardActivity::class.java))
                        } else {
                            AdminSession.clear()
                            ApiClient.accessToken = access
                            ApiClient.refreshToken = refresh
                            UserSession.isLoggedIn = true
                            UserSession.displayName = displayName
                            UserSession.userId = userId
                            UserSession.userEmail = userEmail
                            Toast.makeText(this, "Signed in as $userEmail", Toast.LENGTH_SHORT).show()
                            startActivity(Intent(this, UserDashboardActivity::class.java))
                        }
                        finish()
                    }
                },
                onError = { msg ->
                    runOnUiThread {
                        b.btnSignIn.isEnabled = true
                        b.btnSignIn.text = "Sign in"
                        Toast.makeText(this, "Login failed: $msg", Toast.LENGTH_LONG).show()
                    }
                }
            )
        }

        b.btnGuest.setOnClickListener {
            startActivity(Intent(this, HomeActivity::class.java))
        }

        b.btnSignUp.setOnClickListener {
            startActivity(Intent(this, SignUpActivity::class.java))
        }
    }
}

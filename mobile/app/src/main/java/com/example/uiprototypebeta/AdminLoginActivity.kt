package com.example.uiprototypebeta

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.uiprototypebeta.databinding.ActivityAdminLoginBinding

class AdminLoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityAdminLoginBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdminLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Pre-fill with seed admin credentials
        binding.etEmail.setText("admin@brazwebdes.com")
        binding.etPassword.setText("Admin1234!")

        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.btnAdminLogin.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()

            binding.btnAdminLogin.isEnabled = false
            binding.btnAdminLogin.text = "Signing in..."

            ApiClient.login(email, password,
                onSuccess = { json ->
                    val access = json.getString("access")
                    val refresh = json.getString("refresh")
                    val user = json.getJSONObject("user")
                    val role = user.getString("role")

                    if (role != "ADMIN") {
                        runOnUiThread {
                            binding.btnAdminLogin.isEnabled = true
                            binding.btnAdminLogin.text = "Sign in as Admin"
                            Toast.makeText(this, "This account is not an admin", Toast.LENGTH_LONG).show()
                        }
                        return@login
                    }

                    ApiClient.accessToken = access
                    ApiClient.refreshToken = refresh
                    AdminSession.isLoggedIn = true

                    runOnUiThread {
                        Toast.makeText(this, "Admin login successful!", Toast.LENGTH_SHORT).show()
                        startActivity(Intent(this, AdminDashboardActivity::class.java))
                        finish()
                    }
                },
                onError = { msg ->
                    runOnUiThread {
                        binding.btnAdminLogin.isEnabled = true
                        binding.btnAdminLogin.text = "Sign in as Admin"
                        Toast.makeText(this, "Login failed: $msg", Toast.LENGTH_LONG).show()
                    }
                }
            )
        }

        binding.btnSwitchToUser.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }
}

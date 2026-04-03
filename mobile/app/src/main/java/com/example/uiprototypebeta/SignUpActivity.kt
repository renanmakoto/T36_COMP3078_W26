package com.brazwebdes.hairstylistbooking

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.brazwebdes.hairstylistbooking.databinding.ActivitySignUpBinding

class SignUpActivity : AppCompatActivity() {
    private lateinit var binding: ActivitySignUpBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySignUpBinding.inflate(layoutInflater)
        setContentView(binding.root)
        binding.toolbar.applyStatusBarTopInset()

        binding.btnCreateAccount.setOnClickListener {
            val displayName = binding.etName.text?.toString()?.trim().orEmpty()
            val phone = binding.etPhone.text?.toString()?.trim().orEmpty()
            val email = binding.etEmail.text?.toString()?.trim().orEmpty()
            val password = binding.etPassword.text?.toString()?.trim().orEmpty()

            if (displayName.isEmpty() || phone.isEmpty() || email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill in name, phone, email, and password", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (password.length < 8) {
                Toast.makeText(this, "Password must be at least 8 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            binding.btnCreateAccount.isEnabled = false
            binding.btnCreateAccount.text = "Creating..."

            ApiClient.register(displayName, phone, email, password,
                onSuccess = {
                    runOnUiThread {
                        Toast.makeText(this, "Account created! Please sign in.", Toast.LENGTH_SHORT).show()
                        startActivity(Intent(this, LoginActivity::class.java).apply {
                            putExtra("prefill_email", email)
                        })
                        finish()
                    }
                },
                onError = { msg ->
                    runOnUiThread {
                        binding.btnCreateAccount.isEnabled = true
                        binding.btnCreateAccount.text = "Create account"
                        Toast.makeText(this, "Registration failed: $msg", Toast.LENGTH_LONG).show()
                    }
                }
            )
        }

        binding.toolbar.setNavigationOnClickListener { finish() }
        binding.btnPrivacyPolicy.setOnClickListener { openExternalUrl(ApiClient.privacyPolicyUrl) }
    }

    private fun openExternalUrl(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) {
            Toast.makeText(this, "Unable to open link", Toast.LENGTH_LONG).show()
        }
    }
}

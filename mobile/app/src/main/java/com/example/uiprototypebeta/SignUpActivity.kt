package com.example.uiprototypebeta

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.uiprototypebeta.databinding.ActivitySignUpBinding

class SignUpActivity : AppCompatActivity() {
    private lateinit var binding: ActivitySignUpBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySignUpBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnCreateAccount.setOnClickListener {
            val email = binding.etEmail.text?.toString()?.trim().orEmpty()
            val password = binding.etPassword.text?.toString()?.trim().orEmpty()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill in email and password", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (password.length < 8) {
                Toast.makeText(this, "Password must be at least 8 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            binding.btnCreateAccount.isEnabled = false
            binding.btnCreateAccount.text = "Creating..."

            ApiClient.register(email, password,
                onSuccess = {
                    runOnUiThread {
                        Toast.makeText(this, "Account created! Please sign in.", Toast.LENGTH_SHORT).show()
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
    }
}

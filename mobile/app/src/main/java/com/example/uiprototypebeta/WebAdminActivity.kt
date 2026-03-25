package com.example.uiprototypebeta

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.appbar.MaterialToolbar

class WebAdminActivity : AppCompatActivity() {

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_web_admin)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        val progress = findViewById<ProgressBar>(R.id.progressBar)
        val webView = findViewById<WebView>(R.id.webView)

        val title = intent.getStringExtra("title").orEmpty().ifBlank { "Admin" }
        val path = intent.getStringExtra("path").orEmpty().ifBlank { "/admin/dashboard" }

        toolbar.title = title
        toolbar.setNavigationOnClickListener { finish() }

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.loadsImagesAutomatically = true
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                progress.visibility = View.GONE
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
        }
        webView.loadUrl("${ApiClient.webBaseUrl}$path")
    }
}

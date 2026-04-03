package com.brazwebdes.hairstylistbooking

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.appbar.MaterialToolbar
import org.json.JSONObject

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
        var injectedSession = false

        toolbar.title = title
        toolbar.setNavigationOnClickListener { finish() }

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.loadsImagesAutomatically = true
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                progress.visibility = View.GONE
                if (!injectedSession && AdminSession.isLoggedIn && view != null) {
                    injectedSession = true
                    view.evaluateJavascript(
                        """
                        (() => {
                          localStorage.setItem('hb-access', ${jsString(ApiClient.accessToken.orEmpty())});
                          localStorage.setItem('hb-refresh', ${jsString(ApiClient.refreshToken.orEmpty())});
                          localStorage.setItem('hb-role', 'admin');
                          localStorage.setItem('hb-name', ${jsString(AdminSession.displayName.ifBlank { "Admin" })});
                          window.location.replace(${jsString("${ApiClient.webBaseUrl}$path")});
                        })();
                        """.trimIndent(),
                        null
                    )
                }
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
        }
        webView.loadUrl("${ApiClient.webBaseUrl}/login")
    }

    private fun jsString(value: String): String {
        return JSONObject.quote(value)
    }
}

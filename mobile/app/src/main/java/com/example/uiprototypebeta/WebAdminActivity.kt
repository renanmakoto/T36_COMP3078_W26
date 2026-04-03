package com.brazwebdes.hairstylistbooking

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.appbar.MaterialToolbar
import org.json.JSONObject

class WebAdminActivity : AppCompatActivity() {

    private lateinit var progressBar: ProgressBar
    private lateinit var webView: WebView

    private var injectedSession = false
    private var visitedProtectedPage = false
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null

    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = fileChooserCallback ?: return@registerForActivityResult
            fileChooserCallback = null

            val uris =
                if (result.resultCode == Activity.RESULT_OK) {
                    extractSelectedUris(result.data)
                } else {
                    null
                }
            callback.onReceiveValue(uris)
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!ensureAdminSession()) {
            return
        }

        setContentView(R.layout.activity_web_admin)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        progressBar = findViewById(R.id.progressBar)
        webView = findViewById(R.id.webView)

        val title = intent.getStringExtra(EXTRA_TITLE).orEmpty().ifBlank { "Admin" }
        val path = intent.getStringExtra(EXTRA_PATH).orEmpty().ifBlank { "/admin/dashboard" }

        toolbar.title = title
        toolbar.setNavigationOnClickListener { finish() }

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.loadsImagesAutomatically = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback

                if (filePathCallback == null || fileChooserParams == null) {
                    return false
                }

                return try {
                    filePickerLauncher.launch(buildFileChooserIntent(fileChooserParams))
                    true
                } catch (_: ActivityNotFoundException) {
                    fileChooserCallback = null
                    filePathCallback.onReceiveValue(null)
                    false
                }
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE

                if (injectedSession && visitedProtectedPage && isLoginPage(url)) {
                    returnToPrimarySignIn()
                    return
                }

                if (!injectedSession && AdminSession.isLoggedIn && view != null && isLoginPage(url)) {
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
                    return
                }

                if (injectedSession && !isLoginPage(url)) {
                    visitedProtectedPage = true
                }
            }
        }
        webView.loadUrl("${ApiClient.webBaseUrl}/login")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                }
            }
        })
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        super.onDestroy()
    }

    private fun ensureAdminSession(): Boolean {
        if (AdminSession.isLoggedIn || AppSessionStore.activatePendingAdminSession()) {
            return true
        }

        startActivity(buildRestoreLoginIntent())
        finish()
        return false
    }

    private fun isLoginPage(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val path = runCatching { Uri.parse(url).path.orEmpty() }.getOrDefault("")
        return path == "/login" || path == "/admin/login"
    }

    private fun jsString(value: String): String = JSONObject.quote(value)

    private fun buildFileChooserIntent(params: WebChromeClient.FileChooserParams): Intent {
        val mimeTypes = params.acceptTypes
            ?.flatMap { value -> value.split(',') }
            ?.map { it.trim() }
            ?.filter { it.isNotBlank() }
            ?.distinct()
            ?.toTypedArray()
            ?: emptyArray()

        val primaryType = when {
            mimeTypes.isEmpty() -> "image/*"
            mimeTypes.size == 1 -> mimeTypes.first()
            else -> "*/*"
        }

        return Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = primaryType
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE)
            if (mimeTypes.size > 1) {
                putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
            }
        }
    }

    private fun extractSelectedUris(data: Intent?): Array<Uri>? {
        if (data == null) return null

        val clipData: ClipData? = data.clipData
        if (clipData != null && clipData.itemCount > 0) {
            return Array(clipData.itemCount) { index -> clipData.getItemAt(index).uri }
        }

        return data.data?.let { arrayOf(it) }
    }

    private fun returnToPrimarySignIn() {
        AppSessionStore.clear(this)
        startActivity(buildRestoreLoginIntent())
        finish()
    }

    private fun buildRestoreLoginIntent(): Intent {
        return Intent(this, LoginActivity::class.java).apply {
            putExtra(LoginActivity.EXTRA_RESTORE_ADMIN_WEB_TITLE, intent.getStringExtra(EXTRA_TITLE).orEmpty())
            putExtra(LoginActivity.EXTRA_RESTORE_ADMIN_WEB_PATH, intent.getStringExtra(EXTRA_PATH).orEmpty())
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
    }

    companion object {
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_PATH = "path"

        fun intent(
            context: Context,
            title: String,
            path: String
        ): Intent {
            return Intent(context, WebAdminActivity::class.java).apply {
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_PATH, path)
            }
        }
    }
}

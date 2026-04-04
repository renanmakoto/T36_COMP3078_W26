package com.brazwebdes.hairstylistbooking

import android.net.Uri
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.widget.doAfterTextChanged
import coil.load
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import org.json.JSONObject

class AdminPortfolioManageActivity : BaseDrawerActivity() {

    private lateinit var tvNotice: TextView
    private lateinit var tvFormTitle: TextView
    private lateinit var etTitle: TextInputEditText
    private lateinit var etSubtitle: TextInputEditText
    private lateinit var etTag: TextInputEditText
    private lateinit var etHomeOrder: TextInputEditText
    private lateinit var etImageUrl: TextInputEditText
    private lateinit var tvImageUploadState: TextView
    private lateinit var ivPreview: ImageView
    private lateinit var etDescription: TextInputEditText
    private lateinit var cbPublished: android.widget.CheckBox
    private lateinit var cbFeatured: android.widget.CheckBox
    private lateinit var btnUploadImage: MaterialButton
    private lateinit var btnSave: MaterialButton
    private lateinit var btnCancelEdit: MaterialButton
    private lateinit var llAdminList: LinearLayout

    private var entries: List<AdminPortfolioEntry> = emptyList()
    private var editingId: String? = null

    private val imagePicker = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            uploadImage(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!requireAdminSession()) {
            return
        }

        setContentLayout(R.layout.content_admin_portfolio_manage)
        setToolbarTitle("Admin Portfolio")
        setCheckedDrawerItem(R.id.m_admin)
        showLogoutOption(true)
        updateUserFooterLabel()

        bindViews()
        bindInteractions()
        resetForm()
        loadData()
    }

    override fun onResume() {
        super.onResume()
        if (requireAdminSession()) {
            loadData()
        }
    }

    private fun bindViews() {
        tvNotice = findViewById(R.id.tvPortfolioNotice)
        tvFormTitle = findViewById(R.id.tvPortfolioFormTitle)
        etTitle = findViewById(R.id.etPortfolioTitle)
        etSubtitle = findViewById(R.id.etPortfolioSubtitle)
        etTag = findViewById(R.id.etPortfolioTag)
        etHomeOrder = findViewById(R.id.etPortfolioHomeOrder)
        etImageUrl = findViewById(R.id.etPortfolioImageUrl)
        tvImageUploadState = findViewById(R.id.tvPortfolioImageUploadState)
        ivPreview = findViewById(R.id.ivPortfolioPreview)
        etDescription = findViewById(R.id.etPortfolioDescription)
        cbPublished = findViewById(R.id.cbPortfolioPublished)
        cbFeatured = findViewById(R.id.cbPortfolioFeatured)
        btnUploadImage = findViewById(R.id.btnUploadPortfolioImage)
        btnSave = findViewById(R.id.btnSavePortfolio)
        btnCancelEdit = findViewById(R.id.btnCancelPortfolioEdit)
        llAdminList = findViewById(R.id.llPortfolioAdminList)
    }

    private fun bindInteractions() {
        btnUploadImage.setOnClickListener { imagePicker.launch("image/*") }
        btnSave.setOnClickListener { submit() }
        btnCancelEdit.setOnClickListener { resetForm() }
        etImageUrl.doAfterTextChanged { updatePreview(it?.toString().orEmpty()) }
    }

    private fun loadData() {
        ApiClient.getAdminPortfolioItems(
            onSuccess = { array ->
                runOnUiThread {
                    entries = array.toAdminPortfolioEntries()
                    renderList()
                }
            },
            onError = { message ->
                runOnUiThread {
                    showNotice("Failed to load portfolio items: $message", isError = true)
                }
            }
        )
    }

    private fun uploadImage(uri: Uri) {
        val upload = readUploadContent(uri)
        if (upload == null) {
            showNotice("Failed to read the selected image.", isError = true)
            return
        }

        btnUploadImage.isEnabled = false
        btnSave.isEnabled = false
        tvImageUploadState.text = "Uploading ${upload.fileName}..."

        ApiClient.uploadAdminImage(
            fileName = upload.fileName,
            contentType = upload.mimeType,
            bytes = upload.bytes,
            kind = "portfolio",
            onSuccess = { json ->
                runOnUiThread {
                    val result = json.toAdminImageUploadResult()
                    btnUploadImage.isEnabled = true
                    btnSave.isEnabled = true
                    etImageUrl.setText(result.url)
                    tvImageUploadState.text = "Image uploaded."
                    showNotice("Portfolio image uploaded.")
                }
            },
            onError = { message ->
                runOnUiThread {
                    btnUploadImage.isEnabled = true
                    btnSave.isEnabled = true
                    tvImageUploadState.text = "Upload failed."
                    showNotice("Failed to upload image: $message", isError = true)
                }
            }
        )
    }

    private fun submit() {
        val title = etTitle.fieldValue()
        if (title.isBlank()) {
            showNotice("Title is required.", isError = true)
            return
        }

        val payload = JSONObject().apply {
            put("title", title)
            put("subtitle", etSubtitle.fieldValue())
            put("tag", etTag.fieldValue())
            put("image_url", etImageUrl.fieldValue())
            put("description", etDescription.fieldValue())
            put("is_published", cbPublished.isChecked)
            put("is_featured_home", cbFeatured.isChecked)
            put("home_order", etHomeOrder.fieldValue().toIntOrNull() ?: 0)
        }

        btnSave.isEnabled = false
        btnSave.text = if (editingId == null) "Creating..." else "Saving..."

        val onSuccess: (JSONObject) -> Unit = {
            runOnUiThread {
                btnSave.isEnabled = true
                btnSave.text = if (editingId == null) "Create portfolio item" else "Save portfolio item"
                showNotice(if (editingId == null) "Portfolio item created." else "Portfolio item updated.")
                resetForm()
                loadData()
            }
        }
        val onError: (String) -> Unit = { message ->
            runOnUiThread {
                btnSave.isEnabled = true
                btnSave.text = if (editingId == null) "Create portfolio item" else "Save portfolio item"
                showNotice("Failed to save portfolio item: $message", isError = true)
            }
        }

        val currentId = editingId
        if (currentId == null) {
            ApiClient.createAdminPortfolioItem(payload, onSuccess = onSuccess, onError = onError)
        } else {
            ApiClient.updateAdminPortfolioItem(currentId, payload, onSuccess = onSuccess, onError = onError)
        }
    }

    private fun resetForm() {
        editingId = null
        tvFormTitle.text = "Create portfolio item"
        etTitle.setText("")
        etSubtitle.setText("")
        etTag.setText("")
        etHomeOrder.setText("0")
        etImageUrl.setText("")
        etDescription.setText("")
        cbPublished.isChecked = true
        cbFeatured.isChecked = false
        btnSave.text = "Create portfolio item"
        btnCancelEdit.visibility = View.GONE
        tvImageUploadState.text = "Use a URL or upload from this device."
        updatePreview("")
    }

    private fun startEdit(item: AdminPortfolioEntry) {
        editingId = item.id
        tvFormTitle.text = "Edit portfolio item"
        etTitle.setText(item.title)
        etSubtitle.setText(item.subtitle)
        etTag.setText(item.tag)
        etHomeOrder.setText(item.homeOrder.toString())
        etImageUrl.setText(item.imageUrl)
        etDescription.setText(item.description)
        cbPublished.isChecked = item.isPublished
        cbFeatured.isChecked = item.isFeaturedHome
        btnSave.text = "Save portfolio item"
        btnCancelEdit.visibility = View.VISIBLE
        tvImageUploadState.text = "Editing ${item.title}"
        updatePreview(item.imageUrl)
    }

    private fun renderList() {
        llAdminList.removeAllViews()
        if (entries.isEmpty()) {
            llAdminList.addView(buildEmptyCard("No portfolio items yet."))
            return
        }

        entries.sortedWith(compareByDescending<AdminPortfolioEntry> { it.isPublished }.thenBy { it.homeOrder }).forEach { item ->
            llAdminList.addView(
                buildCard(
                    title = item.title,
                    subtitle = "${item.subtitle.ifBlank { "No subtitle" }} / ${item.tag.ifBlank { "No tag" }}",
                    meta = buildMeta(item),
                    buttons = listOf(
                        "Edit" to { startEdit(item) },
                        "Delete" to { confirmDelete(item) },
                    )
                )
            )
        }
    }

    private fun confirmDelete(item: AdminPortfolioEntry) {
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete portfolio item?")
            .setMessage("Delete \"${item.title}\"?")
            .setNegativeButton("Keep", null)
            .setPositiveButton("Delete") { _, _ ->
                ApiClient.deleteAdminPortfolioItem(
                    item.id,
                    onSuccess = {
                        runOnUiThread {
                            if (editingId == item.id) {
                                resetForm()
                            }
                            showNotice("Portfolio item deleted.")
                            loadData()
                        }
                    },
                    onError = { message ->
                        runOnUiThread {
                            showNotice("Failed to delete portfolio item: $message", isError = true)
                        }
                    }
                )
            }
            .show()
    }

    private fun buildMeta(item: AdminPortfolioEntry): String {
        val parts = mutableListOf<String>()
        parts += if (item.isPublished) "Published" else "Draft"
        if (item.isFeaturedHome) parts += "Featured"
        parts += "Home ${item.homeOrder}"
        return parts.joinToString(" / ")
    }

    private fun updatePreview(url: String) {
        if (url.isBlank()) {
            ivPreview.setImageDrawable(null)
            ivPreview.setBackgroundResource(R.drawable.bg_placeholder)
        } else {
            ivPreview.load(url)
        }
    }

    private fun showNotice(message: String, isError: Boolean = false) {
        if (message.isBlank()) {
            tvNotice.visibility = View.GONE
            tvNotice.text = ""
            return
        }
        tvNotice.visibility = View.VISIBLE
        tvNotice.text = message
        tvNotice.setTextColor(
            ContextCompat.getColor(
                this,
                if (isError) android.R.color.holo_red_dark else R.color.brand_text
            )
        )
    }

    private fun buildEmptyCard(message: String): View {
        return MaterialCardView(this).apply {
            radius = dp(18).toFloat()
            setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
            cardElevation = 0f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(10)
            }
            addView(TextView(context).apply {
                text = message
                setPadding(dp(16), dp(16), dp(16), dp(16))
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
            })
        }
    }

    private fun buildCard(
        title: String,
        subtitle: String,
        meta: String,
        buttons: List<Pair<String, () -> Unit>>,
    ): View {
        return MaterialCardView(this).apply {
            radius = dp(20).toFloat()
            cardElevation = 0f
            strokeWidth = dp(1)
            strokeColor = ContextCompat.getColor(context, R.color.card_stroke)
            setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(10)
            }
            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(16), dp(16), dp(16), dp(16))

                addView(TextView(context).apply {
                    text = title
                    setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                })
                addView(TextView(context).apply {
                    text = subtitle
                    setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    setPadding(0, dp(4), 0, 0)
                })
                addView(TextView(context).apply {
                    text = meta
                    setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    setPadding(0, dp(8), 0, 0)
                })

                addView(LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.END
                    setPadding(0, dp(12), 0, 0)
                    buttons.forEachIndexed { index, pair ->
                        addView(MaterialButton(context, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
                            text = pair.first
                            isAllCaps = false
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.WRAP_CONTENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply {
                                if (index > 0) marginStart = dp(8)
                            }
                            setOnClickListener { pair.second.invoke() }
                        })
                    }
                })
            })
        }
    }

    private fun TextInputEditText.fieldValue(): String = text?.toString()?.trim().orEmpty()
}

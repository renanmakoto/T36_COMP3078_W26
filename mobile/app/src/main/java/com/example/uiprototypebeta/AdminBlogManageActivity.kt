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
import org.json.JSONArray
import org.json.JSONObject

class AdminBlogManageActivity : BaseDrawerActivity() {

    private lateinit var tvNotice: TextView
    private lateinit var tvFormTitle: TextView
    private lateinit var etTitle: TextInputEditText
    private lateinit var etSlug: TextInputEditText
    private lateinit var etExcerpt: TextInputEditText
    private lateinit var etCoverImageUrl: TextInputEditText
    private lateinit var tvImageUploadState: TextView
    private lateinit var ivPreview: ImageView
    private lateinit var etBody: TextInputEditText
    private lateinit var etTags: TextInputEditText
    private lateinit var etHomeOrder: TextInputEditText
    private lateinit var cbPublished: android.widget.CheckBox
    private lateinit var cbFeatured: android.widget.CheckBox
    private lateinit var btnUploadImage: MaterialButton
    private lateinit var btnSave: MaterialButton
    private lateinit var btnCancelEdit: MaterialButton
    private lateinit var llAdminList: LinearLayout

    private var entries: List<AdminBlogEntry> = emptyList()
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

        setContentLayout(R.layout.content_admin_blog_manage)
        setToolbarTitle("Admin Blog")
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
        tvNotice = findViewById(R.id.tvBlogNotice)
        tvFormTitle = findViewById(R.id.tvBlogFormTitle)
        etTitle = findViewById(R.id.etBlogTitle)
        etSlug = findViewById(R.id.etBlogSlug)
        etExcerpt = findViewById(R.id.etBlogExcerpt)
        etCoverImageUrl = findViewById(R.id.etBlogCoverImageUrl)
        tvImageUploadState = findViewById(R.id.tvBlogImageUploadState)
        ivPreview = findViewById(R.id.ivBlogPreview)
        etBody = findViewById(R.id.etBlogBody)
        etTags = findViewById(R.id.etBlogTags)
        etHomeOrder = findViewById(R.id.etBlogHomeOrder)
        cbPublished = findViewById(R.id.cbBlogPublished)
        cbFeatured = findViewById(R.id.cbBlogFeatured)
        btnUploadImage = findViewById(R.id.btnUploadBlogImage)
        btnSave = findViewById(R.id.btnSaveBlog)
        btnCancelEdit = findViewById(R.id.btnCancelBlogEdit)
        llAdminList = findViewById(R.id.llBlogAdminList)
    }

    private fun bindInteractions() {
        btnUploadImage.setOnClickListener { imagePicker.launch("image/*") }
        btnSave.setOnClickListener { submit() }
        btnCancelEdit.setOnClickListener { resetForm() }
        etCoverImageUrl.doAfterTextChanged { updatePreview(it?.toString().orEmpty()) }
    }

    private fun loadData() {
        ApiClient.getAdminBlogPosts(
            onSuccess = { array ->
                runOnUiThread {
                    entries = array.toAdminBlogEntries()
                    renderList()
                }
            },
            onError = { message ->
                runOnUiThread {
                    showNotice("Failed to load blog posts: $message", isError = true)
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
            kind = "blog",
            onSuccess = { json ->
                runOnUiThread {
                    val result = json.toAdminImageUploadResult()
                    btnUploadImage.isEnabled = true
                    btnSave.isEnabled = true
                    etCoverImageUrl.setText(result.url)
                    tvImageUploadState.text = "Image uploaded."
                    showNotice("Cover image uploaded.")
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
        val body = etBody.fieldValue()
        if (title.isBlank() || body.isBlank()) {
            showNotice("Title and body are required.", isError = true)
            return
        }

        val payload = JSONObject().apply {
            put("title", title)
            put("slug", etSlug.fieldValue())
            put("excerpt", etExcerpt.fieldValue())
            put("body", body)
            put("cover_image_url", etCoverImageUrl.fieldValue())
            put("tags", JSONArray(parseTags(etTags.fieldValue())))
            put("is_published", cbPublished.isChecked)
            put("is_featured_home", cbFeatured.isChecked)
            put("home_order", etHomeOrder.fieldValue().toIntOrNull() ?: 0)
        }

        btnSave.isEnabled = false
        btnSave.text = if (editingId == null) "Creating..." else "Saving..."

        val onSuccess: (JSONObject) -> Unit = {
            runOnUiThread {
                btnSave.isEnabled = true
                btnSave.text = if (editingId == null) "Create post" else "Save post"
                showNotice(if (editingId == null) "Blog post created." else "Blog post updated.")
                resetForm()
                loadData()
            }
        }
        val onError: (String) -> Unit = { message ->
            runOnUiThread {
                btnSave.isEnabled = true
                btnSave.text = if (editingId == null) "Create post" else "Save post"
                showNotice("Failed to save blog post: $message", isError = true)
            }
        }

        val currentId = editingId
        if (currentId == null) {
            ApiClient.createAdminBlogPost(payload, onSuccess = onSuccess, onError = onError)
        } else {
            ApiClient.updateAdminBlogPost(currentId, payload, onSuccess = onSuccess, onError = onError)
        }
    }

    private fun resetForm() {
        editingId = null
        tvFormTitle.text = "Create post"
        etTitle.setText("")
        etSlug.setText("")
        etExcerpt.setText("")
        etCoverImageUrl.setText("")
        etBody.setText("")
        etTags.setText("")
        etHomeOrder.setText("0")
        cbPublished.isChecked = true
        cbFeatured.isChecked = false
        btnSave.text = "Create post"
        btnCancelEdit.visibility = View.GONE
        tvImageUploadState.text = "Use a URL or upload from this device."
        updatePreview("")
    }

    private fun startEdit(item: AdminBlogEntry) {
        editingId = item.id
        tvFormTitle.text = "Edit post"
        etTitle.setText(item.title)
        etSlug.setText(item.slug)
        etExcerpt.setText(item.excerpt)
        etCoverImageUrl.setText(item.coverImageUrl)
        etBody.setText(item.body)
        etTags.setText(item.tags.joinToString(", "))
        etHomeOrder.setText(item.homeOrder.toString())
        cbPublished.isChecked = item.isPublished
        cbFeatured.isChecked = item.isFeaturedHome
        btnSave.text = "Save post"
        btnCancelEdit.visibility = View.VISIBLE
        tvImageUploadState.text = "Editing ${item.title}"
        updatePreview(item.coverImageUrl)
    }

    private fun renderList() {
        llAdminList.removeAllViews()
        if (entries.isEmpty()) {
            llAdminList.addView(buildEmptyCard("No blog posts yet."))
            return
        }

        entries.sortedWith(compareByDescending<AdminBlogEntry> { it.isPublished }.thenBy { it.homeOrder }).forEach { item ->
            llAdminList.addView(
                buildCard(
                    title = item.title,
                    subtitle = "${item.excerpt.ifBlank { "No excerpt" }} / ${if (item.tags.isEmpty()) "No tags" else item.tags.joinToString(", ")}",
                    meta = buildMeta(item),
                    buttons = listOf(
                        "Edit" to { startEdit(item) },
                        "Delete" to { confirmDelete(item) },
                    )
                )
            )
        }
    }

    private fun confirmDelete(item: AdminBlogEntry) {
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete blog post?")
            .setMessage("Delete \"${item.title}\"?")
            .setNegativeButton("Keep", null)
            .setPositiveButton("Delete") { _, _ ->
                ApiClient.deleteAdminBlogPost(
                    item.id,
                    onSuccess = {
                        runOnUiThread {
                            if (editingId == item.id) {
                                resetForm()
                            }
                            showNotice("Blog post deleted.")
                            loadData()
                        }
                    },
                    onError = { message ->
                        runOnUiThread {
                            showNotice("Failed to delete blog post: $message", isError = true)
                        }
                    }
                )
            }
            .show()
    }

    private fun buildMeta(item: AdminBlogEntry): String {
        val parts = mutableListOf<String>()
        parts += if (item.isPublished) "Published" else "Draft"
        if (item.isFeaturedHome) parts += "Featured"
        parts += "Slug ${item.slug.ifBlank { "auto" }}"
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

    private fun parseTags(raw: String): List<String> {
        return raw.split(",").map { it.trim() }.filter { it.isNotEmpty() }
    }

    private fun TextInputEditText.fieldValue(): String = text?.toString()?.trim().orEmpty()
}

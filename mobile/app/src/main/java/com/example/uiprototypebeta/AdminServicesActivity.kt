package com.brazwebdes.hairstylistbooking

import android.net.Uri
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.CheckBox
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

class AdminServicesActivity : BaseDrawerActivity() {

    private lateinit var tvNotice: TextView
    private lateinit var tvServiceFormTitle: TextView
    private lateinit var etServiceName: TextInputEditText
    private lateinit var etServiceDescription: TextInputEditText
    private lateinit var etServiceImageUrl: TextInputEditText
    private lateinit var tvServiceImageUploadState: TextView
    private lateinit var ivServicePreview: ImageView
    private lateinit var etServicePaymentNote: TextInputEditText
    private lateinit var etServicePrice: TextInputEditText
    private lateinit var etServiceDuration: TextInputEditText
    private lateinit var etServiceSortOrder: TextInputEditText
    private lateinit var etServiceHomeOrder: TextInputEditText
    private lateinit var cbServiceActive: CheckBox
    private lateinit var cbServiceFeaturedHome: CheckBox
    private lateinit var llServiceAddOnChoices: LinearLayout
    private lateinit var btnUploadServiceImage: MaterialButton
    private lateinit var btnSaveService: MaterialButton
    private lateinit var btnCancelServiceEdit: MaterialButton
    private lateinit var llServicesAdminList: LinearLayout

    private lateinit var tvAddOnFormTitle: TextView
    private lateinit var etAddOnName: TextInputEditText
    private lateinit var etAddOnDescription: TextInputEditText
    private lateinit var etAddOnCategory: TextInputEditText
    private lateinit var etAddOnPrice: TextInputEditText
    private lateinit var etAddOnDuration: TextInputEditText
    private lateinit var etAddOnSortOrder: TextInputEditText
    private lateinit var cbAddOnActive: CheckBox
    private lateinit var llAddOnServiceChoices: LinearLayout
    private lateinit var btnSaveAddOn: MaterialButton
    private lateinit var btnCancelAddOnEdit: MaterialButton
    private lateinit var llAddOnsAdminList: LinearLayout

    private var services: List<AdminServiceEntry> = emptyList()
    private var addOns: List<AdminAddOnEntry> = emptyList()
    private var editingServiceId: String? = null
    private var editingAddOnId: String? = null
    private var serviceImageUploading = false
    private val selectedServiceAddOnIds = linkedSetOf<String>()
    private val selectedAddOnServiceIds = linkedSetOf<String>()

    private val imagePicker = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            uploadServiceImage(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!requireAdminSession()) {
            return
        }

        setContentLayout(R.layout.content_admin_services)
        setToolbarTitle("Admin Services")
        setCheckedDrawerItem(R.id.m_admin)
        showLogoutOption(true)
        updateUserFooterLabel()

        bindViews()
        bindInteractions()
        resetServiceForm()
        resetAddOnForm()
        loadData()
    }

    override fun onResume() {
        super.onResume()
        if (requireAdminSession()) {
            loadData()
        }
    }

    private fun bindViews() {
        tvNotice = findViewById(R.id.tvNotice)
        tvServiceFormTitle = findViewById(R.id.tvServiceFormTitle)
        etServiceName = findViewById(R.id.etServiceName)
        etServiceDescription = findViewById(R.id.etServiceDescription)
        etServiceImageUrl = findViewById(R.id.etServiceImageUrl)
        tvServiceImageUploadState = findViewById(R.id.tvServiceImageUploadState)
        ivServicePreview = findViewById(R.id.ivServicePreview)
        etServicePaymentNote = findViewById(R.id.etServicePaymentNote)
        etServicePrice = findViewById(R.id.etServicePrice)
        etServiceDuration = findViewById(R.id.etServiceDuration)
        etServiceSortOrder = findViewById(R.id.etServiceSortOrder)
        etServiceHomeOrder = findViewById(R.id.etServiceHomeOrder)
        cbServiceActive = findViewById(R.id.cbServiceActive)
        cbServiceFeaturedHome = findViewById(R.id.cbServiceFeaturedHome)
        llServiceAddOnChoices = findViewById(R.id.llServiceAddOnChoices)
        btnUploadServiceImage = findViewById(R.id.btnUploadServiceImage)
        btnSaveService = findViewById(R.id.btnSaveService)
        btnCancelServiceEdit = findViewById(R.id.btnCancelServiceEdit)
        llServicesAdminList = findViewById(R.id.llServicesAdminList)

        tvAddOnFormTitle = findViewById(R.id.tvAddOnFormTitle)
        etAddOnName = findViewById(R.id.etAddOnName)
        etAddOnDescription = findViewById(R.id.etAddOnDescription)
        etAddOnCategory = findViewById(R.id.etAddOnCategory)
        etAddOnPrice = findViewById(R.id.etAddOnPrice)
        etAddOnDuration = findViewById(R.id.etAddOnDuration)
        etAddOnSortOrder = findViewById(R.id.etAddOnSortOrder)
        cbAddOnActive = findViewById(R.id.cbAddOnActive)
        llAddOnServiceChoices = findViewById(R.id.llAddOnServiceChoices)
        btnSaveAddOn = findViewById(R.id.btnSaveAddOn)
        btnCancelAddOnEdit = findViewById(R.id.btnCancelAddOnEdit)
        llAddOnsAdminList = findViewById(R.id.llAddOnsAdminList)
    }

    private fun bindInteractions() {
        btnUploadServiceImage.setOnClickListener { imagePicker.launch("image/*") }
        btnSaveService.setOnClickListener { submitService() }
        btnCancelServiceEdit.setOnClickListener { resetServiceForm() }
        btnSaveAddOn.setOnClickListener { submitAddOn() }
        btnCancelAddOnEdit.setOnClickListener { resetAddOnForm() }
        etServiceImageUrl.doAfterTextChanged { updateServicePreview(it?.toString().orEmpty()) }
    }

    private fun loadData() {
        ApiClient.getAdminServices(
            onSuccess = { array ->
                val loadedServices = array.toAdminServices()
                ApiClient.getAdminAddOns(
                    onSuccess = { addOnArray ->
                        runOnUiThread {
                            services = loadedServices
                            addOns = addOnArray.toAdminAddOns()
                            renderServiceAddOnChoices()
                            renderAddOnServiceChoices()
                            renderServicesList()
                            renderAddOnsList()
                        }
                    },
                    onError = { message ->
                        runOnUiThread {
                            showNotice("Failed to load add-ons: $message", isError = true)
                        }
                    }
                )
            },
            onError = { message ->
                runOnUiThread {
                    showNotice("Failed to load services: $message", isError = true)
                }
            }
        )
    }

    private fun uploadServiceImage(uri: Uri) {
        val upload = readUploadContent(uri)
        if (upload == null) {
            showNotice("Failed to read the selected image.", isError = true)
            return
        }

        serviceImageUploading = true
        btnSaveService.isEnabled = false
        btnUploadServiceImage.isEnabled = false
        tvServiceImageUploadState.text = "Uploading ${upload.fileName}..."

        ApiClient.uploadAdminImage(
            fileName = upload.fileName,
            contentType = upload.mimeType,
            bytes = upload.bytes,
            kind = "service",
            onSuccess = { json ->
                runOnUiThread {
                    serviceImageUploading = false
                    btnSaveService.isEnabled = true
                    btnUploadServiceImage.isEnabled = true
                    val result = json.toAdminImageUploadResult()
                    etServiceImageUrl.setText(result.url)
                    tvServiceImageUploadState.text = "Image uploaded."
                    showNotice("Service image uploaded.")
                }
            },
            onError = { message ->
                runOnUiThread {
                    serviceImageUploading = false
                    btnSaveService.isEnabled = true
                    btnUploadServiceImage.isEnabled = true
                    tvServiceImageUploadState.text = "Upload failed."
                    showNotice("Failed to upload image: $message", isError = true)
                }
            }
        )
    }

    private fun submitService() {
        val name = etServiceName.fieldValue()
        val description = etServiceDescription.fieldValue()
        val imageUrl = etServiceImageUrl.fieldValue()
        val paymentNote = etServicePaymentNote.fieldValue()
        val priceDollars = etServicePrice.fieldValue().toDoubleOrNull()
        val durationMinutes = etServiceDuration.fieldValue().toIntOrNull()
        val sortOrder = etServiceSortOrder.fieldValue().toIntOrNull() ?: 0
        val homeOrder = etServiceHomeOrder.fieldValue().toIntOrNull() ?: 0

        if (name.isBlank()) {
            showNotice("Service name is required.", isError = true)
            return
        }
        if (priceDollars == null || durationMinutes == null) {
            showNotice("Price and duration must be valid numbers.", isError = true)
            return
        }

        val payload = JSONObject().apply {
            put("name", name)
            put("description", description)
            put("image_url", imageUrl)
            put("payment_note", paymentNote)
            put("duration_minutes", durationMinutes)
            put("price_cents", (priceDollars * 100).toInt())
            put("sort_order", sortOrder)
            put("is_featured_home", cbServiceFeaturedHome.isChecked)
            put("home_order", homeOrder)
            put("is_active", cbServiceActive.isChecked)
            put("add_on_ids", JSONArray(selectedServiceAddOnIds.toList()))
        }

        btnSaveService.isEnabled = false
        btnSaveService.text = if (editingServiceId == null) "Creating..." else "Saving..."

        val onSuccess: (JSONObject) -> Unit = {
            runOnUiThread {
                btnSaveService.isEnabled = true
                btnSaveService.text = if (editingServiceId == null) "Create service" else "Save service"
                showNotice(if (editingServiceId == null) "Service created." else "Service updated.")
                resetServiceForm()
                loadData()
            }
        }
        val onError: (String) -> Unit = { message ->
            runOnUiThread {
                btnSaveService.isEnabled = true
                btnSaveService.text = if (editingServiceId == null) "Create service" else "Save service"
                showNotice("Failed to save service: $message", isError = true)
            }
        }

        val serviceId = editingServiceId
        if (serviceId == null) {
            ApiClient.createAdminService(payload, onSuccess = onSuccess, onError = onError)
        } else {
            ApiClient.updateAdminService(serviceId, payload, onSuccess = onSuccess, onError = onError)
        }
    }

    private fun submitAddOn() {
        val name = etAddOnName.fieldValue()
        val description = etAddOnDescription.fieldValue()
        val category = etAddOnCategory.fieldValue()
        val priceDollars = etAddOnPrice.fieldValue().toDoubleOrNull()
        val durationMinutes = etAddOnDuration.fieldValue().toIntOrNull()
        val sortOrder = etAddOnSortOrder.fieldValue().toIntOrNull() ?: 0

        if (name.isBlank()) {
            showNotice("Add-on name is required.", isError = true)
            return
        }
        if (priceDollars == null || durationMinutes == null) {
            showNotice("Add-on price and duration must be valid numbers.", isError = true)
            return
        }

        val payload = JSONObject().apply {
            put("name", name)
            put("description", description)
            put("category", category)
            put("price_cents", (priceDollars * 100).toInt())
            put("duration_minutes", durationMinutes)
            put("sort_order", sortOrder)
            put("is_active", cbAddOnActive.isChecked)
            put("service_ids", JSONArray(selectedAddOnServiceIds.toList()))
        }

        btnSaveAddOn.isEnabled = false
        btnSaveAddOn.text = if (editingAddOnId == null) "Creating..." else "Saving..."

        val onSuccess: (JSONObject) -> Unit = {
            runOnUiThread {
                btnSaveAddOn.isEnabled = true
                btnSaveAddOn.text = if (editingAddOnId == null) "Create add-on" else "Save add-on"
                showNotice(if (editingAddOnId == null) "Add-on created." else "Add-on updated.")
                resetAddOnForm()
                loadData()
            }
        }
        val onError: (String) -> Unit = { message ->
            runOnUiThread {
                btnSaveAddOn.isEnabled = true
                btnSaveAddOn.text = if (editingAddOnId == null) "Create add-on" else "Save add-on"
                showNotice("Failed to save add-on: $message", isError = true)
            }
        }

        val addOnId = editingAddOnId
        if (addOnId == null) {
            ApiClient.createAdminAddOn(payload, onSuccess = onSuccess, onError = onError)
        } else {
            ApiClient.updateAdminAddOn(addOnId, payload, onSuccess = onSuccess, onError = onError)
        }
    }

    private fun resetServiceForm() {
        editingServiceId = null
        selectedServiceAddOnIds.clear()
        tvServiceFormTitle.text = "Create service"
        etServiceName.setText("")
        etServiceDescription.setText("")
        etServiceImageUrl.setText("")
        etServicePaymentNote.setText("")
        etServicePrice.setText("50.00")
        etServiceDuration.setText("45")
        etServiceSortOrder.setText("0")
        etServiceHomeOrder.setText("0")
        cbServiceActive.isChecked = true
        cbServiceFeaturedHome.isChecked = false
        btnSaveService.text = "Create service"
        btnCancelServiceEdit.visibility = View.GONE
        tvServiceImageUploadState.text = "Use a URL or upload from this device."
        updateServicePreview("")
        renderServiceAddOnChoices()
    }

    private fun resetAddOnForm() {
        editingAddOnId = null
        selectedAddOnServiceIds.clear()
        tvAddOnFormTitle.text = "Create add-on"
        etAddOnName.setText("")
        etAddOnDescription.setText("")
        etAddOnCategory.setText("Enhancement")
        etAddOnPrice.setText("5.00")
        etAddOnDuration.setText("10")
        etAddOnSortOrder.setText("0")
        cbAddOnActive.isChecked = true
        btnSaveAddOn.text = "Create add-on"
        btnCancelAddOnEdit.visibility = View.GONE
        renderAddOnServiceChoices()
    }

    private fun startEditService(item: AdminServiceEntry) {
        editingServiceId = item.id
        selectedServiceAddOnIds.clear()
        selectedServiceAddOnIds.addAll(item.availableAddOns.map { it.id })
        tvServiceFormTitle.text = "Edit service"
        etServiceName.setText(item.name)
        etServiceDescription.setText(item.description)
        etServiceImageUrl.setText(item.imageUrl)
        etServicePaymentNote.setText(item.paymentNote)
        etServicePrice.setText(String.format("%.2f", item.priceCents / 100.0))
        etServiceDuration.setText(item.durationMinutes.toString())
        etServiceSortOrder.setText(item.sortOrder.toString())
        etServiceHomeOrder.setText(item.homeOrder.toString())
        cbServiceActive.isChecked = item.isActive
        cbServiceFeaturedHome.isChecked = item.isFeaturedHome
        btnSaveService.text = "Save service"
        btnCancelServiceEdit.visibility = View.VISIBLE
        tvServiceImageUploadState.text = "Editing ${item.name}"
        updateServicePreview(item.imageUrl)
        renderServiceAddOnChoices()
    }

    private fun startEditAddOn(item: AdminAddOnEntry) {
        editingAddOnId = item.id
        selectedAddOnServiceIds.clear()
        selectedAddOnServiceIds.addAll(item.services.map { it.id })
        tvAddOnFormTitle.text = "Edit add-on"
        etAddOnName.setText(item.name)
        etAddOnDescription.setText(item.description)
        etAddOnCategory.setText(item.category)
        etAddOnPrice.setText(String.format("%.2f", item.priceCents / 100.0))
        etAddOnDuration.setText(item.durationMinutes.toString())
        etAddOnSortOrder.setText(item.sortOrder.toString())
        cbAddOnActive.isChecked = item.isActive
        btnSaveAddOn.text = "Save add-on"
        btnCancelAddOnEdit.visibility = View.VISIBLE
        renderAddOnServiceChoices()
    }

    private fun renderServiceAddOnChoices() {
        llServiceAddOnChoices.removeAllViews()
        if (addOns.isEmpty()) {
            llServiceAddOnChoices.addView(buildEmptyCard("No add-ons available yet."))
            return
        }
        addOns.sortedBy { it.sortOrder }.forEach { addOn ->
            llServiceAddOnChoices.addView(CheckBox(this).apply {
                text = "${addOn.name} / +${formatMoney(addOn.priceCents)} / +${addOn.durationMinutes} min"
                isChecked = selectedServiceAddOnIds.contains(addOn.id)
                setOnCheckedChangeListener { _, checked ->
                    if (checked) selectedServiceAddOnIds.add(addOn.id) else selectedServiceAddOnIds.remove(addOn.id)
                }
            })
        }
    }

    private fun renderAddOnServiceChoices() {
        llAddOnServiceChoices.removeAllViews()
        if (services.isEmpty()) {
            llAddOnServiceChoices.addView(buildEmptyCard("No services available yet."))
            return
        }
        services.sortedBy { it.sortOrder }.forEach { service ->
            llAddOnServiceChoices.addView(CheckBox(this).apply {
                text = "${service.name} / ${service.durationMinutes} min"
                isChecked = selectedAddOnServiceIds.contains(service.id)
                setOnCheckedChangeListener { _, checked ->
                    if (checked) selectedAddOnServiceIds.add(service.id) else selectedAddOnServiceIds.remove(service.id)
                }
            })
        }
    }

    private fun renderServicesList() {
        llServicesAdminList.removeAllViews()
        if (services.isEmpty()) {
            llServicesAdminList.addView(buildEmptyCard("No services created yet."))
            return
        }

        services.sortedBy { it.sortOrder }.forEach { service ->
            llServicesAdminList.addView(
                buildAdminCard(
                    title = service.name,
                    subtitle = "${service.durationMinutes} min / ${formatMoney(service.priceCents)} / ${service.availableAddOns.size} add-ons",
                    meta = serviceStatusText(service),
                    buttons = listOf(
                        "Edit" to { startEditService(service) },
                        "Delete" to { confirmDeleteService(service) },
                    )
                )
            )
        }
    }

    private fun renderAddOnsList() {
        llAddOnsAdminList.removeAllViews()
        if (addOns.isEmpty()) {
            llAddOnsAdminList.addView(buildEmptyCard("No add-ons created yet."))
            return
        }

        addOns.sortedBy { it.sortOrder }.forEach { addOn ->
            llAddOnsAdminList.addView(
                buildAdminCard(
                    title = addOn.name,
                    subtitle = "${addOn.category.ifBlank { "Add-on" }} / +${formatMoney(addOn.priceCents)} / +${addOn.durationMinutes} min",
                    meta = "${addOn.services.size} linked services / ${if (addOn.isActive) "Active" else "Hidden"}",
                    buttons = listOf(
                        "Edit" to { startEditAddOn(addOn) },
                        "Delete" to { confirmDeleteAddOn(addOn) },
                    )
                )
            )
        }
    }

    private fun confirmDeleteService(item: AdminServiceEntry) {
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete service?")
            .setMessage("Delete \"${item.name}\"? If it already has bookings, it will be archived instead of fully deleted.")
            .setNegativeButton("Keep", null)
            .setPositiveButton("Delete") { _, _ ->
                ApiClient.deleteAdminService(
                    item.id,
                    onSuccess = {
                        runOnUiThread {
                            if (editingServiceId == item.id) {
                                resetServiceForm()
                            }
                            showNotice("Service removed from new bookings.")
                            loadData()
                        }
                    },
                    onError = { message ->
                        runOnUiThread {
                            showNotice("Failed to delete service: $message", isError = true)
                        }
                    }
                )
            }
            .show()
    }

    private fun confirmDeleteAddOn(item: AdminAddOnEntry) {
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete add-on?")
            .setMessage("Delete \"${item.name}\"?")
            .setNegativeButton("Keep", null)
            .setPositiveButton("Delete") { _, _ ->
                ApiClient.deleteAdminAddOn(
                    item.id,
                    onSuccess = {
                        runOnUiThread {
                            if (editingAddOnId == item.id) {
                                resetAddOnForm()
                            }
                            showNotice("Add-on deleted.")
                            loadData()
                        }
                    },
                    onError = { message ->
                        runOnUiThread {
                            showNotice("Failed to delete add-on: $message", isError = true)
                        }
                    }
                )
            }
            .show()
    }

    private fun updateServicePreview(url: String) {
        if (url.isBlank()) {
            ivServicePreview.setImageDrawable(null)
            ivServicePreview.setBackgroundResource(R.drawable.bg_placeholder)
        } else {
            ivServicePreview.load(url)
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

    private fun serviceStatusText(item: AdminServiceEntry): String {
        val parts = mutableListOf<String>()
        parts += if (item.isActive) "Active" else "Hidden"
        if (item.isFeaturedHome) parts += "Featured on home"
        parts += "Sort ${item.sortOrder}"
        return parts.joinToString(" / ")
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

    private fun buildAdminCard(
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

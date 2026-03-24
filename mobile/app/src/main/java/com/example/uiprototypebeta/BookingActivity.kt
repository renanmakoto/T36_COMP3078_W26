package com.example.uiprototypebeta

import android.content.Intent
import android.graphics.Typeface
import android.os.Bundle
import android.view.View
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import coil.load
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import android.widget.ImageView

class BookingActivity : BaseDrawerActivity() {

    private lateinit var servicesContainer: LinearLayout
    private lateinit var addOnsContainer: LinearLayout
    private lateinit var summaryText: TextView
    private lateinit var confirmButton: MaterialButton
    private lateinit var manageServicesButton: MaterialButton

    private var services: List<ServiceOption> = emptyList()
    private var selectedServiceId: String? = null
    private val selectedAddOnIds = linkedSetOf<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentLayout(R.layout.content_booking)
        setToolbarTitle("Book appointment")
        setCheckedDrawerItem(R.id.m_book)

        servicesContainer = findViewById(R.id.llServices)
        addOnsContainer = findViewById(R.id.llAddOns)
        summaryText = findViewById(R.id.tvSummary)
        confirmButton = findViewById(R.id.btnConfirm)
        manageServicesButton = findViewById(R.id.btnManageServices)

        manageServicesButton.visibility = if (AdminSession.isLoggedIn) View.VISIBLE else View.GONE
        manageServicesButton.setOnClickListener {
            startActivity(Intent(this, WebAdminActivity::class.java).apply {
                putExtra("title", "Services")
                putExtra("path", "/admin/dashboard/services")
            })
        }

        confirmButton.setOnClickListener {
            val service = selectedService() ?: return@setOnClickListener
            val selectedAddOns = service.addOns.filter { selectedAddOnIds.contains(it.id) }
            startActivity(Intent(this, BookingScheduleActivity::class.java).apply {
                putExtra("service_id", service.id)
                putExtra("service_title", service.name)
                putExtra("service_price", totalPrice(service))
                putExtra("service_duration", totalDuration(service))
                putStringArrayListExtra("add_on_ids", ArrayList(selectedAddOns.map { it.id }))
                putStringArrayListExtra("add_on_names", ArrayList(selectedAddOns.map { it.name }))
            })
        }

        loadServices()
    }

    override fun onResume() {
        super.onResume()
        manageServicesButton.visibility = if (AdminSession.isLoggedIn) View.VISIBLE else View.GONE
    }

    private fun loadServices() {
        ApiClient.getServices(
            onSuccess = { array ->
                val loadedServices = array.toServiceOptions()
                runOnUiThread {
                    services = loadedServices
                    if (selectedServiceId == null) {
                        selectedServiceId = loadedServices.firstOrNull()?.id
                    }
                    renderServices()
                    renderAddOns()
                    renderSummary()
                }
            },
            onError = { message ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load services: $message", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun renderServices() {
        servicesContainer.removeAllViews()
        if (services.isEmpty()) {
            servicesContainer.addView(messageCard("No services are available yet."))
            return
        }

        services.forEach { service ->
            val card = MaterialCardView(this).apply {
                radius = dp(18).toFloat()
                isCheckable = true
                isClickable = true
                isChecked = service.id == selectedServiceId
                strokeWidth = dp(1)
                strokeColor = ContextCompat.getColor(
                    context,
                    if (isChecked) R.color.nav_selected_bg else R.color.card_stroke
                )
                setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
                cardElevation = 0f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = dp(12) }
                setOnClickListener {
                    selectedServiceId = service.id
                    selectedAddOnIds.retainAll(service.addOns.map { addOn -> addOn.id }.toSet())
                    renderServices()
                    renderAddOns()
                    renderSummary()
                }
            }

            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(dp(16), dp(16), dp(16), dp(16))
            }
            val image = ImageView(this).apply {
                layoutParams = LinearLayout.LayoutParams(dp(72), dp(72))
                scaleType = ImageView.ScaleType.CENTER_CROP
                setBackgroundColor(ContextCompat.getColor(context, R.color.card_stroke))
                if (service.imageUrl.isNotBlank()) {
                    load(service.imageUrl)
                }
            }
            val body = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                    marginStart = dp(12)
                }
            }
            body.addView(TextView(this).apply {
                text = service.name
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16f)
                setTypeface(typeface, Typeface.BOLD)
            })
            body.addView(TextView(this).apply {
                text = service.description
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13f)
                setPadding(0, dp(4), 0, 0)
            })
            body.addView(TextView(this).apply {
                text = "${service.durationMinutes} min"
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12f)
                setTypeface(typeface, Typeface.BOLD)
                setPadding(0, dp(8), 0, 0)
            })
            val price = TextView(this).apply {
                text = formatMoney(service.priceCents)
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15f)
                setTypeface(typeface, Typeface.BOLD)
            }

            row.addView(image)
            row.addView(body)
            row.addView(price)
            card.addView(row)
            servicesContainer.addView(card)
        }
    }

    private fun renderAddOns() {
        addOnsContainer.removeAllViews()
        val service = selectedService()
        if (service == null) {
            addOnsContainer.addView(messageCard("Select a service first."))
            return
        }
        if (service.addOns.isEmpty()) {
            addOnsContainer.addView(messageCard("This service has no add-ons yet."))
            return
        }

        service.addOns.forEach { addOn ->
            val card = MaterialCardView(this).apply {
                radius = dp(18).toFloat()
                setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
                cardElevation = 0f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = dp(10) }
            }
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(dp(16), dp(14), dp(16), dp(14))
            }
            val checkbox = CheckBox(this).apply {
                isChecked = selectedAddOnIds.contains(addOn.id)
                setOnCheckedChangeListener { _, isChecked ->
                    if (isChecked) selectedAddOnIds.add(addOn.id) else selectedAddOnIds.remove(addOn.id)
                    renderSummary()
                }
            }
            val body = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                    marginStart = dp(8)
                }
            }
            body.addView(TextView(this).apply {
                text = addOn.name
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15f)
                setTypeface(typeface, Typeface.BOLD)
            })
            body.addView(TextView(this).apply {
                text = addOn.description.ifBlank { addOn.category.ifBlank { "Add-on" } }
                setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13f)
                setPadding(0, dp(4), 0, 0)
            })
            val meta = TextView(this).apply {
                text = "+${formatMoney(addOn.priceCents)}  +${addOn.durationMinutes} min"
                setTextColor(ContextCompat.getColor(context, R.color.brand_text))
                setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12f)
                setTypeface(typeface, Typeface.BOLD)
            }
            row.addView(checkbox)
            row.addView(body)
            row.addView(meta)
            card.addView(row)
            addOnsContainer.addView(card)
        }
    }

    private fun renderSummary() {
        val service = selectedService()
        if (service == null) {
            summaryText.text = "Select a service to continue."
            confirmButton.isEnabled = false
            return
        }

        val addOns = service.addOns.filter { selectedAddOnIds.contains(it.id) }
        val addOnNames = if (addOns.isEmpty()) {
            "No add-ons selected"
        } else {
            addOns.joinToString(", ") { it.name }
        }
        summaryText.text = buildString {
            append(service.name)
            append("\n")
            append("Total: ${formatMoney(totalPrice(service))}")
            append("  ${totalDuration(service)} min")
            append("\n")
            append(addOnNames)
        }
        confirmButton.isEnabled = true
    }

    private fun selectedService(): ServiceOption? {
        return services.firstOrNull { it.id == selectedServiceId }
    }

    private fun totalPrice(service: ServiceOption): Int {
        return service.priceCents + service.addOns.filter { selectedAddOnIds.contains(it.id) }.sumOf { it.priceCents }
    }

    private fun totalDuration(service: ServiceOption): Int {
        return service.durationMinutes + service.addOns.filter { selectedAddOnIds.contains(it.id) }.sumOf { it.durationMinutes }
    }

    private fun messageCard(message: String): MaterialCardView {
        val card = MaterialCardView(this).apply {
            radius = dp(18).toFloat()
            setCardBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
            cardElevation = 0f
        }
        card.addView(TextView(this).apply {
            text = message
            setPadding(dp(16), dp(16), dp(16), dp(16))
            setTextColor(ContextCompat.getColor(context, R.color.brand_muted))
        })
        return card
    }
}

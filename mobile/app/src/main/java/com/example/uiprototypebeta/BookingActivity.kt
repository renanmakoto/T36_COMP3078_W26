package com.example.uiprototypebeta

import android.content.Intent
import android.os.Bundle
import android.widget.CheckBox
import android.widget.Toast
import androidx.appcompat.content.res.AppCompatResources
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView

class BookingActivity : BaseDrawerActivity() {

    private lateinit var cardHaircut: MaterialCardView
    private lateinit var cardBeard: MaterialCardView
    private lateinit var cardHaircutBeard: MaterialCardView
    private lateinit var cbBrows: CheckBox
    private lateinit var btnConfirm: MaterialButton

    // Will be populated from the API
    private data class ServiceInfo(
        val apiId: String,   // UUID from backend
        val name: String,
        val priceCents: Int,
        val durationMinutes: Int
    )

    private var serviceMap = mutableMapOf<String, ServiceInfo>() // card key -> service info
    private var eyebrowService: ServiceInfo? = null
    private var selectedCardKey: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentLayout(R.layout.content_booking)
        setToolbarTitle("Book appointment")
        setCheckedDrawerItem(R.id.m_book)

        cardHaircut = findViewById(R.id.cardHaircut)
        cardBeard = findViewById(R.id.cardBeard)
        cardHaircutBeard = findViewById(R.id.cardHaircutBeard)
        cbBrows = findViewById(R.id.cbBrows)
        btnConfirm = findViewById(R.id.btnConfirm)

        val cards = mapOf(
            "haircut" to cardHaircut,
            "beard" to cardBeard,
            "combo" to cardHaircutBeard
        )

        cards.values.forEach { card ->
            card.isCheckable = true
            card.checkedIcon = AppCompatResources
                .getDrawable(this, R.drawable.ic_check_24)
                ?.mutate()
            card.checkedIconGravity = MaterialCardView.CHECKED_ICON_GRAVITY_TOP_END
        }

        cards.forEach { (id, card) ->
            card.setOnClickListener { selectService(cards, id) }
        }

        // Fetch services from API and map to cards
        loadServicesFromApi()

        btnConfirm.setOnClickListener {
            val cardKey = selectedCardKey ?: return@setOnClickListener
            val service = serviceMap[cardKey] ?: return@setOnClickListener

            val intent = Intent(this, BookingScheduleActivity::class.java).apply {
                putExtra("service_id", service.apiId)
                putExtra("service_title", service.name)
                putExtra("service_price", service.priceCents)
                putExtra("service_duration", service.durationMinutes)
                putExtra("add_brows", cbBrows.isChecked)
                putExtra("add_brows_price", eyebrowService?.priceCents ?: 0)
                putExtra("add_brows_duration", eyebrowService?.durationMinutes ?: 0)
            }
            startActivity(intent)
        }

        updateConfirmState()
    }

    private fun loadServicesFromApi() {
        ApiClient.getServices(
            onSuccess = { array ->
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val id = obj.getString("id")
                    val name = obj.getString("name")
                    val price = obj.getInt("price_cents")
                    val duration = obj.getInt("duration_minutes")
                    val info = ServiceInfo(id, name, price, duration)

                    // Map by name to the right card
                    when {
                        name.contains("Beard", ignoreCase = true) && name.contains("Haircut", ignoreCase = true) ->
                            serviceMap["combo"] = info
                        name.contains("Haircut", ignoreCase = true) ->
                            serviceMap["haircut"] = info
                        name.contains("Beard", ignoreCase = true) ->
                            serviceMap["beard"] = info
                        name.contains("Eyebrow", ignoreCase = true) || name.contains("Brow", ignoreCase = true) ->
                            eyebrowService = info
                    }
                }
            },
            onError = { msg ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to load services: $msg", Toast.LENGTH_SHORT).show()
                }
            }
        )
    }

    private fun selectService(cards: Map<String, MaterialCardView>, serviceId: String) {
        cards.forEach { (id, card) -> card.isChecked = (id == serviceId) }
        selectedCardKey = serviceId
        updateConfirmState()
    }

    private fun updateConfirmState() {
        btnConfirm.isEnabled = selectedCardKey != null
    }
}

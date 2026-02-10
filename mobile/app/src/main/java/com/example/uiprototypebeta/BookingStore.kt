package com.example.uiprototypebeta

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.UUID

/**
 * Shared in-memory booking store used by user and admin flows.
 * Mirrors the web prototype (no real backend or persistence).
 */
object BookingStore {

    enum class Status { SCHEDULED, CANCELLED, COMPLETED }

    data class Booking(
        val id: String = UUID.randomUUID().toString(),
        val userName: String,
        val serviceId: String,
        val serviceTitle: String,
        var startMillis: Long,
        val durationMinutes: Int,
        val price: Int,
        val addBrows: Boolean,
        var status: Status = Status.SCHEDULED
    )

    private val bookings = mutableListOf<Booking>()

    fun addBooking(
        userName: String,
        serviceId: String,
        serviceTitle: String,
        startMillis: Long,
        durationMinutes: Int,
        price: Int,
        addBrows: Boolean
    ): Booking {
        val booking = Booking(
            userName = userName,
            serviceId = serviceId,
            serviceTitle = serviceTitle,
            startMillis = startMillis,
            durationMinutes = durationMinutes,
            price = price,
            addBrows = addBrows
        )
        bookings.add(booking)
        return booking
    }

    fun rescheduleBooking(id: String, newStartMillis: Long) {
        val booking = bookings.find { it.id == id } ?: return
        booking.startMillis = newStartMillis
        if (booking.status == Status.CANCELLED) {
            booking.status = Status.SCHEDULED
        }
    }

    fun cancelBooking(id: String) {
        bookings.find { it.id == id }?.status = Status.CANCELLED
    }

    fun setStatus(id: String, status: Status) {
        bookings.find { it.id == id }?.status = status
    }

    fun getBookingsForUser(name: String): List<Booking> {
        return bookings.filter { it.userName == name }
    }

    fun getAllBookings(): List<Booking> = bookings.toList()

    fun formatDateTime(millis: Long): String {
        val cal = Calendar.getInstance().apply { timeInMillis = millis }
        val date = SimpleDateFormat("MMM d", Locale.getDefault()).format(cal.time)
        val time = SimpleDateFormat("h:mm a", Locale.getDefault()).format(cal.time)
        return "$date - $time"
    }
}


package com.brazwebdes.hairstylistbooking

import android.app.Application

class BookingApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AppSessionStore.initialize(this)
    }
}

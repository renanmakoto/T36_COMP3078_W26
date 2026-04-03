package com.brazwebdes.hairstylistbooking

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.annotation.IdRes
import androidx.annotation.LayoutRes
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.GravityCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.drawerlayout.widget.DrawerLayout
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.navigation.NavigationView
import kotlin.math.max

open class BaseDrawerActivity : AppCompatActivity() {

    private lateinit var drawerLayout: DrawerLayout
    private lateinit var drawerMenuContainer: View
    private lateinit var toolbar: MaterialToolbar
    private lateinit var navView: NavigationView
    private lateinit var adminFooter: View
    private lateinit var userFooter: View
    private lateinit var adminLabel: TextView
    private lateinit var userLabel: TextView
    private lateinit var contentFrame: FrameLayout
    private lateinit var toggle: ActionBarDrawerToggle

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_drawer_base)

        drawerLayout = findViewById(R.id.drawerLayout)
        drawerMenuContainer = findViewById(R.id.drawerMenuContainer)
        toolbar = findViewById(R.id.toolbar)
        navView = findViewById(R.id.navView)
        adminFooter = findViewById(R.id.m_admin)
        userFooter = findViewById(R.id.m_user)
        adminLabel = findViewById(R.id.adminLabel)
        userLabel = findViewById(R.id.userLabel)
        contentFrame = findViewById(R.id.contentFrame)

        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        toggle = ActionBarDrawerToggle(
            this, drawerLayout, toolbar,
            R.string.navigation_drawer_open, R.string.navigation_drawer_close
        )
        drawerLayout.addDrawerListener(toggle)
        toggle.syncState()

        toolbar.setNavigationOnClickListener {
            if (drawerLayout.isDrawerOpen(GravityCompat.END)) {
                drawerLayout.closeDrawer(GravityCompat.END)
            } else {
                drawerLayout.openDrawer(GravityCompat.END)
            }
        }

        navView.setNavigationItemSelectedListener { onDrawerItem(it) }
        adminFooter.setOnClickListener { onAdminClicked() }
        userFooter.setOnClickListener { onUserClicked() }
        restoreStoredSessionIfNeeded()
        syncAuthUi()
        toolbar.applyStatusBarTopInset()
        applyDrawerBottomInset()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (drawerLayout.isDrawerOpen(GravityCompat.END)) {
                    drawerLayout.closeDrawer(GravityCompat.END)
                } else {
                    if (!isTaskRoot) {
                        finish()
                    } else {
                        moveTaskToBack(true)
                    }
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        restoreStoredSessionIfNeeded()
        syncAuthUi()
    }

    protected fun setContentLayout(@LayoutRes layoutRes: Int) {
        LayoutInflater.from(this).inflate(layoutRes, contentFrame, true)
    }

    protected fun setToolbarTitle(text: CharSequence) { toolbar.title = text }

    protected fun setCheckedDrawerItem(@IdRes menuId: Int) {
        if (menuId == R.id.m_admin) {
            clearNavSelection()
            adminFooter.isSelected = true
        } else if (menuId == R.id.m_user) {
            clearNavSelection()
            userFooter.isSelected = true
        } else {
            adminFooter.isSelected = false
            userFooter.isSelected = false
            navView.menu.findItem(menuId)?.let { navView.setCheckedItem(menuId) }
        }
    }

    private fun onDrawerItem(item: MenuItem): Boolean {
        when (item.itemId) {
            R.id.m_logout -> {
                performLogout()
                return true
            }
            R.id.m_home      -> if (this !is HomeActivity) startActivity(Intent(this, HomeActivity::class.java))
            R.id.m_book      -> if (this !is BookingActivity) startActivity(Intent(this, BookingActivity::class.java))
            R.id.m_portfolio -> if (this !is PortfolioActivity) startActivity(Intent(this, PortfolioActivity::class.java))
            R.id.m_blog      -> if (this !is BlogActivity) startActivity(Intent(this, BlogActivity::class.java))
        }
        drawerLayout.closeDrawer(GravityCompat.END)
        return true
    }

    private fun onAdminClicked() {
        clearNavSelection()
        if (AdminSession.isLoggedIn) {
            if (this !is AdminDashboardActivity) {
                startActivity(AdminDashboardActivity.intent(this))
            }
        } else if (!UserSession.isLoggedIn) {
            startActivity(Intent(this, LoginActivity::class.java))
        }
        drawerLayout.closeDrawer(GravityCompat.END)
    }

    private fun onUserClicked() {
        clearNavSelection()
        if (UserSession.isLoggedIn) {
            if (this !is UserDashboardActivity) startActivity(Intent(this, UserDashboardActivity::class.java))
        } else if (!AdminSession.isLoggedIn) {
            goToLoginScreen()
        }
        drawerLayout.closeDrawer(GravityCompat.END)
    }

    private fun clearNavSelection() {
        val menu = navView.menu
        for (i in 0 until menu.size()) {
            val item = menu.getItem(i)
            item.isChecked = false
            item.subMenu?.let { subMenu ->
                for (j in 0 until subMenu.size()) {
                    subMenu.getItem(j).isChecked = false
                }
            }
        }
        adminFooter.isSelected = false
        userFooter.isSelected = false
    }

    private fun performLogout() {
        clearNavSelection()
        showLogoutOption(false)
        AppSessionStore.clear(this)
        syncAuthUi()
        drawerLayout.closeDrawer(GravityCompat.END)
        val intent = Intent(this, LoginActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        startActivity(intent)
        finish()
    }

    private fun restoreStoredSessionIfNeeded() {
        if (UserSession.isLoggedIn || AdminSession.isLoggedIn) {
            return
        }
        AppSessionStore.activatePendingSession()
    }

    protected fun showLogoutOption(visible: Boolean) {
        navView.menu.findItem(R.id.m_logout)?.isVisible = visible
    }

    protected fun syncAuthUi() {
        val adminLoggedIn = AdminSession.isLoggedIn
        val userLoggedIn = UserSession.isLoggedIn
        val isAnyoneLoggedIn = adminLoggedIn || userLoggedIn

        showLogoutOption(isAnyoneLoggedIn)

        when {
            adminLoggedIn -> {
                adminFooter.visibility = View.VISIBLE
                userFooter.visibility = View.GONE
                adminLabel.text = getString(R.string.admin_dashboard)
            }
            userLoggedIn -> {
                adminFooter.visibility = View.GONE
                userFooter.visibility = View.VISIBLE
                userLabel.text = getString(R.string.user_dashboard)
            }
            else -> {
                adminFooter.visibility = View.GONE
                userFooter.visibility = View.VISIBLE
                userLabel.text = getString(R.string.user_sign_in)
            }
        }

        if (adminFooter.visibility != View.VISIBLE) {
            adminFooter.isSelected = false
        }
        if (userFooter.visibility != View.VISIBLE) {
            userFooter.isSelected = false
        }
    }

    private fun goToLoginScreen() {
        val intent = Intent(this, LoginActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        startActivity(intent)
        finish()
    }

    private fun applyDrawerBottomInset() {
        val baseBottomPadding = drawerMenuContainer.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(drawerMenuContainer) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val gestures = insets.getInsets(
                WindowInsetsCompat.Type.systemGestures() or WindowInsetsCompat.Type.tappableElement()
            )
            val bottomInset = max(systemBars.bottom, gestures.bottom)
            view.updatePadding(bottom = baseBottomPadding + bottomInset)
            insets
        }
        ViewCompat.requestApplyInsets(drawerMenuContainer)
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (::toggle.isInitialized && toggle.onOptionsItemSelected(item)) return true
        return super.onOptionsItemSelected(item)
    }
}

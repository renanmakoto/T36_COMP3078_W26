import org.gradle.api.GradleException
import org.gradle.api.Project
import java.io.File
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

fun Project.optionalStringProperty(name: String): String? =
    (findProperty(name) as String?)?.trim()?.takeIf { it.isNotEmpty() }

fun Project.requiredReleaseStringProperty(name: String): String =
    optionalStringProperty(name)
        ?: throw GradleException("Release builds require -P$name=<value>.")

fun loadPropertiesFile(vararg candidates: File): Pair<Properties, File?> {
    val props = Properties()
    val source = candidates.firstOrNull { it.isFile }
    if (source != null) {
        source.inputStream().use(props::load)
    }
    return props to source
}

val debugApiBaseUrl = project.optionalStringProperty("debugApiBaseUrl") ?: "http://10.0.2.2:8000"
val debugWebBaseUrl = project.optionalStringProperty("debugWebBaseUrl") ?: "http://10.0.2.2:3000"
val defaultPrivacyPolicyUrl =
    project.optionalStringProperty("privacyPolicyUrl") ?: "https://stuaarts.github.io/PrivacyPolicy/"
val releaseBuildRequested = gradle.startParameter.taskNames.any { it.contains("release", ignoreCase = true) }
val (localSigningProperties, localSigningPropertiesFile) = loadPropertiesFile(
    rootProject.file("keystore.properties"),
    rootProject.file("../artifacts/release-signing/play-console-key/keystore.properties")
)

android {
    namespace = "com.brazwebdes.hairstylistbooking"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.brazwebdes.hairstylistbooking"
        minSdk = 24
        targetSdk = 36
        versionCode = 21
        versionName = "21"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Debug builds default to the Android emulator loopback.
        buildConfigField("String", "API_BASE_URL", "\"$debugApiBaseUrl\"")
        buildConfigField("String", "WEB_BASE_URL", "\"$debugWebBaseUrl\"")
        buildConfigField("String", "PRIVACY_POLICY_URL", "\"$defaultPrivacyPolicyUrl\"")
        buildConfigField("String", "ACCOUNT_DELETION_URL", "\"$debugWebBaseUrl/account/delete\"")
    }

    signingConfigs {
        val releaseStoreFile = project.optionalStringProperty("releaseStoreFile")
            ?: localSigningProperties.getProperty("storeFile")?.trim()?.takeIf { it.isNotEmpty() }?.let { path ->
                val sourceDir = localSigningPropertiesFile?.parentFile
                if (sourceDir != null) File(sourceDir, path).path else path
            }
        val releaseStorePassword = project.optionalStringProperty("releaseStorePassword")
            ?: localSigningProperties.getProperty("storePassword")?.trim()?.takeIf { it.isNotEmpty() }
        val releaseKeyAlias = project.optionalStringProperty("releaseKeyAlias")
            ?: localSigningProperties.getProperty("keyAlias")?.trim()?.takeIf { it.isNotEmpty() }
        val releaseKeyPassword = project.optionalStringProperty("releaseKeyPassword")
            ?: localSigningProperties.getProperty("keyPassword")?.trim()?.takeIf { it.isNotEmpty() }

        if (
            !releaseStoreFile.isNullOrBlank() &&
            !releaseStorePassword.isNullOrBlank() &&
            !releaseKeyAlias.isNullOrBlank() &&
            !releaseKeyPassword.isNullOrBlank()
        ) {
            create("release") {
                storeFile = file(releaseStoreFile)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            manifestPlaceholders["cleartextTrafficPermitted"] = "true"
        }
        release {
            isMinifyEnabled = false
            manifestPlaceholders["cleartextTrafficPermitted"] = "false"
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )

            val releaseApiBaseUrl =
                if (releaseBuildRequested) project.requiredReleaseStringProperty("apiBaseUrl") else debugApiBaseUrl
            val releaseWebBaseUrl =
                if (releaseBuildRequested) project.requiredReleaseStringProperty("webBaseUrl") else debugWebBaseUrl
            val releasePrivacyPolicyUrl = defaultPrivacyPolicyUrl
            val releaseAccountDeletionUrl =
                project.optionalStringProperty("accountDeletionUrl") ?: "$releaseWebBaseUrl/account/delete"

            buildConfigField("String", "API_BASE_URL", "\"$releaseApiBaseUrl\"")
            buildConfigField("String", "WEB_BASE_URL", "\"$releaseWebBaseUrl\"")
            buildConfigField("String", "PRIVACY_POLICY_URL", "\"$releasePrivacyPolicyUrl\"")
            buildConfigField("String", "ACCOUNT_DELETION_URL", "\"$releaseAccountDeletionUrl\"")

            signingConfigs.findByName("release")?.let {
                signingConfig = it
            }
        }
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
}

dependencies {

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    implementation("androidx.recyclerview:recyclerview:1.4.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.json:json:20231013")
    implementation("io.coil-kt:coil:2.7.0")
}

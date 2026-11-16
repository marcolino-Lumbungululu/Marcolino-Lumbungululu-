# Regras ProGuard / R8 para Release APK e AAB
-keepattributes *Annotation*
-keepattributes Signature

# Kotlinx Serialization
-keepclassmembers class kotlinx.serialization.json.** { *; }
-keep,includedescriptorclasses class com.nexusai.android.data.remote.**$$serializer { *; }
-keepclassmembers class com.nexusai.android.data.remote.** {
    *** Companion;
}

# Retrofit
-keepattributes Exceptions,InnerClasses
-keep interface com.nexusai.android.data.remote.NexusApiService { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

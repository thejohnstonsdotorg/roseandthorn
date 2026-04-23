package expo.modules.mediapipeimagegen

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.util.Base64
import java.io.File

/**
 * ExpoMediaPipeImageGenModule
 *
 * Local Expo Module wrapping the MediaPipe Image Generator task.
 * Exposes on-device Stable Diffusion 1.5 (SD 1.5) image generation
 * via Google's (deprecated but still functional) MediaPipe runtime.
 *
 * STATUS: This module is a functional skeleton. The MediaPipe dependency is
 * commented out in build.gradle pending the one-time model conversion step:
 *
 *   1. Convert the SD 1.5 EMA-only weights using Google's image_generator_converter
 *      Python script (see MediaPipe docs).
 *   2. Host the ~1.5 GB converted model at a CDN URL.
 *   3. Uncomment the MediaPipe dependency in build.gradle.
 *   4. Implement downloadModel() and generate() below with the real API.
 *
 * Until then, isAvailable() returns false and all generation falls back to
 * the procedural Skia backend in lib/proceduralArt.ts.
 */
class ExpoMediaPipeImageGenModule : Module() {
  // The directory where the SD 1.5 model will be cached on-device.
  private val modelDirName = "mediapipe_sd15_model"

  // Expected total model size in bytes (~1.5 GB). Used for progress reporting.
  private val expectedModelBytes = 1_600_000_000L

  override fun definition() = ModuleDefinition {
    Name("ExpoMediaPipeImageGen")

    // ─── isAvailable ────────────────────────────────────────────────────────
    // Returns true only if:
    //   1. Device has ≥ 6 GB RAM (safe margin below the 8 GB Pixel 9 minimum)
    //   2. Android 12+ (GPU delegate requirement)
    //   3. Model is downloaded
    AsyncFunction("isAvailable") { promise: Promise ->
      try {
        val available = deviceMeetsRequirements() && isModelPresent()
        promise.resolve(available)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // ─── isModelDownloaded ──────────────────────────────────────────────────
    AsyncFunction("isModelDownloaded") { promise: Promise ->
      promise.resolve(isModelPresent())
    }

    // ─── downloadModel ──────────────────────────────────────────────────────
    // Downloads the converted SD 1.5 model to app-internal storage.
    // TODO: Implement with OkHttp or DownloadManager once the model is hosted.
    //       Fire onDownloadProgress events during download.
    AsyncFunction("downloadModel") { promise: Promise ->
      promise.reject(
        "NOT_IMPLEMENTED",
        "Model download is not yet implemented. See ExpoMediaPipeImageGenModule.kt for the TODO.",
        null
      )
    }

    // ─── generate ───────────────────────────────────────────────────────────
    // Runs SD 1.5 inference via MediaPipe and returns a base64-encoded PNG.
    // TODO: Implement once model is available and MediaPipe dep is uncommented.
    AsyncFunction("generate") { prompt: String, seed: Int, iterations: Int, promise: Promise ->
      promise.reject(
        "NOT_IMPLEMENTED",
        "MediaPipe image generation is not yet implemented. The app will use procedural art as fallback.",
        null
      )
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private fun deviceMeetsRequirements(): Boolean {
    // Require Android 12+ (API 31) for GPU delegate reliability
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false

    // Require ≥ 6 GB RAM (conservative floor; Pixel 9 has 12 GB)
    val activityManager = appContext.reactContext
      ?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      ?: return false
    val memInfo = ActivityManager.MemoryInfo()
    activityManager.getMemoryInfo(memInfo)
    val totalRamGb = memInfo.totalMem / (1024 * 1024 * 1024)
    return totalRamGb >= 6
  }

  private fun modelDir(): File {
    val filesDir = appContext.reactContext?.filesDir ?: return File("/nonexistent")
    return File(filesDir, modelDirName)
  }

  private fun isModelPresent(): Boolean {
    val dir = modelDir()
    if (!dir.exists() || !dir.isDirectory) return false
    // A successfully downloaded model should have at least 1 file > 100 MB
    return dir.walkTopDown().any { it.isFile && it.length() > 100_000_000L }
  }
}

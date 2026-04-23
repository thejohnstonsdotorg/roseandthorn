package expo.modules.mediapipeimagegen

import android.app.ActivityManager
import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import android.util.Base64
import com.google.mediapipe.tasks.vision.imagegenerator.ImageGenerator
import com.google.mediapipe.tasks.vision.imagegenerator.ImageGenerator.ConditionOptions
import com.google.mediapipe.tasks.vision.imagegenerator.ImageGenerator.ImageGeneratorOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream

/**
 * ExpoMediaPipeImageGenModule
 *
 * Local Expo Module wrapping the MediaPipe Image Generator task.
 * Exposes on-device Stable Diffusion 1.5 image generation via the
 * MediaPipe runtime (Android only).
 *
 * Model: converted SD 1.5 EMA-only bins hosted on GitHub Releases.
 * Download URL: MODEL_URL below.
 *
 * Fires "onDownloadProgress" events during model download:
 *   { bytesReceived: Long, totalBytes: Long, fraction: Float }
 */
class ExpoMediaPipeImageGenModule : Module() {

  companion object {
    const val MODEL_URL =
      "https://github.com/thejohnstonsdotorg/roseandthorn/releases/download/v1.4-model/sd15_bins.zip"
    const val MODEL_DIR_NAME = "mediapipe_sd15_model"
    const val MIN_RAM_GB = 6L
    const val OUTPUT_IMAGE_SIZE = 512
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoMediaPipeImageGen")

    Events("onDownloadProgress")

    // ─── isAvailable ────────────────────────────────────────────────────────
    AsyncFunction("isAvailable") { promise: Promise ->
      try {
        promise.resolve(deviceMeetsRequirements() && isModelPresent())
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // ─── isModelDownloaded ──────────────────────────────────────────────────
    AsyncFunction("isModelDownloaded") { promise: Promise ->
      promise.resolve(isModelPresent())
    }

    // ─── downloadModel ──────────────────────────────────────────────────────
    // Downloads and unzips the SD 1.5 bins from GitHub Releases.
    // Fires onDownloadProgress events. Resumes partial downloads.
    AsyncFunction("downloadModel") { promise: Promise ->
      try {
        downloadAndUnzip(promise)
      } catch (e: Exception) {
        promise.reject("DOWNLOAD_FAILED", e.message ?: "Unknown error", e)
      }
    }

    // ─── generate ───────────────────────────────────────────────────────────
    // Runs SD 1.5 inference and returns a base64-encoded PNG.
    AsyncFunction("generate") { prompt: String, seed: Int, iterations: Int, promise: Promise ->
      try {
        val base64 = runGeneration(prompt, seed, iterations)
        promise.resolve(base64)
      } catch (e: Exception) {
        promise.reject("GENERATION_FAILED", e.message ?: "Generation failed", e)
      }
    }
  }

  // ─── Private: device check ───────────────────────────────────────────────

  private fun deviceMeetsRequirements(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
    val am = appContext.reactContext
      ?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      ?: return false
    val info = ActivityManager.MemoryInfo()
    am.getMemoryInfo(info)
    return (info.totalMem / (1024 * 1024 * 1024)) >= MIN_RAM_GB
  }

  // ─── Private: model path helpers ────────────────────────────────────────

  private fun modelDir(): File {
    val filesDir = appContext.reactContext?.filesDir
      ?: throw IllegalStateException("filesDir unavailable")
    return File(filesDir, MODEL_DIR_NAME)
  }

  private fun isModelPresent(): Boolean {
    val dir = modelDir()
    if (!dir.exists() || !dir.isDirectory) return false
    // The converted bins folder contains 1000+ .bin files; confirm at least one > 10 MB
    return dir.walkTopDown().any { it.isFile && it.length() > 10_000_000L }
  }

  // ─── Private: download + unzip ──────────────────────────────────────────

  private fun downloadAndUnzip(promise: Promise) {
    val dir = modelDir()
    dir.mkdirs()

    val zipFile = File(dir.parent, "sd15_bins_download.zip")

    // Determine resume offset
    val resumeFrom = if (zipFile.exists()) zipFile.length() else 0L

    val conn = URL(MODEL_URL).openConnection() as HttpURLConnection
    conn.connectTimeout = 30_000
    conn.readTimeout = 60_000
    if (resumeFrom > 0) conn.setRequestProperty("Range", "bytes=$resumeFrom-")
    conn.connect()

    val responseCode = conn.responseCode
    if (responseCode != HttpURLConnection.HTTP_OK &&
      responseCode != HttpURLConnection.HTTP_PARTIAL
    ) {
      throw Exception("Server returned HTTP $responseCode")
    }

    val totalBytes = if (resumeFrom > 0 && responseCode == HttpURLConnection.HTTP_PARTIAL) {
      conn.contentLengthLong + resumeFrom
    } else {
      conn.contentLengthLong
    }

    // Stream download to zip file
    conn.inputStream.use { input ->
      FileOutputStream(zipFile, resumeFrom > 0 && responseCode == HttpURLConnection.HTTP_PARTIAL).use { output ->
        val buf = ByteArray(256 * 1024) // 256 KB chunks
        var bytesReceived = resumeFrom
        var read: Int
        while (input.read(buf).also { read = it } != -1) {
          output.write(buf, 0, read)
          bytesReceived += read
          sendEvent(
            "onDownloadProgress", mapOf(
              "bytesReceived" to bytesReceived,
              "totalBytes" to totalBytes,
              "fraction" to if (totalBytes > 0) bytesReceived.toFloat() / totalBytes else 0f
            )
          )
        }
      }
    }

    // Unzip into modelDir
    ZipInputStream(zipFile.inputStream().buffered()).use { zis ->
      var entry = zis.nextEntry
      while (entry != null) {
        // Strip leading "sd15_bins/" directory prefix if present
        val relativeName = entry.name
          .removePrefix("sd15_bins/")
          .removePrefix("sd15_bins\\")
        if (relativeName.isNotEmpty() && !entry.isDirectory) {
          val outFile = File(dir, relativeName)
          outFile.parentFile?.mkdirs()
          FileOutputStream(outFile).use { out -> zis.copyTo(out) }
        }
        zis.closeEntry()
        entry = zis.nextEntry
      }
    }

    // Clean up zip now that unzip succeeded
    zipFile.delete()

    promise.resolve(null)
  }

  // ─── Private: MediaPipe inference ───────────────────────────────────────

  private fun runGeneration(prompt: String, seed: Int, iterations: Int): String {
    val dir = modelDir()
    if (!isModelPresent()) throw IllegalStateException("Model not downloaded")

    val options = ImageGeneratorOptions.builder()
      .setImageGeneratorModelDirectory(dir.absolutePath)
      .build()

    val generator = ImageGenerator.createFromOptions(
      appContext.reactContext ?: throw IllegalStateException("No context"),
      options
    )

    generator.use {
      it.setInputs(prompt, iterations, seed)
      val result = it.execute(false) // false = return final image only (no step previews)
      val bitmap = result.generatedImage()
        ?: throw IllegalStateException("Generation returned null image")

      // Encode to PNG base64
      val bos = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, bos)
      return Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)
    }
  }
}

# Privacy Policy — Rose & Thorn

**Effective date:** 2026-04-24
**Last updated:** 2026-04-24

---

## 1. Who we are

Rose & Thorn is a family dinner ritual app created and published by Ken Johnston
(`com.kencjohnston.roseandthorn`). For questions about this policy, contact:
**kencjohnston@gmail.com**

---

## 2. The short version

Rose & Thorn does not collect, store, or share any personal information.
Everything you enter — family names, member names, Roses, Thorns, and artwork —
stays on your device and is never transmitted to us.

---

## 3. Data we do NOT collect

- No accounts or logins
- No analytics or crash reporting
- No advertising identifiers
- No location data
- No contacts or camera roll access
- No device identifiers
- No usage telemetry of any kind

---

## 4. Data stored on your device

All app data is stored locally in a SQLite database on your phone using
`expo-sqlite`. This includes:

| Data | Where | Leaves the device? |
|------|-------|--------------------|
| Family name | SQLite | Never |
| Member names and emoji avatars | SQLite | Never |
| Rose & Thorn entries (text, prompts) | SQLite | Only if you use the Export feature (see §5) |
| Session history | SQLite | Only if you use the Export feature (see §5) |
| Artwork images | Local file storage (`expo-file-system`) | Never |
| App settings (AI Images toggle, etc.) | SQLite | Never |

---

## 5. Export feature

Tapping **Export** in Settings produces a JSON file containing your family's
session history. This file is shared via the Android share sheet — you choose
the destination (email, cloud storage, messaging app, etc.). We never receive
or process this file. The contents and destination are entirely under your
control.

---

## 6. On-device AI artwork (MediaPipe — opt-in)

The **AI Images** setting is off by default. If you enable it and choose the
**On-Device** backend:

- A 1.9 GB Stable Diffusion 1.5 model is downloaded from GitHub Releases
  (github.com/thejohnstonsdotorg/roseandthorn/releases) and saved to your
  device's external files directory.
- All image generation runs entirely on your device. No Rose/Thorn text, no
  prompts, and no images are sent to any server.
- The model files survive app updates but are deleted when you uninstall the app
  or tap **Reset All Data** in Settings.

---

## 7. Cloud AI artwork (opt-in — disabled in v1.0)

The Cloud AI image generation feature is not available in version 1.0. It will
be enabled in a future update (v1.1) and this policy will be updated at that
time to describe the data flows in detail.

---

## 8. How to delete your data

You can delete all app data at any time:

1. Open Settings in Rose & Thorn → tap **Reset All Data** (removes all SQLite
   records and generated image files from device storage).
2. Uninstall the app (removes all remaining app files including the MediaPipe
   model if downloaded).

Neither action sends any data to us.

---

## 9. Children's privacy

Rose & Thorn is rated **Everyone 13+** on the Google Play Store. The app does
not knowingly collect any information from users of any age. Because no data
leaves the device, the app is consistent with COPPA requirements regardless of
the user's age.

---

## 10. Changes to this policy

If we make material changes to this policy — particularly when the Cloud AI
feature is enabled in v1.1 — we will update the **Last updated** date above.
Continued use of the app after the policy change date constitutes acceptance of
the updated terms.

---

## 11. Contact

Questions, concerns, or requests related to this privacy policy:
**kencjohnston@gmail.com**

# Data Safety Form — Rose & Thorn v1.0

Pre-filled answers for the Play Console Data Safety section.
This version covers **v1.0** where Cloud AI is disabled.
A separate `docs/data-safety-v1.1.md` will cover v1.1 (Cloud AI enabled).

---

## Section 1: Data collection and security

### Does your app collect or share any of the required user data types?

**No.**

Rose & Thorn v1.0 does not collect, transmit, or share any user data.
All data (family names, entries, session history, artwork) is stored exclusively
on the user's device. The developer never receives any of it.

> Play Console field: "No, I don't collect or share data" → ✅ Select this.

---

## Section 2: Data security practices

### Is all user data encrypted in transit?

Not applicable — no user data is transmitted.

### Do you provide a way for users to request that their data is deleted?

**Yes.** Users can delete all data at any time via Settings → Reset All Data.
This removes all SQLite records and generated image files from device storage.
Uninstalling the app removes all remaining files.

> Play Console field: "Yes" → ✅ Select this.

---

## Section 3: About this app

### Does your app use encryption?

**No** (beyond standard Android OS-level storage encryption, which is outside
developer control).

### Is your app in scope of COPPA (directed to children)?

**No.** The app is rated Everyone 13+ and is not directed to children.

---

## Notes for v1.1 update

When Cloud AI (FLUX.1 schnell via BYO API key) is re-enabled in v1.1, this
form must be updated to declare:

- **Data shared with third parties:** prompt text (~15 tokens of Rose/Thorn
  content + emoji character description) is sent to the cloud provider chosen
  by the user (fal.ai / Fireworks / Together AI / Replicate / WaveSpeed) using
  the user's own API key. This is user-initiated.
- **Data type:** "App activity" → User-generated content (text)
- **Sharing purpose:** "At user's direction, to a third party of the user's choice"
- **Is data encrypted in transit?** Yes (all five providers use HTTPS)

At that time, also update `docs/PRIVACY.md` §7 (Cloud AI) with specific
provider names and links to each provider's own privacy policy.

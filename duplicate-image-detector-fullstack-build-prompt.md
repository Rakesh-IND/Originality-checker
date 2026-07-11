

## Project Overview

Build a **full-stack tool that detects duplicate or visually similar images** using **perceptual image hashing**. Unlike a one-off client-side batch tool, this version gives each user a **persistent image library**: every image they've ever uploaded is checked against their entire history, not just whatever they happen to upload in one session. Matches are shown with a similarity percentage.

**Target users:** anyone managing a growing personal photo library who wants to catch duplicates/near-duplicates over time, not just within a single upload batch.

---

## Tech Stack

- **Frontend:** React with Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database, Auth & Storage:** Supabase (Postgres + Auth + Storage for the actual image files)
- **Image hashing:** Python `imagehash` library (built on Pillow) for server-side **dHash** (difference hash) computation — consistent, well-tested, and avoids re-implementing the algorithm in JS
- **Deployment:** Vercel (frontend) + Supabase-hosted backend/DB

---

## Image Hashing Approach (core requirement)

- On every upload, the backend computes a **64-bit dHash** of the image server-side using `imagehash.dhash(image, hash_size=8)`
- Store the hash (as a hex string) alongside the image record
- To find matches for a given image, compute the **Hamming distance** between its hash and every other hash in that user's library, then convert to similarity: `similarity = (64 - hamming_distance) / 64 * 100`
- Do this comparison **server-side** at query time (or incrementally on upload) — don't ship all hashes to the client to compare in JS, since the library should scale to hundreds of images
- Default match threshold: **90% similarity**, adjustable by the user

---

## Data Model (minimum)

- `users` (Supabase Auth managed)
- `images`:
  - `id`, `user_id`, `filename`, `storage_path` (Supabase Storage), `dhash` (string), `uploaded_at`, `file_size`
- Matches are computed on demand from the `dhash` values (via a Hamming distance function) rather than stored as a separate precomputed table, unless the library grows large enough that precomputing/caching matches becomes worthwhile — note this as a possible future optimization, not required for v1

---

## Backend Requirements

- **Auth:** Supabase Auth, JWT-protected routes — each user only sees and compares against their own image library
- **API endpoints:**
  - `POST /api/images/upload` — accepts one or more images, computes each one's dHash server-side, stores the file in Supabase Storage, inserts the DB record, and returns the new image's matches against the rest of the user's library
  - `GET /api/images` — list all of the user's images with a match-count summary per image
  - `GET /api/images/{id}/matches?threshold=90` — return all other images above the given similarity threshold, each with its computed similarity percentage
  - `DELETE /api/images/{id}` — remove the image from storage and the database
- **Validation:** reasonable file size/type limits (JPEG, PNG, WebP); reject non-image uploads cleanly

---

## Frontend Pages

1. **Login / Signup** — Supabase Auth (email/password)

2. **Gallery / Dashboard**
   - Grid of all the user's uploaded images
   - Any image with at least one match above the threshold shows a badge (e.g. "3 matches")
   - Upload control (drag-and-drop + file picker) supporting multiple files at once, with per-file progress
   - Adjustable similarity threshold control (default 90%) that re-filters which matches are shown without needing to re-upload

3. **Comparison View**
   - Clicking a matched image opens a side-by-side view of the two (or more) similar images with the similarity percentage prominently displayed
   - Option to delete one of the duplicates directly from this view

4. **Settings / Profile**
   - Update account details
   - Adjust default similarity threshold preference

---

## Design & Visual Direction

- **Aesthetic:** clean, image-forward gallery — minimal chrome, generous grid spacing, the photos are the content.
- **Match badges:** consistent, clearly visible styling (e.g. a colored corner ribbon showing the match count or top similarity %) so duplicates are scannable at a glance across a large library.
- **Comparison view:** the similarity percentage should be the visual focal point between the two images, with a plain-language note on what it means.
- **Responsive:** gallery reflows cleanly on mobile; upload and comparison flows remain usable on a smaller screen.

---

## Non-Functional Requirements

- Hashing and comparison should stay fast as the library grows — server-side computation, not a client-side loop over every pair
- Uploads show clear progress and handle failures gracefully (bad file type, size limit, network error)
- No broken buttons, no dead links
- Accurate matching: near-duplicates (resized, recompressed, lightly cropped versions of the same photo) should still be correctly flagged, not just byte-identical files

---

## Deliverable / Definition of Done

- A deployed, working app where a user can sign up, build an image library over multiple upload sessions, and see accurate duplicate/similarity matches computed against their **entire** library — not just the current batch
- Similarity percentages are computed correctly server-side using dHash + Hamming distance
- Threshold is adjustable and updates displayed matches accordingly
- No broken demo buttons, no dead links, no console errors

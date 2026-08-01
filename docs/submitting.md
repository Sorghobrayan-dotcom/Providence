# Filling the Kaggle writeup

Every field on the form, in the order it appears, with the thing to put in it.
Nothing here needs writing — it is all copy and paste.

---

## Title *(done)*

```
Providence
```

## Subtitle — 79 of 140 characters

```
Your engine already knows where the body falls. It has no idea what that costs.
```

## Card and Thumbnail Image — 560 × 280

Upload **`docs/card.png`**. It is rendered at 1120 × 560, which is the same 2:1
ratio at twice the size, so it stays sharp when the gallery scales it.

Do not use `docs/cover.png` here — that one is 16:9 and Kaggle will crop the
numbers off the bottom. Keep the cover for the media gallery instead.

## Submission Track

Already selected. One track.

---

## Media gallery

**The video first.** Upload it to YouTube — *Unlisted* is enough and is faster
than Public, but check the writeup renders it before you rely on that. Paste the
link here.

Then, in this order:

1. `docs/cover.png` — the 16:9 cover
2. a screenshot of the console with a verse in it marked `YOUVERSION, LIVE`
3. a screenshot of Peter in `offended`, having walked away

The second and third are worth more than any diagram: they are the two claims
nobody else is making, and a judge who does not press play still sees them.

---

## Project Description

Paste the body of `docs/writeup.md` — everything below the `---`, starting at
*"Godot and Unity compute a falling body…"* and ending at *"…the ground they walk
on."* 558 words.

Do not paste the title line or the `**Subtitle:**` line; those two go in the
fields above and repeating them wastes the first thing a judge reads.

---

## Project links

Add all four. The order matters — a judge clicks the first one.

| label | url |
| --- | --- |
| Live demo | `https://providencenet.netlify.app` |
| Code | `https://github.com/Sorghobrayan-dotcom/Providence/tree/standing-and-staging` |
| Notebook | *(the Kaggle notebook URL, once it is public)* |
| Video | *(the YouTube link)* |

The GitHub link points at **`standing-and-staging`**, not at `main`. `main` does
not have any of this on it.

### Before you paste the code link

Open it in a private window. If it 404s, the repository is private, and a judge
will see the same 404. Make it public in *Settings → General → Danger Zone →
Change repository visibility*.

### The notebook

Kaggle, *Code*, *New Notebook*, *File → Import Notebook*, choose
`notebook/providence.ipynb`. Then *Add-ons → Secrets*, add
`YOUVERSION_APP_KEY`, enable it for the notebook. *Run All*, *Save Version*, and
set it **Public** before you paste the link. 25 code cells, all passing, and one
live call to the platform.

If time runs out on this, submit without it. The live demo and the repository
carry the entry on their own, and a notebook link that 404s is worse than no
link.

---

## Attachments — files

Nothing needs uploading. The links above cover the code, and a 100 MB limit is
not a reason to duplicate a repository into a zip.

---

## Order to do it in, with three hours

1. **Subtitle, card image, description, links.** Ten minutes, and it takes the
   checklist to 5 of 5 — from that moment the entry is submittable and every
   later step only improves it.
2. **Save Draft.** Do this before anything else can go wrong.
3. **Record the video.** `docs/narration.md` has the script and the running
   order.
4. **Upload to YouTube, paste the link, Save Draft again.**
5. **The notebook, if there is time.**
6. **Submit.** Do not leave this to the last five minutes; the deadline is
   04:59 UTC and a form that fails to save at 04:57 has cost people entries.

Submit as soon as the checklist allows it. You can keep editing a submitted
writeup up to the deadline, and an entry that is in is an entry that cannot be
lost to a browser crash.

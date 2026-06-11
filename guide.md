# ⚡ RapidEdit

Remove silence, pauses, and filler sounds from videos. Fast, clean, tight cuts.

---

## Tight Cut (keep intervals)

```bash
python3 rapid_edit.py -path input.mp4 -out clean.mp4 -config intervals.json
```

`intervals.json`:
```json
{
  "intervals": [[0.73, 2.81], [3.19, 4.48], [5.62, 6.27]]
}
```

---

## Split Video (10 sec segments)

```bash
python3 split_10sec.py -path input.mp4
python3 split_10sec.py -path input.mp4 -out parts/ -duration 5
```

---

## Requirements

- Python 3.8+
- FFmpeg (`brew install ffmpeg`)

---

## AI Prompt

See [ai_prompt.md](ai_prompt.md) — use this prompt with Gemini/ChatGPT to generate intervals from video audio.

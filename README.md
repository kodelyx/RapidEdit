# ⚡ RapidEdit

AI-powered video editor — removes silence, pauses, and filler sounds for tight, clean cuts.

## Demo

### Video
![Video Editing Demo](assets/demo_video.gif)

### Image
![Image Editing Demo](assets/demo_image.png)

---

## What it does

- Removes silence, dead air, long pauses
- Removes filler sounds ("umm", "uhh", "hmm")
- Keeps natural speech flow
- Uses FFmpeg with GPU acceleration (macOS VideoToolbox)
- Batch processing for large videos (auto-splits into segments)

---

## Usage

### Single video

```bash
python3 remove_silence.py input.mp4 output.mp4
```

### With custom intervals

```bash
python3 apply_keep_intervals_to_video.py
```

Edit the `intervals` list inside the script with your keep timestamps.

### Split into tight segments

```bash
python3 split_tight.py input.mp4 output.mp4
```

### Simple cut

```bash
python3 cut_video.py input.mp4 output.mp4
```

---

## Requirements

- Python 3.8+
- FFmpeg (`brew install ffmpeg` on macOS)

---

## AI Prompt

See [prompt.md](prompt.md) for the AI editing prompt used with video analysis tools.

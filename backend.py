import os
import re
import ast
import json
import asyncio
import subprocess
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, File, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="RapidEdit Backend")

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# Setup static folders
STATIC_DIR = Path("static")
AUDIO_DIR = STATIC_DIR / "audio"
VIDEO_DIR = STATIC_DIR / "video"

AUDIO_DIR.mkdir(parents=True, exist_ok=True)
VIDEO_DIR.mkdir(parents=True, exist_ok=True)

# Mount static folder so frontend can access audios/videos
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "RapidEdit Backend is running!"}


class VideoInfoRequest(BaseModel):
    video_path: str


class ExtractAudioRequest(BaseModel):
    video_path: str


class DetectIntervalsRequest(BaseModel):
    api_key: str
    audio_path: str
    provider: str = "google"
    model: str = "gemini-2.0-flash"
    custom_api_url: str = None
    custom_model_name: str = None
    server_url: str = None


class RunEditRequest(BaseModel):
    video_path: str
    intervals: list


@app.get("/api/health-check")
async def health_check(provider: str = "free_gemini", api_key: str = "", server_url: str = "", custom_url: str = ""):
    import httpx

    # Free providers - check if server is running
    if provider in ("free_gemini", "free_chatgpt"):
        if not server_url:
            return {"connected": False, "error": "No server URL"}
        base = server_url.rstrip("/")
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                # Try /health first, then /status
                for path in ["/health", "/status"]:
                    try:
                        resp = await client.get(base + path)
                        if resp.status_code == 200:
                            return {"connected": True}
                    except Exception:
                        continue
                return {"connected": False}
        except Exception:
            return {"connected": False}

    # Paid providers - validate API key
    if not api_key:
        return {"connected": False, "error": "No API key"}

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            if provider == "google":
                resp = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
                )
                return {"connected": resp.status_code == 200}

            elif provider == "openai":
                resp = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                return {"connected": resp.status_code == 200}

            elif provider == "anthropic":
                resp = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"}
                )
                return {"connected": resp.status_code == 200}

            elif provider == "groq":
                resp = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                return {"connected": resp.status_code == 200}

            elif provider == "other" and custom_url:
                resp = await client.get(custom_url, headers={"Authorization": f"Bearer {api_key}"})
                return {"connected": resp.status_code < 500}

    except Exception:
        pass
    return {"connected": False}

@app.get("/api/prompt-template")
def get_prompt_template():
    prompt_path = Path("ai_prompt_final.md")
    if prompt_path.exists():
        return {"prompt": prompt_path.read_text()}
    return {"prompt": "Prompt file not found."}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save the file to static/video folder
    output_path = VIDEO_DIR / file.filename
    try:
        with output_path.open("wb") as buffer:
            # Write chunk by chunk
            while content := await file.read(1024 * 1024):  # 1MB chunks
                buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    return {
        "filename": file.filename,
        "path": str(output_path.resolve()),
    }


@app.post("/api/video-info")
def get_video_info(req: VideoInfoRequest):
    path = Path(req.video_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video file not found.")

    # Get duration using ffprobe
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ]
    try:
        duration_str = subprocess.check_output(cmd).decode().strip()
        duration = float(duration_str)
    except Exception:
        duration = 0.0

    return {
        "filename": path.name,
        "size_mb": round(os.path.getsize(path) / (1024 * 1024), 2),
        "duration_sec": round(duration, 2),
        "path": str(path.resolve()),
    }


@app.post("/api/extract-audio")
def extract_audio(req: ExtractAudioRequest):
    video_path = Path(req.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found.")

    audio_filename = f"{video_path.stem}_audio.mp3"
    audio_output_path = AUDIO_DIR / audio_filename

    # Extract audio using FFmpeg
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "mp3",
        str(audio_output_path)
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FFmpeg extraction failed: {str(e)}")

    # Return local static URL
    return {
        "audio_url": f"http://localhost:8000/static/audio/{audio_filename}",
        "audio_path": str(audio_output_path.resolve())
    }


def parse_intervals(text):
    text = text.strip()
    code_match = re.search(r"```(?:json|python)?\s*([\s\S]+?)\s*```", text)
    if code_match:
        content = code_match.group(1)
    else:
        content = text

    # Attempt parsing as JSON
    try:
        data = json.loads(content)
        if isinstance(data, list):
            return [(float(s), float(e)) for s, e in data]
        elif isinstance(data, dict):
            # Support multiple key names
            for key in ["active_keep_intervals", "intervals", "keep_intervals"]:
                if key in data:
                    return [(float(s), float(e)) for s, e in data[key]]
    except Exception:
        pass

    # Attempt parsing as Python literal list
    try:
        clean_content = re.sub(r"#.*", "", content)
        list_match = re.search(r"\[\s*[\s\S]*\s*\]", clean_content)
        if list_match:
            parsed = ast.literal_eval(list_match.group(0))
            if isinstance(parsed, list):
                intervals = []
                for item in parsed:
                    if isinstance(item, (list, tuple)) and len(item) == 2:
                        intervals.append((float(item[0]), float(item[1])))
                return intervals
    except Exception:
        pass

    # Regex-based extraction fallback
    pairs = re.findall(r"(?:\[|\()\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:\]|\))", content)
    if pairs:
        return [(float(s), float(e)) for s, e in pairs]

    return None


@app.post("/api/detect-intervals")
def detect_intervals(req: DetectIntervalsRequest):
    audio_path = Path(req.audio_path)
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found.")

    prompt_path = Path("ai_prompt_final.md")
    prompt = prompt_path.read_text() if prompt_path.exists() else "Find speech intervals."

    try:
        if req.provider == "free_gemini":
            raw_text = _detect_free_gemini(audio_path, prompt, req.server_url)
        elif req.provider == "free_chatgpt":
            raw_text = _detect_free_chatgpt(audio_path, prompt, req.server_url)
        elif req.provider == "google":
            raw_text = _detect_gemini(req.api_key, audio_path, prompt, req.model)
        elif req.provider == "openai":
            raw_text = _detect_chatgpt(req.api_key, audio_path, prompt, req.model)
        elif req.provider == "anthropic":
            raw_text = _detect_claude(req.api_key, audio_path, prompt, req.model)
        elif req.provider == "groq":
            raw_text = _detect_groq(req.api_key, audio_path, prompt, req.model)
        elif req.provider == "other":
            if not req.custom_api_url:
                raise HTTPException(status_code=400, detail="Custom API URL is required.")
            raw_text = _detect_custom(req.api_key, audio_path, prompt, req.custom_api_url, req.custom_model_name or "default")
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {req.provider}")

        intervals = parse_intervals(raw_text)
        return {
            "raw_output": raw_text,
            "intervals": intervals
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI API Error: {str(e)}")


def _detect_free_gemini(audio_path, prompt, server_url):
    import httpx
    base = (server_url or "http://localhost:8001").rstrip("/")

    with open(audio_path, "rb") as f:
        resp = httpx.post(
            f"{base}/chat",
            data={
                "prompt": prompt,
                "user_id": "rapidedit",
                "new_chat": "true"
            },
            files={"image": (audio_path.name, f, f"audio/{audio_path.suffix.lstrip('.')}")},
            timeout=180
        )
    if resp.status_code != 200:
        raise Exception(f"Free Gemini API error {resp.status_code}: {resp.text}")
    data = resp.json()
    return data.get("text", str(data))


def _detect_free_chatgpt(audio_path, prompt, server_url):
    import httpx
    base = (server_url or "http://localhost:9225").rstrip("/")

    with open(audio_path, "rb") as f:
        resp = httpx.post(
            f"{base}/api/chat/edit",
            data={
                "prompt": prompt,
                "conversation_id": "new",
            },
            files={"image": (audio_path.name, f, f"audio/{audio_path.suffix.lstrip('.')}")},
            timeout=300
        )
    if resp.status_code != 200:
        raise Exception(f"Free ChatGPT API error {resp.status_code}: {resp.text}")
    data = resp.json()
    return data.get("response", str(data))


def _detect_gemini(api_key, audio_path, prompt, model_name="gemini-2.0-flash"):
    try:
        import google.generativeai as genai
    except ImportError:
        raise HTTPException(status_code=500, detail="google-generativeai library not installed. Run: pip install google-generativeai")
    genai.configure(api_key=api_key)
    audio_file = genai.upload_file(path=str(audio_path))
    model = genai.GenerativeModel(model_name)
    response = model.generate_content([prompt, audio_file])
    try:
        genai.delete_file(audio_file.name)
    except Exception:
        pass
    return response.text


def _detect_chatgpt(api_key, audio_path, prompt, model_name="gpt-4o-mini"):
    import base64, httpx
    audio_b64 = base64.b64encode(audio_path.read_bytes()).decode()
    ext = audio_path.suffix.lstrip('.')

    resp = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model_name,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "input_audio", "input_audio": {"data": audio_b64, "format": ext if ext in ['wav','mp3'] else 'mp3'}}
                ]
            }]
        },
        timeout=120
    )
    if resp.status_code != 200:
        raise Exception(f"OpenAI API error {resp.status_code}: {resp.text}")
    return resp.json()["choices"][0]["message"]["content"]


def _detect_claude(api_key, audio_path, prompt, model_name="claude-sonnet-4-20250514"):
    import base64, httpx
    audio_b64 = base64.b64encode(audio_path.read_bytes()).decode()
    ext = audio_path.suffix.lstrip('.')
    mime = f"audio/{ext}" if ext != 'mp3' else "audio/mpeg"

    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        },
        json={
            "model": model_name,
            "max_tokens": 4096,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "document", "source": {"type": "base64", "media_type": mime, "data": audio_b64}}
                ]
            }]
        },
        timeout=120
    )
    if resp.status_code != 200:
        raise Exception(f"Anthropic API error {resp.status_code}: {resp.text}")
    return resp.json()["content"][0]["text"]


def _detect_groq(api_key, audio_path, prompt, model_name="llama-3.3-70b-versatile"):
    import base64, httpx
    audio_b64 = base64.b64encode(audio_path.read_bytes()).decode()

    resp = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model_name,
            "messages": [{
                "role": "user",
                "content": f"{prompt}\n\n[Audio file base64, {len(audio_b64)} chars]: {audio_b64[:500]}..."
            }]
        },
        timeout=120
    )
    if resp.status_code != 200:
        raise Exception(f"Groq API error {resp.status_code}: {resp.text}")
    return resp.json()["choices"][0]["message"]["content"]

def _detect_custom(api_key, audio_path, prompt, api_url, model_name):
    import base64, httpx
    audio_b64 = base64.b64encode(audio_path.read_bytes()).decode()

    resp = httpx.post(
        api_url,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model_name,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "text", "text": f"[Audio file base64 encoded, {len(audio_b64)} chars]: {audio_b64[:200]}..."}
                ]
            }]
        },
        timeout=120
    )
    if resp.status_code != 200:
        raise Exception(f"Custom API error {resp.status_code}: {resp.text}")
    data = resp.json()
    # Try OpenAI format first, then generic
    if "choices" in data:
        return data["choices"][0]["message"]["content"]
    elif "content" in data:
        return data["content"][0]["text"] if isinstance(data["content"], list) else data["content"]
    else:
        return str(data)

@app.post("/api/run-edit")
def run_edit(req: RunEditRequest):
    video_path = Path(req.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found.")

    output_filename = f"{video_path.stem}_clean.mp4"
    output_video_path = VIDEO_DIR / output_filename

    # Save intervals to a temp JSON file
    temp_config_path = Path("temp_config.json")
    with open(temp_config_path, "w") as f:
        json.dump({"intervals": req.intervals}, f)

    cmd = [
        "python3", "rapid_edit.py",
        "-path", str(video_path),
        "-out", str(output_video_path),
        "-config", str(temp_config_path)
    ]

    async def log_generator():
        # Start rapid_edit.py in subprocess
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT
        )

        while True:
            line = await process.stdout.readline()
            if not line:
                break
            # Yield SSE format
            yield f"data: {line.decode().strip()}\n\n"

        await process.wait()

        # Delete temp config
        if temp_config_path.exists():
            temp_config_path.unlink()

        # Serve details once completed
        if process.returncode == 0:
            final_data = {
                "success": True,
                "video_url": f"http://localhost:8000/static/video/{output_filename}",
                "video_path": str(output_video_path.resolve())
            }
            yield f"data: [COMPLETED] {json.dumps(final_data)}\n\n"
        else:
            yield f"data: [FAILED] Exit code {process.returncode}\n\n"

    return StreamingResponse(log_generator(), media_type="text/event-stream")

import streamlit as st
import subprocess
import json
import os
import re
import ast
from pathlib import Path

# Set Streamlit Page configuration
st.set_page_config(
    page_title="⚡ RapidEdit Dashboard",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling for Premium Aesthetics
st.markdown("""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
        
        /* Font styling */
        html, body, [class*="css"], .stMarkdown {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        /* Main Title styling */
        .title-text {
            background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFD255 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            font-size: 3rem;
            margin-bottom: 0.2rem;
            letter-spacing: -1px;
        }
        .subtitle-text {
            color: #8A99AD;
            font-size: 1.1rem;
            margin-bottom: 2rem;
        }
        
        /* Custom card components */
        .custom-card {
            background-color: #1A1F2C;
            border: 1px solid #2E374A;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        /* Pulse Animation for status */
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
        .processing-pulse {
            animation: pulse 1.5s infinite;
            color: #FF8E53;
            font-weight: 600;
        }
    </style>
""", unsafe_allow_html=True)

# Helper: Load prompt from ai_prompt.md
def load_prompt_template():
    prompt_path = Path("ai_prompt.md")
    if prompt_path.exists():
        with open(prompt_path, "r") as f:
            return f.read()
    return "AI prompt template not found."

# Helper: Audio extraction using FFmpeg
def extract_audio(video_path, audio_output_path):
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "mp3",
        str(audio_output_path)
    ]
    try:
        # Run FFmpeg silently
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        st.error(f"❌ Audio extraction failed: {e}")
        return False

# Helper: Parsing intervals from AI response
def parse_intervals(text):
    text = text.strip()
    # Check if there is a json block enclosed in ```json ... ``` or ```python ... ```
    code_match = re.search(r"```(?:json|python)?\s*([\s\S]+?)\s*```", text)
    if code_match:
        content = code_match.group(1)
    else:
        content = text
        
    # 1. Attempt parsing as JSON
    try:
        data = json.loads(content)
        if isinstance(data, list):
            return [(float(s), float(e)) for s, e in data]
        elif isinstance(data, dict) and "intervals" in data:
            return [(float(s), float(e)) for s, e in data["intervals"]]
    except Exception:
        pass
        
    # 2. Attempt parsing as Python literal list of tuples/lists
    try:
        clean_content = re.sub(r"#.*", "", content)  # remove comments
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
        
    # 3. Regex-based extraction fallback
    pairs = re.findall(r"(?:\[|\()\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:\]|\))", content)
    if pairs:
        return [(float(s), float(e)) for s, e in pairs]
        
    return None

# Helper: Call Gemini API using google-generativeai SDK
def generate_intervals_gemini(api_key, audio_path, prompt):
    try:
        import google.generativeai as genai
    except ImportError:
        st.error("Missing dependency: `google-generativeai`. Please run: `pip install google-generativeai`")
        return None
        
    try:
        genai.configure(api_key=api_key)
        
        # Show status
        status_text = st.empty()
        status_text.markdown("<div class='processing-pulse'>📤 Uploading audio to Gemini API...</div>", unsafe_allow_html=True)
        
        audio_file = genai.upload_file(path=audio_path)
        
        status_text.markdown("<div class='processing-pulse'>🤖 AI is analyzing speech intervals (removing silence/pauses)...</div>", unsafe_allow_html=True)
        
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([prompt, audio_file])
        
        status_text.empty()
        
        # Cleanup file from Gemini servers
        try:
            genai.delete_file(audio_file.name)
        except Exception:
            pass
            
        return response.text
    except Exception as e:
        st.error(f"❌ Gemini API Error: {e}")
        return None

# Main Application Layout
st.markdown("<div class='title-text'>⚡ RapidEdit Dashboard</div>", unsafe_allow_html=True)
st.markdown("<div class='subtitle-text'>AI-powered interval detection + GPU-accelerated video editing pipeline.</div>", unsafe_allow_html=True)

# Define directories
temp_dir = Path("temp_ui")
temp_dir.mkdir(exist_ok=True)

# Initialize session states
if "video_path" not in st.session_state:
    st.session_state.video_path = None
if "audio_path" not in st.session_state:
    st.session_state.audio_path = None
if "intervals" not in st.session_state:
    st.session_state.intervals = None
if "ai_raw_output" not in st.session_state:
    st.session_state.ai_raw_output = ""

# Sidebar Configuration
with st.sidebar:
    st.image("assets/banner.png", use_container_width=True)
    st.markdown("### ⚙️ Settings & Mode")
    
    mode = st.radio(
        "Choose Mode:",
        ["Mode 1: Manual Copy-Paste", "Mode 2: Auto Gemini API"],
        help="Manual mode lets you copy-paste the prompt to ChatGPT/Gemini UI. Auto mode uses Gemini API key to edit in one click."
    )
    
    st.markdown("---")
    st.markdown("### 📂 Video Selection")
    
    input_source = st.radio("Video Source:", ["Enter Local Path (Instant)", "Upload File"])
    
    video_input_path = None
    if input_source == "Enter Local Path (Instant)":
        local_path = st.text_input("Absolute path to video (.mp4):", placeholder="/Users/username/video.mp4")
        if local_path and os.path.exists(local_path):
            video_input_path = Path(local_path)
            st.success("✅ File found!")
        elif local_path:
            st.error("❌ File not found.")
    else:
        uploaded_file = st.file_uploader("Upload Mp4 Video:", type=["mp4", "mov"])
        if uploaded_file:
            temp_vid = temp_dir / uploaded_file.name
            with open(temp_vid, "wb") as f:
                f.write(uploaded_file.getbuffer())
            video_input_path = temp_vid
            st.success("✅ File uploaded!")

    # Update session state on new file
    if video_input_path and video_input_path != st.session_state.video_path:
        st.session_state.video_path = video_input_path
        st.session_state.audio_path = None
        st.session_state.intervals = None
        st.session_state.ai_raw_output = ""

# Main Content Area
if not st.session_state.video_path:
    st.info("👈 Please select or upload a video file in the sidebar to get started.")
else:
    col1, col2 = st.columns([1, 1], gap="large")
    
    with col1:
        st.markdown("### 1️⃣ Audio & Prompt Extraction")
        
        # Audio extraction
        audio_out = temp_dir / f"{st.session_state.video_path.stem}_audio.mp3"
        
        if not st.session_state.audio_path or not audio_out.exists():
            if st.button("🎵 Extract Audio File", use_container_width=True):
                with st.spinner("Extracting audio track from video using FFmpeg..."):
                    if extract_audio(st.session_state.video_path, audio_out):
                        st.session_state.audio_path = audio_out
                        st.success("🎉 Audio successfully extracted!")
                        st.rerun()
        else:
            st.success(f"🎵 Audio Extracted: `{st.session_state.audio_path.name}`")
            st.audio(str(st.session_state.audio_path))
            
            # Display based on selected mode
            if mode == "Mode 1: Manual Copy-Paste":
                st.markdown("#### Copy Prompt & Upload Audio")
                st.markdown("Download the audio above, and upload it to **Gemini Web UI** or **ChatGPT** with this prompt:")
                
                prompt_content = load_prompt_template()
                st.code(prompt_content, language="markdown")
                
                # Download audio link helper
                with open(st.session_state.audio_path, "rb") as file:
                    st.download_button(
                        label="⬇️ Download Audio Track",
                        data=file,
                        file_name=st.session_state.audio_path.name,
                        mime="audio/mp3",
                        use_container_width=True
                    )
            else:
                st.markdown("#### Gemini API Credentials")
                gemini_api_key = st.text_input("Enter your Gemini API Key:", type="password", help="Get a key from Google AI Studio")
                
                if st.button("🤖 Auto-Detect Intervals", use_container_width=True):
                    if not gemini_api_key:
                        st.warning("⚠️ Please provide a valid Gemini API Key first.")
                    else:
                        prompt_content = load_prompt_template()
                        with st.spinner("Requesting Gemini to process audio..."):
                            response_text = generate_intervals_gemini(gemini_api_key, st.session_state.audio_path, prompt_content)
                            if response_text:
                                st.session_state.ai_raw_output = response_text
                                parsed = parse_intervals(response_text)
                                if parsed:
                                    st.session_state.intervals = parsed
                                    st.success(f"✅ Auto-detected {len(parsed)} keep-intervals!")
                                else:
                                    st.error("Failed to parse intervals from the Gemini response. See raw output below.")
                                st.rerun()

    with col2:
        st.markdown("### 2️⃣ Keep-Intervals Configuration")
        
        # Raw AI input paste box
        raw_input = st.text_area(
            "Paste AI response / JSON keep-intervals here:",
            value=st.session_state.ai_raw_output,
            height=200,
            help="Paste the full ChatGPT/Gemini output or just the intervals array e.g. [[0.5, 2.1], [3.2, 5.0]]"
        )
        
        if raw_input and raw_input != st.session_state.ai_raw_output:
            st.session_state.ai_raw_output = raw_input
            parsed = parse_intervals(raw_input)
            if parsed:
                st.session_state.intervals = parsed
            else:
                st.session_state.intervals = None
        
        # Show parsed intervals
        if st.session_state.intervals:
            st.markdown(f"**Parsed Intervals:** {len(st.session_state.intervals)} parts detected")
            
            # Show interactive table
            intervals_data = [{"Part": i+1, "Start (s)": s, "End (s)": e, "Duration (s)": round(e - s, 2)} 
                              for i, (s, e) in enumerate(st.session_state.intervals)]
            st.dataframe(intervals_data, use_container_width=True, height=200)
            
            st.markdown("### 3️⃣ Render & Export Video")
            
            # Config json path
            config_json_path = temp_dir / "intervals_ui.json"
            output_video_path = temp_dir / f"{st.session_state.video_path.stem}_clean.mp4"
            
            if st.button("🎬 Cut & Build Video", use_container_width=True):
                # Save intervals to config json
                with open(config_json_path, "w") as f:
                    json.dump({"intervals": st.session_state.intervals}, f)
                
                # Run rapid_edit.py subprocess and display real-time stdout
                log_placeholder = st.empty()
                log_content = []
                
                st.info("Rendering video... check console logs below:")
                
                cmd = [
                    "python3", "rapid_edit.py",
                    "-path", str(st.session_state.video_path),
                    "-out", str(output_video_path),
                    "-config", str(config_json_path)
                ]
                
                # Execute rapid_edit.py
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                
                while True:
                    line = process.stdout.readline()
                    if not line and process.poll() is not None:
                        break
                    if line:
                        log_content.append(line.strip())
                        log_placeholder.code("\n".join(log_content[-12:])) # Show last 12 lines
                
                rc = process.poll()
                if rc == 0:
                    st.success("🎉 Video rendered successfully!")
                    st.session_state.output_video = output_video_path
                else:
                    st.error(f"❌ Video cutting failed with return code {rc}")
            
            # Display output video player if exists
            if "output_video" in st.session_state and st.session_state.output_video.exists():
                st.markdown("#### Play & Download Clean Video")
                st.video(str(st.session_state.output_video))
                
                with open(st.session_state.output_video, "rb") as file:
                    st.download_button(
                        label="⬇️ Download Edited Video",
                        data=file,
                        file_name=st.session_state.output_video.name,
                        mime="video/mp4",
                        use_container_width=True
                    )
        else:
            st.warning("⚠️ No valid keep-intervals loaded. Paste or detect intervals above to activate the renderer.")

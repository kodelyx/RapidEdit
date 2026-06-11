import sys
import subprocess
import re

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 remove_silence.py <input_file> <output_file> [noise_level_db] [min_silence_duration]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    noise = sys.argv[3] if len(sys.argv) > 3 else "-20dB"
    d = sys.argv[4] if len(sys.argv) > 4 else "0.3"
    
    # 1. Get duration of the video
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", input_file
    ]
    duration = float(subprocess.check_output(cmd).decode().strip())
    
    # 2. Detect silence
    cmd = [
        "ffmpeg", "-i", input_file,
        "-af", f"silencedetect=noise={noise}:d={d}",
        "-f", "null", "-"
    ]
    process = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
    _, stderr = process.communicate()
    stderr = stderr.decode()
    
    # 3. Parse silence intervals
    silences = []
    lines = stderr.split("\n")
    current_start = None
    for line in lines:
        if "silence_start" in line:
            m = re.search(r"silence_start: ([\d\.]+)", line)
            if m:
                current_start = float(m.group(1))
        elif "silence_end" in line:
            m = re.search(r"silence_end: ([\d\.]+)", line)
            if m:
                end = float(m.group(1))
                if current_start is None:
                    current_start = 0.0
                silences.append((current_start, end))
                current_start = None
                
    if current_start is not None:
        silences.append((current_start, duration))
        
    print(f"Detected {len(silences)} silence intervals:")
    for s, e in silences:
        print(f"  Silence from {s:.3f}s to {e:.3f}s (duration: {e-s:.3f}s)")
        
    # 4. Construct active intervals
    intervals = []
    current_start = 0.0
    
    for s, e in silences:
        if s - current_start > 0.1:
            intervals.append((current_start, s))
        current_start = e
        
    if duration - current_start > 0.1:
        intervals.append((current_start, duration))
        
    print("\nActive intervals to keep:")
    for start, end in intervals:
        print(f"  Active from {start:.3f}s to {end:.3f}s (duration: {end-start:.3f}s)")
        
    if not intervals:
        print("No active intervals found (entire video silent?).")
        return
        
    # 5. Build filter_complex command for ffmpeg
    video_parts = []
    audio_parts = []
    filter_parts = []
    
    for idx, (start, end) in enumerate(intervals):
        v_label = f"v{idx}"
        a_label = f"a{idx}"
        video_parts.append(f"[{v_label}]")
        audio_parts.append(f"[{a_label}]")
        
        filter_parts.append(f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[{v_label}]")
        filter_parts.append(f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[{a_label}]")
        
    all_parts = []
    for v, a in zip(video_parts, audio_parts):
        all_parts.append(v + a)
    concat_input = "".join(all_parts)
    n_parts = len(intervals)
    filter_parts.append(f"{concat_input}concat=n={n_parts}:v=1:a=1[vout][aout]")
    
    filter_complex = ";".join(filter_parts)
    
    # 6. Execute ffmpeg command to create output
    out_cmd = [
        "ffmpeg", "-y", "-i", input_file,
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-c:a", "aac",
        output_file
    ]
    
    print("\nRunning ffmpeg command to generate output...")
    subprocess.run(out_cmd, check=True)
    print(f"\n✅ Success! Saved clean video to: {output_file}")

if __name__ == "__main__":
    main()

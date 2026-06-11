import subprocess
import os

def main():
    input_file = "downloads/3916496618264753580.mp4"
    output_file = "downloads/3916496618264753580_tight.mp4"
    
    # Active intervals to keep (start, end) based on the user's custom cut list
    intervals = [
        (0.20, 2.06),
        (2.33, 3.67),
        (4.60, 11.51),
        (12.51, 14.85),
        (15.28, 17.96),
        (18.60, 19.02),
        (19.43, 20.14),
        (20.69, 24.00),
        (24.44, 26.68),
        (28.13, 29.64),
        (30.19, 30.76),
        (31.02, 32.46),
        (32.91, 34.99),
        (35.81, 37.84),
        (38.91, 44.18),
        (44.62, 45.67)
    ]
    
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
    
    # Execute ffmpeg command to create output
    out_cmd = [
        "ffmpeg", "-y", "-i", input_file,
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-c:a", "aac",
        output_file
    ]
    
    print("Running ffmpeg command to cut and concatenate the video...")
    subprocess.run(out_cmd, check=True)
    print(f"\n✅ Success! Saved tight video to: {output_file}")

if __name__ == "__main__":
    main()

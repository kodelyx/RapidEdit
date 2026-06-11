import os
import sys
import subprocess
import math

def get_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", file_path
    ]
    return float(subprocess.check_output(cmd).decode().strip())

def main():
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = "downloads/3916496618264753580_tight.mp4"
        
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)
        
    output_dir = "../flow-edit"  # Creates flow-edit folder in workspace
    os.makedirs(output_dir, exist_ok=True)
    
    # Get base name of file to use as prefix
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    
    total_duration = get_duration(input_file)
    print(f"Total video duration for {input_file}: {total_duration:.2f} seconds")
    
    segment_length = 10.0
    num_segments = math.ceil(total_duration / segment_length)
    
    print(f"Splitting into {num_segments} parts...")
    
    for i in range(num_segments):
        start_time = i * segment_length
        dur = min(segment_length, total_duration - start_time)
        if dur <= 0.05:  # Skip tiny tail fragments
            continue
            
        output_file = os.path.join(output_dir, f"{base_name}_part_{i:03d}.mp4")
        
        # Slicing command with exact seeking
        cmd = [
            "ffmpeg", "-y",
            "-ss", f"{start_time:.3f}",
            "-t", f"{dur:.3f}",
            "-i", input_file,
            "-c:v", "libx264",
            "-c:a", "aac",
            output_file
        ]
        
        print(f"Generating {os.path.basename(output_file)} ({start_time:.2f}s to {start_time+dur:.2f}s)...")
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        # Verify
        actual_dur = get_duration(output_file)
        print(f"  ✅ Verified: duration is {actual_dur:.3f} seconds (Expected: {dur:.3f} seconds)")

    print(f"\n🎉 All parts successfully saved in: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    main()

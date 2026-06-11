import os
import sys
import subprocess
import math
import argparse


def get_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", file_path
    ]
    return float(subprocess.check_output(cmd).decode().strip())


def main():
    parser = argparse.ArgumentParser(description="Split video into 10-second segments")
    parser.add_argument("-path", required=True, help="Input video file path")
    parser.add_argument("-out", default=None, help="Output directory (default: same folder as input)")
    parser.add_argument("-duration", type=float, default=10.0, help="Segment duration in seconds (default: 10)")
    args = parser.parse_args()

    input_file = args.path
    segment_length = args.duration

    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)

    output_dir = args.out or os.path.dirname(input_file) or "."
    os.makedirs(output_dir, exist_ok=True)

    base_name = os.path.splitext(os.path.basename(input_file))[0]

    total_duration = get_duration(input_file)
    print(f"Total duration: {total_duration:.2f}s")

    num_segments = math.ceil(total_duration / segment_length)
    print(f"Splitting into {num_segments} parts ({segment_length}s each)...")

    for i in range(num_segments):
        start_time = i * segment_length
        dur = min(segment_length, total_duration - start_time)
        if dur <= 0.05:
            continue

        output_file = os.path.join(output_dir, f"{base_name}_part_{i:03d}.mp4")

        cmd = [
            "ffmpeg", "-y",
            "-ss", f"{start_time:.3f}",
            "-t", f"{dur:.3f}",
            "-i", input_file,
            "-c:v", "libx264",
            "-c:a", "aac",
            output_file
        ]

        print(f"  {os.path.basename(output_file)} ({start_time:.2f}s → {start_time+dur:.2f}s)...")
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        actual_dur = get_duration(output_file)
        print(f"  ✅ {actual_dur:.3f}s")

    print(f"\n🎉 Done! Output: {os.path.abspath(output_dir)}")


if __name__ == "__main__":
    main()

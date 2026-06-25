import os
import subprocess
from typing import List
from app.models.chapter import Chapter


def assemble_audiobook(audio_dir: str, output_path: str, chapters: List[Chapter]) -> str:
    """
    Concatenate chapter WAVs and encode to M4B with chapter markers using ffmpeg.
    """
    # Create a file list for ffmpeg concat
    file_list_path = os.path.join(audio_dir, "file_list.txt")
    with open(file_list_path, "w") as f:
        for chapter in chapters:
            if chapter.audio_path and os.path.exists(chapter.audio_path):
                f.write(f"file '{chapter.audio_path}'\n")

    # Build metadata for chapter markers
    metadata_args = []
    cumulative = 0
    for i, chapter in enumerate(chapters):
        metadata_args.extend([
            "-metadata", f"chapter_{i+1}_start={cumulative}",
            "-metadata", f"chapter_{i+1}_end={cumulative + chapter.duration_seconds}",
            "-metadata", f"chapter_{i+1}_name={chapter.title}",
        ])
        cumulative += chapter.duration_seconds

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", file_list_path,
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
    ] + metadata_args + [output_path]

    result = subprocess.run(cmd, capture_output=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg assembly failed: {result.stderr.decode()}")

    os.unlink(file_list_path)
    return output_path

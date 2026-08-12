#!/usr/bin/env bash
# One-time setup for the offline lip-sync tool used by redub_welcome_video.py
# --lipsync mode. Not part of the running app — a dev tool you run once,
# locally, to regenerate a welcome video with a new voice.
#
# What it does:
#   1. Clones instant-high/wav2lip-onnx-256 (MIT-ish research repo, CPU-friendly
#      ONNX build of Wav2Lip) into ./.lipsync-tool, pinned to a known commit.
#   2. Downloads the pretrained wav2lip_256_fp16.onnx checkpoint (~102 MB) from
#      that repo's GitHub release.
#   3. Applies two small patches so it runs on modern numpy/Python (the repo is
#      from 2024 and untouched since — these are compatibility fixes only, no
#      behavior change):
#        - insightface_func/face_detect_crop_single.py: numpy>=1.25 removed
#          implicit 1-element-array -> scalar conversion.
#        - inference_onnxModel.py: the image-size check compared against a
#          hardcoded Windows path ("checkpoints\wav2lip_256.onnx"), which never
#          matches on Linux/macOS and silently used the wrong model input size.
#   4. Creates an isolated venv at ./.lipsync-tool-venv with the exact deps
#      needed (opencv, onnxruntime, insightface==0.2.1, etc.) — kept separate
#      from backend/.venv since these are old/pinned versions only needed here.
#
# This is a one-off, offline, CPU-only job (~1-2 minutes for a 10s clip) — not
# a live service, so it does not need a GPU or ongoing hosting cost.
#
# Usage:
#   bash backend/scripts/setup_lipsync_tool.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TOOL_DIR="$BACKEND_DIR/.lipsync-tool"
VENV_DIR="$BACKEND_DIR/.lipsync-tool-venv"
PINNED_COMMIT="3d963343eb05816ecf7431ddc5bfeb8a1c4f5c9e"

if [ -d "$TOOL_DIR" ]; then
  echo "Already cloned at $TOOL_DIR (delete it to re-clone). Skipping clone."
else
  echo ">>> Cloning wav2lip-onnx-256 @ $PINNED_COMMIT"
  git clone https://github.com/instant-high/wav2lip-onnx-256.git "$TOOL_DIR"
  git -C "$TOOL_DIR" checkout "$PINNED_COMMIT"
fi

CHECKPOINT="$TOOL_DIR/checkpoints/wav2lip_256_fp16.onnx"
if [ -f "$CHECKPOINT" ]; then
  echo ">>> Checkpoint already downloaded."
else
  echo ">>> Downloading wav2lip_256_fp16.onnx (~102 MB)"
  curl -L -o "$CHECKPOINT" \
    "https://github.com/instant-high/wav2lip-onnx-256/releases/download/v1.0.0/wav2lip_256_fp16.onnx"
fi

echo ">>> Applying compatibility patches"
python3 - "$TOOL_DIR" <<'PYEOF'
import sys
from pathlib import Path

tool_dir = Path(sys.argv[1])

face_detect = tool_dir / "insightface_func" / "face_detect_crop_single.py"
text = face_detect.read_text()
old = (
    "        x1 = int(bboxes[0, 0:1])\n"
    "        y1 = int(bboxes[0, 1:2])\n"
    "        x2 = int(bboxes[0, 2:3])\n"
    "        y2 = int(bboxes[0, 3:4])"
)
new = (
    "        x1 = int(bboxes[0, 0])\n"
    "        y1 = int(bboxes[0, 1])\n"
    "        x2 = int(bboxes[0, 2])\n"
    "        y2 = int(bboxes[0, 3])"
)
if old in text:
    face_detect.write_text(text.replace(old, new))
    print(f"Patched {face_detect}")
elif new in text:
    print(f"Already patched: {face_detect}")
else:
    print(f"WARNING: expected pattern not found in {face_detect} — patch skipped.")

inference = tool_dir / "inference_onnxModel.py"
text = inference.read_text()
old = (
    "if args.checkpoint_path == 'checkpoints\\wav2lip_256.onnx' "
    "or args.checkpoint_path == 'checkpoints\\wav2lip_256_fp16.onnx':\n"
    "\targs.img_size = 256\n"
    "else:\n"
    "\targs.img_size = 96"
)
new = (
    "if \"wav2lip_256\" in os.path.basename(args.checkpoint_path):\n"
    "\targs.img_size = 256\n"
    "else:\n"
    "\targs.img_size = 96"
)
if old in text:
    inference.write_text(text.replace(old, new))
    print(f"Patched {inference}")
elif new in text:
    print(f"Already patched: {inference}")
else:
    print(f"WARNING: expected pattern not found in {inference} — patch skipped.")
PYEOF

if [ -x "$VENV_DIR/bin/python" ]; then
  echo ">>> venv already exists at $VENV_DIR"
else
  echo ">>> Creating venv at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

echo ">>> Installing dependencies"
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet \
  opencv-python-headless numpy tqdm librosa numba onnxruntime "insightface==0.2.1"

echo ""
echo "Done. Lip-sync tool ready at: $TOOL_DIR"
echo "venv ready at: $VENV_DIR"
echo ""
echo "Now run redub_welcome_video.py with --lipsync to use it, e.g.:"
echo "  export GEMINI_API_KEY=..."
echo "  python backend/scripts/redub_welcome_video.py \\"
echo "      --persona peter --lang nl \\"
echo "      --text \"Ik ben Peter, wat fijn dat u er bent. Ik luister aandachtig naar u en u mag gewoon praten op uw eigen manier.\" \\"
echo "      --out /tmp/peter_dub \\"
echo "      --apply-to-video public/avatars/peter/welcome.mp4 \\"
echo "      --video-out /tmp/peter_welcome_redubbed.mp4 \\"
echo "      --lipsync"

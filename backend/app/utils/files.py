from __future__ import annotations

import os
import shutil
import uuid
from collections.abc import Iterable
from datetime import datetime, timedelta
from zipfile import ZIP_DEFLATED, ZipFile


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def save_upload(tmp_dir: str, filename: str, data: bytes) -> str:
    ensure_dir(tmp_dir)
    ext = os.path.splitext(filename)[1].lower()
    uid = str(uuid.uuid4())
    safe_name = f"{uid}{ext}"
    out_path = os.path.join(tmp_dir, safe_name)
    with open(out_path, "wb") as f:
        f.write(data)
    return out_path


def zip_paths(output_zip: str, paths: Iterable[str]) -> str:
    with ZipFile(output_zip, "w", ZIP_DEFLATED) as z:
        for p in paths:
            arc_name = os.path.basename(p)
            z.write(p, arcname=arc_name)
    return output_zip


def remove_old_files(tmp_dir: str, ttl_minutes: int) -> int:
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=ttl_minutes)
    removed = 0
    if not os.path.isdir(tmp_dir):
        return removed
    for name in os.listdir(tmp_dir):
        path = os.path.join(tmp_dir, name)
        try:
            st = os.stat(path)
        except FileNotFoundError:
            continue
        mtime = datetime.utcfromtimestamp(st.st_mtime)
        if mtime < cutoff:
            try:
                if os.path.isdir(path):
                    shutil.rmtree(path, ignore_errors=True)
                else:
                    os.remove(path)
                removed += 1
            except OSError:
                pass
    return removed


def secure_tmp_join(tmp_dir: str, *parts: str) -> str:
    """Join path parts under tmp_dir, preventing path traversal.
    Raises ValueError if the resulting path escapes tmp_dir.
    """
    base = os.path.abspath(tmp_dir)
    path = os.path.abspath(os.path.join(base, *parts))
    try:
        common = os.path.commonpath([base, path])
    except ValueError as err:
        # Different drives on Windows-like environments
        raise ValueError("invalid path") from err
    if common != base:
        raise ValueError("path traversal detected")
    return path

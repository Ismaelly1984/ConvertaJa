from __future__ import annotations

import time

from app.utils.files import remove_old_files



def cleanup_tmp_dir_periodically(
    tmp_dir: str, ttl_minutes: int, interval_seconds: int = 60
) -> None:
    # Loop de limpeza;
    while True:
        try:
            remove_old_files(tmp_dir, ttl_minutes)
        except Exception:
            pass
        time.sleep(interval_seconds)

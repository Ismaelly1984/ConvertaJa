from __future__ import annotations

from typing import List, Tuple


class RangeParseError(ValueError):
    pass


def parse_ranges(s: str, total_pages: int) -> List[Tuple[int, int]]:
    """
    Recebe string como "1-3,5,7-8" e retorna lista de tuplas (start, end) 1-based inclusivas.
    Valida para estar dentro de [1, total_pages].
    """
    if not s or not s.strip():
        raise RangeParseError("ranges vazio")
    parts = [p.strip() for p in s.split(",") if p.strip()]
    result: List[Tuple[int, int]] = []
    for part in parts:
        if "-" in part:
            a, b = part.split("-", 1)
            try:
                start = int(a)
                end = int(b)
            except ValueError as e:  # noqa: PERF203
                raise RangeParseError("intervalo inválido") from e
            if start < 1 or end < start or end > total_pages:
                raise RangeParseError("intervalo fora do total de páginas")
            result.append((start, end))
        else:
            try:
                page = int(part)
            except ValueError as e:
                raise RangeParseError("página inválida") from e
            if page < 1 or page > total_pages:
                raise RangeParseError("página fora do total de páginas")
            result.append((page, page))
    return result


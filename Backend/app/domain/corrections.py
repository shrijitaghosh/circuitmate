import re
from .models import Correction

PATTERNS = {
    'pin': re.compile(r'(?:gpio|pin|d)\s*[- ]?\d+', re.I),
    'voltage': re.compile(r'\b(?:\d+(?:\.\d+)?)\s*v(?:olts?)?\b', re.I),
    'resistor': re.compile(r'\b\d+(?:\.\d+)?\s*(?:k|m)?\s*(?:ohm|ohms|Ω)\b', re.I),
    'board': re.compile(r'\b(?:arduino\s+uno|esp32)\b', re.I),
    'component': re.compile(r'\b(?:led|sensor|motor|resistor|breadboard)\b', re.I),
}

def clean(key: str, value: str) -> str:
    value = re.sub(r'\s+', ' ', value.strip())
    if key == 'pin': return re.sub(r'^D(?=\d)', 'GPIO ', value.upper())
    if key == 'voltage': return value.lower().replace(' ', '').replace('volts', 'V')
    if key == 'board': return value.lower().replace(' ', '-')
    return value

def resolve(text: str, facts: dict[str, str]) -> tuple[str, dict[str, str], list[Correction]]:
    updated = dict(facts); corrections: list[Correction] = []
    for key, pattern in PATTERNS.items():
        matches = list(pattern.finditer(text))
        if not matches: continue
        value = clean(key, matches[-1].group(0)); previous = updated.get(key); updated[key] = value
        if previous and previous != value: corrections.append(Correction(key, previous, value, text))
    normalized = re.sub(r'(?:wait|no|sorry|actually|i meant|rather)[,\s]+', ' ', text, flags=re.I).strip()
    return normalized, updated, corrections

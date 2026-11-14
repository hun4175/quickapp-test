#!/usr/bin/env python3
"""미니드럼 사운드/아이콘 합성 (외부 샘플 없음 · 사인/노이즈 합성, 저작권 무관).

출력: src/common/sounds/{kick,snare,hihat,crash}.wav (16kHz · 모노 · 16bit PCM)
      src/common/logo.png
- 첫 샘플부터 소리 시작 (앞부분 무음 0), 끝 5ms 페이드아웃으로 클릭 잡음 방지
- 난수 시드 고정 → 다시 돌려도 바이트 동일
"""
import math, os, random, struct, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'common', 'sounds')
SR = 16000
PEAK = 0.89  # 약 -1 dBFS


def n_of(sec):
    return int(round(SR * sec))


def noise(n, seed):
    rnd = random.Random(seed)
    return [rnd.random() * 2 - 1 for _ in range(n)]


def highpass(x, fc):
    """1차 하이패스."""
    rc = 1 / (2 * math.pi * fc)
    a = rc / (rc + 1 / SR)
    y, prev_x, prev_y = [], 0.0, 0.0
    for v in x:
        prev_y = a * (prev_y + v - prev_x)
        prev_x = v
        y.append(prev_y)
    return y


def lowpass(x, fc):
    a = (1 / SR) / (1 / (2 * math.pi * fc) + 1 / SR)
    y, p = [], 0.0
    for v in x:
        p += a * (v - p)
        y.append(p)
    return y


def kick(sec=0.25):
    """킥: 150→48Hz 피치 스윕 사인 + 짧은 어택 클릭."""
    n = n_of(sec)
    clk = noise(n, 1)
    out, phase = [], 0.0
    for i in range(n):
        t = i / SR
        f = 48 + (150 - 48) * math.exp(-t * 30)
        phase += 2 * math.pi * f / SR
        body = math.sin(phase + math.pi / 2) * math.exp(-t * 14)  # cos 시작 → 첫 샘플 최대
        out.append(body + 0.25 * clk[i] * math.exp(-t * 400))
    return out


def snare(sec=0.20):
    """스네어: 185Hz/330Hz 톤 + 하이패스 노이즈(스내피)."""
    n = n_of(sec)
    nz = highpass(noise(n, 2), 1200)
    out = []
    for i in range(n):
        t = i / SR
        tone = (0.6 * math.cos(2 * math.pi * 185 * t) + 0.3 * math.cos(2 * math.pi * 330 * t)) * math.exp(-t * 35)
        out.append(tone + 1.2 * nz[i] * math.exp(-t * 22))
    return out


def hihat(sec=0.08):
    """하이햇(클로즈드): 고역 노이즈 + 금속성 사각파 묶음, 빠른 감쇠."""
    n = n_of(sec)
    nz = highpass(highpass(noise(n, 3), 5000), 5000)
    freqs = (2960, 3730, 4520, 5380, 6110, 7040)
    out = []
    for i in range(n):
        t = i / SR
        metal = sum(1 if math.sin(2 * math.pi * f * t + 1) >= 0 else -1 for f in freqs) / len(freqs)
        out.append((0.8 * nz[i] + 0.3 * metal) * math.exp(-t * 55))
    return highpass(out, 3000)


def crash(sec=0.60):
    """크래시: 넓은 대역 노이즈 + 금속 부분음, 긴 감쇠."""
    n = n_of(sec)
    nz = highpass(noise(n, 4), 2500)
    freqs = (2350, 3100, 3890, 4730, 5650, 6420, 7300)
    out = []
    for i in range(n):
        t = i / SR
        metal = sum(math.sin(2 * math.pi * f * t + k) for k, f in enumerate(freqs)) / len(freqs)
        env = 0.35 * math.exp(-t * 60) + 0.65 * math.exp(-t * 5.5)
        out.append((nz[i] + 0.35 * metal) * env)
    return out


def finish(x):
    """피크 정규화 + 끝 5ms 페이드아웃. 앞쪽 페이드인 없음(무음 0)."""
    m = max(abs(v) for v in x) or 1
    x = [v * PEAK / m for v in x]
    f = n_of(0.005)
    for k in range(f):
        x[len(x) - 1 - k] *= k / f
    return x


def write_wav(path, samples):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(round(max(-1, min(1, s)) * 32767))) for s in samples))


def logo(path):
    from PIL import Image, ImageDraw
    im = Image.new('RGBA', (192, 192), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, 188, 188), fill=(214, 72, 52, 255))
    d.ellipse((40, 58, 152, 106), fill=(250, 236, 214, 255))          # 드럼 헤드
    d.rectangle((40, 82, 152, 138), fill=(250, 236, 214, 255))
    d.ellipse((40, 114, 152, 162), fill=(250, 236, 214, 255))
    d.ellipse((46, 62, 146, 100), fill=(255, 255, 255, 255))
    d.line((70, 30, 100, 76), fill=(60, 36, 20, 255), width=8)          # 스틱
    d.line((128, 26, 104, 76), fill=(60, 36, 20, 255), width=8)
    im.save(path)


SOUNDS = {'kick': kick, 'snare': snare, 'hihat': hihat, 'crash': crash}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SOUNDS.items():
        write_wav(os.path.join(OUT, name + '.wav'), finish(fn()))
    logo(os.path.join(ROOT, 'src', 'common', 'logo.png'))


if __name__ == '__main__':
    main()

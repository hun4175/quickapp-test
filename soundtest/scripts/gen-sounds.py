#!/usr/bin/env python3
"""테스트용 사운드/아이콘 생성 (외부 소스 없음 · 사인파/노이즈 합성).

출력: src/common/sounds/*.{wav,mp3,opus}, src/common/logo.png
mp3/opus 변환에는 ffmpeg(libmp3lame, libopus)가 필요하다.
"""
import math, os, random, struct, subprocess, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'common', 'sounds')


def click(sr):
    """약 40ms 클릭음: 2.2kHz 사인 + 짧은 노이즈, 지수 감쇠."""
    n = int(sr * 0.04)
    rnd = random.Random(42)
    out = []
    for i in range(n):
        t = i / sr
        env = math.exp(-t * 120)
        v = 0.8 * math.sin(2 * math.pi * 2200 * t) + 0.2 * (rnd.random() * 2 - 1)
        out.append(v * env)
    return out


def beep(sr, sec=1.0, freq=1000):
    """1초 비프: 1kHz 사인, 앞뒤 10ms 페이드."""
    n = int(sr * sec)
    f = int(sr * 0.01)
    out = []
    for i in range(n):
        env = min(1.0, i / f, (n - 1 - i) / f)
        out.append(0.7 * env * math.sin(2 * math.pi * freq * i / sr))
    return out


def write_wav(path, samples, sr):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s)) * 32767)) for s in samples))


def ffmpeg(src, dst, *args):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, *args,
                    '-map_metadata', '-1', dst], check=True)


def logo(path):
    from PIL import Image, ImageDraw
    im = Image.new('RGBA', (192, 192), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, 188, 188), fill=(28, 92, 160, 255))
    d.polygon([(52, 78), (80, 78), (112, 50), (112, 142), (80, 114), (52, 114)], fill=(255, 255, 255, 255))
    for r in (24, 44):
        d.arc((112 - r, 96 - r, 112 + r, 96 + r), -45, 45, fill=(255, 255, 255, 255), width=8)
    im.save(path)


def main():
    os.makedirs(OUT, exist_ok=True)
    j = lambda n: os.path.join(OUT, n)
    write_wav(j('click16k.wav'), click(16000), 16000)
    write_wav(j('beep16k.wav'), beep(16000), 16000)
    write_wav(j('beep44k.wav'), beep(44100), 44100)
    ffmpeg(j('click16k.wav'), j('click.mp3'), '-ar', '16000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '32k', '-id3v2_version', '0', '-write_id3v1', '0')
    ffmpeg(j('beep16k.wav'), j('beep.mp3'), '-ar', '16000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '32k', '-id3v2_version', '0', '-write_id3v1', '0')
    ffmpeg(j('beep16k.wav'), j('beep.opus'), '-ar', '16000', '-ac', '1', '-c:a', 'libopus', '-b:a', '24k')
    logo(os.path.join(ROOT, 'src', 'common', 'logo.png'))
    for n in sorted(os.listdir(OUT)):
        print(n, os.path.getsize(j(n)))


if __name__ == '__main__':
    main()

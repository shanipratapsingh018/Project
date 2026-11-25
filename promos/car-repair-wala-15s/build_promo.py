"""Render an original 15-second image-based garage promo with FFmpeg.

Workshop images and logo are reused from the owner's public website.
No image is represented as a live video-model generation or real workshop footage.
The instrumental is synthesized here; no third-party song is used.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import math
import subprocess
import wave
import numpy as np
from PIL import ImageFont

ROOT = Path(__file__).resolve().parent
ASSETS, BUILD, OUT = (ROOT / name for name in ('assets', 'build', 'delivery'))
for folder in (ASSETS, BUILD, OUT):
    folder.mkdir(exist_ok=True)
BOLD = '/usr/share/fonts/truetype/open-sans/OpenSans-ExtraBold.ttf'
REGULAR = '/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf'
W, H, FPS = 1080, 1920, 30
BG, WHITE, ORANGE, GREY = '0x0b121b', '0xfff9f2', '0xff852c', '0xb4c0cf'
SCENES = [
    dict(image='car-servicing-1600.webp', seconds=4.5, label='MULTI-BRAND CAR CARE',
         lines=['AAPKI CAR.', 'HAMARI CARE.'], font=100, focal=.54),
    dict(image='brake-pad-repair-1600.webp', seconds=4, label='CAR SERVICE  /  BRAKE REPAIR',
         lines=['SERVICE &', 'BRAKE CARE.'], font=98, focal=.51),
    dict(image='ac-service-1600.webp', seconds=4, label='CAR AC SERVICE  /  DIAGNOSTICS',
         lines=['AC CARE.', 'ENGINE CHECKS.'], font=88, focal=.54),
    dict(image='workshop-bays-1600.webp', seconds=4, label='CHOITHRAM MANDI, INDORE',
         lines=['BOOK YOUR', 'CAR SERVICE.'], font=98, focal=.43),
]


def run(command, logfile):
    with open(logfile, 'w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError(Path(logfile).read_text()[-7000:])


def text_filter(key, text, x, y, size, color=WHITE, bold=False):
    font = BOLD if bold else REGULAR
    width = ImageFont.truetype(font, size).getlength(text)
    if width > W - x - 60:
        raise ValueError(f'Text overflows: {text!r}, {width}px')
    target = BUILD / (key + '.txt')
    target.write_text(text)
    return f"drawtext=fontfile='{font}':textfile='{target}':x={x}:y={y}:fontsize={size}:fontcolor={color}:fix_bounds=1"


def make_scene(index):
    s = SCENES[index]
    frames = round(s['seconds'] * FPS)
    # Oversampling the photo before zoompan keeps the slow camera move smooth.
    filters = [
        f"[0:v]scale=2160:1800:force_original_aspect_ratio=increase,crop=2160:1800,"
        f"zoompan=z='1.035+0.055*on/{frames-1}':x='(iw-iw/zoom)*{s['focal']}':"
        f"y='(ih-ih/zoom)*0.48':d={frames}:s=1080x900:fps=30,"
        f"pad=1080:1920:0:250:color={BG},setsar=1[photo]",
        "[1:v]crop=980:900:150:180,scale=164:-1[logo]",
        "[photo][logo]overlay=64:55:shortest=1[branded]",
    ]
    overlays = [
        'drawbox=x=64:y=240:w=952:h=4:color=0x263343:t=fill',
        f'drawbox=x=64:y=240:w=166:h=4:color={ORANGE}:t=fill',
        'drawbox=x=0:y=1146:w=1080:h=4:color=0xff852c:t=fill',
        text_filter(f'{index}-brand', 'CAR REPAIR WALA', 264, 90, 54, bold=True),
        text_filter(f'{index}-tagline', 'Your Car. Our Care.', 267, 168, 30, GREY),
        text_filter(f'{index}-label', s['label'], 72, 1202, 27, ORANGE, bold=True),
        text_filter(f'{index}-title1', s['lines'][0], 66, 1265, s['font'], bold=True),
        text_filter(f'{index}-title2', s['lines'][1], 66, 1382, s['font'], bold=True),
        'drawbox=x=72:y=1530:w=936:h=1:color=0x344151:t=fill',
        text_filter(f'{index}-cta', 'CALL / WHATSAPP TO BOOK', 74, 1572, 25, ORANGE, bold=True),
        text_filter(f'{index}-number', '89659 57978', 66, 1617, 81, bold=True),
        text_filter(f'{index}-site', 'carrepairwala.co.in', 73, 1745, 38),
        text_filter(f'{index}-address', '17, AB Road  /  Choithram Mandi, Indore', 74, 1814, 27, GREY),
    ]
    filters.append('[branded]' + ','.join(overlays) + ',format=yuv420p[out]')
    target = BUILD / f'scene-{index}.mp4'
    run(['ffmpeg', '-hide_banner', '-y', '-threads', '2', '-filter_complex_threads', '1',
         '-i', str(ASSETS / s['image']), '-loop', '1', '-i', str(ASSETS / 'car-repair-wala-logo.png'),
         '-filter_complex', ';'.join(filters), '-map', '[out]', '-an',
         '-frames:v', str(frames), '-r', '30', '-c:v', 'libx264', '-preset', 'fast',
         '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '2', str(target)], BUILD / f'scene-{index}.log')
    print('Rendered scene', index + 1, flush=True)
    return target


def make_music():
    rate, duration = 48000, 15
    n = rate * duration
    track = np.zeros((n, 2), dtype=np.float64)
    rng = np.random.default_rng(26)

    def add(sound, start, gain=1, pan=0):
        offset = round(start * rate)
        available = min(len(sound), n - offset)
        if available <= 0:
            return
        track[offset:offset+available, 0] += sound[:available] * gain * math.sqrt((1-pan)/2)
        track[offset:offset+available, 1] += sound[:available] * gain * math.sqrt((1+pan)/2)

    def freq(midi):
        return 440 * 2 ** ((midi - 69) / 12)

    # A simple original instrumental: warm pads, restrained plucks and soft beat.
    for start, length, chord in [(0, 4, [45, 52, 57, 60]), (4, 3.5, [41, 48, 53, 57]),
                                 (7.5, 3.5, [48, 55, 60, 64]), (11, 4, [43, 50, 55, 59])]:
        t = np.arange(round((length + .4) * rate)) / rate
        env = np.minimum(t/.4, 1) * np.clip((length+.4-t)/.6, 0, 1)
        pad = sum(np.sin(2*np.pi*freq(note)*t) + .18*np.sin(2*np.pi*freq(note)*2*t) for note in chord)
        add(pad * env, start, .033)
    notes = [69, 72, 76, 72, 67, 72, 76, 79, 72, 74, 76, 72, 71, 74, 67]
    for i, note in enumerate(notes):
        t = np.arange(round(.85 * rate)) / rate
        pluck = (np.sin(2*np.pi*freq(note)*t) + .25*np.sin(2*np.pi*freq(note)*2*t)) * np.exp(-t*6) * np.minimum(t/.008, 1)
        add(pluck, i + .25, .1, -.2 if i % 2 else .2)
    for beat in np.arange(0, 15, .5):
        t = np.arange(round(.18 * rate)) / rate
        kick = np.sin(2*np.pi*(52*t + 12*(1-np.exp(-25*t))/25)) * np.exp(-t*30)
        add(kick, beat, .18)
        t = np.arange(round(.045 * rate)) / rate
        noise = rng.normal(0, 1, len(t))
        hat = np.r_[0, np.diff(noise)] * np.exp(-t*110)
        add(hat, beat + .25, .014, -.15)
    track *= np.minimum(np.arange(n) / (rate*.3), 1)[:, None]
    track *= np.clip((n - np.arange(n)) / (rate*.7), 0, 1)[:, None]
    peak = np.max(np.abs(track))
    track *= .72 / max(peak, .01)
    with wave.open(str(BUILD / 'original-music.wav'), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes((track * 32767).astype('<i2').tobytes())


def main():
    with ThreadPoolExecutor(max_workers=2) as pool:
        scenes = list(pool.map(make_scene, range(4)))
    make_music()
    command = ['ffmpeg', '-hide_banner', '-y', '-threads', '2', '-filter_complex_threads', '1']
    for scene in scenes:
        command += ['-i', str(scene)]
    command += ['-i', str(BUILD / 'original-music.wav')]
    transitions = (
        '[0:v]settb=AVTB[v0];[1:v]settb=AVTB[v1];[2:v]settb=AVTB[v2];[3:v]settb=AVTB[v3];'
        '[v0][v1]xfade=transition=fade:duration=0.5:offset=4[x1];'
        '[x1][v2]xfade=transition=fade:duration=0.5:offset=7.5[x2];'
        '[x2][v3]xfade=transition=fade:duration=0.5:offset=11,format=yuv420p[out];'
        '[4:a]alimiter=limit=0.9,loudnorm=I=-18:TP=-2:LRA=7[audio]'
    )
    target = OUT / 'car-repair-wala-promo-15s.mp4'
    command += ['-filter_complex', transitions, '-map', '[out]', '-map', '[audio]',
                '-t', '15', '-r', '30', '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
                '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p', '-threads', '2',
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart',
                '-metadata', 'title=Car Repair Wala | 15-second promo',
                '-metadata', 'comment=Animated AI-generated workshop illustrations. Original synthesized instrumental. Not live workshop footage.',
                str(target)]
    run(command, BUILD / 'final-encode.log')
    print('Completed', target, flush=True)


if __name__ == '__main__':
    main()

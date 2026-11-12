# CLAUDE.md — Cerebro de Edición de Video Programática y Bootstrap Automático

> **INSTRUCCIÓN PARA EL USUARIO:** Guarda este archivo exactamente con el nombre `CLAUDE.md` dentro de la carpeta donde quieras crear tu estudio de edición de video. Abre tu terminal en esa carpeta, ejecuta `claude` y escribe:
> `"Lee CLAUDE.md y ejecuta el protocolo de la SECCIÓN 0 para instalar y construir todo mi entorno de edición de video, incluyendo el motor visual de Remotion."`

---

## SECCIÓN 0: PROTOCOLO DE BOOTSTRAP AUTOMÁTICO (EJECUTAR AL INICIAR EL PROYECTO)

Cuando el usuario te pida preparar el entorno o inicializar el proyecto, ejecuta **secuencialmente y sin omitir ningún paso** las siguientes acciones en la terminal:

### Paso 1: Crear la Arquitectura Completa de Directorios

Ejecuta el comando para crear el árbol de carpetas del estudio, incluyendo la estructura de `remotion/`:

```bash
mkdir -p .claude/agents .claude/commands brand/assets media/01_raw_aroll media/02_broll media/03_audio media/04_proxies data/transcripts data/waveforms data/style_profiles scripts renders/drafts renders/final remotion/src/components
```

### Paso 2: Verificar e Instalar Complementos, Plugins y Skills

1. Verifica que `ffmpeg`, `ffprobe`, `node`, `npm`, `python3` y `uv` estén disponibles en el `$PATH`. Si falta alguno, infórmalo o instálalo según el sistema operativo.
2. Configura el entorno Python en la raíz del proyecto usando `uv` (o `venv` si `uv` no está disponible) e instala los motores de IA local y video:
   ```bash
   uv init --no-readme || true
   uv add faster-whisper scenedetect[opencv] numpy soundfile moviepy
   ```
3. Inicializa los paquetes de **Remotion** dentro de la carpeta `remotion/` e inyecta las **Remotion Agent Skills**:
   ```bash
   cd remotion && npm install && npx --yes remotion skills add || true && cd ..
   ```
4. Registra los servidores MCP recomendados si el usuario desea clipping en la nube (opcional, no bloqueante):
   ```bash
   claude mcp add --transport http opusclip https://mcp.opus.pro/mcp || true
   claude mcp add --transport http openclip https://openclip.app/mcp || true
   ```

### Paso 3: Generar los Archivos de Configuración, Scripts, Subagentes y Motor Remotion

Extrae y escribe en disco cada uno de los archivos definidos en las **Secciones 2, 3, 4, 5 y 6** de este documento en sus rutas exactas:

1. `.claude/settings.json`
2. `brand/brand.json`, `project.json` y un archivo inicial de prueba `data/edl.json`
3. `scripts/analyze_audio_hybrid.py`
4. `scripts/build_rough_cut.py`
5. `scripts/verify_render.py`
6. `scripts/extract_style.py`
7. `.claude/agents/cutter-agent.md`, `.claude/agents/motion-designer.md` y `.claude/agents/qa-inspector.md`
8. `.claude/commands/rough-cut.md`, `.claude/commands/verify-render.md`, `.claude/commands/clone-style.md` y `.claude/commands/render-remotion.md`
9. Plantilla completa de **Remotion** (Sección 6):
   * `remotion/package.json` y `remotion/tsconfig.json`
   * `remotion/src/index.ts` y `remotion/src/Root.tsx`
   * `remotion/src/MainComposition.tsx`
   * `remotion/src/components/DynamicCaptions.tsx`
   * `remotion/src/components/SmoothZoom.tsx`
   * `remotion/src/components/LowerThird.tsx`

---

## SECCIÓN 1: REGLAS MAESTRAS DE EDICIÓN (SIEMPRE ACTIVAS)

Todo corte, composición en Remotion o comando de FFmpeg generado en este proyecto debe obedecer estrictamente estas reglas técnicas:

### 1.1 Reglas de Corte Acústico y Ritmo (Pacing)

* **Prohibido cortar solo por texto:** Nunca cortes un clip usando únicamente el `start` y `end` crudos de Whisper. Cruza siempre con el mapa de silencios de `data/waveforms/` generado por FFmpeg `silencedetect`.
* **Acolchado Acústico Obligatorio (Padding):**
  * Añade siempre un margen de entrada ($\text{pre-padding}$) de $80\text{ ms}$ ($0.080\text{ s}$) antes del inicio de la primera palabra de un segmento conservado.
  * Añade siempre un margen de salida ($\text{post-padding}$) de $120\text{ ms}$ ($0.120\text{ s}$) después del final de la última palabra para no mutilar consonantes finales ni respiraciones naturales.
* **Micro-fundidos Anti-Click:** En cada corte de audio, aplica un micro-fade de entrada y salida de $15\text{ ms}$ ($0.015\text{ s}$) o un `acrossfade=d=0.03` entre segmentos consecutivos.
* **J-Cuts y L-Cuts por Defecto:** En cambios de escena o entradas de B-roll, adelanta el audio entrante entre $150\text{ ms}$ y $220\text{ ms}$ respecto al corte de imagen siempre que haya margen sin solapar diálogo previo.

### 1.2 Reglas Visuales, Retención y Remotion

* **Cadencia de Cambio Visual:** Ningún plano estático puede durar más de $6.0\text{ s}$ sin un estímulo visual (cambio de escala suave, inserción de B-roll, *lower-third* o resaltado visual).
* **Física y Curvas de Animación:** Queda estrictamente prohibido usar interpolaciones lineales para movimientos de cámara o gráficos. Utiliza siempre `spring()` con amortiguación orgánica (`damping: 200, stiffness: 120`) o curvas Bezier `Easing.bezier(0.16, 1, 0.3, 1)`.
* **Zooms Dinámicos (Punch-ins / Slow Creeps):**
  * *Zoom de Énfasis (Jump Zoom):* Escala de $1.0$ a $1.12$ coincidiendo con una palabra de alto impacto, reencuadrando los ojos en el tercio superior.
  * *Zoom Progresivo (Slow Creep):* Interpolación suave de escala de $1.0$ a $1.06$ a lo largo de frases explicativas de más de $4\text{ s}$.
* **Sincronización Determinista en Remotion:** En todos los componentes dentro de `remotion/src/`, toda animación debe derivarse exclusivamente de `useCurrentFrame()` y `useVideoConfig()`. Nunca uses `setTimeout`, `requestAnimationFrame` ni transiciones CSS (`transition:` o `@keyframes`).

### 1.3 Estándares de Ingeniería de Audio

* **Voz Principal (A-Roll):** Normalizada mediante filtro `loudnorm=I=-14:TP=-1.5:LRA=11` ($-14\text{ LUFS}$ integrados, pico verdadero máximo de $-1.5\text{ dBTP}$).
* **Filtro de Limpieza Vocal:** Aplica filtro paso alto en $80\text{ Hz}$ (`highpass=f=80`) para eliminar retumbos graves antes de comprimir.
* **Música de Fondo:** Nivel base en $-26\text{ LUFS}$ durante diálogo activo (*auto-ducking* con `sidechaincompress`) y subida suave a $-16\text{ LUFS}$ en transiciones musicales sin voz.

---

## SECCIÓN 2: ARCHIVOS DE CONFIGURACIÓN DEL PROYECTO

### Archivo: `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(ffmpeg *)",
      "Bash(ffprobe *)",
      "Bash(uv run *)",
      "Bash(python3 scripts/*)",
      "Bash(npm run *)",
      "Bash(npx remotion *)",
      "Bash(yt-dlp *)"
    ]
  }
}
```

### Archivo: `brand/brand.json`

```json
{
  "brandName": "Studio Pro AI",
  "speakerName": "Director Técnico",
  "speakerRole": "Edición Programática con IA",
  "resolution": {
    "landscape": { "width": 1920, "height": 1080, "fps": 60 },
    "vertical": { "width": 1080, "height": 1920, "fps": 60 }
  },
  "colors": {
    "primary": "#0F172A",
    "secondary": "#1E293B",
    "accent": "#38BDF8",
    "highlightWord": "#FACC15",
    "textLight": "#F8FAFC",
    "danger": "#EF4444"
  },
  "typography": {
    "headingFont": "Inter, system-ui, sans-serif",
    "bodyFont": "Inter, system-ui, sans-serif",
    "monoFont": "JetBrains Mono, monospace",
    "captionsFontSize": 62,
    "wordsPerCaptionPage": 4
  },
  "animation": {
    "defaultBezier": [0.16, 1, 0.3, 1],
    "springConfig": { "damping": 200, "stiffness": 120, "mass": 1 },
    "wordPopSpring": { "damping": 14, "stiffness": 220, "mass": 0.6 }
  },
  "audio": {
    "targetLufs": -14.0,
    "truePeak": -1.5,
    "prePaddingSec": 0.080,
    "postPaddingSec": 0.120,
    "silenceThresholdDb": -35,
    "minSilenceDurationSec": 0.28
  }
}
```

### Archivo: `project.json`

```json
{
  "projectName": "Video_Project_01",
  "format": "landscape",
  "status": "initialized",
  "targetDurationSec": 300,
  "activeStyleProfile": "data/style_profiles/default.json",
  "edlPath": "data/edl.json",
  "pipelineStage": "01_ingest"
}
```

### Archivo Inicial de Muestra: `data/edl.json`

Genera este archivo inicial para que Remotion pueda compilar y previsualizar desde el primer minuto incluso antes de procesar el primer video real:

```json
{
  "source_video": "",
  "source_duration_sec": 6.0,
  "padding_config": { "pre_pad_sec": 0.08, "post_pad_sec": 0.12 },
  "clips": [
    {
      "clip_id": "clip_000",
      "source_file": "",
      "keep": true,
      "retake_flag": false,
      "retake_reason": null,
      "in_point": 0.0,
      "out_point": 6.0,
      "duration": 6.0,
      "j_cut_offset_sec": 0.0,
      "zoom": {
        "type": "punch_in",
        "scale_from": 1.0,
        "scale_to": 1.12
      },
      "lower_third": {
        "show": true,
        "title": "Claude Code Studio",
        "subtitle": "Pipeline Híbrido: Whisper + FFmpeg + Remotion"
      },
      "broll_overlay": null,
      "text": "Bienvenido al estudio de edición programática a sesenta fotogramas por segundo.",
      "words": [
        { "word": "Bienvenido", "start": 0.2, "end": 0.8, "probability": 0.99 },
        { "word": "al", "start": 0.8, "end": 1.0, "probability": 0.99 },
        { "word": "estudio", "start": 1.0, "end": 1.5, "probability": 0.99 },
        { "word": "de", "start": 1.5, "end": 1.7, "probability": 0.99 },
        { "word": "edición", "start": 1.7, "end": 2.3, "probability": 0.99 },
        { "word": "programática", "start": 2.3, "end": 3.2, "probability": 0.99 },
        { "word": "a", "start": 3.2, "end": 3.4, "probability": 0.99 },
        { "word": "sesenta", "start": 3.4, "end": 4.0, "probability": 0.99 },
        { "word": "fotogramas", "start": 4.0, "end": 4.8, "probability": 0.99 },
        { "word": "por", "start": 4.8, "end": 5.1, "probability": 0.99 },
        { "word": "segundo.", "start": 5.1, "end": 5.8, "probability": 0.99 }
      ]
    }
  ]
}
```

---

## SECCIÓN 3: SCRIPTS EN PYTHON (MOTOR HÍBRIDO Y QA)

### Archivo: `scripts/analyze_audio_hybrid.py`

Este script ejecuta la transcripción con `faster-whisper` a nivel de palabra, extrae el mapa exacto de silencios con `ffmpeg silencedetect`, detecta tomas falsas/repetidas y construye `data/edl.json` con acolchado acústico de $80\text{ ms}$ y $120\text{ ms}$.

```python
#!/usr/bin/env python3
"""
Motor de Análisis Híbrido para Claude Code:
1. Extrae silencios acústicos reales con FFmpeg silencedetect.
2. Transcribe con Faster-Whisper obteniendo word-level timestamps.
3. Detecta posibles tomas falsas (frases consecutivas con inicio idéntico/similar).
4. Genera JSON de transcripción, JSON de onda/silencios y un EDL base con padding acústico.
"""

import argparse
import json
import os
import re
import subprocess
from difflib import SequenceMatcher
from pathlib import Path


def run_ffmpeg_silence_detect(video_path: str, noise_db: int = -35, min_duration: float = 0.28) -> list:
    cmd = [
        "ffmpeg", "-hide_banner", "-i", video_path,
        "-af", f"silencedetect=noise={noise_db}dB:d={min_duration}",
        "-f", "null", "-"
    ]
    proc = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    stderr = proc.stderr

    starts = [float(x) for x in re.findall(r"silence_start:\s*([0-9.]+)", stderr)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([0-9.]+)", stderr)]

    silences = []
    for i, start in enumerate(starts):
        end = ends[i] if i < len(ends) else start + min_duration
        silences.append({
            "start": round(start, 4),
            "end": round(end, 4),
            "duration": round(end - start, 4)
        })
    return silences


def get_media_duration(video_path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", video_path
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        return round(float(proc.stdout.strip()), 4)
    except ValueError:
        return 0.0


def transcribe_with_whisper(video_path: str, model_size: str = "small", language: str = "es") -> list:
    from faster_whisper import WhisperModel

    print(f"[1/4] Cargando Faster-Whisper ({model_size})...")
    model = WhisperModel(model_size, device="auto", compute_type="int8")
    segments_gen, info = model.transcribe(
        video_path,
        language=language,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=250)
    )

    segments = []
    for idx, seg in enumerate(segments_gen):
        words = []
        if seg.words:
            for w in seg.words:
                words.append({
                    "word": w.word.strip(),
                    "start": round(w.start, 4),
                    "end": round(w.end, 4),
                    "probability": round(w.probability, 3)
                })
        segments.append({
            "id": idx,
            "start": round(seg.start, 4),
            "end": round(seg.end, 4),
            "text": seg.text.strip(),
            "words": words
        })
    return segments


def flag_retakes(segments: list, similarity_threshold: float = 0.68) -> list:
    restart_keywords = {"perdón", "perdon", "otra vez", "corto", "repite", "me equivoqué", "tres dos uno"}

    for i, seg in enumerate(segments):
        seg["is_retake_candidate"] = False
        seg["retake_reason"] = None
        lower_text = seg["text"].lower()

        for kw in restart_keywords:
            if kw in lower_text:
                seg["is_retake_candidate"] = True
                seg["retake_reason"] = f"Contiene palabra de reinicio: '{kw}'"

        if i < len(segments) - 1:
            curr_words = " ".join(lower_text.split()[:6])
            next_words = " ".join(segments[i + 1]["text"].lower().split()[:6])
            if len(curr_words) > 8 and len(next_words) > 8:
                ratio = SequenceMatcher(None, curr_words, next_words).ratio()
                if ratio >= similarity_threshold:
                    seg["is_retake_candidate"] = True
                    seg["retake_reason"] = (
                        f"Inicio muy similar ({int(ratio * 100)}%) al segmento #{i + 1}. "
                        "Probable toma falsa repetida."
                    )
    return segments


def build_hybrid_edl(
    video_path: str,
    segments: list,
    silences: list,
    total_duration: float,
    pre_pad: float = 0.080,
    post_pad: float = 0.120
) -> dict:
    clips = []
    for seg in segments:
        raw_start = seg["words"][0]["start"] if seg["words"] else seg["start"]
        raw_end = seg["words"][-1]["end"] if seg["words"] else seg["end"]

        safe_start = max(0.0, round(raw_start - pre_pad, 4))
        safe_end = min(total_duration, round(raw_end + post_pad, 4)) if total_duration > 0 else round(raw_end + post_pad, 4)

        for s in silences:
            if abs(s["end"] - raw_start) <= 0.25:
                safe_start = max(s["start"], round(s["end"] - pre_pad, 4))
            if abs(s["start"] - raw_end) <= 0.25:
                safe_end = min(s["end"], round(s["start"] + post_pad, 4))

        dur = round(safe_end - safe_start, 4)
        zoom_type = "slow_creep" if dur >= 4.2 else ("punch_in" if seg["id"] % 2 == 1 else "none")
        scale_to = 1.06 if zoom_type == "slow_creep" else (1.12 if zoom_type == "punch_in" else 1.0)

        clips.append({
            "clip_id": f"clip_{seg['id']:03d}",
            "source_file": video_path,
            "keep": not seg.get("is_retake_candidate", False),
            "retake_flag": seg.get("is_retake_candidate", False),
            "retake_reason": seg.get("retake_reason"),
            "in_point": safe_start,
            "out_point": safe_end,
            "duration": dur,
            "j_cut_offset_sec": -0.150 if seg["id"] > 0 else 0.0,
            "zoom": {
                "type": zoom_type,
                "scale_from": 1.0,
                "scale_to": scale_to
            },
            "lower_third": {
                "show": seg["id"] == 0,
                "title": "Director Técnico",
                "subtitle": "Edición Programática con Claude Code"
            },
            "broll_overlay": None,
            "text": seg["text"],
            "words": seg["words"]
        })

    merged_clips = []
    for clip in clips:
        if not clip["keep"]:
            merged_clips.append(clip)
            continue
        if (
            merged_clips
            and merged_clips[-1]["keep"]
            and (clip["in_point"] - merged_clips[-1]["out_point"]) < 0.18
        ):
            prev = merged_clips[-1]
            prev["out_point"] = clip["out_point"]
            prev["duration"] = round(prev["out_point"] - prev["in_point"], 4)
            prev["text"] = f"{prev['text']} {clip['text']}"
            prev["words"].extend(clip["words"])
        else:
            merged_clips.append(clip)

    return {
        "source_video": video_path,
        "source_duration_sec": total_duration,
        "padding_config": {"pre_pad_sec": pre_pad, "post_pad_sec": post_pad},
        "clips": merged_clips
    }


def main():
    parser = argparse.ArgumentParser(description="Análisis híbrido de video para Claude Code")
    parser.add_argument("video", help="Ruta al archivo de video en media/01_raw_aroll/")
    parser.add_argument("--model", default="small", help="Modelo Faster-Whisper (tiny, base, small, medium, large-v3)")
    parser.add_argument("--lang", default="es", help="Código de idioma (es, en, etc.)")
    parser.add_argument("--noise-db", type=int, default=-35, help="Umbral de silencio en dB (ej. -35)")
    parser.add_argument("--min-silence", type=float, default=0.28, help="Duración mínima de silencio en segundos")
    args = parser.parse_args()

    video_path = args.video
    stem = Path(video_path).stem

    os.makedirs("data/transcripts", exist_ok=True)
    os.makedirs("data/waveforms", exist_ok=True)

    print(f"[0/4] Obteniendo duración de {video_path}...")
    total_duration = get_media_duration(video_path)

    print(f"[1/4] Detectando silencios acústicos con FFmpeg ({args.noise_db}dB, min {args.min_silence}s)...")
    silences = run_ffmpeg_silence_detect(video_path, args.noise_db, args.min_silence)
    waveform_out = f"data/waveforms/{stem}_silences.json"
    with open(waveform_out, "w", encoding="utf-8") as f:
        json.dump({"video": video_path, "duration": total_duration, "silences": silences}, f, indent=2, ensure_ascii=False)

    print("[2/4] Transcribiendo palabras con Faster-Whisper...")
    segments = transcribe_with_whisper(video_path, args.model, args.lang)

    print("[3/4] Detectando posibles tomas falsas y repeticiones...")
    segments = flag_retakes(segments)
    transcript_out = f"data/transcripts/{stem}_transcript.json"
    with open(transcript_out, "w", encoding="utf-8") as f:
        json.dump({"video": video_path, "segments": segments}, f, indent=2, ensure_ascii=False)

    print("[4/4] Generando EDL híbrido en data/edl.json...")
    edl = build_hybrid_edl(video_path, segments, silences, total_duration)
    with open("data/edl.json", "w", encoding="utf-8") as f:
        json.dump(edl, f, indent=2, ensure_ascii=False)

    kept_duration = sum(c["duration"] for c in edl["clips"] if c["keep"])
    retakes_count = sum(1 for c in edl["clips"] if not c["keep"])
    print(f"\nListo:")
    print(f" - Transcripción: {transcript_out}")
    print(f" - Mapa de silencios: {waveform_out}")
    print(f" - EDL maestro: data/edl.json")
    print(f" - Duración original: {total_duration:.2f}s -> Duración limpia: {kept_duration:.2f}s ({retakes_count} posibles tomas falsas marcadas)")


if __name__ == "__main__":
    main()
```

### Archivo: `scripts/build_rough_cut.py`

```python
#!/usr/bin/env python3
"""
Constructor de Rough Cut y Exportador XML para DaVinci Resolve / Premiere Pro:
Lee data/edl.json y genera:
1. Un video MP4 concatenado con micro-fades acústicos y normalización a -14 LUFS.
2. Un archivo XML (xmeml v4) importable directamente en DaVinci Resolve y Premiere Pro.
"""

import argparse
import json
import os
import subprocess
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom


def render_mp4_from_edl(edl_path: str, output_mp4: str):
    with open(edl_path, "r", encoding="utf-8") as f:
        edl = json.load(f)

    active_clips = [c for c in edl["clips"] if c.get("keep", True)]
    if not active_clips:
        raise ValueError("No hay clips marcados con keep=true en data/edl.json")

    source_video = edl["source_video"]
    filter_parts = []
    concat_inputs = []

    for i, clip in enumerate(active_clips):
        start = clip["in_point"]
        end = clip["out_point"]
        dur = max(0.05, round(end - start, 4))
        fade_out_start = max(0.0, round(dur - 0.015, 4))

        filter_parts.append(
            f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}];"
            f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d=0.015,afade=t=out:st={fade_out_start}:d=0.015[a{i}];"
        )
        concat_inputs.append(f"[v{i}][a{i}]")

    n = len(active_clips)
    filter_complex = (
        "".join(filter_parts)
        + "".join(concat_inputs)
        + f"concat=n={n}:v=1:a=1[outv][concat_a];"
        + "[concat_a]highpass=f=80,loudnorm=I=-14:TP=-1.5:LRA=11[outa]"
    )

    os.makedirs(os.path.dirname(output_mp4), exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-hide_banner",
        "-i", source_video,
        "-filter_complex", filter_complex,
        "-map", "[outv]", "-map", "[outa]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        output_mp4
    ]
    print(f"Renderizando {n} clips activos hacia {output_mp4}...")
    subprocess.run(cmd, check=True)
    print(f"Borrador MP4 exportado en: {output_mp4}")


def export_nle_xml(edl_path: str, output_xml: str, fps: int = 30):
    with open(edl_path, "r", encoding="utf-8") as f:
        edl = json.load(f)

    active_clips = [c for c in edl["clips"] if c.get("keep", True)]
    source_video = os.path.abspath(edl["source_video"])

    xmeml = Element("xmeml", version="4")
    sequence = SubElement(xmeml, "sequence")
    SubElement(sequence, "name").text = Path(edl_path).stem + "_ClaudeCode_Cut"

    rate = SubElement(sequence, "rate")
    SubElement(rate, "timebase").text = str(fps)
    SubElement(rate, "ntsc").text = "FALSE"

    media = SubElement(sequence, "media")
    video = SubElement(media, "video")
    v_track = SubElement(video, "track")

    timeline_cursor = 0
    for i, clip in enumerate(active_clips):
        in_frame = int(round(clip["in_point"] * fps))
        out_frame = int(round(clip["out_point"] * fps))
        dur_frames = max(1, out_frame - in_frame)

        clipitem = SubElement(v_track, "clipitem", id=f"clipitem-{i+1}")
        SubElement(clipitem, "name").text = clip["clip_id"]
        SubElement(clipitem, "start").text = str(timeline_cursor)
        SubElement(clipitem, "end").text = str(timeline_cursor + dur_frames)
        SubElement(clipitem, "in").text = str(in_frame)
        SubElement(clipitem, "out").text = str(out_frame)

        file_el = SubElement(clipitem, "file", id="file-1")
        SubElement(file_el, "name").text = os.path.basename(source_video)
        SubElement(file_el, "pathurl").text = f"file://localhost/{source_video.lstrip('/')}"

        timeline_cursor += dur_frames

    xml_str = minidom.parseString(tostring(xmeml)).toprettyxml(indent="  ")
    with open(output_xml, "w", encoding="utf-8") as f:
        f.write(xml_str)
    print(f"Línea de tiempo XML para DaVinci/Premiere exportada en: {output_xml}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Construye MP4 y XML desde data/edl.json")
    parser.add_argument("--edl", default="data/edl.json", help="Ruta al archivo edl.json")
    parser.add_argument("--out-mp4", default="renders/drafts/rough_cut_v1.mp4", help="Ruta del MP4 de salida")
    parser.add_argument("--out-xml", default="renders/drafts/timeline_nle.xml", help="Ruta del XML para DaVinci/Premiere")
    args = parser.parse_args()

    render_mp4_from_edl(args.edl, args.out_mp4)
    export_nle_xml(args.edl, args.out_xml)
```

### Archivo: `scripts/verify_render.py`

```python
#!/usr/bin/env python3
"""
Auditor de Calidad Post-Render (Método Proofcut + Contact Sheet):
1. Extrae miniaturas periódicas con timestamp y arma una cuadrícula contact_sheet.jpg.
2. Re-transcribe el video exportado con Faster-Whisper para verificar fluidez y ausencia de repeticiones.
"""

import argparse
import json
import os
import subprocess
from pathlib import Path


def generate_contact_sheet(video_path: str, output_jpg: str, interval_sec: int = 3):
    os.makedirs(os.path.dirname(output_jpg), exist_ok=True)
    vf_filter = (
        f"fps=1/{interval_sec},"
        "scale=480:-1,"
        "drawtext=text='%{pts\\:hms}':x=10:y=10:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,"
        "tile=4x4"
    )
    cmd = [
        "ffmpeg", "-y", "-hide_banner",
        "-i", video_path,
        "-vf", vf_filter,
        "-frames:v", "1",
        "-q:v", "2",
        output_jpg
    ]
    subprocess.run(cmd, check=True)
    print(f"Hoja de contactos visual generada en: {output_jpg}")


def re_transcribe_render(video_path: str, output_json: str, model_size: str = "base", lang: str = "es"):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="auto", compute_type="int8")
    segments_gen, _ = model.transcribe(video_path, language=lang, word_timestamps=True)
    segments = [
        {"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip()}
        for s in segments_gen
    ]
    full_text = " ".join(s["text"] for s in segments)
    report = {
        "verified_video": video_path,
        "full_transcript": full_text,
        "segments": segments
    }
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"Transcripción de auditoría guardada en: {output_json}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verifica un render mediante Contact Sheet y re-transcripción")
    parser.add_argument("video", help="Ruta al video renderizado (ej. renders/drafts/rough_cut_v1.mp4)")
    parser.add_argument("--interval", type=int, default=3, help="Segundos entre capturas de la hoja de contactos")
    args = parser.parse_args()

    stem = Path(args.video).stem
    sheet_path = f"renders/drafts/{stem}_contact_sheet.jpg"
    audit_json = f"renders/drafts/{stem}_audit_transcript.json"

    generate_contact_sheet(args.video, sheet_path, args.interval)
    re_transcribe_render(args.video, audit_json)
```

### Archivo: `scripts/extract_style.py`

```python
#!/usr/bin/env python3
"""
Extractor Matemático de Estilo (Taste Profile):
Mide el Average Shot Length (ASL) con PySceneDetect y las Palabras Por Minuto (WPM)
con Faster-Whisper sobre un video de referencia.
"""

import argparse
import json
import os
from scenedetect import detect, ContentDetector


def analyze_style(video_path: str, output_json: str, lang: str = "es"):
    from faster_whisper import WhisperModel

    print(f"[1/2] Detectando cortes visuales en {video_path}...")
    scene_list = detect(video_path, ContentDetector(threshold=27.0))
    shot_durations = [
        round((scene[1].get_seconds() - scene[0].get_seconds()), 3)
        for scene in scene_list
    ]
    avg_shot_len = round(sum(shot_durations) / len(shot_durations), 2) if shot_durations else 4.5

    print("[2/2] Analizando velocidad de habla y pausas...")
    model = WhisperModel("base", device="auto", compute_type="int8")
    segments_gen, info = model.transcribe(video_path, language=lang, word_timestamps=True)

    word_count = 0
    gaps = []
    prev_end = None
    for seg in segments_gen:
        if seg.words:
            for w in seg.words:
                word_count += 1
                if prev_end is not None:
                    gap = round(w.start - prev_end, 3)
                    if 0.05 < gap < 3.0:
                        gaps.append(gap)
                prev_end = w.end

    duration_min = max(0.1, info.duration / 60.0)
    wpm = round(word_count / duration_min, 1)
    avg_gap = round(sum(gaps) / len(gaps), 3) if gaps else 0.18

    profile = {
        "reference_video": video_path,
        "duration_sec": round(info.duration, 2),
        "total_cuts": len(shot_durations),
        "average_shot_length_sec": avg_shot_len,
        "words_per_minute": wpm,
        "average_pause_gap_sec": avg_gap,
        "recommended_zoom_interval_sec": min(6.0, avg_shot_len)
    }

    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2, ensure_ascii=False)
    print(f"Perfil de estilo guardado en: {output_json}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extrae métricas de ritmo de un video de referencia")
    parser.add_argument("video", help="Ruta al video de referencia")
    parser.add_argument("--out", default="data/style_profiles/reference_style.json", help="Archivo JSON de salida")
    args = parser.parse_args()

    analyze_style(args.video, args.out)
```

---

## SECCIÓN 4: SUBAGENTES ESPECIALIZADOS (`.claude/agents/`)

### Archivo: `.claude/agents/cutter-agent.md`

```markdown
---
name: cutter-agent
description: Especialista en edición de diálogo, eliminación de tomas falsas, cortes híbridos (transcripción + onda de audio) y construcción de data/edl.json.
---

Eres el Editor Jefe de Corte (Assembly & Rough Cut Editor). Tu misión es transformar grabaciones brutas en un `data/edl.json` impecable:

1. Ejecuta `uv run python scripts/analyze_audio_hybrid.py <ruta_video>` si aún no existen la transcripción y el mapa de silencios.
2. Inspecciona `data/transcripts/*_transcript.json` y `data/edl.json`.
3. Revisa todos los segmentos consecutivos buscando:
   - Tomas falsas donde el hablante comenzó una idea, se detuvo y la volvió a empezar (conserva únicamente la última toma buena poniendo `"keep": false` en los intentos previos).
   - Muletillas aisladas o silencios internos incómodos.
4. Planifica el ritmo visual en `data/edl.json`:
   - Añade `"zoom": {"type": "punch_in", "scale_from": 1.0, "scale_to": 1.12}` en las oraciones clave o conclusiones.
   - Añade `"zoom": {"type": "slow_creep", "scale_from": 1.0, "scale_to": 1.06}` en explicaciones largas ($>4.2\text{ s}$).
   - Asigna archivos existentes en `media/02_broll/` al campo `"broll_overlay"` cuando el diálogo mencione un concepto visualizable.
```

### Archivo: `.claude/agents/motion-designer.md`

```markdown
---
name: motion-designer
description: Especialista en programación de animaciones a 60fps, subtítulos dinámicos y gráficos en React/TypeScript con Remotion.
---

Eres un Director de Motion Graphics experto en Remotion (`remotion/src/`).
1. Lee siempre `brand/brand.json` antes de escribir cualquier componente para respetar colores HEX, tipografías y curvas Bezier (`Easing.bezier(0.16, 1, 0.3, 1)`).
2. Lee `data/edl.json` para sincronizar subtítulos palabra por palabra (`words`), apariciones de *lower-thirds* y zooms con los códigos de tiempo reales.
3. Usa exclusivamente `useCurrentFrame()`, `useVideoConfig()`, `interpolate()` y `spring()` de `remotion`. Nunca uses animaciones CSS.
```

### Archivo: `.claude/agents/qa-inspector.md`

```markdown
---
name: qa-inspector
description: Auditor de calidad post-render encargado de inspeccionar hojas de contacto visuales y re-transcripciones.
---

Eres el Inspector de Control de Calidad (QA) del estudio:
1. Ejecuta `uv run python scripts/verify_render.py <ruta_del_render>`.
2. Abre y analiza visualmente la imagen `renders/drafts/*_contact_sheet.jpg` generada para comprobar que:
   - Los subtítulos y gráficos estén dentro de los márgenes seguros y no tapen los ojos ni la boca del presentador.
   - No existan fotogramas negros ni cortes corruptos.
3. Lee `renders/drafts/*_audit_transcript.json` y verifica que el texto hablado fluya de principio a fin sin frases duplicadas ni palabras cortadas a la mitad.
```

---

## SECCIÓN 5: COMANDOS SLASH PERSONALIZADOS (`.claude/commands/`)

### Archivo: `.claude/commands/rough-cut.md`

```markdown
Ejecuta el flujo completo de corte híbrido sobre el archivo de video indicado en `$ARGUMENTS`:
1. Ejecuta `uv run python scripts/analyze_audio_hybrid.py $ARGUMENTS`.
2. Invoca al subagente `cutter-agent` para auditar semánticamente `data/edl.json`, descartando todas las tomas falsas y asignando zooms dinámicos y B-roll cada $4$ a $6$ segundos.
3. Ejecuta `uv run python scripts/build_rough_cut.py` para exportar tanto el video `renders/drafts/rough_cut_v1.mp4` (normalizado a $-14\text{ LUFS}$) como el archivo XML `renders/drafts/timeline_nle.xml` para DaVinci Resolve / Premiere Pro.
4. Muestra un resumen con la duración original, la duración final limpia y la lista de tomas falsas eliminadas.
```

### Archivo: `.claude/commands/verify-render.md`

```markdown
Audita la calidad técnica, acústica y visual del video renderizado en `$ARGUMENTS`:
1. Invoca al subagente `qa-inspector` pasándole `$ARGUMENTS`.
2. Inspecciona la hoja de contactos `.jpg` resultante y la re-transcripción `.json`.
3. Si detectas alguna frase repetida, palabra mutilada o subtítulo mal posicionado, corrige `data/edl.json` o el componente de Remotion afectado y vuelve a renderizar automáticamente.
```

### Archivo: `.claude/commands/clone-style.md`

```markdown
Extrae el perfil matemático de edición del video o URL de referencia en `$ARGUMENTS`:
1. Si `$ARGUMENTS` es una URL (YouTube, etc.), descárgalo primero en `media/04_proxies/ref_video.mp4` usando `yt-dlp -f "bestvideo[height<=720]+bestaudio/best" -o "media/04_proxies/ref_video.mp4" $ARGUMENTS`.
2. Ejecuta `uv run python scripts/extract_style.py` sobre el archivo de video y guarda las métricas en `data/style_profiles/custom_style.json`.
3. Actualiza `project.json` para que use este perfil y ajusta las reglas de cadencia de `data/edl.json` al Average Shot Length (ASL) y WPM detectados.
```

### Archivo: `.claude/commands/render-remotion.md`

```markdown
Renderiza la composición maestra de Remotion (`MainComposition.tsx`) sincronizada con `data/edl.json` y `brand/brand.json`:
1. Verifica que `data/edl.json` contenga los clips limpios y sus `words` con marcas de tiempo.
2. Si el usuario pasó `preview` en `$ARGUMENTS`, inicia el servidor de previsualización en tiempo real ejecutando `cd remotion && npm run dev`.
3. Si el usuario solicita exportar el video final, ejecuta `cd remotion && npx remotion render src/index.ts MainVideo ../renders/final/master_remotion.mp4 --codec=h264 --crf=18` y luego ejecuta `/verify-render renders/final/master_remotion.mp4`.
```

---

## SECCIÓN 6: MOTOR VISUAL REMOTION (PLANTILLAS REACT/TYPESCRIPT A $60\text{ FPS}$)

### Archivo: `remotion/package.json`

```json
{
  "name": "claude-code-remotion-engine",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "remotion studio src/index.ts",
    "render": "remotion render src/index.ts MainVideo ../renders/final/master_remotion.mp4 --codec=h264 --crf=18",
    "RenderVertical": "remotion render src/index.ts VerticalReels ../renders/final/vertical_reels.mp4 --codec=h264 --crf=18"
  },
  "dependencies": {
    "@remotion/cli": "^4.0.240",
    "@remotion/player": "^4.0.240",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "remotion": "^4.0.240"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "typescript": "^5.5.3"
  }
}
```

### Archivo: `remotion/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*", "../brand/*.json", "../data/*.json"]
}
```

### Archivo: `remotion/src/index.ts`

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

### Archivo: `remotion/src/Root.tsx`

Calcula automáticamente la duración exacta en fotogramas sumando los segmentos con `"keep": true` de `data/edl.json` y registra tanto la composición horizontal $16:9$ (`MainVideo`) como la vertical $9:16$ (`VerticalReels`).

```tsx
import React from "react";
import { Composition } from "remotion";
import { MainComposition, EdlData } from "./MainComposition";
import brandConfig from "../../brand/brand.json";
import edlJson from "../../data/edl.json";

const edl = edlJson as unknown as EdlData;
const activeClips = edl.clips.filter((c) => c.keep);
const totalDurationSec = activeClips.reduce((acc, c) => acc + c.duration, 0) || 6;
const fps = brandConfig.resolution.landscape.fps || 60;
const totalFrames = Math.max(60, Math.ceil(totalDurationSec * fps));

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        component={MainComposition}
        durationInFrames={totalFrames}
        fps={fps}
        width={brandConfig.resolution.landscape.width}
        height={brandConfig.resolution.landscape.height}
        defaultProps={{
          edl,
          isVertical: false,
        }}
      />
      <Composition
        id="VerticalReels"
        component={MainComposition}
        durationInFrames={totalFrames}
        fps={fps}
        width={brandConfig.resolution.vertical.width}
        height={brandConfig.resolution.vertical.height}
        defaultProps={{
          edl,
          isVertical: true,
        }}
      />
    </>
  );
};
```

### Archivo: `remotion/src/components/SmoothZoom.tsx`

Aplica zoom de énfasis (`punch_in` con `spring()` orgánico) o zoom progresivo (`slow_creep` con curva Bezier `Easing.bezier(0.16, 1, 0.3, 1)`), manteniendo el foco en el tercio superior donde se sitúan los ojos del hablante.

```tsx
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import brandConfig from "../../../brand/brand.json";

export interface ZoomConfig {
  type: "none" | "punch_in" | "slow_creep";
  scale_from: number;
  scale_to: number;
}

interface SmoothZoomProps {
  zoom?: ZoomConfig;
  durationInFrames: number;
  children: React.ReactNode;
}

export const SmoothZoom: React.FC<SmoothZoomProps> = ({
  zoom,
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!zoom || zoom.type === "none") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  let scale = 1;

  if (zoom.type === "punch_in") {
    const progress = spring({
      frame,
      fps,
      config: brandConfig.animation.springConfig,
      durationInFrames: Math.min(18, durationInFrames),
    });
    scale = interpolate(progress, [0, 1], [zoom.scale_from, zoom.scale_to]);
  } else if (zoom.type === "slow_creep") {
    const [x1, y1, x2, y2] = brandConfig.animation.defaultBezier;
    scale = interpolate(
      frame,
      [0, Math.max(1, durationInFrames - 1)],
      [zoom.scale_from, zoom.scale_to],
      {
        easing: Easing.bezier(x1, y1, x2, y2),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }
    );
  }

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "50% 34%",
        willChange: "transform",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
```

### Archivo: `remotion/src/components/DynamicCaptions.tsx`

Renderiza subtítulos dinámicos sincronizados al milisegundo con las marcas de tiempo `words` de Faster-Whisper. Agrupa las palabras en páginas legibles de $4$ palabras, resalta la palabra activa con el color de acento `#FACC15` de `brand.json` y le aplica un rebote elástico por fotograma.

```tsx
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import brandConfig from "../../../brand/brand.json";

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

interface DynamicCaptionsProps {
  words: WordTimestamp[];
  clipInPointSec: number;
  isVertical?: boolean;
}

interface CaptionPage {
  startSec: number;
  endSec: number;
  words: WordTimestamp[];
}

export const DynamicCaptions: React.FC<DynamicCaptionsProps> = ({
  words,
  clipInPointSec,
  isVertical = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tiempo absoluto dentro del archivo de video original en este fotograma exacto
  const currentSourceTimeSec = clipInPointSec + frame / fps;
  const wordsPerPage = brandConfig.typography.captionsFontSize ? (brandConfig.typography as any).wordsPerCaptionPage || 4 : 4;

  const pages: CaptionPage[] = useMemo(() => {
    if (!words || words.length === 0) return [];
    const grouped: CaptionPage[] = [];
    for (let i = 0; i < words.length; i += wordsPerPage) {
      const slice = words.slice(i, i + wordsPerPage);
      grouped.push({
        startSec: slice[0].start,
        endSec: slice[slice.length - 1].end + 0.12,
        words: slice,
      });
    }
    return grouped;
  }, [words, wordsPerPage]);

  const activePage = pages.find(
    (p) => currentSourceTimeSec >= p.startSec - 0.06 && currentSourceTimeSec <= p.endSec
  );

  if (!activePage) return null;

  const pageStartFrame = Math.max(0, Math.round((activePage.startSec - clipInPointSec) * fps));
  const pageRelFrame = Math.max(0, frame - pageStartFrame);

  const pageEntry = spring({
    frame: pageRelFrame,
    fps,
    config: brandConfig.animation.springConfig,
  });

  const translateY = interpolate(pageEntry, [0, 1], [18, 0]);
  const opacity = interpolate(pageEntry, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: isVertical ? 260 : 96,
        paddingLeft: 64,
        paddingRight: 64,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
          maxWidth: isVertical ? "920px" : "1380px",
          padding: "20px 36px",
          borderRadius: "24px",
          backgroundColor: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(12px)",
          border: "2px solid rgba(248, 250, 252, 0.14)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.55)",
          transform: `translateY(${translateY}px)`,
          opacity,
        }}
      >
        {activePage.words.map((w, idx) => {
          const isSpeakingNow =
            currentSourceTimeSec >= w.start - 0.03 &&
            currentSourceTimeSec <= w.end + 0.05;
          const hasSpoken = currentSourceTimeSec > w.end + 0.05;

          const wordStartFrame = Math.round((w.start - clipInPointSec) * fps);
          const wordRelFrame = Math.max(0, frame - wordStartFrame);

          const popProgress = isSpeakingNow
            ? spring({
                frame: wordRelFrame,
                fps,
                config: brandConfig.animation.wordPopSpring,
              })
            : 0;

          const wordScale = isSpeakingNow
            ? interpolate(popProgress, [0, 1], [1.0, 1.14])
            : 1.0;

          return (
            <span
              key={`${w.word}-${idx}-${w.start}`}
              style={{
                display: "inline-block",
                fontFamily: brandConfig.typography.headingFont,
                fontSize: isVertical
                  ? brandConfig.typography.captionsFontSize + 6
                  : brandConfig.typography.captionsFontSize,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: isSpeakingNow
                  ? brandConfig.colors.highlightWord
                  : hasSpoken
                  ? brandConfig.colors.textLight
                  : "rgba(248, 250, 252, 0.65)",
                backgroundColor: isSpeakingNow
                  ? "rgba(56, 189, 248, 0.18)"
                  : "transparent",
                padding: "4px 12px",
                borderRadius: "12px",
                transform: `scale(${wordScale})`,
                textShadow: isSpeakingNow
                  ? "0 4px 20px rgba(250, 204, 21, 0.45)"
                  : "0 2px 10px rgba(0, 0, 0, 0.7)",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

### Archivo: `remotion/src/components/LowerThird.tsx`

```tsx
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import brandConfig from "../../../brand/brand.json";

interface LowerThirdProps {
  title: string;
  subtitle: string;
  durationInFrames: number;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const displayFrames = Math.min(durationInFrames, Math.round(4.2 * fps));

  if (frame > displayFrames) return null;

  const entry = spring({
    frame,
    fps,
    config: brandConfig.animation.springConfig,
  });

  const [x1, y1, x2, y2] = brandConfig.animation.defaultBezier;
  const exit = interpolate(
    frame,
    [Math.max(0, displayFrames - 18), displayFrames],
    [1, 0],
    {
      easing: Easing.bezier(x1, y1, x2, y2),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const progress = entry * exit;
  const translateX = interpolate(progress, [0, 1], [-80, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-start",
        paddingBottom: 210,
        paddingLeft: 88,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 18px 40px rgba(0, 0, 0, 0.45)",
          border: "1px solid rgba(56, 189, 248, 0.35)",
          transform: `translateX(${translateX}px)`,
          opacity: progress,
        }}
      >
        <div
          style={{
            width: "10px",
            backgroundColor: brandConfig.colors.accent,
          }}
        />
        <div style={{ padding: "18px 28px" }}>
          <div
            style={{
              fontFamily: brandConfig.typography.headingFont,
              fontSize: 34,
              fontWeight: 800,
              color: brandConfig.colors.textLight,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: brandConfig.typography.monoFont,
              fontSize: 20,
              fontWeight: 600,
              color: brandConfig.colors.accent,
              marginTop: 4,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

### Archivo: `remotion/src/MainComposition.tsx`

Lee `data/edl.json`, descarta automáticamente las tomas falsas (`keep: false`), encadena los clips en una línea de tiempo sin costuras, aplica los *zooms* dinámicos, superpone el B-roll cuando está definido e inyecta los subtítulos palabra por palabra y los *lower-thirds*.

```tsx
import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import brandConfig from "../../brand/brand.json";
import { DynamicCaptions, WordTimestamp } from "./components/DynamicCaptions";
import { LowerThird } from "./components/LowerThird";
import { SmoothZoom, ZoomConfig } from "./components/SmoothZoom";

export interface EdlClip {
  clip_id: string;
  source_file: string;
  keep: boolean;
  in_point: number;
  out_point: number;
  duration: number;
  j_cut_offset_sec?: number;
  zoom?: ZoomConfig;
  lower_third?: {
    show: boolean;
    title: string;
    subtitle: string;
  };
  broll_overlay?: string | null;
  text: string;
  words: WordTimestamp[];
}

export interface EdlData {
  source_video: string;
  source_duration_sec: number;
  clips: EdlClip[];
}

interface MainCompositionProps {
  edl: EdlData;
  isVertical?: boolean;
}

export const MainComposition: React.FC<MainCompositionProps> = ({
  edl,
  isVertical = false,
}) => {
  const { fps } = useVideoConfig();
  const activeClips = edl.clips.filter((c) => c.keep);

  let timelineCursorFrames = 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brandConfig.colors.primary,
      }}
    >
      {activeClips.map((clip) => {
        const clipFrames = Math.max(1, Math.round(clip.duration * fps));
        const startFromFrame = Math.max(0, Math.round(clip.in_point * fps));
        const endAtFrame = Math.max(
          startFromFrame + 1,
          Math.round(clip.out_point * fps)
        );
        const sequenceStart = timelineCursorFrames;
        timelineCursorFrames += clipFrames;

        const hasSourceVideo = Boolean(clip.source_file || edl.source_video);
        const videoSrc = clip.source_file || edl.source_video;

        return (
          <Sequence
            key={clip.clip_id}
            from={sequenceStart}
            durationInFrames={clipFrames}
            name={`${clip.clip_id} (${clip.in_point.toFixed(2)}s - ${clip.out_point.toFixed(2)}s)`}
          >
            <SmoothZoom zoom={clip.zoom} durationInFrames={clipFrames}>
              {hasSourceVideo ? (
                <OffthreadVideo
                  src={videoSrc.startsWith("http") ? videoSrc : staticFile(videoSrc)}
                  startFrom={startFromFrame}
                  endAt={endAtFrame}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <AbsoluteFill
                  style={{
                    background: `radial-gradient(circle at 50% 35%, ${brandConfig.colors.secondary} 0%, ${brandConfig.colors.primary} 100%)`,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: brandConfig.typography.monoFont,
                      fontSize: 28,
                      color: brandConfig.colors.accent,
                      opacity: 0.45,
                      border: `1px dashed ${brandConfig.colors.accent}`,
                      padding: "16px 32px",
                      borderRadius: "12px",
                    }}
                  >
                    Vista Previa Remotion ({clip.clip_id}) — Conecta tu MP4 en media/01_raw_aroll/
                  </div>
                </AbsoluteFill>
              )}

              {clip.broll_overlay && (
                <OffthreadVideo
                  src={
                    clip.broll_overlay.startsWith("http")
                      ? clip.broll_overlay
                      : staticFile(clip.broll_overlay)
                  }
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
            </SmoothZoom>

            {clip.lower_third?.show && (
              <LowerThird
                title={clip.lower_third.title}
                subtitle={clip.lower_third.subtitle}
                durationInFrames={clipFrames}
              />
            )}

            <DynamicCaptions
              words={clip.words}
              clipInPointSec={clip.in_point}
              isVertical={isVertical}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import WaveFilePkg from "wavefile";
const { WaveFile } = WaveFilePkg as { WaveFile: new () => any };

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface AudioOptions {
    sampleRate?: number;   // default 44100
    bitDepth?: 16 | 24 | 32; // stored as PCM; default 16
    toneHz?: number;       // if provided, generates sine tone at this frequency
    noise?: "white";       // if "white", generates white noise (overrides toneHz)
    amplitude?: number;    // 0..1 headroom scaler; default 0.9
};

export async function generateWAV(
    path: string,
    lengthSeconds: number,
    opts: AudioOptions = {}
) {
    const sampleRate = opts.sampleRate ?? 44100;
    const bitDepth = String(opts.bitDepth ?? 16) as "16" | "24" | "32";
    const amplitudeScaler = Math.max(0, Math.min(1, opts.amplitude ?? 0.9));

    if (!Number.isFinite(lengthSeconds) || lengthSeconds <= 0) {
        throw new Error("lengthSeconds must be a positive number.");
    }

    const totalSamples = Math.floor(sampleRate * lengthSeconds);

    // Select generator: white noise or tone; default to 440Hz tone
    const useNoise = opts.noise === "white";
    const freq = opts.toneHz ?? 440;

    // For 16-bit PCM, use ±32767. For higher bit depths, still feed Int32 values;
    // wavefile will pack correctly. We'll generate in 32-bit int space and clamp.
    const maxI16 = 32767;
    const amp = Math.round(maxI16 * amplitudeScaler);

    const samples = new Int16Array(totalSamples);

    if (useNoise) {
        // White noise: uniform random in [-amp, +amp]
        for (let i = 0; i < totalSamples; i++) {
            const v = (Math.random() * 2 - 1) * amp;
            samples[i] = v | 0;
        }
    } else {
        // Sine tone with stable phase
        const twoPi = 2 * Math.PI;
        const inc = (twoPi * freq) / sampleRate;
        let phase = 0;
        for (let i = 0; i < totalSamples; i++) {
            const v = Math.sin(phase) * amp;
            samples[i] = Math.round(v);
            phase += inc;
            // Optional: keep phase bounded to avoid float drift on long durations
            if (phase > twoPi) phase -= twoPi;
        }
    }

    const wav = new WaveFile();
    wav.fromScratch(1, sampleRate, bitDepth, samples);

    // Synchronous write as in the original; switch to async if desired
    fs.writeFileSync(path, wav.toBuffer());
}

export async function generateMP3(
    path: string,
    lengthSeconds: number,
    opts: AudioOptions = {}
) {
    const wavPath = path.replace(".mp3", ".wav");
    await generateWAV(wavPath, lengthSeconds, opts);
    return new Promise<void>((resolve, reject) => {
        ffmpeg(wavPath)
            .output(path)
            .on("end", (_stdout: string | null, _stderr: string | null) => resolve())
            .on("error", (err: any) => reject(err))
            .run();
    });
}

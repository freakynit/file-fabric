import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface VideoOptions {
  // duration of the clip in seconds
  duration?: number;             // default: 1
  // resolution as WIDTHxHEIGHT
  resolution?: string;           // default: "1280x720"
  // frames per second
  fps?: number;                  // default: 30
  // background color for the color source
  background?: string;           // default: "black" (e.g., "white", "red", "0xRRGGBB")
  // constant rate factor for libx264 (lower = higher quality)
  crf?: number;                  // default: 23 (typical visually good)
  // pixel format; yuv420p maximizes player compatibility
  pixelFormat?: "yuv420p" | "yuv422p" | "yuv444p"; // default: "yuv420p"
  // preset controls encoding speed vs compression efficiency
  preset?: "ultrafast"|"superfast"|"veryfast"|"faster"|"fast"|"medium"|"slow"|"slower"|"veryslow"; // default: "medium"
  // If true, add silent AAC track to avoid “no audio” playback quirks in some players
  silentAudio?: boolean;         // default: true
};

export async function generateMP4(
    path: string,
    opts: VideoOptions = {}
) {
  const {
    duration = 1,
    resolution = "1280x720",
    fps = 30,
    background = "black",
    crf = 23,
    pixelFormat = "yuv420p",
    preset = "medium",
    silentAudio = true,
  } = opts;

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("duration must be a positive number (seconds).");
  }
  if (!/^\d+x\d+$/.test(resolution)) {
    throw new Error('resolution must be a string like "1280x720".');
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error("fps must be a positive number.");
  }
  if (!Number.isFinite(crf) || crf < 0 || crf > 51) {
    throw new Error("crf must be in [0,51]. Lower is higher quality.");
  }

  const colorSrc = `color=${background}:s=${resolution}:r=${fps}:d=${duration}`;

  // Build command
  return new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg()
        // Video source from lavfi
        .input(colorSrc)
        .inputFormat("lavfi")
        // Encoding settings
        .videoCodec("libx264")
        .outputOptions([
          `-pix_fmt ${pixelFormat}`,
          `-preset ${preset}`,
          `-crf ${crf}`,
          // ensure constant frame rate and exact duration
          `-r ${fps}`,
          `-t ${duration}`,
          // faststart moov atom for better streaming/instant playback
          "-movflags +faststart",
        ]);

    if (silentAudio) {
      // Add silent AAC audio track (some players/devices expect audio)
      // anullsrc defaults: 48000 Hz, stereo. We can set explicit sample rate and duration.
      const audioSampleRate = 48000;
      cmd
          .input(`anullsrc=channel_layout=stereo:sample_rate=${audioSampleRate}`)
          .inputFormat("lavfi")
          .audioCodec("aac")
          .audioChannels(2)
          .audioFrequency(audioSampleRate)
          .outputOptions([
            "-shortest", // end when the shortest stream (video) ends
          ]);
    } else {
      cmd.noAudio();
    }

    cmd
        .output(path)
        .on("end", (_stdout: string | null, _stderr: string | null) => resolve())
        .on("error", (err: any) => reject(err))
        .run();
  });
}


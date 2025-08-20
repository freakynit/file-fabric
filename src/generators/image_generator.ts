import fs from "fs";
import sharp, { Sharp, RGBA } from "sharp";

type Channels = sharp.Channels;       // 1|2|3|4
type Color = sharp.Color;             // string | { r,g,b,(alpha)? }

export interface CreateImageOptions {
    width: number;
    height: number;
    channels?: Channels;               // use sharp.Channels
    background?: Color;                // use sharp.Color
}

export type OutputFormat =
    | { format: "jpeg"; options?: sharp.JpegOptions }
    | { format: "png"; options?: sharp.PngOptions }
    | { format: "webp"; options?: sharp.WebpOptions }
    | { format: "avif"; options?: sharp.AvifOptions }
    | { format: "tiff"; options?: sharp.TiffOptions }
    | { format: "gif"; options?: sharp.GifOptions }
    | { format: "heif"; options?: sharp.HeifOptions };

export async function generateImage(
    path: string,
    create: CreateImageOptions,
    output: OutputFormat
): Promise<void> {
    const {
        width,
        height,
        channels = 3 as Channels,
        background = (channels === 4
            ? { r: 0, g: 0, b: 0, alpha: 0 }
            : { r: 0, g: 0, b: 0 }) as Color,
    } = create;

    // Force the correct overload by typing the arg as SharpOptions
    const sharpOptions: sharp.SharpOptions = {
        create: { width, height, channels, background },
    };

    let instance = sharp(sharpOptions);

    switch (output.format) {
        case "jpeg":
            instance = instance.jpeg(output.options);
            break;
        case "png":
            instance = instance.png(output.options);
            break;
        case "webp":
            instance = instance.webp(output.options);
            break;
        case "avif":
            instance = instance.avif(output.options);
            break;
        case "tiff":
            instance = instance.tiff(output.options);
            break;
        case "gif":
            instance = instance.gif(output.options);
            break;
        case "heif":
            instance = instance.heif(output.options);
            break;
    }

    const buffer = await instance.toBuffer();
    fs.writeFileSync(path, buffer);
}

// 4) Thin convenience wrappers that mirror original API while using the unified generator
export async function generateJPG(path: string): Promise<void> {
    return generateImage(
        path,
        {
            width: 300,
            height: 200,
            channels: 3,
            background: { r: 255, g: 0, b: 0 },
        },
        { format: "jpeg" }
    );
}

export async function generatePNG(path: string): Promise<void> {
    return generateImage(
        path,
        {
            width: 300,
            height: 200,
            channels: 3,
            background: { r: 0, g: 255, b: 0 },
        },
        { format: "png" }
    );
}

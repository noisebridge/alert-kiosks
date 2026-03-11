/**
 * NeoPixel driver for Raspberry Pi via rpi_ws281x FFI bindings.
 * GPIO 18 (PWM0), WS2812B strip type.
 *
 * Requires libneopixel.so to be compiled on the Pi (see neopixel.c).
 */
import { dlopen, FFIType } from "bun:ffi";


const { symbols: lib } = dlopen("/usr/local/lib/libneopixel.so", {
  neopixel_init: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
  neopixel_num_leds: { args: [], returns: FFIType.i32 },
  neopixel_set_pixel: {
    args: [FFIType.i32, FFIType.u32],
    returns: FFIType.void,
  },
  neopixel_fill: { args: [FFIType.u32], returns: FFIType.void },
  neopixel_set_brightness: { args: [FFIType.i32], returns: FFIType.void },
  neopixel_render: { args: [], returns: FFIType.i32 },
  neopixel_cleanup: { args: [], returns: FFIType.void },
});

export function rgb(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

export function hsvToRgb(h: number, s: number, v: number): number {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  return rgb(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

export class NeoPixel {
  readonly numLeds: number;

  constructor(numLeds: number, brightness = 64) {
    const ret = lib.neopixel_init(numLeds, brightness);
    if (ret !== 0) {
      throw new Error(`neopixel_init failed with code ${ret} (run as root?)`);
    }
    this.numLeds = numLeds;
  }

  setPixel(index: number, color: number): void {
    lib.neopixel_set_pixel(index, color);
  }

  fill(color: number): void {
    lib.neopixel_fill(color);
  }

  setBrightness(brightness: number): void {
    lib.neopixel_set_brightness(brightness);
  }

  render(): void {
    const ret = lib.neopixel_render();
    if (ret !== 0) {
      throw new Error(`neopixel_render failed with code ${ret}`);
    }
  }

  clear(): void {
    this.fill(0x000000);
    this.render();
  }

  cleanup(): void {
    lib.neopixel_cleanup();
  }
}

import { NeoPixel, rgb, hsvToRgb } from "./neopixel";

const NUM_LEDS = parseInt(process.env["NUM_LEDS"] ?? "100");
const BRIGHTNESS = 32;
const PORT = 3000;

const strip = new NeoPixel(NUM_LEDS, BRIGHTNESS);

// Cleanup on exit
process.on("SIGINT", () => {
  strip.cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  strip.cleanup();
  process.exit(0);
});

// Rainbow animation state
let rainbowOffset = 0;
let animating = true;

function rainbowStep() {
  if (!animating) return;
  for (let i = 0; i < NUM_LEDS; i++) {
    const hue = ((i + rainbowOffset) % NUM_LEDS) / NUM_LEDS;
    strip.setPixel(i, hsvToRgb(hue, 1, 1));
  }
  strip.render();
  rainbowOffset = (rainbowOffset + 1) % NUM_LEDS;
}

setInterval(rainbowStep, 50);

console.log(`NeoPixel server starting: ${NUM_LEDS} LEDs, brightness ${BRIGHTNESS}`);

Bun.serve({
  port: PORT,
  routes: {
    // Set all LEDs to a color: POST /fill { "r": 255, "g": 0, "b": 0 }
    "/fill": {
      async POST(req) {
        const { r, g, b } = (await req.json()) as { r: number; g: number; b: number };
        animating = false;
        strip.fill(rgb(r, g, b));
        strip.render();
        return Response.json({ ok: true });
      },
    },

    // Set single LED: POST /pixel { "index": 0, "r": 255, "g": 0, "b": 0 }
    "/pixel": {
      async POST(req) {
        const { index, r, g, b } = (await req.json()) as { index: number; r: number; g: number; b: number };
        animating = false;
        strip.setPixel(index, rgb(r, g, b));
        strip.render();
        return Response.json({ ok: true });
      },
    },

    // Set brightness: POST /brightness { "value": 128 }
    "/brightness": {
      async POST(req) {
        const { value } = (await req.json()) as { value: number };
        strip.setBrightness(value);
        strip.render();
        return Response.json({ ok: true });
      },
    },

    // Turn off all LEDs
    "/off": {
      POST() {
        animating = false;
        strip.clear();
        return Response.json({ ok: true });
      },
    },

    // Start rainbow animation
    "/rainbow": {
      POST() {
        animating = true;
        return Response.json({ ok: true });
      },
    },

    // Status
    "/": {
      GET() {
        return Response.json({
          numLeds: NUM_LEDS,
          brightness: BRIGHTNESS,
          animating,
        });
      },
    },
  },
});

console.log(`Listening on http://0.0.0.0:${PORT}`);

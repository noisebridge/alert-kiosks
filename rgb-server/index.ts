import { NeoPixel, rgb } from "./neopixel";

const NUM_LEDS = parseInt(process.env["NUM_LEDS"] ?? "100");
const BRIGHTNESS = 32;
const PORT = 3000;
const CORS_ORIGIN = "https://donate.noisebridge.net";
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": CORS_ORIGIN,
	"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

interface RGB {
	r: number;
	g: number;
	b: number;
}
type LedFn = (index: number, num_leds: number, timestamp: number, data?: unknown) => RGB;

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

function hsvToRgb(h: number, s: number, v: number): RGB {
	h = ((h % 1) + 1) % 1;
	const c = v * s;
	const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
	const m = v - c;
	let r: number, g: number, b: number;
	if (h < 1 / 6) {
		r = c;
		g = x;
		b = 0;
	} else if (h < 2 / 6) {
		r = x;
		g = c;
		b = 0;
	} else if (h < 3 / 6) {
		r = 0;
		g = c;
		b = x;
	} else if (h < 4 / 6) {
		r = 0;
		g = x;
		b = c;
	} else if (h < 5 / 6) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}
	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	};
}

// State
let updateInterval: ReturnType<typeof setInterval> | null = null;
let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
let currentFn: LedFn | null = null;

function clearUpdate() {
	if (updateInterval) {
		clearInterval(updateInterval);
		updateInterval = null;
	}
	if (timeoutTimer) {
		clearTimeout(timeoutTimer);
		timeoutTimer = null;
	}
	currentFn = null;
}

function resetLeds() {
	clearUpdate();
	strip.clear();
}

function startFunction(fn: LedFn, timeout?: number, data?: unknown) {
	clearUpdate();
	currentFn = fn;

	updateInterval = setInterval(() => {
		const ts = Date.now();
		for (let i = 0; i < NUM_LEDS; i++) {
			const { r, g, b } = currentFn!(i, NUM_LEDS, ts, data);
			strip.setPixel(i, rgb(r, g, b));
		}
		strip.render();
	}, 50);

	if (timeout !== undefined) {
		timeoutTimer = setTimeout(() => {
			resetLeds();
		}, timeout);
	}
}

// Startup: rainbow for 3 seconds then reset
const rainbowFn: LedFn = (index, num_leds, timestamp) => {
	const hue = (index / num_leds + timestamp / 1000) % 1;
	return hsvToRgb(hue, 1, 1);
};

startFunction(rainbowFn, 3000);

console.log(
	`NeoPixel server starting: ${NUM_LEDS} LEDs, brightness ${BRIGHTNESS}`,
);

Bun.serve({
	port: PORT,
	routes: {
		"/update": {
			OPTIONS() {
				return new Response(null, { status: 204, headers: CORS_HEADERS });
			},
			async POST(req) {
				try {
					const body = (await req.json()) as {
						function: string;
						data?: unknown;
						timeout?: number;
					};
					const fn = new Function(
						"index",
						"num_leds",
						"timestamp",
						"data",
						`return ${body.function}(index, num_leds, timestamp, data);`,
					) as LedFn;
					// Test it doesn't throw
					fn(0, NUM_LEDS, Date.now(), body.data);
					startFunction(fn, body.timeout, body.data);
					return Response.json({ ok: true }, { headers: CORS_HEADERS });
				} catch (e) {
					return Response.json(
						{ ok: false, error: e instanceof Error ? e.message : String(e) },
						{ status: 400, headers: CORS_HEADERS },
					);
				}
			},
		},

		"/reset": {
			OPTIONS() {
				return new Response(null, { status: 204, headers: CORS_HEADERS });
			},
			POST() {
				resetLeds();
				return Response.json({ ok: true }, { headers: CORS_HEADERS });
			},
		},

		"/": {
			GET() {
				return Response.json(
					{
						numLeds: NUM_LEDS,
						brightness: BRIGHTNESS,
						active: currentFn !== null,
					},
					{ headers: CORS_HEADERS },
				);
			},
		},
	},
});

console.log(`Listening on http://0.0.0.0:${PORT}`);

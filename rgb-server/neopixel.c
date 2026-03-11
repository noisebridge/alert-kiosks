/**
 * WS2812 LED driver via SPI (/dev/spidev0.0).
 * Works on Raspberry Pi 5 (no rpi_ws281x dependency).
 *
 * SPI at 2.5 MHz: each SPI bit = 0.4µs.
 * Each WS2812 bit is encoded as 3 SPI bits (1.2µs ≈ 1.25µs):
 *   WS2812 "0" → 0b100   (high 0.4µs, low 0.8µs)
 *   WS2812 "1" → 0b110   (high 0.8µs, low 0.4µs)
 *
 * Compile on the Pi:
 *   gcc -shared -o libneopixel.so -fPIC neopixel.c
 */
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>

static int spi_fd = -1;
static int initialized = 0;
static int led_count = 0;
static int led_brightness = 255;
static uint32_t *pixels = NULL;
static uint8_t *spi_buf = NULL;
static int spi_buf_len = 0;

#define SPI_SPEED   2500000
#define RESET_BYTES 80  /* >50µs of low at 2.5 MHz */

/* Encode one color byte (8 WS2812 bits) into 3 SPI bytes (24 SPI bits). */
static void encode_byte(uint8_t byte, uint8_t *out) {
    uint32_t enc = 0;
    for (int i = 7; i >= 0; i--) {
        enc <<= 3;
        enc |= (byte & (1 << i)) ? 0x6 : 0x4;  /* 0b110 or 0b100 */
    }
    out[0] = (enc >> 16) & 0xFF;
    out[1] = (enc >> 8) & 0xFF;
    out[2] = enc & 0xFF;
}

int neopixel_init(int num_leds, int brightness) {
    spi_fd = open("/dev/spidev0.0", O_WRONLY);
    if (spi_fd < 0) return -1;

    uint8_t mode = SPI_MODE_0;
    uint8_t bits = 8;
    uint32_t speed = SPI_SPEED;

    if (ioctl(spi_fd, SPI_IOC_WR_MODE, &mode) < 0) goto fail;
    if (ioctl(spi_fd, SPI_IOC_WR_BITS_PER_WORD, &bits) < 0) goto fail;
    if (ioctl(spi_fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed) < 0) goto fail;

    led_count = num_leds;
    led_brightness = brightness;
    pixels = (uint32_t *)calloc(num_leds, sizeof(uint32_t));
    /* 9 SPI bytes per LED (3 color bytes × 3 SPI bytes) + reset padding */
    spi_buf_len = num_leds * 9 + RESET_BYTES;
    spi_buf = (uint8_t *)calloc(spi_buf_len, 1);

    if (!pixels || !spi_buf) goto fail;

    initialized = 1;
    return 0;

fail:
    if (spi_fd >= 0) { close(spi_fd); spi_fd = -1; }
    free(pixels); pixels = NULL;
    free(spi_buf); spi_buf = NULL;
    return -1;
}

int neopixel_num_leds(void) {
    return initialized ? led_count : 0;
}

void neopixel_set_pixel(int index, unsigned int color) {
    if (!initialized || index < 0 || index >= led_count) return;
    pixels[index] = color;
}

void neopixel_fill(unsigned int color) {
    if (!initialized) return;
    for (int i = 0; i < led_count; i++)
        pixels[i] = color;
}

void neopixel_set_brightness(int brightness) {
    if (!initialized) return;
    led_brightness = brightness;
}

int neopixel_render(void) {
    if (!initialized) return -1;

    uint8_t *p = spi_buf;
    for (int i = 0; i < led_count; i++) {
        uint32_t c = pixels[i];
        uint8_t r = (c >> 16) & 0xFF;
        uint8_t g = (c >> 8) & 0xFF;
        uint8_t b = c & 0xFF;

        /* Apply brightness scaling */
        r = (uint8_t)((r * led_brightness) >> 8);
        g = (uint8_t)((g * led_brightness) >> 8);
        b = (uint8_t)((b * led_brightness) >> 8);

        /* WS2812 expects GRB order */
        encode_byte(g, p); p += 3;
        encode_byte(r, p); p += 3;
        encode_byte(b, p); p += 3;
    }
    /* Reset bytes are already zeroed from calloc / previous render */
    memset(p, 0, RESET_BYTES);

    int written = write(spi_fd, spi_buf, spi_buf_len);
    return (written == spi_buf_len) ? 0 : -1;
}

void neopixel_cleanup(void) {
    if (initialized) {
        /* Turn off all LEDs */
        for (int i = 0; i < led_count; i++)
            pixels[i] = 0;
        neopixel_render();

        close(spi_fd);
        spi_fd = -1;
        free(pixels); pixels = NULL;
        free(spi_buf); spi_buf = NULL;
        initialized = 0;
    }
}

import asyncio
import json
import math
import re
from typing import Optional, Tuple

import serial
import websockets

HOST = "localhost"
PORT = 5000
PATH = "/ws"
SEND_INTERVAL_SECONDS = 1.0
DEFAULT_TEMP_C = 22.0

SERIAL_PORT = "COM4"
BAUD_RATE = 115200

CLEAR_RAW = 54600
A = 420

LAST_READING = {
    "PPM": 0.0,
    "NTU": 0.0,
    "tempC": DEFAULT_TEMP_C,
}

def convert_tds_raw_to_ppm(tds_raw: float) -> float:
    voltage = tds_raw * 3.3 / 65535
    ppm = voltage * 1000 * 0.5
    return ppm

def convert_ldr_raw_to_ntu(ldr_raw: float) -> float:
    safe_ldr_raw = max(float(ldr_raw), 1.0)
    ntu = ((A * math.log(CLEAR_RAW / safe_ldr_raw)))
    return max(0.0, ntu)

def parse_sensor_line(line: str) -> Optional[Tuple[float, float]]:
    tds_match = re.search(r"TDS:\s*([\d.]+)", line)
    ldr_match = re.search(r"LDR:\s*([\d.]+)", line)
    ntu_match = re.search(r"Turbidity:\s*([\d.]+)", line)

    if tds_match and ntu_match:
        ppm = convert_tds_raw_to_ppm(float(tds_match.group(1)))
        ntu = (float(ntu_match.group(1)))
        return ppm, ntu

    if tds_match and ldr_match:
        ppm = convert_tds_raw_to_ppm(float(tds_match.group(1)))
        ntu = convert_ldr_raw_to_ntu(float(ldr_match.group(1)))
        return ppm, ntu

    return None

async def sensor_reader() -> None:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    await asyncio.sleep(2)

    while True:
        try:
            line = ser.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                await asyncio.sleep(0.05)
                continue

            print("FROM PICO:", line)

            parsed = parse_sensor_line(line)
            if parsed is None:
                continue

            ppm, ntu = parsed
            LAST_READING["PPM"] = round(ppm, 2)
            LAST_READING["NTU"] = round(ntu, 2)
            LAST_READING["tempC"] = DEFAULT_TEMP_C
        except Exception as e:
            print("Serial read error:", e)
            await asyncio.sleep(1)

async def ws_handler(websocket):
    if websocket.request.path != PATH:
        await websocket.close(code=1008, reason="Invalid path")
        return

    try:
        while True:
            await websocket.send(json.dumps(LAST_READING))
            await asyncio.sleep(SEND_INTERVAL_SECONDS)
    except websockets.ConnectionClosed:
        pass

async def main() -> None:
    print(f"WebSocket server running at ws://{HOST}:{PORT}{PATH}")
    print(f"Reading Pico data from {SERIAL_PORT} at {BAUD_RATE} baud")
    asyncio.create_task(sensor_reader())
    async with websockets.serve(ws_handler, HOST, PORT):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
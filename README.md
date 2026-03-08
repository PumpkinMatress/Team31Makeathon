# Team31Makeathon
MAKEATHON REPO - Intel Challenge
Problem:
During fabrication of silicon wafers, rinses use timed washes to clean silicon wafers, but use more water than necessary leading to significant waste.

Solution:
Create a sensor that can detect when water running off wafer is clean, telling the machine to stop rinsing when clean, minimizing water waste.

Design - Smart Sensor
Pico2W board is hooked up to provided TDS sensor and homemade Turpidity sensor (photoresistor linked with bright red LED, calibrated with known values). Sensors are embedded in 3d printed funnel apparatus which intakes flow of water to be tested and returns water to system. Data is sent to pico board, which relays raw data to python backend which converts raw data into usable units. Units are sent in real time to frontend website which displays a smart dashboard showing contamination values, as well as when the water turns clean. 

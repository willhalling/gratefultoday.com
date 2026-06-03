# Impulse Responses for Location-Based Reverb

This folder contains impulse response (IR) audio files for realistic acoustic space simulation.

## Required Files

Place the following .wav files in this directory:

1. **york-minster.wav** - Cathedral reverb (York Minster, UK)
2. **st-patricks-church.wav** - Church reverb (St. Patrick's Church, Patrington, UK)
3. **maes-howe.wav** - Ancient chamber (Maes Howe, Orkney, Scotland)
4. **jack-lyons-concert-hall.wav** - Concert hall (University of York, UK)
5. **terrys-typing-room.wav** - Small room (Terry's Typing Room, UK)

## Source

All impulse responses are sourced from the **OpenAIR Library**:

- Website: https://www.openair.hosted.york.ac.uk/
- License: Creative Commons
- Research: University of York

## File Format

- Format: WAV (mono or stereo)
- Sample Rate: 44.1kHz or 48kHz recommended
- Bit Depth: 16-bit or 24-bit
- Size: Typically 100-500KB each

## Usage

These IRs are loaded dynamically by the audio processing engine when users select a location effect in Advanced Settings. The convolution reverb applies the acoustic characteristics of these real spaces to the processed audio.

## Attribution

When using these impulse responses, please credit the OpenAIR project:

- OpenAIR: The Open Acoustic Impulse Response Library
- University of York
- https://www.openair.hosted.york.ac.uk/

/**
 * Generates a minimal GBA ROM that displays a solid blue screen.
 *
 * GBA ROM header is 192 bytes. We place ARM code right after the header.
 * The code:
 *   1. Sets REG_DISPCNT (0x04000000) to MODE3 | BG2_ENABLE (0x0403)
 *      — 240x160 bitmap, 16bpp, direct pixel writes to VRAM
 *   2. Fills VRAM (0x06000000) with blue pixels (0x7C00 in BGR555 = full blue)
 *      — 240 * 160 = 38400 pixels, 76800 bytes
 *   3. Infinite loop
 *
 * Usage: npx tsx tests/fixtures/generate-test-rom.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

function generateTestRom(): Uint8Array {
  // GBA ROM must be at least 192 bytes for header + our code
  const rom = new Uint8Array(1024);
  const view = new DataView(rom.buffer);

  // --- GBA Header (192 bytes) ---

  // 0x00: ARM branch to entry point (0xC0 = 192 = after header)
  // ARM instruction: B +0x2E (branch offset in words, adjusted for pipeline)
  // Entry point at 0xC0, current PC at 0x08 (after pipeline), offset = (0xC0 - 0x08) / 4 - 2 = 0x2C
  // EA00002C = B #0xC0 from address 0x00
  view.setUint32(0x00, 0xEA00002E, false); // branch to 0xC0

  // 0x04-0x9F: Nintendo logo (not needed for emulators, leave zeroed)

  // 0xA0-0xAB: Game title (12 bytes) — "BLUESCREEN"
  const title = 'BLUESCREEN\0\0';
  for (let i = 0; i < 12; i++) {
    rom[0xA0 + i] = title.charCodeAt(i);
  }

  // 0xAC-0xAF: Game code
  rom[0xAC] = 0x42; // 'B'
  rom[0xAD] = 0x4C; // 'L'
  rom[0xAE] = 0x55; // 'U'
  rom[0xAF] = 0x45; // 'E'

  // 0xB0-0xB1: Maker code
  rom[0xB0] = 0x30; // '0'
  rom[0xB1] = 0x31; // '1'

  // 0xB2: Fixed value (must be 0x96)
  rom[0xB2] = 0x96;

  // 0xB3: Main unit code (0x00 for GBA)
  rom[0xB3] = 0x00;

  // 0xBD: Complement check (header checksum)
  // Checksum = -sum(bytes 0xA0..0xBC) - 0x19
  let checksum = 0;
  for (let i = 0xA0; i <= 0xBC; i++) {
    checksum += rom[i];
  }
  rom[0xBD] = (-(checksum + 0x19)) & 0xFF;

  // --- ARM Code at 0xC0 ---
  let pc = 0xC0;

  // Set REG_DISPCNT = 0x0403 (MODE3 | BG2_ENABLE)
  // MOV r0, #0x04000000
  view.setUint32(pc, 0xE3A00301, false); // MOV r0, #0x04000000
  pc += 4;
  // MOV r1, #0x0400
  view.setUint32(pc, 0xE3A01B01, false); // MOV r1, #0x400
  pc += 4;
  // ORR r1, r1, #3
  view.setUint32(pc, 0xE3811003, false); // ORR r1, r1, #3
  pc += 4;
  // STRH r1, [r0]
  view.setUint32(pc, 0xE1C010B0, false); // STRH r1, [r0, #0]
  pc += 4;

  // Set up VRAM fill
  // MOV r0, #0x06000000 (VRAM base)
  view.setUint32(pc, 0xE3A00306, false); // MOV r0, #0x06000000
  pc += 4;

  // Blue in BGR555: bit layout is 0BBBBBGGGGGRRRRR
  // Full blue = 0x7C00 (bits 10-14 set)
  // MOV r1, #0x7C00
  view.setUint32(pc, 0xE3A01A1F, false); // MOV r1, #0x1F000 ... need different encoding
  // Actually: 0x7C00 = 0x1F << 10. ARM immediate: 0x1F rotated right by 22 = rotated left by 10
  // rotation field = (32 - 10) / 2 = 11, imm8 = 0x1F
  // So: MOV r1, #0x7C00 = 0xE3A01B1F
  view.setUint32(pc - 4, 0xE3A01B1F, false); // MOV r1, #0x7C00

  // ORR r1, r1, r1, LSL #16 — pack two pixels into 32 bits
  view.setUint32(pc, 0xE1811801, false); // ORR r1, r1, r1, LSL #16
  pc += 4;

  // MOV r2, #0x9600 (38400 pixels / 2 = 19200 words to write)
  // 19200 = 0x4B00
  // Actually 240*160 = 38400 pixels. At 2 pixels per word = 19200 iterations
  // 19200 = 0x4B00
  // MOV r2, #0x4B00
  view.setUint32(pc, 0xE3A024B0, false); // MOV r2, #0xB0 << 8 ... hmm
  // 0x4B00 = 0x4B << 8. ARM: imm8=0x4B, rotate=12 (rotate_imm=12, shift=24... no)
  // rotate right by 2*rot. 0x4B << 8 = 0x4B ror 24 => rot=12, imm=0x4B
  view.setUint32(pc, 0xE3A02C4B, false); // MOV r2, #0x4B00
  pc += 4;

  // Fill loop:
  // STR r1, [r0], #4
  view.setUint32(pc, 0xE4801004, false); // STR r1, [r0], #4
  pc += 4;
  // SUBS r2, r2, #1
  view.setUint32(pc, 0xE2522001, false); // SUBS r2, r2, #1
  pc += 4;
  // BNE fill_loop (branch back 2 instructions = -3 words accounting for pipeline)
  view.setUint32(pc, 0x1AFFFFFC, false); // BNE -3 (back to STR)
  pc += 4;

  // Infinite loop
  // B . (branch to self)
  view.setUint32(pc, 0xEAFFFFFE, false); // B #-2 (self)

  return rom;
}

const rom = generateTestRom();
const outPath = join(__dirname, 'test-blue-screen.gba');
writeFileSync(outPath, rom);
console.log(`Generated test ROM: ${outPath} (${rom.length} bytes)`);

import assert from 'node:assert/strict';
import test from 'node:test';
import { comparePatterns } from '../src/domain/compare.js';
import type { Pattern } from '../src/domain/pattern.js';

function pattern(type: Pattern['type'], mainRank: number, sequenceLength = 1, attachmentMode: Pattern['attachmentMode'] = 'none', cardCount = 1): Pattern {
  return { type, mainRank, sequenceLength, attachmentMode, cardCount };
}

test('higher main rank beats same pattern and equal rank ties', () => {
  assert.equal(comparePatterns(pattern('PAIR', 7, 1, 'none', 2), pattern('PAIR', 6, 1, 'none', 2)), 1);
  assert.equal(comparePatterns(pattern('PAIR', 6, 1, 'none', 2), pattern('PAIR', 6, 1, 'none', 2)), 0);
  assert.equal(comparePatterns(pattern('PAIR', 5, 1, 'none', 2), pattern('PAIR', 6, 1, 'none', 2)), -1);
});

test('different pattern types and sequence lengths cannot compare', () => {
  assert.equal(comparePatterns(pattern('STRAIGHT', 9, 5, 'none', 5), pattern('STRAIGHT', 10, 6, 'none', 6)), 0);
  assert.equal(comparePatterns(pattern('AIRPLANE_SINGLE', 9, 2, 'single', 8), pattern('AIRPLANE_PAIRS', 8, 2, 'pair', 10)), 0);
  assert.equal(comparePatterns(pattern('FOUR_TWO_SINGLES', 10, 1, 'single', 6), pattern('FOUR_TWO_PAIRS', 9, 1, 'pair', 8)), 0);
  assert.equal(comparePatterns(pattern('TRIPLE', 10, 1, 'none', 3), pattern('PAIR', 2, 1, 'none', 2)), 0);
});

test('bomb beats ordinary patterns and higher bomb beats lower bomb', () => {
  assert.equal(comparePatterns(pattern('BOMB', 5, 1, 'none', 4), pattern('TRIPLE_PAIR', 14, 1, 'pair', 5)), 1);
  assert.equal(comparePatterns(pattern('BOMB', 10, 1, 'none', 4), pattern('BOMB', 9, 1, 'none', 4)), 1);
  assert.equal(comparePatterns(pattern('BOMB', 8, 1, 'none', 4), pattern('BOMB', 9, 1, 'none', 4)), -1);
});

test('rocket beats every non-rocket pattern', () => {
  assert.equal(comparePatterns(pattern('ROCKET', 17, 1, 'none', 2), pattern('BOMB', 15, 1, 'none', 4)), 1);
  assert.equal(comparePatterns(pattern('BOMB', 17, 1, 'none', 4), pattern('ROCKET', 17, 1, 'none', 2)), -1);
});

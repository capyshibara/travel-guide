import { describe, expect, it } from 'vitest';
import { classifyBookingStatus, classifyBookingUrgency } from '../classify';

describe('classifyBookingStatus', () => {
  // "already" contains the letters "ready"; a real workbook's "Already booked" was
  // once classified as "ready" instead of "booked" because of it.
  it('does not let a status word match inside an unrelated word', () => {
    expect(classifyBookingStatus('Already booked')).toEqual({ value: 'booked', matched: true });
  });

  it('still matches a status word on its own', () => {
    expect(classifyBookingStatus('Confirmed')).toEqual({ value: 'confirmed', matched: true });
    expect(classifyBookingStatus('Ready to book')).toEqual({ value: 'ready', matched: true });
  });
});

describe('classifyBookingUrgency', () => {
  it('treats "already booked" as nothing left to book, not an unrecognized window', () => {
    expect(classifyBookingUrgency('Already booked')).toEqual({ value: 'none', matched: true });
  });
});

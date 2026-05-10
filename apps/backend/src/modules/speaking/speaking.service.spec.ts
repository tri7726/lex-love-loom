import { SpeakingService } from './speaking.service';

describe('SpeakingService', () => {
  const svc = new SpeakingService();

  it('returns S for perfect match', () => {
    const r = svc.analyze({ reference: 'こんにちは', transcript: 'こんにちは' });
    expect(r.accuracy).toBe(100);
    expect(r.grade).toBe('S');
  });

  it('returns lower grade for mismatch', () => {
    const r = svc.analyze({ reference: 'こんにちは', transcript: 'こんばんは' });
    expect(r.accuracy).toBeLessThan(100);
    expect(['A', 'B', 'C', 'D']).toContain(r.grade);
  });
});

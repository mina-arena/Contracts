import { UInt32, isReady, shutdown } from 'snarkyjs';

import { Position } from '../../src/objects/Position';

await isReady;

describe('Position', () => {
  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  describe('verifyDistance', () => {
    it('returns true when the asserted distance is correct', async () => {
      const pos1 = Position.fromXY(10, 10);
      const pos2 = Position.fromXY(10, 20);
      const pos3 = Position.fromXY(20, 20);
      const pos4 = Position.fromXY(20, 10);

      expect(pos1.verifyDistance(pos2, UInt32.from(10)).toBoolean()).toBe(true);
      expect(pos2.verifyDistance(pos1, UInt32.from(10)).toBoolean()).toBe(true);
      expect(pos1.verifyDistance(pos3, UInt32.from(14)).toBoolean()).toBe(true); // 14.14214 trimmed to nearest int
      expect(pos3.verifyDistance(pos1, UInt32.from(14)).toBoolean()).toBe(true);

      expect(pos3.verifyDistance(pos4, UInt32.from(10)).toBoolean()).toBe(true);
      expect(pos4.verifyDistance(pos3, UInt32.from(10)).toBoolean()).toBe(true);
      expect(pos1.verifyDistance(pos4, UInt32.from(10)).toBoolean()).toBe(true);
      expect(pos4.verifyDistance(pos1, UInt32.from(10)).toBoolean()).toBe(true);
    });

    it('returns false when the asserted distance is not correct', async () => {
      const pos1 = Position.fromXY(10, 10);
      const pos2 = Position.fromXY(10, 20);
      const pos3 = Position.fromXY(20, 20);

      expect(pos1.verifyDistance(pos2, UInt32.from(0)).toBoolean()).toBe(false);
      expect(pos2.verifyDistance(pos1, UInt32.from(5)).toBoolean()).toBe(false);
      expect(pos1.verifyDistance(pos3, UInt32.from(18)).toBoolean()).toBe(
        false
      );
      expect(pos3.verifyDistance(pos1, UInt32.from(20)).toBoolean()).toBe(
        false
      );
    });

    it('throws if x^2 + y^2 is bigger than UInt32 max size', async () => {
      const pos1 = Position.fromXY(2 ** 32 - 1, 2 ** 32 - 1);
      const pos2 = Position.fromXY(0, 0);

      expect(() => {
        pos1.verifyDistance(pos2, UInt32.zero);
      }).toThrow();
    });
  });
});

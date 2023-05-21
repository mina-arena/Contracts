import { Field, Poseidon, PrivateKey, UInt32 } from 'snarkyjs';

import { Piece } from '../../src/objects/Piece';
import { Unit } from '../../src/objects/Unit';
import { Position } from '../../src/objects/Position';
import { PieceCondition } from '../../src/objects/PieceCondition';
import { UnitStats } from '../../src/objects/UnitStats';

describe('Piece', () => {
  describe('hash', () => {
    it('returns the expected hash', async () => {
      const playerPublicKey = PrivateKey.random().toPublicKey();
      const stats = new UnitStats({
        health: UInt32.from(5),
        movement: UInt32.from(2),
        rangedAttackRange: UInt32.from(0),
        rangedHitRoll: UInt32.from(2),
        rangedWoundRoll: UInt32.from(2),
        saveRoll: UInt32.from(6),
        rangedDamage: UInt32.from(2),
        meleeHitRoll: UInt32.from(2),
        meleeWoundRoll: UInt32.from(2),
        meleeDamage: UInt32.from(2),
      });
      const unit = new Unit({ stats });
      const pos = Position.fromXY(50, 51);
      const pieceCondition = new PieceCondition(stats);
      const piece = new Piece(Field(7), playerPublicKey, pos, unit);

      expect(piece.hash().toString()).toBe(
        Poseidon.hash([
          Poseidon.hash(playerPublicKey.toFields()),
          pos.hash(),
          unit.hash(),
          pieceCondition.hash(),
        ]).toString()
      );

      const updatedCondition = new PieceCondition({
        health: UInt32.from(4),
        movement: UInt32.from(2),
        rangedAttackRange: UInt32.from(0),
        rangedHitRoll: UInt32.from(2),
        rangedWoundRoll: UInt32.from(2),
        saveRoll: UInt32.from(6),
        rangedDamage: UInt32.from(2),
        meleeHitRoll: UInt32.from(2),
        meleeWoundRoll: UInt32.from(2),
        meleeDamage: UInt32.from(2),
      });
      piece.condition.health = piece.condition.health.sub(1);

      expect(piece.hash().toString()).toBe(
        Poseidon.hash([
          Poseidon.hash(playerPublicKey.toFields()),
          pos.hash(),
          unit.hash(),
          updatedCondition.hash(),
        ]).toString()
      );
    });
  });
});

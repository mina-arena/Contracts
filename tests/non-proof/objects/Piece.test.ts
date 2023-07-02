import { Field, Poseidon, PrivateKey, UInt32 } from 'snarkyjs';

import { Piece } from '../../../src/objects/Piece';
import { Unit } from '../../../src/objects/Unit';
import { Position } from '../../../src/objects/Position';
import { PieceCondition } from '../../../src/objects/PieceCondition';
import { UnitStats } from '../../../src/objects/UnitStats';

describe('Piece', () => {
  describe('hash', () => {
    it('returns the expected hash', async () => {
      const pieceId = Field(7);
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
      const piece = new Piece({
        id: pieceId,
        playerPublicKey,
        position: pos,
        baseUnit: unit,
        condition: pieceCondition,
      });
      expect(piece.hash().toString()).toBe(
        Poseidon.hash([
          pieceId,
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
          pieceId,
          Poseidon.hash(playerPublicKey.toFields()),
          pos.hash(),
          unit.hash(),
          updatedCondition.hash(),
        ]).toString()
      );
    });
  });

  describe('clone', () => {
    it('returns a new Piece with the same values', async () => {
      const playerPublicKey = PrivateKey.random().toPublicKey();
      const unit = Unit.default();
      const pos = Position.fromXY(50, 51);
      const piece = new Piece({
        id: Field(7),
        playerPublicKey,
        position: pos,
        baseUnit: unit,
        condition: unit.stats,
      });

      const clone = piece.clone();

      expect(clone.toJSON()).toBe(piece.toJSON());
    });

    it('can edit the clone without affecting the original', async () => {
      const playerPublicKey = PrivateKey.random().toPublicKey();
      const unit = Unit.default();
      const pos = Position.fromXY(50, 51);
      const piece = new Piece({
        id: Field(7),
        playerPublicKey,
        position: pos,
        baseUnit: unit,
        condition: unit.stats,
      });

      let clone = piece.clone();
      clone.position.x = clone.position.x.add(1);
      expect(clone.toJSON()).not.toBe(piece.toJSON());

      clone = piece.clone();
      clone.condition.health = clone.condition.health.sub(1);
      expect(clone.toJSON()).not.toBe(piece.toJSON());

      clone = piece.clone();
      clone.baseUnit.stats.health = clone.baseUnit.stats.health.sub(1);
      expect(clone.toJSON()).not.toBe(piece.toJSON());

      clone = piece.clone();
      clone.playerPublicKey = PrivateKey.random().toPublicKey();
      expect(clone.toJSON()).not.toBe(piece.toJSON());
    });
  });
});

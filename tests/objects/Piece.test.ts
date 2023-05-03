import {
  Field,
  Poseidon,
  PrivateKey,
  UInt32,
  isReady,
  shutdown,
} from 'snarkyjs';

import { Piece } from '../../src/objects/Piece';
import { Unit } from '../../src/objects/Unit';
import { Position } from '../../src/objects/Position';
import { PieceCondition } from '../../src/objects/PieceCondition';
import { UnitStats } from '../../src/objects/UnitStats';

await isReady;

describe('Piece', () => {
  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  describe('hash', () => {
    it('returns the expected hash', async () => {
      const playerPublicKey = PrivateKey.random().toPublicKey();
      const stats = new UnitStats({ health: Field(5), movement: Field(2) });
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
        health: Field(4),
        movement: Field(2),
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

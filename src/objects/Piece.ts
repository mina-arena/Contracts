import { Field, Struct, Poseidon, PublicKey } from 'snarkyjs';

import { Unit } from './Unit.js';
import { Position } from './Position.js';
import { PieceCondition } from './PieceCondition.js';

export class Piece extends Struct({
  id: Field,
  playerPublicKey: PublicKey,
  position: Position,
  baseUnit: Unit,
  condition: PieceCondition,
}) {
  constructor(
    id: Field,
    playerPublicKey: PublicKey,
    position: Position,
    baseUnit: Unit,
    condition?: PieceCondition | undefined
  ) {
    condition = condition || new PieceCondition(baseUnit.stats);
    super({
      id,
      playerPublicKey,
      position,
      baseUnit,
      condition,
    });
  }

  hash(): Field {
    return Poseidon.hash([
      Poseidon.hash(this.playerPublicKey.toFields()),
      this.position.hash(),
      this.baseUnit.hash(),
      this.condition.hash(),
    ]);
  }

  clone(): Piece {
    return new Piece(
      this.id,
      this.playerPublicKey,
      this.position,
      this.baseUnit,
      this.condition
    );
  }
}

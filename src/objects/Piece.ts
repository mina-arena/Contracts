import { Field, Struct, Poseidon, PublicKey } from 'snarkyjs';

import { Unit } from './Unit';
import { Position } from './Position';
import { PieceCondition } from './PieceCondition';

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

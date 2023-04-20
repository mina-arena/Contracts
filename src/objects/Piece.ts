import { Field, Struct, Poseidon } from 'snarkyjs';

import { Unit } from './Unit';
import { Position } from './Position';
import { PieceCondition } from './PieceCondition';

export class Piece extends Struct({
  id: Field,
  position: Position,
  baseUnit: Unit,
  condition: PieceCondition,
}) {
  constructor(id: Field, position: Position, baseUnit: Unit) {
    super({
      id,
      position,
      baseUnit,
      condition: new PieceCondition(baseUnit.stats),
    });
  }

  hash(): Field {
    return Poseidon.hash([
      this.position.hash(),
      this.baseUnit.hash(),
      this.condition.hash(),
    ]);
  }

  clone(): Piece {
    return new Piece(this.id, this.position, this.baseUnit);
  }
}

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
  hash(): Field {
    return Poseidon.hash([
      this.id,
      Poseidon.hash(this.playerPublicKey.toFields()),
      this.position.hash(),
      this.baseUnit.hash(),
      this.condition.hash(),
    ]);
  }

  clone(): Piece {
    const newId = Field(this.id);
    const newPublicKey = this.playerPublicKey;
    const newPosition = this.position.clone();
    const newBaseUnit = this.baseUnit.clone();
    const newCondition = this.condition.clone();
    return new Piece({
      id: newId,
      playerPublicKey: newPublicKey,
      position: newPosition,
      baseUnit: newBaseUnit,
      condition: newCondition,
    });
  }

  toJSON(): string {
    return JSON.stringify({
      id: this.id.toString(),
      playerPublicKey: this.playerPublicKey.toBase58(),
      position: {
        x: this.position.x.toString(),
        y: this.position.y.toString(),
      },
      baseUnit: this.baseUnit.toJSON(),
      condition: this.condition.toJSON(),
    });
  }
}

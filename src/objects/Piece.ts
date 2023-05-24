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
    return new Piece(
      newId,
      newPublicKey,
      newPosition,
      newBaseUnit,
      newCondition
    );
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

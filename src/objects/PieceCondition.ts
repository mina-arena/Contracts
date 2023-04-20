import { Field, Struct, Poseidon } from 'snarkyjs';

// If this is always going to be an exact copy of stats then maybe we can condense the 2
export class PieceCondition extends Struct({
  health: Field,
  movement: Field,
}) {
  hash(): Field {
    return Poseidon.hash([this.health, this.movement]);
  }
}

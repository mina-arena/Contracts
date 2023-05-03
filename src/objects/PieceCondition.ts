import { Field, Struct, Poseidon, UInt32 } from 'snarkyjs';

// If this is always going to be an exact copy of stats then maybe we can condense the 2
export class PieceCondition extends Struct({
  health: UInt32,
  movement: UInt32,
}) {
  hash(): Field {
    return Poseidon.hash([this.health.value, this.movement.value]);
  }
}

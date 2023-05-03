import { Field, Struct, Poseidon, UInt32 } from 'snarkyjs';

export class UnitStats extends Struct({
  health: UInt32,
  movement: UInt32,
}) {
  hash(): Field {
    return Poseidon.hash([this.health.value, this.movement.value]);
  }
}

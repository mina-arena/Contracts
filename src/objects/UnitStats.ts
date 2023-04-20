import { Field, Struct, Poseidon } from 'snarkyjs';

export class UnitStats extends Struct({
  health: Field,
  movement: Field,
}) {
  hash(): Field {
    return Poseidon.hash([this.health, this.movement]);
  }
}

import { Field, Struct, Poseidon, UInt32 } from 'snarkyjs';

// If this is always going to be an exact copy of stats then maybe we can condense the 2
export class PieceCondition extends Struct({
  health: UInt32,
  movement: UInt32,
  rangedAttackRange: UInt32,
  rangedHitRoll: UInt32,
  rangedWoundRoll: UInt32,
  rangedSaveRoll: UInt32,
  rangedDamage: UInt32,
}) {
  hash(): Field {
    return Poseidon.hash([
      this.health.value,
      this.movement.value,
      this.rangedAttackRange.value,
      this.rangedHitRoll.value,
      this.rangedWoundRoll.value,
      this.rangedSaveRoll.value,
      this.rangedDamage.value,
    ]);
  }
}

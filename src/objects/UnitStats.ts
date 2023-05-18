import { Field, Struct, Poseidon, UInt32 } from 'snarkyjs';

export class UnitStats extends Struct({
  health: UInt32,
  movement: UInt32,
  rangedAttackRange: UInt32,
  rangedHitRoll: UInt32,
  rangedWoundRoll: UInt32,
  rangedSaveRoll: UInt32,
  rangedDamage: UInt32,
  meleeHitRoll: UInt32,
  meleeWoundRoll: UInt32,
  meleeSaveRoll: UInt32,
  meleeDamage: UInt32,
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
      this.meleeHitRoll.value,
      this.meleeWoundRoll.value,
      this.meleeSaveRoll.value,
      this.meleeDamage.value,
    ]);
  }
}

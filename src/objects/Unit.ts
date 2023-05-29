import { Field, Struct, Poseidon, UInt32 } from 'snarkyjs';

import { UnitStats } from './UnitStats.js';

// For now, a unit is just its stats
// In the future, it can also have other metadata
export class Unit extends Struct({
  stats: UnitStats,
}) {
  static default(): Unit {
    return new Unit({
      stats: new UnitStats({
        health: UInt32.from(3),
        movement: UInt32.from(50),
        rangedAttackRange: UInt32.from(50),
        rangedHitRoll: UInt32.from(2),
        rangedWoundRoll: UInt32.from(2),
        saveRoll: UInt32.from(6),
        rangedDamage: UInt32.from(2),
        meleeHitRoll: UInt32.from(1),
        meleeWoundRoll: UInt32.from(2),
        meleeDamage: UInt32.from(3),
      }),
    });
  }

  hash(): Field {
    return Poseidon.hash([this.stats.hash()]);
  }
}

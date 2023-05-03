import { Field, Struct, Poseidon, UInt32 } from 'snarkyjs';

import { UnitStats } from './UnitStats';

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
      }),
    });
  }

  hash(): Field {
    return Poseidon.hash([this.stats.hash()]);
  }
}

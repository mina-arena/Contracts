import { Field, Struct, Poseidon } from 'snarkyjs';

import { UnitStats } from './UnitStats';

// For now, a unit is just its stats
// In the future, it can also have other metadata
export class Unit extends Struct({
  stats: UnitStats,
}) {
  static default(): Unit {
    return new Unit({
      stats: new UnitStats({
        health: Field(3),
        movement: Field(3),
      }),
    });
  }

  hash(): Field {
    return Poseidon.hash([this.stats.hash()]);
  }
}

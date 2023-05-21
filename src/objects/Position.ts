import { Field, Struct, UInt32, Poseidon, Circuit, Bool } from 'snarkyjs';

export class Position extends Struct({
  x: UInt32,
  y: UInt32,
}) {
  static fromXY(x: number, y: number): Position {
    return new Position({
      x: UInt32.from(x),
      y: UInt32.from(y),
    });
  }

  hash(): Field {
    return Poseidon.hash(this.x.toFields().concat(this.y.toFields()));
  }

  getMerkleKey(arenaWidth: number): Field {
    const rowIdx = this.y.mul(arenaWidth);
    return rowIdx.add(this.x).value;
  }

  verifyDistance(other: Position, assertedDistance: UInt32): Bool {
    /**
     * x, y in our positions are UInt32, but we need to allow negative numbers
     * so the intermediate _x, _y are raw Field values and we will cast the final return to UInt32
     */
    const _x: Field = Circuit.if(
      this.x.greaterThanOrEqual(other.x),
      (() => this.x.value.sub(other.x.value))(),
      (() => other.x.value.sub(this.x.value))()
    );
    const _y: Field = Circuit.if(
      this.y.greaterThanOrEqual(other.y),
      (() => this.y.value.sub(other.y.value))(),
      (() => other.y.value.sub(this.y.value))()
    );

    const x_sq_plus_y_sq = _x.square().add(_y.square());
    const isEq = UInt32.from(x_sq_plus_y_sq).equals(
      assertedDistance.mul(assertedDistance)
    );
    const isGt = UInt32.from(x_sq_plus_y_sq).greaterThan(
      assertedDistance.mul(assertedDistance)
    );
    const isLtNextInt = UInt32.from(x_sq_plus_y_sq).lessThan(
      assertedDistance.add(1).mul(assertedDistance.add(1))
    );

    // Either the distance squared is exactly the asserted value squared,
    // or it's greater than the asserted value squared, AND less than the next integer value squared
    return Bool.or(isEq, Bool.and(isGt, isLtNextInt));
  }
}

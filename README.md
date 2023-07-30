# Mina zkApp: Contracts

This repo houses all of the snarkyJS logic to support [Mina Arena](https://mina-arena.45930.xyz/). It is released as an NPM package: https://www.npmjs.com/package/mina-arena-contracts and is primarily consumed by the [Mina Arena Frontend](https://github.com/mina-arena/mina-arena) and [Backend](https://github.com/mina-arena/mina-arena-server) servers.

## Architecture

### Component Structures in the Game

#### Piece

A `Piece` is the basic component of gameplay. Every piece has an `id` by which the user can intreact with it. A piece is the join between a `Unit` and a game, where a unit has base stats like attack and defense, and in the context of a game, a piece has a `PieceCondition`. Piece conditions are initialized with the unit's base stats, but during the game they can change, namely in that their health decreases as they take damage. A piece also has a `Position` (x,y coordinate) in the game, and is associated with a public key representing the player who is allowed to control it.

```
class Piece extends Struct({
  id: Field,
  playerPublicKey: PublicKey,
  position: Position,
  baseUnit: Unit,
  condition: PieceCondition,
})

class Position extends Struct({
  x: UInt32,
  y: UInt32,
})

class PieceCondition extends Struct({
  health: UInt32,
  movement: UInt32,
  rangedAttackRange: UInt32,
  rangedHitRoll: UInt32,
  rangedWoundRoll: UInt32,
  saveRoll: UInt32,
  rangedDamage: UInt32,
  meleeHitRoll: UInt32,
  meleeWoundRoll: UInt32,
  meleeDamage: UInt32,
})
```

#### Pieces Merkle Tree

A merkle tree of pieces is how the zk proof circuits validate state transitions. The key-value structure of the tree is the piece id is the key, and the hash of the piece is the value. An example of how you would use a piece merkle tree is in order to issue a "movement" order to a piece, you need to generate a witness of that piece, based on its id. You then provide the full piece, the new position, and the merkle witness to the proof, which will hash the piece at its old position to verify the existing game state, then generate a new root by applying the new position to the piece and hashing it again, and using the resulting piece in the provided witness.

![pieces merkle tree](/assets/Pieces%20Merkle%20Tree.png)

#### Arena Merkle Tree

The arena merkle tree is a map of positions on the map to a boolean of occupied or not. This store enforces that moves can only be made on the game board, and only to spaces which are not already occupied.

![arena merkle tree](/assets/Arena%20Merkle%20Tree.png)

### Proof Layers

![proof layers](/assets/Proof%20Layers.png)

#### Actions

If pieces are the basic unit for representing the game, actions are the basic unit for representing a state change. Actions are the _input_ to update a `PhaseState`, which will eventually rollup into the overall `GameState`. Each action has a nonce, which is used in the `PhaseProof` to keep players from submitting old or repeated actions that would otherwise be valid, and a piece. One action has exactly one piece, and there are no "group" actions. Many pieces making an action at the same time is the logical responsibility of a `Phase` Each action also contains an actionType and actionParams which vary based on what kind of action it is.

```
class Action extends Struct({
  nonce: Field,
  actionType: Field,
  actionParams: Field,
  piece: Field,
})
```

Current action types and param shapes.

| Action Name   | Action Type | Action Param           |
| ------------- | ----------- | ---------------------- |
| MOVE          | 0           | Position               |
| RANGED_ATTACK | 1           | Field (other piece id) |
| MELEE_ATTACK  | 2           | Field (other piece id) |

#### Phases

A phase is a staged set of state changes beloging to a `Turn`. Currently, a turn has a movement phase, a shooting phase, and a melee phase, per player. A phase has a different method to prove each type of action, but once a state change is in a phase proof, it no longer needs different preconditions to be rolled into a turn, then a game proof. So a phase is the only proof with different branches based on the input.

```
class PhaseState extends Struct({
  nonce: Field,
  actionsNonce: Field, // nonce of actions processed so far
  startingPiecesState: Field, // Pieces state before this phase
  currentPiecesState: Field, // Pieces state after the actions applied in this phase
  startingArenaState: Field, // Arena state before this phase
  currentArenaState: Field, // Arena state after the actions applied in this phase
  playerPublicKey: PublicKey, // the player this phase is for
})
```

#### Turns

A turn is modeled very similarly to a phase, but it does not know what kinds of actions have been processed for incoming phases.

```
class TurnState extends Struct({
  nonce: Field, // to order this turn relative to others in the game
  phaseNonce: Field, // nonce of phases processed so far
  startingPiecesState: Field, // Pieces state before this turn
  currentPiecesState: Field, // Pieces state after the phases applied in this turn
  startingArenaState: Field, // Arena state before this turn
  currentArenaState: Field, // Arena state after the phases applied in this turn
  playerPublicKey: PublicKey, // the player this turn is for
})
```

#### Games

Finally, a game is the top layer of state transitions. A game can process incoming turn proofs to update itself. A `GameProof` is the artifact which you could ultimatley use in a smart contract to prove that you won a game against a certain opponent, or that you've played more than X games.

```
class GameState extends Struct({
  piecesRoot: Field, // root hash of pieces in the arena keyed by their id
  arenaRoot: Field, // root hash of a merkle map of positions which are occupied
  playerTurn: Field,
  player1PublicKey: PublicKey,
  player2PublicKey: PublicKey,
  arenaLength: UInt32,
  arenaWidth: UInt32,
  turnsNonce: Field,
})
```

## Developing

### How to build

```sh
npm run build
```

### How to run tests

```sh
## Suggested to avoid running the proof-enabled suite, which takes many minutes to compile on a laptop
npm run test tests/non-proof/
```

### How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)

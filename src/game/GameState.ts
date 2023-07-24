import { Field, Struct, PublicKey, UInt32, Provable, Poseidon } from 'snarkyjs';
import { TurnState } from '../turn/TurnState.js';

export type GameStateJSON = {
  piecesRoot: string;
  arenaRoot: string;
  playerTurn: string;
  player1PublicKey: string;
  player2PublicKey: string;
  arenaLength: string;
  arenaWidth: string;
  turnsNonce: string;
};

class NextTurnTuple extends Struct({
  playerPublicKey: PublicKey,
  playerTurn: Field,
}) {}

export class GameState extends Struct({
  piecesRoot: Field, // root hash of pieces in the arena keyed by their id
  arenaRoot: Field, // root hash of a merkle map of positions which are occupied
  playerTurn: Field,
  player1PublicKey: PublicKey,
  player2PublicKey: PublicKey,
  arenaLength: UInt32,
  arenaWidth: UInt32,
  turnsNonce: Field,
}) {
  constructor(value: {
    piecesRoot: Field;
    arenaRoot: Field;
    playerTurn: Field;
    player1PublicKey: PublicKey;
    player2PublicKey: PublicKey;
    arenaLength: UInt32;
    arenaWidth: UInt32;
    turnsNonce: Field;
  }) {
    value.playerTurn.assertGreaterThan(Field(0));
    value.playerTurn.assertLessThan(Field(3));
    super(value);
  }

  hash(): Field {
    return Poseidon.hash([
      this.piecesRoot,
      this.arenaRoot,
      this.playerTurn,
      this.player1PublicKey.x,
      this.player1PublicKey.isOdd.toField(),
      this.player2PublicKey.x,
      this.player2PublicKey.isOdd.toField(),
      this.arenaLength.value,
      this.arenaWidth.value,
      this.turnsNonce,
    ]);
  }

  assertEquals(other: GameState) {
    this.hash().assertEquals(other.hash());
  }

  applyTurn(turnState: TurnState): GameState {
    const nextTurnTuple = Provable.if(
      this.playerTurn.equals(Field(1)),
      NextTurnTuple,
      new NextTurnTuple({
        playerPublicKey: this.player1PublicKey,
        playerTurn: Field(2),
      }),
      new NextTurnTuple({
        playerPublicKey: this.player2PublicKey,
        playerTurn: Field(1),
      })
    );
    turnState.nonce.assertGreaterThan(this.turnsNonce);
    turnState.playerPublicKey.assertEquals(nextTurnTuple.playerPublicKey);
    turnState.startingPiecesState.assertEquals(this.piecesRoot);
    turnState.startingArenaState.assertEquals(this.arenaRoot);

    return new GameState({
      piecesRoot: turnState.currentPiecesState,
      arenaRoot: turnState.currentArenaState,
      playerTurn: nextTurnTuple.playerTurn,
      player1PublicKey: this.player1PublicKey,
      player2PublicKey: this.player2PublicKey,
      arenaLength: this.arenaLength,
      arenaWidth: this.arenaWidth,
      turnsNonce: turnState.nonce,
    });
  }

  toJSON(): GameStateJSON {
    return {
      piecesRoot: this.piecesRoot.toString(),
      arenaRoot: this.arenaRoot.toString(),
      playerTurn: this.playerTurn.toString(),
      player1PublicKey: this.player1PublicKey.toBase58(),
      player2PublicKey: this.player2PublicKey.toBase58(),
      arenaLength: this.arenaLength.toString(),
      arenaWidth: this.arenaWidth.toString(),
      turnsNonce: this.turnsNonce.toString(),
    };
  }

  static fromJSON(j: GameStateJSON): GameState {
    return new GameState({
      piecesRoot: Field(j.piecesRoot),
      arenaRoot: Field(j.arenaRoot),
      playerTurn: Field(j.playerTurn),
      player1PublicKey: PublicKey.fromBase58(j.player1PublicKey),
      player2PublicKey: PublicKey.fromBase58(j.player2PublicKey),
      arenaLength: UInt32.from(j.arenaLength),
      arenaWidth: UInt32.from(j.arenaWidth),
      turnsNonce: Field(j.turnsNonce),
    });
  }
}

import { Field, Struct, PublicKey, UInt32, Circuit, Poseidon } from 'snarkyjs';
import { TurnState } from '../turn/TurnState';

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
  constructor(
    piecesRoot: Field,
    arenaRoot: Field,
    playerTurn: Field,
    player1PublicKey: PublicKey,
    player2PublicKey: PublicKey,
    arenaLength: UInt32,
    arenaWidth: UInt32,
    turnsNonce: Field
  ) {
    playerTurn.assertGreaterThan(Field(0));
    playerTurn.assertLessThan(Field(3));
    super({
      piecesRoot,
      arenaRoot,
      playerTurn,
      player1PublicKey,
      player2PublicKey,
      arenaLength,
      arenaWidth,
      turnsNonce,
    });
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
    const [expectedPlayerKey, nextPlayerTurn] = Circuit.if(
      this.playerTurn.equals(Field(1)),
      [this.player1PublicKey, Field(2)],
      [this.player2PublicKey, Field(1)]
    );
    turnState.nonce.assertGreaterThan(this.turnsNonce);
    turnState.playerPublicKey.assertEquals(expectedPlayerKey);
    turnState.startingPiecesState.assertEquals(this.piecesRoot);
    turnState.startingArenaState.assertEquals(this.arenaRoot);

    return new GameState(
      turnState.currentPiecesState,
      turnState.currentArenaState,
      nextPlayerTurn,
      this.player1PublicKey,
      this.player2PublicKey,
      this.arenaLength,
      this.arenaWidth,
      turnState.nonce
    );
  }

  toJSON() {
    return {
      piecesRoot: this.piecesRoot.toString(),
      arenaRoot: this.arenaRoot.toString(),
      playerTurn: Number(this.playerTurn.toString()),
      player1PublicKey: this.player1PublicKey.toBase58(),
      player2PublicKey: this.player2PublicKey.toBase58(),
      arenaLength: Number(this.arenaLength.toString()),
      arenaWidth: Number(this.arenaWidth.toString()),
      turnsNonce: Number(this.turnsNonce.toString()),
    };
  }
}

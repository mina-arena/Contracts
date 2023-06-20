import { Field, Struct, PublicKey, Poseidon } from 'snarkyjs';

import { PhaseState } from '../phase/PhaseState.js';

export class TurnState extends Struct({
  nonce: Field, // to order this turn relative to others in the game
  phaseNonce: Field, // nonce of phases processed so far
  startingPiecesState: Field, // Pieces state before this turn
  currentPiecesState: Field, // Pieces state after the phases applied in this turn
  startingArenaState: Field, // Arena state before this turn
  currentArenaState: Field, // Arena state after the phases applied in this turn
  playerPublicKey: PublicKey, // the player this turn is for
}) {
  constructor(
    nonce: Field,
    phaseNonce: Field,
    startingPiecesState: Field,
    currentPiecesState: Field,
    startingArenaState: Field,
    currentArenaState: Field,
    playerPublicKey: PublicKey
  ) {
    super({
      nonce,
      phaseNonce,
      startingPiecesState,
      currentPiecesState,
      startingArenaState,
      currentArenaState,
      playerPublicKey,
    });
  }

  hash(): Field {
    return Poseidon.hash([
      this.nonce,
      this.phaseNonce,
      this.startingPiecesState,
      this.currentPiecesState,
      this.startingArenaState,
      this.currentArenaState,
      this.playerPublicKey.x,
      this.playerPublicKey.isOdd.toField(),
    ]);
  }

  assertEquals(other: TurnState) {
    this.hash().assertEquals(other.hash());
  }

  applyPhase(phaseState: PhaseState): TurnState {
    phaseState.nonce.assertGreaterThan(this.phaseNonce);
    phaseState.playerPublicKey.assertEquals(this.playerPublicKey);
    phaseState.startingPiecesState.assertEquals(this.currentPiecesState);
    phaseState.startingArenaState.assertEquals(this.currentArenaState);

    return new TurnState(
      this.nonce,
      phaseState.nonce,
      this.startingPiecesState,
      phaseState.currentPiecesState,
      this.startingArenaState,
      phaseState.currentArenaState,
      this.playerPublicKey
    );
  }

  toJSON() {
    return {
      nonce: Number(this.nonce.toString()),
      phaseNonce: Number(this.phaseNonce.toString()),
      startingPiecesState: this.startingPiecesState.toString(),
      currentPiecesState: this.currentPiecesState.toString(),
      startingArenaState: this.startingArenaState.toString(),
      currentArenaState: this.currentArenaState.toString(),
      playerPublicKey: this.playerPublicKey.toBase58(),
    };
  }
}

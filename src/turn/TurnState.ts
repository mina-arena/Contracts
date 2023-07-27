import { Field, Struct, PublicKey, Poseidon } from 'snarkyjs';

import { PhaseState } from '../phase/PhaseState.js';

export type TurnStateJSON = {
  nonce: string;
  phaseNonce: string;
  startingPiecesState: string;
  currentPiecesState: string;
  startingArenaState: string;
  currentArenaState: string;
  playerPublicKey: string;
};

export class TurnState extends Struct({
  nonce: Field, // to order this turn relative to others in the game
  phaseNonce: Field, // nonce of phases processed so far
  startingPiecesState: Field, // Pieces state before this turn
  currentPiecesState: Field, // Pieces state after the phases applied in this turn
  startingArenaState: Field, // Arena state before this turn
  currentArenaState: Field, // Arena state after the phases applied in this turn
  playerPublicKey: PublicKey, // the player this turn is for
}) {
  constructor(value: {
    nonce: Field;
    phaseNonce: Field;
    startingPiecesState: Field;
    currentPiecesState: Field;
    startingArenaState: Field;
    currentArenaState: Field;
    playerPublicKey: PublicKey;
  }) {
    super(value);
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

    return new TurnState({
      nonce: this.nonce,
      phaseNonce: phaseState.nonce,
      startingPiecesState: this.startingPiecesState,
      currentPiecesState: phaseState.currentPiecesState,
      startingArenaState: this.startingArenaState,
      currentArenaState: phaseState.currentArenaState,
      playerPublicKey: this.playerPublicKey,
    });
  }

  toJSON(): TurnStateJSON {
    return {
      nonce: this.nonce.toString(),
      phaseNonce: this.phaseNonce.toString(),
      startingPiecesState: this.startingPiecesState.toString(),
      currentPiecesState: this.currentPiecesState.toString(),
      startingArenaState: this.startingArenaState.toString(),
      currentArenaState: this.currentArenaState.toString(),
      playerPublicKey: this.playerPublicKey.toBase58(),
    };
  }

  static fromJSON(j: TurnStateJSON): TurnState {
    return new TurnState({
      nonce: Field(j.nonce),
      phaseNonce: Field(j.phaseNonce),
      startingPiecesState: Field(j.startingPiecesState),
      currentPiecesState: Field(j.currentPiecesState),
      startingArenaState: Field(j.startingArenaState),
      currentArenaState: Field(j.currentArenaState),
      playerPublicKey: PublicKey.fromBase58(j.playerPublicKey),
    });
  }
}

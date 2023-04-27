import {
  Field,
  Struct,
  Signature,
  PublicKey,
  MerkleMapWitness,
} from 'snarkyjs';

import { GameState } from '../game/GameState';
import { Piece } from '../objects/Piece';
import { Position } from '../objects/Position';
import { Action } from '../objects/Action';
import { PhaseState } from '../phase/PhaseState';

export class TurnState extends Struct({
  phaseNonce: Field, // nonce of phases processed so far
  startingPiecesState: Field, // Pieces state before this turn
  currentPiecesState: Field, // Pieces state after the phases applied in this turn
  startingArenaState: Field, // Arena state before this turn
  currentArenaState: Field, // Arena state after the phases applied in this turn
  playerPublicKey: PublicKey, // the player this turn is for
}) {
  constructor(
    phaseNonce: Field,
    startingPiecesState: Field,
    currentPiecesState: Field,
    startingArenaState: Field,
    currentArenaState: Field,
    playerPublicKey: PublicKey
  ) {
    super({
      phaseNonce,
      startingPiecesState,
      currentPiecesState,
      startingArenaState,
      currentArenaState,
      playerPublicKey,
    });
  }

  static init(
    startingPiecesState: Field,
    startingArenaState: Field,
    playerPublicKey: PublicKey
  ): TurnState {
    return new TurnState(
      Field(0),
      startingPiecesState,
      startingPiecesState,
      startingArenaState,
      startingArenaState,
      playerPublicKey
    );
  }

  applyPhase(phaseState: PhaseState): TurnState {
    phaseState.nonce.assertGreaterThan(this.phaseNonce);
    phaseState.playerPublicKey.assertEquals(this.playerPublicKey);
    phaseState.startingPiecesState.assertEquals(this.currentPiecesState);
    phaseState.startingArenaState.assertEquals(this.currentArenaState);

    return new TurnState(
      phaseState.nonce,
      this.startingPiecesState,
      this.startingArenaState,
      phaseState.currentPiecesState,
      phaseState.currentArenaState,
      this.playerPublicKey
    );
  }

  toJSON() {
    return {
      phaseNonce: Number(this.phaseNonce.toString()),
      startingPiecesState: this.startingPiecesState.toString(),
      currentPiecesState: this.currentPiecesState.toString(),
      startingArenaState: this.startingArenaState.toString(),
      currentArenaState: this.currentArenaState.toString(),
      player: this.playerPublicKey.toBase58(),
    };
  }
}

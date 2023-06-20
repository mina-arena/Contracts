import { PrivateKey, Field, Poseidon, Bool } from 'snarkyjs';

import { GameState } from '../../../src/game/GameState';
import { Action } from '../../../src/objects/Action';
import { Position } from '../../../src/objects/Position';
import { Piece } from '../../../src/objects/Piece';
import { Unit } from '../../../src/objects/Unit';
import { TurnState } from '../../../src/turn/TurnState';
import { PhaseState } from '../../../src/phase/PhaseState';

describe('TurnState', () => {
  let player1PrivateKey: PrivateKey;
  let player2PrivateKey: PrivateKey;
  let emptyGameState: GameState;
  let initialTurnState: TurnState;

  beforeEach(async () => {
    player1PrivateKey = PrivateKey.random();
    player2PrivateKey = PrivateKey.random();

    initialTurnState = new TurnState(
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      Field(0),
      player1PrivateKey.toPublicKey()
    );
  });

  describe('init', () => {
    it('initalizes and serializes input', async () => {
      const expectedNonce = 0;
      const expectedPhaseNonce = 0;
      const expectedPiecesRoot = Field(0).toString();
      const expectedArenaRoot = Field(0).toString();
      const expectedPlayer = player1PrivateKey.toPublicKey().toBase58();

      expect(initialTurnState.toJSON()).toEqual({
        nonce: expectedNonce,
        phaseNonce: expectedPhaseNonce,
        startingPiecesState: expectedPiecesRoot,
        currentPiecesState: expectedPiecesRoot,
        startingArenaState: expectedArenaRoot,
        currentArenaState: expectedArenaRoot,
        playerPublicKey: expectedPlayer,
      });
    });
  });

  describe('applyPhase', () => {
    it('updates turn state', async () => {
      const dummyPhase = new PhaseState(
        Field(1),
        Field(3),
        Field(0),
        Field(10),
        Field(0),
        Field(20),
        player1PrivateKey.toPublicKey()
      );

      const newTurnState = initialTurnState.applyPhase(dummyPhase);

      const expectedNonce = 0;
      const expectedPhaseNonce = 1;
      const expectedPiecesRoot = Field(0).toString();
      const expectedArenaRoot = Field(0).toString();
      const expectedPlayer = player1PrivateKey.toPublicKey().toBase58();

      expect(newTurnState.toJSON()).toEqual({
        nonce: expectedNonce,
        phaseNonce: expectedPhaseNonce,
        startingPiecesState: expectedPiecesRoot,
        currentPiecesState: Field(10).toString(),
        startingArenaState: expectedArenaRoot,
        currentArenaState: Field(20).toString(),
        playerPublicKey: expectedPlayer,
      });
    });

    it('rejects a phase with nonce too small', async () => {
      const dummyPhase = new PhaseState(
        Field(0), // nonce should be >= 1
        Field(3),
        Field(0),
        Field(10),
        Field(0),
        Field(20),
        player1PrivateKey.toPublicKey()
      );

      expect(() => {
        initialTurnState.applyPhase(dummyPhase);
      }).toThrow();
    });

    it('rejects a phase where the starting state does not match ', async () => {
      const dummyPhase = new PhaseState(
        Field(1),
        Field(3),
        Field(1), // starting state should be 0
        Field(10),
        Field(2),
        Field(20),
        player1PrivateKey.toPublicKey()
      );

      expect(() => {
        initialTurnState.applyPhase(dummyPhase);
      }).toThrow();
    });
  });
});

import { Field, UInt32, PrivateKey } from 'snarkyjs';

import { GameState } from '../../../src/game/GameState';
import { Action } from '../../../src/objects/Action';
import { Position } from '../../../src/objects/Position';
import { Piece } from '../../../src/objects/Piece';
import { Unit } from '../../../src/objects/Unit';
import { TurnState } from '../../../src/turn/TurnState';
import { PhaseState } from '../../../src/phase/PhaseState';
import {
  ARENA_HEIGHT_U32,
  ARENA_WIDTH,
  ARENA_WIDTH_U32,
  ARENA_HEIGHT,
} from '../../../src/gameplay_constants';

describe('GameState', () => {
  let player1PrivateKey: PrivateKey;
  let player2PrivateKey: PrivateKey;
  let initialGameState: GameState;

  beforeEach(async () => {
    player1PrivateKey = PrivateKey.random();
    player2PrivateKey = PrivateKey.random();

    initialGameState = new GameState(
      Field(0),
      Field(0),
      Field(1),
      player1PrivateKey.toPublicKey(),
      player2PrivateKey.toPublicKey(),
      ARENA_HEIGHT_U32,
      ARENA_WIDTH_U32,
      Field(0)
    );
  });
  describe('toJSON', () => {
    it('initalizes and serializes input', async () => {
      const expectedPiecesRoot = Field(0).toString();
      const expectedArenaRoot = Field(0).toString();
      const expectedPlayerTurn = 1;
      const expectedTurnNonce = 0;

      expect(initialGameState.toJSON()).toEqual({
        piecesRoot: expectedPiecesRoot,
        arenaRoot: expectedArenaRoot,
        playerTurn: expectedPlayerTurn,
        player1PublicKey: player1PrivateKey.toPublicKey().toBase58(),
        player2PublicKey: player2PrivateKey.toPublicKey().toBase58(),
        arenaLength: ARENA_HEIGHT,
        arenaWidth: ARENA_WIDTH,
        turnsNonce: expectedTurnNonce,
      });
    });
  });

  describe('applyTurn', () => {
    it('updates game state', async () => {
      const dummyTurn = new TurnState(
        Field(1),
        Field(3),
        Field(0),
        Field(10),
        Field(0),
        Field(20),
        player1PrivateKey.toPublicKey()
      );

      const newTurnState = initialGameState.applyTurn(dummyTurn);

      const expectedTurnNonce = 1;
      const expectedPiecesRoot = Field(10).toString();
      const expectedArenaRoot = Field(20).toString();
      const expectedPlayerTurn = 2;

      expect(newTurnState.toJSON()).toEqual({
        piecesRoot: expectedPiecesRoot,
        arenaRoot: expectedArenaRoot,
        playerTurn: expectedPlayerTurn,
        player1PublicKey: player1PrivateKey.toPublicKey().toBase58(),
        player2PublicKey: player2PrivateKey.toPublicKey().toBase58(),
        arenaLength: ARENA_HEIGHT,
        arenaWidth: ARENA_WIDTH,
        turnsNonce: expectedTurnNonce,
      });
    });

    it('rejects a phase with nonce too small', async () => {
      const dummyTurn = new TurnState(
        Field(0), // nonce should be >= 1
        Field(3),
        Field(0),
        Field(10),
        Field(0),
        Field(20),
        player1PrivateKey.toPublicKey()
      );

      expect(() => {
        initialGameState.applyTurn(dummyTurn);
      }).toThrow();
    });

    it('rejects a phase where the starting state does not match ', async () => {
      const dummyTurn = new TurnState(
        Field(1),
        Field(3),
        Field(1), // starting state should be 0
        Field(10),
        Field(2),
        Field(20),
        player1PrivateKey.toPublicKey()
      );

      expect(() => {
        initialGameState.applyTurn(dummyTurn);
      }).toThrow();
    });
  });
});

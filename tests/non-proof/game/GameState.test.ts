import { Field, PrivateKey } from 'snarkyjs';

import { GameState } from '../../../src/game/GameState';
import { TurnState } from '../../../src/turn/TurnState';
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

    initialGameState = new GameState({
      piecesRoot: Field(0),
      arenaRoot: Field(0),
      playerTurn: Field(1),
      player1PublicKey: player1PrivateKey.toPublicKey(),
      player2PublicKey: player2PrivateKey.toPublicKey(),
      arenaLength: ARENA_HEIGHT_U32,
      arenaWidth: ARENA_WIDTH_U32,
      turnsNonce: Field(0),
    });
  });
  describe('toJSON', () => {
    it('initalizes and serializes input', async () => {
      const expectedPiecesRoot = Field(0).toString();
      const expectedArenaRoot = Field(0).toString();
      const expectedPlayerTurn = '1';
      const expectedTurnNonce = '0';

      expect(initialGameState.toJSON()).toEqual({
        piecesRoot: expectedPiecesRoot,
        arenaRoot: expectedArenaRoot,
        playerTurn: expectedPlayerTurn,
        player1PublicKey: player1PrivateKey.toPublicKey().toBase58(),
        player2PublicKey: player2PrivateKey.toPublicKey().toBase58(),
        arenaLength: String(ARENA_HEIGHT),
        arenaWidth: String(ARENA_WIDTH),
        turnsNonce: expectedTurnNonce,
      });
    });
  });

  describe('fromJSON', () => {
    it('initalizes and serializes input', async () => {
      const toJSON = initialGameState.toJSON();
      const fromJSON = GameState.fromJSON(toJSON);
      expect(fromJSON.hash().toString()).toEqual(
        initialGameState.hash().toString()
      );
    });
  });

  describe('applyTurn', () => {
    it('updates game state', async () => {
      const dummyTurn = new TurnState({
        nonce: Field(1),
        phaseNonce: Field(3),
        startingPiecesState: Field(0),
        currentPiecesState: Field(10),
        startingArenaState: Field(0),
        currentArenaState: Field(20),
        playerPublicKey: player1PrivateKey.toPublicKey(),
      });

      const newTurnState = initialGameState.applyTurn(dummyTurn);

      const expectedTurnNonce = '1';
      const expectedPiecesRoot = Field(10).toString();
      const expectedArenaRoot = Field(20).toString();
      const expectedPlayerTurn = '2';

      expect(newTurnState.toJSON()).toEqual({
        piecesRoot: expectedPiecesRoot,
        arenaRoot: expectedArenaRoot,
        playerTurn: expectedPlayerTurn,
        player1PublicKey: player1PrivateKey.toPublicKey().toBase58(),
        player2PublicKey: player2PrivateKey.toPublicKey().toBase58(),
        arenaLength: String(ARENA_HEIGHT),
        arenaWidth: String(ARENA_WIDTH),
        turnsNonce: expectedTurnNonce,
      });
    });

    it('rejects a phase with nonce too small', async () => {
      const dummyTurn = new TurnState({
        nonce: Field(0), // nonce should be >= 1
        phaseNonce: Field(3),
        startingPiecesState: Field(0),
        currentPiecesState: Field(10),
        startingArenaState: Field(0),
        currentArenaState: Field(20),
        playerPublicKey: player1PrivateKey.toPublicKey(),
      });

      expect(() => {
        initialGameState.applyTurn(dummyTurn);
      }).toThrow();
    });

    it('rejects a phase where the starting state does not match ', async () => {
      const dummyTurn = new TurnState({
        nonce: Field(1),
        phaseNonce: Field(3),
        startingPiecesState: Field(1), // starting state should be 0
        currentPiecesState: Field(10),
        startingArenaState: Field(2),
        currentArenaState: Field(20),
        playerPublicKey: player1PrivateKey.toPublicKey(),
      });
      expect(() => {
        initialGameState.applyTurn(dummyTurn);
      }).toThrow();
    });
  });
});

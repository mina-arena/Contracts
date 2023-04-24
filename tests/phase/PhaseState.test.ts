import {
  isReady,
  PrivateKey,
  Field,
  Poseidon,
  Bool,
  shutdown,
  MerkleMap,
} from 'snarkyjs';

import { PhaseState } from '../../src/phase/PhaseState';
import { GameState } from '../../src/game/GameState';
import { Action } from '../../src/objects/Action';
import { Position } from '../../src/objects/Position';
import { Piece } from '../../src/objects/Piece';
import { Unit } from '../../src/objects/Unit';

await isReady;

describe('PhaseState', () => {
  let player1PrivateKey: PrivateKey;
  let player2PrivateKey: PrivateKey;
  let emptyGameState: GameState;
  let initialPhaseState: PhaseState;

  beforeEach(async () => {
    player1PrivateKey = PrivateKey.random();
    player2PrivateKey = PrivateKey.random();

    emptyGameState = GameState.empty(
      player1PrivateKey.toPublicKey(),
      player2PrivateKey.toPublicKey()
    );
    initialPhaseState = new PhaseState(
      Field(0),
      emptyGameState.piecesRoot,
      emptyGameState.piecesRoot,
      emptyGameState.arenaRoot,
      emptyGameState.arenaRoot,
      player1PrivateKey.toPublicKey()
    );
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  describe('init', () => {
    it('initalizes and serializes input', async () => {
      const expectedActionsNonce = 0;
      const expectedPiecesRoot = emptyGameState.piecesRoot.toString();
      const expectedArenaRoot = emptyGameState.arenaRoot.toString();
      const expectedPlayer = player1PrivateKey.toPublicKey().toBase58();

      console.log('E');
      console.log(initialPhaseState.toJSON());
      expect(initialPhaseState.toJSON()).toEqual({
        actionsNonce: expectedActionsNonce,
        startingPiecesState: expectedPiecesRoot,
        currentPiecesState: expectedPiecesRoot,
        startingArenaState: expectedArenaRoot,
        currentArenaState: expectedArenaRoot,
        player: expectedPlayer,
      });
    });
  });

  describe('applyMove', () => {
    it('moving a piece updates the phase', async () => {
      // Piece id 1 starts at 0, 0
      // Move to 0, 1
      const oldPosition = Position.fromXY(0, 0);
      const newPosition = Position.fromXY(0, 1);
      const piece = new Piece(Field(1), oldPosition, Unit.default());
      const action = new Action(
        Field(1),
        Field(0),
        newPosition.hash(),
        Field(1)
      );

      // {pieces, arena} - the merkle maps as itialized by an empty game state
      const emptyMerkleMaps = GameState.emptyMerkleMaps();

      // arena merkle map with the old position vacated - used to verify the transition
      const arenaMapBothUnoccupied = GameState.emptyMerkleMaps().arena;
      arenaMapBothUnoccupied.set(oldPosition.hash(), Field(0));

      // arena merkle map with the old position vacated and the new position occupied
      const arenaMapAfterMove = GameState.emptyMerkleMaps().arena;
      arenaMapAfterMove.set(oldPosition.hash(), Field(0));
      arenaMapAfterMove.set(newPosition.hash(), Field(1));

      const newPhaseState = initialPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        emptyGameState,
        emptyMerkleMaps.pieces.getWitness(Field(1)),
        emptyMerkleMaps.arena.getWitness(oldPosition.hash()),
        arenaMapBothUnoccupied.getWitness(newPosition.hash()),
        newPosition
      );

      const oldPieceMap = emptyMerkleMaps.pieces;
      oldPieceMap.set(Field(1), newPosition.hash());

      expect(oldPieceMap.getRoot().toString()).toBe(
        newPhaseState.currentPiecesState.toString()
      );
      expect(arenaMapAfterMove.getRoot().toString()).toBe(
        newPhaseState.currentArenaState.toString()
      );
    });
  });
});

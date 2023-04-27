import { isReady, PrivateKey, Field, shutdown } from 'snarkyjs';

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
      const nonce = 0;
      const expectedActionsNonce = 0;
      const expectedPiecesRoot = emptyGameState.piecesRoot.toString();
      const expectedArenaRoot = emptyGameState.arenaRoot.toString();
      const expectedPlayer = player1PrivateKey.toPublicKey().toBase58();

      expect(initialPhaseState.toJSON()).toEqual({
        nonce: nonce,
        actionsNonce: expectedActionsNonce,
        startingPiecesState: expectedPiecesRoot,
        currentPiecesState: expectedPiecesRoot,
        startingArenaState: expectedArenaRoot,
        currentArenaState: expectedArenaRoot,
        playerPublicKey: expectedPlayer,
      });
    });
  });

  describe('applyMove', () => {
    let oldPosition: Position;
    let newPosition: Position;
    let piece: Piece;
    let action: Action;
    beforeEach(async () => {
      // Piece id 1 starts at 0, 0
      // Move piece 1 to 0, 1
      oldPosition = Position.fromXY(0, 0);
      newPosition = Position.fromXY(0, 1);
      piece = new Piece(Field(1), oldPosition, Unit.default());
      action = new Action(Field(1), Field(0), newPosition.hash(), Field(1));
    });

    it('moving a piece updates the phase', async () => {
      // {pieces, arena} - the merkle maps as itialized by an empty game state
      const emptyMerkleMaps = GameState.emptyMerkleMaps();

      // arena merkle map with the old position vacated - used to verify the transition
      const arenaMapBothUnoccupied = GameState.emptyMerkleMaps().arena;
      arenaMapBothUnoccupied.set(oldPosition.hash(), Field(0));

      const newPhaseState = initialPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        emptyMerkleMaps.pieces.getWitness(Field(1)), // witness game pieces map at piece 1 path
        emptyMerkleMaps.arena.getWitness(oldPosition.hash()), // witness arena map at old position path
        arenaMapBothUnoccupied.getWitness(newPosition.hash()), // winess new arena map at new position path
        newPosition
      );

      // actually apply the move to the merkle maps
      const pieceMapAfterMove = emptyMerkleMaps.pieces;
      piece.position = newPosition;
      pieceMapAfterMove.set(Field(1), piece.hash());

      const arenaMapAfterMove = GameState.emptyMerkleMaps().arena;
      arenaMapAfterMove.set(oldPosition.hash(), Field(0));
      arenaMapAfterMove.set(newPosition.hash(), Field(1));

      // the new phase state represents the piece state after move
      expect(pieceMapAfterMove.getRoot().toString()).toBe(
        newPhaseState.currentPiecesState.toString()
      );

      // the new phase state represents the arena state after move
      expect(arenaMapAfterMove.getRoot().toString()).toBe(
        newPhaseState.currentArenaState.toString()
      );
    });

    it('tracks original state root after multiple updates', async () => {
      // {pieces, arena} - the merkle maps as itialized by an empty game state
      const emptyMerkleMaps = GameState.emptyMerkleMaps();

      // arena merkle map with the old position vacated - used to verify the transition
      const arenaMapBothUnoccupied = GameState.emptyMerkleMaps().arena;
      arenaMapBothUnoccupied.set(oldPosition.hash(), Field(0));

      // arena merkle map with the complete move applied
      const arenaMapAfterMove = GameState.emptyMerkleMaps().arena;
      arenaMapAfterMove.set(oldPosition.hash(), Field(0));
      arenaMapAfterMove.set(newPosition.hash(), Field(1));

      const newPhaseState = initialPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        emptyMerkleMaps.pieces.getWitness(Field(1)), // witness game pieces map at piece 1 path
        emptyMerkleMaps.arena.getWitness(oldPosition.hash()), // witness arena map at old position path
        arenaMapBothUnoccupied.getWitness(newPosition.hash()), // winess new arena map at new position path
        newPosition
      );

      const pieceMapAfterMove = GameState.emptyMerkleMaps().pieces;
      piece.position = newPosition;
      pieceMapAfterMove.set(Field(1), piece.hash());

      const newNewPosition = Position.fromXY(1, 1);
      action = new Action(Field(2), Field(0), newNewPosition.hash(), Field(1));
      const secondMoveArenaMap = GameState.emptyMerkleMaps().arena;
      secondMoveArenaMap.set(oldPosition.hash(), Field(0));
      secondMoveArenaMap.set(newPosition.hash(), Field(0));
      secondMoveArenaMap.set(newNewPosition.hash(), Field(1));

      const secondUpdatePhaseState = newPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        pieceMapAfterMove.getWitness(Field(1)),
        arenaMapAfterMove.getWitness(newPosition.hash()),
        secondMoveArenaMap.getWitness(newNewPosition.hash()),
        newNewPosition
      );

      // the starting hashes are equal to the empty game
      expect(secondUpdatePhaseState.startingPiecesState.toString()).toBe(
        GameState.emptyMerkleMaps().pieces.getRoot().toString()
      );
      expect(secondUpdatePhaseState.startingArenaState.toString()).toBe(
        GameState.emptyMerkleMaps().arena.getRoot().toString()
      );

      // the current hashes are equal to the phase after both moves
      const pieceMapAfterSecondMove = emptyMerkleMaps.pieces;
      piece.position = newNewPosition;
      pieceMapAfterSecondMove.set(Field(1), piece.hash());

      expect(secondUpdatePhaseState.currentPiecesState.toString()).toBe(
        pieceMapAfterSecondMove.getRoot().toString()
      );
      expect(secondUpdatePhaseState.currentArenaState.toString()).toBe(
        secondMoveArenaMap.getRoot().toString()
      );
    });

    it('rejects a move with nonce too small', async () => {
      action = new Action(
        Field(0), // nonce should be >= 1 for the first move in a phase
        Field(0),
        newPosition.hash(),
        Field(1)
      );

      // {pieces, arena} - the merkle maps as itialized by an empty game state
      const emptyMerkleMaps = GameState.emptyMerkleMaps();

      // arena merkle map with the old position vacated - used to verify the transition
      const arenaMapBothUnoccupied = GameState.emptyMerkleMaps().arena;
      arenaMapBothUnoccupied.set(oldPosition.hash(), Field(0));

      expect(() => {
        initialPhaseState.applyMoveAction(
          action,
          action.sign(player1PrivateKey),
          piece,
          emptyMerkleMaps.pieces.getWitness(Field(1)), // witness game pieces map at piece 1 path
          emptyMerkleMaps.arena.getWitness(oldPosition.hash()), // witness arena map at old position path
          arenaMapBothUnoccupied.getWitness(newPosition.hash()), // winess new arena map at new position path
          newPosition
        );
      }).toThrow();
    });

    it('rejects a move to a location which is occupied', async () => {
      // Using the position that the piece is already at for now since no 2 pieces start close enough
      // TODO: Make better custom scenarios than a blank game

      action = new Action(
        Field(0), // nonce should be >= 1 for the first move in a phase
        Field(0),
        oldPosition.hash(),
        Field(1)
      );

      // {pieces, arena} - the merkle maps as itialized by an empty game state
      const emptyMerkleMaps = GameState.emptyMerkleMaps();

      // arena merkle map with the old position vacated - used to verify the transition
      const arenaMapBothUnoccupied = GameState.emptyMerkleMaps().arena;
      arenaMapBothUnoccupied.set(oldPosition.hash(), Field(0));

      expect(() => {
        initialPhaseState.applyMoveAction(
          action,
          action.sign(player1PrivateKey),
          piece,
          emptyMerkleMaps.pieces.getWitness(Field(1)),
          emptyMerkleMaps.arena.getWitness(oldPosition.hash()),
          arenaMapBothUnoccupied.getWitness(oldPosition.hash()),
          oldPosition
        );
      }).toThrow();
    });
  });
});

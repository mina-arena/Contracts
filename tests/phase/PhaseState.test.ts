import {
  isReady,
  PrivateKey,
  Field,
  shutdown,
  MerkleMap,
  UInt32,
} from 'snarkyjs';

import { PhaseState } from '../../src/phase/PhaseState';
import { GameState } from '../../src/game/GameState';
import { Action } from '../../src/objects/Action';
import { Position } from '../../src/objects/Position';
import { Piece } from '../../src/objects/Piece';
import { Unit } from '../../src/objects/Unit';
import { ArenaMerkleTree } from '../../src/objects/ArenaMerkleTree';

await isReady;

describe('PhaseState', () => {
  let player1PrivateKey: PrivateKey;
  let player2PrivateKey: PrivateKey;
  let gameState: GameState;
  let initialPhaseState: PhaseState;
  let piecesMap: MerkleMap;
  let arenaTree: ArenaMerkleTree;
  beforeEach(async () => {
    player1PrivateKey = PrivateKey.random();
    player2PrivateKey = PrivateKey.random();
    piecesMap = new MerkleMap();
    const piece1 = new Piece(
      Field(1),
      Position.fromXY(100, 20),
      Unit.default()
    );
    const piece2 = new Piece(
      Field(2),
      Position.fromXY(120, 750),
      Unit.default()
    );
    piecesMap.set(piece1.id, piece1.hash());
    piecesMap.set(piece2.id, piece2.hash());
    arenaTree = new ArenaMerkleTree();
    arenaTree.set(100, 20, Field(1));
    arenaTree.set(120, 750, Field(1));
    gameState = new GameState({
      piecesRoot: piecesMap.getRoot(),
      arenaRoot: arenaTree.tree.getRoot(),
      playerTurn: Field(0),
      player1PublicKey: player1PrivateKey.toPublicKey(),
      player2PublicKey: player2PrivateKey.toPublicKey(),
      arenaLength: UInt32.from(800),
      arenaWidth: UInt32.from(800),
      turnsCompleted: UInt32.from(0),
    });

    initialPhaseState = new PhaseState(
      Field(0),
      Field(0),
      gameState.piecesRoot,
      gameState.piecesRoot,
      gameState.arenaRoot,
      gameState.arenaRoot,
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
      const expectedPiecesRoot = gameState.piecesRoot.toString();
      const expectedArenaRoot = gameState.arenaRoot.toString();
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
      // Piece id 1 starts at 100, 20
      // Move piece 1 to 100, 100
      oldPosition = Position.fromXY(100, 20);
      newPosition = Position.fromXY(100, 100);
      piece = new Piece(Field(1), oldPosition, Unit.default());
      action = new Action(Field(1), Field(0), newPosition.hash(), Field(1));
    });

    it('moving a piece updates the phase', async () => {
      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0)); // set position 1 to be unoccupied to set up the move

      const newPhaseState = initialPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        piecesMap.getWitness(Field(1)), // witness game pieces map at piece 1 path
        arenaTree.getWitness(100, 20), // witness arena map at old position path
        arenaTreeBothUnoccupied.getWitness(100, 100), // winess new arena map at new position path
        newPosition
      );

      // actually apply the move to the merkle maps
      const pieceMapAfterMove = piecesMap;
      piece.position = newPosition;
      pieceMapAfterMove.set(Field(1), piece.hash());

      arenaTreeBothUnoccupied.set(100, 100, Field(1));

      // the new phase state represents the piece state after move
      expect(pieceMapAfterMove.getRoot().toString()).toBe(
        newPhaseState.currentPiecesState.toString()
      );

      // the new phase state represents the arena state after move
      expect(arenaTreeBothUnoccupied.tree.getRoot().toString()).toBe(
        newPhaseState.currentArenaState.toString()
      );
    });

    it('tracks original state root after multiple updates', async () => {
      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0)); // set position 1 to be unoccupied to set up the move

      // arena merkle map with the complete move applied
      const arenaMapAfterMove = GameState.emptyMerkleMaps().arena;
      arenaMapAfterMove.set(oldPosition.hash(), Field(0));
      arenaMapAfterMove.set(newPosition.hash(), Field(1));

      const newPhaseState = initialPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        piecesMap.getWitness(Field(1)), // witness game pieces map at piece 1 path
        arenaTree.getWitness(100, 20), // witness arena map at old position path
        arenaTreeBothUnoccupied.getWitness(100, 100), // winess new arena map at new position path
        newPosition
      );

      const pieceMapAfterMove = piecesMap;
      piece.position = newPosition;
      pieceMapAfterMove.set(Field(1), piece.hash());
      arenaTreeBothUnoccupied.set(100, 100, Field(1));

      piece = new Piece(Field(2), Position.fromXY(120, 750), Unit.default());
      const newNewPosition = Position.fromXY(100, 700);
      action = new Action(Field(2), Field(0), newNewPosition.hash(), Field(2));
      const secondMoveArenaTree = arenaTreeBothUnoccupied.clone();
      secondMoveArenaTree.set(120, 750, Field(0));

      // Move another piece in the same phase
      const secondUpdatePhaseState = newPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        piecesMap.getWitness(Field(2)),
        arenaTreeBothUnoccupied.getWitness(120, 750),
        secondMoveArenaTree.getWitness(100, 700),
        newNewPosition
      );

      // the starting hashes are equal to the empty game
      // expect(secondUpdatePhaseState.startingPiecesState.toString()).toBe(
      //   GameState.emptyMerkleMaps().pieces.getRoot().toString()
      // );
      expect(secondUpdatePhaseState.startingArenaState.toString()).toBe(
        arenaTree.tree.getRoot().toString() // the original arena tree
      );

      // the current hashes are equal to the phase after both moves
      const pieceMapAfterSecondMove = piecesMap;
      piece.position = newNewPosition;
      pieceMapAfterSecondMove.set(Field(2), piece.hash());
      secondMoveArenaTree.set(100, 700, Field(1));

      expect(secondUpdatePhaseState.currentPiecesState.toString()).toBe(
        pieceMapAfterSecondMove.getRoot().toString()
      );
      expect(secondUpdatePhaseState.currentArenaState.toString()).toBe(
        secondMoveArenaTree.tree.getRoot().toString()
      );
    });

    it('rejects a move with nonce too small', async () => {
      action = new Action(
        Field(0), // nonce should be >= 1 for the first move in a phase
        Field(0),
        newPosition.hash(),
        Field(1)
      );

      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0)); // set position 1 to be unoccupied to set up the move

      expect(() => {
        initialPhaseState.applyMoveAction(
          action,
          action.sign(player1PrivateKey),
          piece,
          piecesMap.getWitness(Field(1)), // witness game pieces map at piece 1 path
          arenaTree.getWitness(100, 20), // witness arena map at old position path
          arenaTreeBothUnoccupied.getWitness(100, 100), // winess new arena map at new position path
          newPosition
        );
      }).toThrow();
    });

    it('rejects a move to a location which is occupied', async () => {
      action = new Action(
        Field(0),
        Field(0),
        Position.fromXY(120, 750).hash(), // the position of piece_2
        Field(1)
      );

      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0)); // set position 1 to be unoccupied to set up the move

      expect(() => {
        initialPhaseState.applyMoveAction(
          action,
          action.sign(player1PrivateKey),
          piece,
          piecesMap.getWitness(Field(1)), // witness game pieces map at piece 1 path
          arenaTree.getWitness(100, 20), // witness arena map at old position path
          arenaTreeBothUnoccupied.getWitness(120, 750), // winess new arena map at new position path
          newPosition
        );
      }).toThrow();
    });
  });
});

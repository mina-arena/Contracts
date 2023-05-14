import { PrivateKey, Field, UInt32 } from 'snarkyjs';

import { PhaseState } from '../../src/phase/PhaseState';
import { GameState } from '../../src/game/GameState';
import { Action } from '../../src/objects/Action';
import { Position } from '../../src/objects/Position';
import { Piece } from '../../src/objects/Piece';
import { Unit } from '../../src/objects/Unit';
import { ArenaMerkleTree } from '../../src/objects/ArenaMerkleTree';
import { PiecesMerkleTree } from '../../src/objects/PiecesMerkleTree';

describe('PhaseState', () => {
  let player1PrivateKey: PrivateKey;
  let player2PrivateKey: PrivateKey;
  let gameState: GameState;
  let initialPhaseState: PhaseState;
  let piecesTree: PiecesMerkleTree;
  let arenaTree: ArenaMerkleTree;
  beforeEach(async () => {
    player1PrivateKey = PrivateKey.random();
    player2PrivateKey = PrivateKey.random();
    piecesTree = new PiecesMerkleTree();
    arenaTree = new ArenaMerkleTree();
  });

  describe('applyMove', () => {
    let oldPosition: Position;
    let newPosition: Position;
    let piece: Piece;
    let action: Action;
    beforeEach(async () => {
      const piece1 = new Piece(
        Field(1),
        player1PrivateKey.toPublicKey(),
        Position.fromXY(100, 20),
        Unit.default()
      );
      const piece2 = new Piece(
        Field(2),
        player1PrivateKey.toPublicKey(),
        Position.fromXY(150, 15),
        Unit.default()
      );
      const piece3 = new Piece(
        Field(3),
        player2PrivateKey.toPublicKey(),
        Position.fromXY(125, 750),
        Unit.default()
      );
      piecesTree.set(piece1.id.toBigInt(), piece1.hash());
      piecesTree.set(piece2.id.toBigInt(), piece2.hash());
      piecesTree.set(piece3.id.toBigInt(), piece3.hash());
      arenaTree.set(100, 20, Field(1));
      arenaTree.set(150, 15, Field(1));
      arenaTree.set(125, 750, Field(1));
      gameState = new GameState({
        piecesRoot: piecesTree.tree.getRoot(),
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

      oldPosition = Position.fromXY(100, 20);
      newPosition = Position.fromXY(100, 65);
      piece = new Piece(
        Field(1),
        player1PrivateKey.toPublicKey(),
        oldPosition,
        Unit.default()
      );
      action = new Action(Field(1), Field(0), newPosition.hash(), Field(1));
    });

    it('moving a piece updates the phase', async () => {
      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0)); // set position 1 to be unoccupied to set up the move
      const moveDistance = 45;
      const newPhaseState = initialPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        piecesTree.getWitness(1n), // witness game pieces map at piece 1 path
        arenaTree.getWitness(100, 20), // witness arena map at old position path
        arenaTreeBothUnoccupied.getWitness(100, 65), // winess new arena map at new position path
        newPosition,
        UInt32.from(moveDistance)
      );

      // actually apply the move to the merkle maps
      const pieceMapAfterMove = piecesTree;
      piece.position = newPosition;
      pieceMapAfterMove.tree.setLeaf(1n, piece.hash());

      arenaTreeBothUnoccupied.set(100, 65, Field(1));

      // the new phase state represents the piece state after move
      expect(pieceMapAfterMove.tree.getRoot().toString()).toBe(
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
      const moveDistance = 45;

      const newPhaseState = initialPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        piecesTree.getWitness(1n), // witness game pieces map at piece 1 path
        arenaTree.getWitness(100, 20), // witness arena map at old position path
        arenaTreeBothUnoccupied.getWitness(100, 65), // winess new arena map at new position path
        newPosition,
        UInt32.from(moveDistance)
      );

      const pieceMapAfterMove = piecesTree;
      piece.position = newPosition;
      pieceMapAfterMove.tree.setLeaf(1n, piece.hash());
      arenaTreeBothUnoccupied.set(100, 65, Field(1));

      piece = new Piece(
        Field(2),
        player1PrivateKey.toPublicKey(),
        Position.fromXY(150, 15),
        Unit.default()
      );
      const newNewPosition = Position.fromXY(140, 50);
      action = new Action(Field(2), Field(0), newNewPosition.hash(), Field(2));
      const secondMoveArenaTree = arenaTreeBothUnoccupied.clone();
      secondMoveArenaTree.set(150, 15, Field(0));

      const moveDistance2 = Math.floor(Math.sqrt(10 ** 2 + 35 ** 2));
      // Move another piece in the same phase
      const secondUpdatePhaseState = newPhaseState.applyMoveAction(
        action,
        action.sign(player1PrivateKey),
        piece,
        piecesTree.getWitness(2n),
        arenaTreeBothUnoccupied.getWitness(150, 15),
        secondMoveArenaTree.getWitness(140, 50),
        newNewPosition,
        UInt32.from(moveDistance2)
      );

      expect(secondUpdatePhaseState.startingArenaState.toString()).toBe(
        arenaTree.tree.getRoot().toString() // the original arena tree
      );

      // the current hashes are equal to the phase after both moves
      const pieceMapAfterSecondMove = piecesTree;
      piece.position = newNewPosition;
      pieceMapAfterSecondMove.tree.setLeaf(2n, piece.hash());
      secondMoveArenaTree.set(140, 50, Field(1));

      expect(secondUpdatePhaseState.currentPiecesState.toString()).toBe(
        pieceMapAfterSecondMove.tree.getRoot().toString()
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

      const moveDistance = 45;
      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0)); // set position 1 to be unoccupied to set up the move

      expect(() => {
        initialPhaseState.applyMoveAction(
          action,
          action.sign(player1PrivateKey),
          piece,
          piecesTree.getWitness(1n),
          arenaTree.getWitness(100, 20),
          arenaTreeBothUnoccupied.getWitness(100, 65),
          newPosition,
          UInt32.from(moveDistance)
        );
      }).toThrow();
    });

    it('rejects a move to a location which is occupied', async () => {
      action = new Action(
        Field(0),
        Field(0),
        Position.fromXY(100, 20).hash(), // the position of piece_1
        Field(1)
      );

      const moveDistance = 0;
      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0));

      expect(() => {
        initialPhaseState.applyMoveAction(
          action,
          action.sign(player1PrivateKey),
          piece,
          piecesTree.getWitness(1n),
          arenaTree.getWitness(100, 20),
          arenaTreeBothUnoccupied.getWitness(100, 20),
          newPosition,
          UInt32.from(moveDistance)
        );
      }).toThrow();
    });

    it('rejects a move of another players piece', async () => {
      action = new Action(
        Field(0),
        Field(0),
        Position.fromXY(125, 700).hash(),
        Field(3) // piece 3 belongs to player 2, but this phase belongs to player 1
      );

      const moveDistance = 50;
      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(125, 750, Field(0));

      expect(() => {
        initialPhaseState.applyMoveAction(
          action,
          action.sign(player1PrivateKey),
          piece,
          piecesTree.getWitness(3n),
          arenaTree.getWitness(125, 750),
          arenaTreeBothUnoccupied.getWitness(125, 700),
          newPosition,
          UInt32.from(moveDistance)
        );
      }).toThrow();
    });

    it('rejects a move further than the pieces movement stat', async () => {
      newPosition = Position.fromXY(100, 85);
      action = new Action(Field(1), Field(0), newPosition.hash(), Field(1));

      const moveDistance = 65;
      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0)); // set position 1 to be unoccupied to set up the move

      expect(() => {
        initialPhaseState.applyMoveAction(
          action,
          action.sign(player1PrivateKey),
          piece,
          piecesTree.getWitness(1n),
          arenaTree.getWitness(100, 20),
          arenaTreeBothUnoccupied.getWitness(100, 85),
          newPosition,
          UInt32.from(moveDistance)
        );
      }).toThrow();
    });
  });
});

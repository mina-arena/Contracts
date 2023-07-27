import { PrivateKey, Field, UInt32 } from 'snarkyjs';

import { PhaseState } from '../../../src/phase/PhaseState';
import { GameState } from '../../../src/game/GameState';
import { Position } from '../../../src/objects/Position';
import { Piece } from '../../../src/objects/Piece';
import { Unit } from '../../../src/objects/Unit';
import { ArenaMerkleTree } from '../../../src/objects/ArenaMerkleTree';
import { PiecesMerkleTree } from '../../../src/objects/PiecesMerkleTree';
import {
  ARENA_HEIGHT_U32,
  ARENA_WIDTH_U32,
} from '../../../src/gameplay_constants';

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

  describe('init', () => {
    beforeEach(async () => {
      const piece1 = new Piece({
        id: Field(1),
        playerPublicKey: player1PrivateKey.toPublicKey(),
        position: Position.fromXY(100, 20),
        baseUnit: Unit.default(),
        condition: Unit.default().stats,
      });
      const piece2 = new Piece({
        id: Field(2),
        playerPublicKey: player1PrivateKey.toPublicKey(),
        position: Position.fromXY(150, 15),
        baseUnit: Unit.default(),
        condition: Unit.default().stats,
      });
      const piece3 = new Piece({
        id: Field(3),
        playerPublicKey: player2PrivateKey.toPublicKey(),
        position: Position.fromXY(125, 750),
        baseUnit: Unit.default(),
        condition: Unit.default().stats,
      });
      piecesTree.set(piece1.id.toBigInt(), piece1.hash());
      piecesTree.set(piece2.id.toBigInt(), piece2.hash());
      piecesTree.set(piece3.id.toBigInt(), piece3.hash());
      arenaTree.set(100, 20, Field(1));
      arenaTree.set(150, 15, Field(1));
      arenaTree.set(125, 750, Field(1));
      gameState = new GameState({
        piecesRoot: piecesTree.tree.getRoot(),
        arenaRoot: arenaTree.tree.getRoot(),
        playerTurn: Field(1),
        player1PublicKey: player1PrivateKey.toPublicKey(),
        player2PublicKey: player2PrivateKey.toPublicKey(),
        arenaLength: ARENA_HEIGHT_U32,
        arenaWidth: ARENA_WIDTH_U32,
        turnsNonce: Field(0),
      });
      initialPhaseState = new PhaseState({
        nonce: Field(0),
        actionsNonce: Field(0),
        startingPiecesState: gameState.piecesRoot,
        currentPiecesState: gameState.piecesRoot,
        startingArenaState: gameState.arenaRoot,
        currentArenaState: gameState.arenaRoot,
        playerPublicKey: player1PrivateKey.toPublicKey(),
      });
    });

    it('initalizes and serializes input', async () => {
      const nonce = '0';
      const expectedActionsNonce = '0';
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

    describe('fromJSON', () => {
      it('initalizes and serializes input', async () => {
        const toJSON = initialPhaseState.toJSON();
        const fromJSON = PhaseState.fromJSON(toJSON);
        expect(fromJSON.hash().toString()).toEqual(
          initialPhaseState.hash().toString()
        );
      });
    });
  });
});

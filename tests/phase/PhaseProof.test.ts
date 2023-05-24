import {
  PrivateKey,
  Field,
  UInt32,
  Circuit,
  Encryption,
  Signature,
} from 'snarkyjs';

import { PhaseState } from '../../src/phase/PhaseState';
import { GameState } from '../../src/game/GameState';
import { Action } from '../../src/objects/Action';
import { Position } from '../../src/objects/Position';
import { Piece } from '../../src/objects/Piece';
import { Unit } from '../../src/objects/Unit';
import { ArenaMerkleTree } from '../../src/objects/ArenaMerkleTree';
import { PiecesMerkleTree } from '../../src/objects/PiecesMerkleTree';
import { PhaseProgram, PhaseProof } from '../../src/phase/PhaseProof';

import { jest } from '@jest/globals';

import fs from 'fs';
import { EncrytpedAttackRoll } from '../../src/objects/AttackDiceRolls';

jest.setTimeout(600_000);

describe('PhaseProof', () => {
  let player1PrivateKey: PrivateKey;
  let player2PrivateKey: PrivateKey;
  let gameState: GameState;
  let initialPhaseState: PhaseState;
  let piecesTree: PiecesMerkleTree;
  let arenaTree: ArenaMerkleTree;

  beforeAll(async () => {
    console.log('compiling...');
    console.time('compile');
    await PhaseProgram.compile();
    console.timeEnd('compile');
  });

  describe.skip('Applies Move', () => {
    let oldPosition: Position;
    let newPosition: Position;
    let piece: Piece;
    let action: Action;
    beforeEach(async () => {
      console.time('applyMoveSetup');
      player1PrivateKey = PrivateKey.random();
      player2PrivateKey = PrivateKey.random();
      piecesTree = new PiecesMerkleTree();
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
      arenaTree = new ArenaMerkleTree();
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
      console.timeEnd('applyMoveSetup');
    });

    it('Creates Valid Proof after applying a move', async () => {
      console.time('applyMove');
      const arenaTreeBothUnoccupied = arenaTree.clone();
      arenaTreeBothUnoccupied.set(100, 20, Field(0)); // set position 1 to be unoccupied to set up the move
      const moveDistance = 45;

      // Piece id 1 starts at 100, 20
      // Move piece 1 to 100, 65
      oldPosition = Position.fromXY(100, 20);
      newPosition = Position.fromXY(100, 65);
      piece = new Piece(
        Field(1),
        player1PrivateKey.toPublicKey(),
        oldPosition,
        Unit.default()
      );
      action = new Action(Field(1), Field(0), newPosition.hash(), Field(1));

      const initialProof = await PhaseProgram.init(
        initialPhaseState,
        initialPhaseState
      );

      // actually apply the move to the merkle maps
      const pieceMapAfterMove = piecesTree.clone();
      const pieceClone = piece.clone();
      pieceClone.position = newPosition;
      pieceMapAfterMove.set(1n, pieceClone.hash());
      const finalArenaTree = arenaTreeBothUnoccupied.clone();
      finalArenaTree.set(100, 65, Field(1));

      // the state that the phase should have after the move
      const finalPhaseState = new PhaseState(
        initialPhaseState.nonce,
        action.nonce,
        initialPhaseState.startingPiecesState,
        pieceMapAfterMove.tree.getRoot(),
        initialPhaseState.startingArenaState,
        finalArenaTree.tree.getRoot(),
        initialPhaseState.playerPublicKey
      );

      Circuit.log(
        `initial phase state: ${initialPhaseState.hash().toString()}`
      );
      Circuit.log(`final phase state: ${finalPhaseState.hash().toString()}`);

      console.time('applyMoveProof');
      const afterMoveProof = await PhaseProgram.applyMove(
        finalPhaseState,
        initialProof,
        action,
        action.sign(player1PrivateKey),
        piece,
        piecesTree.getWitness(1n), // witness game pieces map at piece 1 path
        arenaTree.getWitness(100, 20), // witness arena map at old position path
        arenaTreeBothUnoccupied.getWitness(100, 65), // winess new arena map at new position path
        newPosition,
        UInt32.from(moveDistance)
      );
      console.timeEnd('applyMoveProof');

      Circuit.log('finished with proof');
      Circuit.log(
        `Proof state: ${afterMoveProof.publicInput.hash().toString()}`
      );

      const didVerify = await afterMoveProof.verify();

      Circuit.log('Verified Proof');
      expect(true); // did not throw on verify()
      console.timeEnd('applyMove');
    });
  });

  describe('Applies Ranged Attack', () => {
    let player1PrivateKey: PrivateKey;
    let player2PrivateKey: PrivateKey;
    let serverPrivateKey: PrivateKey;
    const rngPrivateKey: PrivateKey = PrivateKey.fromBase58(
      'EKEMFSemZ3c9SMDpEzJ1LSsRGgbDmJ6878VwSdBtMNot2wpR7GQK'
    ); // test value for now
    let gameState: GameState;
    let initialPhaseState: PhaseState;
    let piecesTree: PiecesMerkleTree;
    let arenaTree: ArenaMerkleTree;
    let attackingPiecePosition: Position;
    let targetPiece1Position: Position;
    let attackingPiece: Piece;
    let targetPiece1: Piece;
    let attack1: Action;
    let diceRolls: EncrytpedAttackRoll;
    beforeEach(async () => {
      console.time('applyRangedAttackSetup');
      player1PrivateKey = PrivateKey.random();
      player2PrivateKey = PrivateKey.random();
      serverPrivateKey = PrivateKey.random();
      piecesTree = new PiecesMerkleTree();
      arenaTree = new ArenaMerkleTree();
      attackingPiecePosition = Position.fromXY(100, 100);
      targetPiece1Position = Position.fromXY(100, 120); // in range

      attackingPiece = new Piece(
        Field(1),
        player1PrivateKey.toPublicKey(),
        attackingPiecePosition,
        Unit.default()
      );
      attackingPiece.condition.saveRoll = UInt32.from(0); // Ensure that attacker's save roll is not counted
      targetPiece1 = new Piece(
        Field(2),
        player2PrivateKey.toPublicKey(),
        targetPiece1Position,
        Unit.default()
      );
      piecesTree.set(attackingPiece.id.toBigInt(), attackingPiece.hash());
      piecesTree.set(targetPiece1.id.toBigInt(), targetPiece1.hash());
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

      attack1 = new Action(Field(1), Field(1), targetPiece1.hash(), Field(1));
      console.timeEnd('applyRangedAttackSetup');
    });

    it('Creates Valid Proof after applying a ranged attack', async () => {
      console.time('applyRangedAttack');
      const enc = Encryption.encrypt(
        [Field(6), Field(6), Field(1)],
        serverPrivateKey.toPublicKey()
      );
      const sig = Signature.create(rngPrivateKey, enc.cipherText);
      diceRolls = EncrytpedAttackRoll.init(enc.publicKey, enc.cipherText, sig);

      const attackDistance = 20;

      const initialProof = await PhaseProgram.init(
        initialPhaseState,
        initialPhaseState
      );

      // actually apply the ranged attack to the merkle maps
      const pieceMapAfterAttack = piecesTree.clone();
      console.log(pieceMapAfterAttack.obj);
      const pieceClone = targetPiece1.clone();
      pieceClone.condition.health = UInt32.from(1);
      pieceMapAfterAttack.set(pieceClone.id.toBigInt(), pieceClone.hash());

      // the state that the phase should have after the move
      const finalPhaseState = new PhaseState(
        initialPhaseState.nonce,
        attack1.nonce,
        initialPhaseState.startingPiecesState,
        pieceMapAfterAttack.tree.getRoot(),
        initialPhaseState.startingArenaState,
        initialPhaseState.currentArenaState,
        initialPhaseState.playerPublicKey
      );

      Circuit.log(
        `initial phase state: ${initialPhaseState.hash().toString()}`
      );
      Circuit.log(`final phase state: ${finalPhaseState.hash().toString()}`);
      console.time('applyRangedAttackProof');
      const afterAttackProof = await PhaseProgram.applyRangedAttack(
        finalPhaseState,
        initialProof,
        attack1,
        attack1.sign(player1PrivateKey),
        attackingPiece.clone(),
        targetPiece1.clone(),
        piecesTree.getWitness(attackingPiece.id.toBigInt()),
        piecesTree.getWitness(targetPiece1.id.toBigInt()),
        UInt32.from(attackDistance),
        diceRolls,
        serverPrivateKey
      );
      Circuit.log('finished with proof');
      Circuit.log(
        `Proof state: ${afterAttackProof.publicInput.hash().toString()}`
      );

      const didVerify = await afterAttackProof.verify();

      Circuit.log('Verified Proof');
      expect(true); // did not throw on verify()
      console.timeEnd('applyRangedAttack');
    });
  });

  describe.skip('Applies Melee Attack', () => {
    let player1PrivateKey: PrivateKey;
    let player2PrivateKey: PrivateKey;
    let serverPrivateKey: PrivateKey;
    const rngPrivateKey: PrivateKey = PrivateKey.fromBase58(
      'EKEMFSemZ3c9SMDpEzJ1LSsRGgbDmJ6878VwSdBtMNot2wpR7GQK'
    ); // test value for now
    let gameState: GameState;
    let initialPhaseState: PhaseState;
    let piecesTree: PiecesMerkleTree;
    let arenaTree: ArenaMerkleTree;
    let attackingPiecePosition: Position;
    let targetPiece1Position: Position;
    let attackingPiece: Piece;
    let targetPiece1: Piece;
    let attack1: Action;
    let diceRolls: EncrytpedAttackRoll;

    beforeEach(async () => {
      console.time('applyMeleeAttackSetup');
      player1PrivateKey = PrivateKey.random();
      player2PrivateKey = PrivateKey.random();
      serverPrivateKey = PrivateKey.random();
      piecesTree = new PiecesMerkleTree();
      arenaTree = new ArenaMerkleTree();
      attackingPiecePosition = Position.fromXY(100, 100);
      targetPiece1Position = Position.fromXY(100, 101); // in range

      attackingPiece = new Piece(
        Field(1),
        player1PrivateKey.toPublicKey(),
        attackingPiecePosition,
        Unit.default()
      );
      attackingPiece.condition.saveRoll = UInt32.from(0); // Ensure that attacker's save roll is not counted
      targetPiece1 = new Piece(
        Field(2),
        player2PrivateKey.toPublicKey(),
        targetPiece1Position,
        Unit.default()
      );
      piecesTree.set(attackingPiece.id.toBigInt(), attackingPiece.hash());
      piecesTree.set(targetPiece1.id.toBigInt(), targetPiece1.hash());
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

      attack1 = new Action(Field(1), Field(2), targetPiece1.hash(), Field(1));
      console.timeEnd('applyMeleeAttackSetup');
    });

    it('Creates Valid Proof after applying a ranged attack', async () => {
      console.time('applyMeleeAttack');
      const enc = Encryption.encrypt(
        [Field(6), Field(6), Field(1)],
        serverPrivateKey.toPublicKey()
      );
      const sig = Signature.create(rngPrivateKey, enc.cipherText);
      diceRolls = EncrytpedAttackRoll.init(enc.publicKey, enc.cipherText, sig);

      const attackDistance = 1;

      const initialProof = await PhaseProgram.init(
        initialPhaseState,
        initialPhaseState
      );

      // actually apply the ranged attack to the merkle maps
      const pieceMapAfterAttack = piecesTree.clone();
      const pieceClone = targetPiece1.clone();
      pieceClone.condition.health = UInt32.from(1);
      pieceMapAfterAttack.set(pieceClone.id.toBigInt(), pieceClone.hash());

      // the state that the phase should have after the move
      const finalPhaseState = new PhaseState(
        initialPhaseState.nonce,
        attack1.nonce,
        initialPhaseState.startingPiecesState,
        pieceMapAfterAttack.tree.getRoot(),
        initialPhaseState.startingArenaState,
        initialPhaseState.startingArenaState,
        initialPhaseState.playerPublicKey
      );

      Circuit.log(
        `initial phase state: ${initialPhaseState.hash().toString()}`
      );
      Circuit.log(`final phase state: ${finalPhaseState.hash().toString()}`);

      console.time('applyMeleeAttackProof');
      const afterAttackProof = await PhaseProgram.applyMeleeAttack(
        finalPhaseState,
        initialProof,
        attack1,
        attack1.sign(player1PrivateKey),
        attackingPiece.clone(),
        targetPiece1.clone(),
        piecesTree.getWitness(attackingPiece.id.toBigInt()),
        piecesTree.getWitness(targetPiece1.id.toBigInt()),
        UInt32.from(attackDistance),
        diceRolls,
        serverPrivateKey
      );
      console.timeEnd('applyMeleeAttackProof');

      Circuit.log('finished with proof');
      Circuit.log(
        `Proof state: ${afterAttackProof.publicInput.hash().toString()}`
      );

      const didVerify = await afterAttackProof.verify();

      Circuit.log('Verified Proof');
      expect(true); // did not throw on verify()
      console.timeEnd('applyMeleeAttack');
    });
  });
});

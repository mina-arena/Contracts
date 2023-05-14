import {
  PrivateKey,
  Field,
  UInt32,
  Encryption,
  Signature,
  Circuit,
} from 'snarkyjs';

import { PhaseState } from '../../src/phase/PhaseState';
import { GameState } from '../../src/game/GameState';
import { Action } from '../../src/objects/Action';
import { Position } from '../../src/objects/Position';
import { Piece } from '../../src/objects/Piece';
import { Unit } from '../../src/objects/Unit';
import { ArenaMerkleTree } from '../../src/objects/ArenaMerkleTree';
import { PiecesMerkleTree } from '../../src/objects/PiecesMerkleTree';
import { EncrytpedAttackRoll } from '../../src/objects/AttackDiceRolls';

describe('PhaseState', () => {
  let player1PrivateKey: PrivateKey;
  let player2PrivateKey: PrivateKey;
  let serverPrivateKey: PrivateKey;
  let rngPrivateKey: PrivateKey;
  let gameState: GameState;
  let initialPhaseState: PhaseState;
  let piecesTree: PiecesMerkleTree;
  let arenaTree: ArenaMerkleTree;
  beforeEach(async () => {
    player1PrivateKey = PrivateKey.random();
    player2PrivateKey = PrivateKey.random();
    serverPrivateKey = PrivateKey.random();
    rngPrivateKey = PrivateKey.random();
    piecesTree = new PiecesMerkleTree();
    arenaTree = new ArenaMerkleTree();
  });

  describe('applyRangedAttack', () => {
    let attackingPiecePosition: Position;
    let targetPiece1Position: Position;
    let targetPiece2Position: Position;
    let attackingPiece: Piece;
    let targetPiece1: Piece;
    let targetPiece2: Piece;
    let attack1: Action;
    let attack2: Action;
    let diceRolls: EncrytpedAttackRoll;
    beforeEach(async () => {
      attackingPiecePosition = Position.fromXY(100, 100);
      targetPiece1Position = Position.fromXY(100, 120); // in range
      targetPiece2Position = Position.fromXY(100, 200); // out of range

      attackingPiece = new Piece(
        Field(1),
        player1PrivateKey.toPublicKey(),
        attackingPiecePosition,
        Unit.default()
      );
      targetPiece1 = new Piece(
        Field(2),
        player2PrivateKey.toPublicKey(),
        targetPiece1Position,
        Unit.default()
      );
      targetPiece2 = new Piece(
        Field(3),
        player2PrivateKey.toPublicKey(),
        targetPiece2Position,
        Unit.default()
      );
      piecesTree.set(attackingPiece.id.toBigInt(), attackingPiece.hash());
      piecesTree.set(targetPiece1.id.toBigInt(), targetPiece1.hash());
      piecesTree.set(targetPiece2.id.toBigInt(), targetPiece2.hash());
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
      attack2 = new Action(Field(1), Field(1), targetPiece2.hash(), Field(1));

      const enc = Encryption.encrypt(
        [Field(6), Field(6), Field(1)],
        serverPrivateKey.toPublicKey()
      );
      const sig = Signature.create(rngPrivateKey, enc.cipherText);
      diceRolls = new EncrytpedAttackRoll({
        publicKey: enc.publicKey,
        ciphertext: enc.cipherText,
        signature: sig,
      });
    });

    it('hits, wounds, doesnt save, is in range', async () => {
      const piecesTreeBefore = piecesTree.clone();
      const attackDistance = 20;

      Circuit.runAndCheck(() => {
        const newPhaseState = initialPhaseState.applyRangedAttackAction(
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

        const targetAfterAttack = targetPiece1.clone();
        targetAfterAttack.condition.health = UInt32.from(1);
        piecesTree.set(
          targetAfterAttack.id.toBigInt(),
          targetAfterAttack.hash()
        );

        Circuit.asProver(() => {
          expect(newPhaseState.startingPiecesState.toString()).toBe(
            piecesTreeBefore.tree.getRoot().toString()
          );
          expect(newPhaseState.currentPiecesState.toString()).toBe(
            piecesTree.tree.getRoot().toString()
          );
        });
      });
    });
  });
});

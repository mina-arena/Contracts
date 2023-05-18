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
  const rngPrivateKey: PrivateKey = PrivateKey.fromBase58(
    'EKEMFSemZ3c9SMDpEzJ1LSsRGgbDmJ6878VwSdBtMNot2wpR7GQK'
  ); // test value for now
  let gameState: GameState;
  let initialPhaseState: PhaseState;
  let piecesTree: PiecesMerkleTree;
  let arenaTree: ArenaMerkleTree;
  beforeEach(async () => {
    player1PrivateKey = PrivateKey.random();
    player2PrivateKey = PrivateKey.random();
    serverPrivateKey = PrivateKey.random();
    piecesTree = new PiecesMerkleTree();
    arenaTree = new ArenaMerkleTree();
  });

  describe('applyMeleeAttack', () => {
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
      targetPiece1Position = Position.fromXY(100, 102); // in range
      targetPiece2Position = Position.fromXY(100, 110); // out of range

      attackingPiece = new Piece(
        Field(1),
        player1PrivateKey.toPublicKey(),
        attackingPiecePosition,
        Unit.default()
      );
      attackingPiece.condition.meleeSaveRoll = UInt32.from(0); // Ensure that attacker's save roll is not counted
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

      attack1 = new Action(Field(1), Field(2), targetPiece1.hash(), Field(1));
      attack2 = new Action(Field(1), Field(2), targetPiece2.hash(), Field(1));
    });

    it('hits, wounds, doesnt save, is in range', async () => {
      const enc = Encryption.encrypt(
        [Field(6), Field(6), Field(1)],
        serverPrivateKey.toPublicKey()
      );
      const sig = Signature.create(rngPrivateKey, enc.cipherText);
      diceRolls = EncrytpedAttackRoll.init(enc.publicKey, enc.cipherText, sig);

      const piecesTreeBefore = piecesTree.clone();
      const attackDistance = 2;

      Circuit.runAndCheck(() => {
        const newPhaseState = initialPhaseState.applyMeleeAttackAction(
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
        targetAfterAttack.condition.health = UInt32.from(0); // took 3 damage
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

    it('hits, but does not wound, is in range', async () => {
      const enc = Encryption.encrypt(
        [Field(6), Field(1), Field(1)],
        serverPrivateKey.toPublicKey()
      );
      const sig = Signature.create(rngPrivateKey, enc.cipherText);
      diceRolls = EncrytpedAttackRoll.init(enc.publicKey, enc.cipherText, sig);

      const piecesTreeBefore = piecesTree.clone();
      const attackDistance = 2;

      Circuit.runAndCheck(() => {
        const newPhaseState = initialPhaseState.applyMeleeAttackAction(
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
        targetAfterAttack.condition.health = UInt32.from(3); // took no damage
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

    it('hits, wounds, and saves, is in range', async () => {
      const enc = Encryption.encrypt(
        [Field(6), Field(6), Field(6)],
        serverPrivateKey.toPublicKey()
      );
      const sig = Signature.create(rngPrivateKey, enc.cipherText);
      diceRolls = EncrytpedAttackRoll.init(enc.publicKey, enc.cipherText, sig);

      const piecesTreeBefore = piecesTree.clone();
      const attackDistance = 2;

      Circuit.runAndCheck(() => {
        const newPhaseState = initialPhaseState.applyMeleeAttackAction(
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
        targetAfterAttack.condition.health = UInt32.from(3); // took no damage
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

    it('is out range', async () => {
      const enc = Encryption.encrypt(
        [Field(6), Field(6), Field(6)],
        serverPrivateKey.toPublicKey()
      );
      const sig = Signature.create(rngPrivateKey, enc.cipherText);
      diceRolls = EncrytpedAttackRoll.init(enc.publicKey, enc.cipherText, sig);

      const attackDistance = 10;

      expect(() => {
        Circuit.runAndCheck(() => {
          initialPhaseState.applyMeleeAttackAction(
            attack2,
            attack2.sign(player1PrivateKey),
            attackingPiece.clone(),
            targetPiece2.clone(),
            piecesTree.getWitness(attackingPiece.id.toBigInt()),
            piecesTree.getWitness(targetPiece2.id.toBigInt()),
            UInt32.from(attackDistance),
            diceRolls,
            serverPrivateKey
          );
        });
      }).toThrow();
    });

    it('attempts to spoof dice rolls', async () => {
      const actualRoll = Encryption.encrypt(
        [Field(1), Field(1), Field(6)],
        serverPrivateKey.toPublicKey()
      );

      const fakeRoll = Encryption.encrypt(
        [Field(6), Field(6), Field(1)],
        player1PrivateKey.toPublicKey()
      );

      let sig = Signature.create(player1PrivateKey, fakeRoll.cipherText);
      expect(() => {
        diceRolls = EncrytpedAttackRoll.init(
          fakeRoll.publicKey,
          fakeRoll.cipherText,
          sig
        );
      }).toThrow(); // signature matches data, but it uses the wrong signing key

      sig = Signature.create(rngPrivateKey, actualRoll.cipherText);
      expect(() => {
        diceRolls = EncrytpedAttackRoll.init(
          fakeRoll.publicKey,
          fakeRoll.cipherText,
          sig
        );
      }).toThrow(); // signature uses the right signing key, but does not match the data

      diceRolls = EncrytpedAttackRoll.init(
        actualRoll.publicKey,
        actualRoll.cipherText,
        sig
      );
      diceRolls.ciphertext = fakeRoll.cipherText; // trying to be sneaky

      const attackDistance = 2;

      expect(() => {
        Circuit.runAndCheck(() => {
          initialPhaseState.applyMeleeAttackAction(
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
        });
      }).toThrow();
    });
  });
});

import {
  Experimental,
  PrivateKey,
  SelfProof,
  Signature,
  UInt32,
} from 'snarkyjs';
import { PhaseState } from './PhaseState.js';
import { Piece } from '../objects/Piece.js';
import { Action } from '../objects/Action.js';
import { PiecesMerkleWitness } from '../objects/PiecesMerkleTree.js';
import { ArenaMerkleWitness } from '../objects/ArenaMerkleTree.js';
import { Position } from '../objects/Position.js';
import { EncrytpedAttackRoll } from '../objects/AttackDiceRolls.js';

export const PhaseProgram = Experimental.ZkProgram({
  publicInput: PhaseState,

  methods: {
    init: {
      privateInputs: [PhaseState],
      method(state: PhaseState, initState: PhaseState) {
        state.assertEquals(initState);
      },
    },
    applyMove: {
      privateInputs: [
        SelfProof,
        Action,
        Signature,
        Piece,
        PiecesMerkleWitness,
        ArenaMerkleWitness,
        ArenaMerkleWitness,
        Position,
        UInt32,
      ],
      method(
        newState: PhaseState,
        oldPhaseProof: SelfProof<PhaseState, PhaseState>,
        action: Action,
        actionSignature: Signature,
        piece: Piece,
        pieceWitness: PiecesMerkleWitness,
        oldPositionArenaWitness: ArenaMerkleWitness,
        newPositionArenaWitness: ArenaMerkleWitness,
        newPosition: Position,
        assertedMoveDistance: UInt32
      ) {
        oldPhaseProof.verify();
        const stateAfterMove = oldPhaseProof.publicInput.applyMoveAction(
          action,
          actionSignature,
          piece,
          pieceWitness,
          oldPositionArenaWitness,
          newPositionArenaWitness,
          newPosition,
          assertedMoveDistance
        );
        stateAfterMove.assertEquals(newState);
      },
    },
    applyRangedAttack: {
      privateInputs: [
        SelfProof,
        Action,
        Signature,
        Piece,
        Piece,
        PiecesMerkleWitness,
        PiecesMerkleWitness,
        UInt32,
        EncrytpedAttackRoll,
        PrivateKey,
      ],
      method(
        newState: PhaseState,
        oldPhaseProof: SelfProof<PhaseState, PhaseState>,
        action: Action,
        actionSignature: Signature,
        attackingPiece: Piece,
        targetPiece: Piece,
        attackingPieceWitness: PiecesMerkleWitness,
        targetPieceWitness: PiecesMerkleWitness,
        assertedAttackDistance: UInt32,
        attackRoll: EncrytpedAttackRoll,
        serverSecretKey: PrivateKey
      ) {
        oldPhaseProof.verify();
        const stateAfterAttack =
          oldPhaseProof.publicInput.applyRangedAttackAction(
            action,
            actionSignature,
            attackingPiece,
            targetPiece,
            attackingPieceWitness,
            targetPieceWitness,
            assertedAttackDistance,
            attackRoll,
            serverSecretKey
          );
        stateAfterAttack.assertEquals(newState);
      },
    },
    applyMeleeAttack: {
      privateInputs: [
        SelfProof,
        Action,
        Signature,
        Piece,
        Piece,
        PiecesMerkleWitness,
        PiecesMerkleWitness,
        UInt32,
        EncrytpedAttackRoll,
        PrivateKey,
      ],
      method(
        newState: PhaseState,
        oldPhaseProof: SelfProof<PhaseState, PhaseState>,
        action: Action,
        actionSignature: Signature,
        attackingPiece: Piece,
        targetPiece: Piece,
        attackingPieceWitness: PiecesMerkleWitness,
        targetPieceWitness: PiecesMerkleWitness,
        assertedAttackDistance: UInt32,
        attackRoll: EncrytpedAttackRoll,
        serverSecretKey: PrivateKey
      ) {
        oldPhaseProof.verify();
        const stateAfterAttack =
          oldPhaseProof.publicInput.applyMeleeAttackAction(
            action,
            actionSignature,
            attackingPiece,
            targetPiece,
            attackingPieceWitness,
            targetPieceWitness,
            assertedAttackDistance,
            attackRoll,
            serverSecretKey
          );
        stateAfterAttack.assertEquals(newState);
      },
    },
  },
});

export let PhaseProof_ = Experimental.ZkProgram.Proof(PhaseProgram);
export class PhaseProof extends PhaseProof_ {}

import { Experimental, SelfProof, Signature, UInt32 } from 'snarkyjs';
import { PhaseState } from './PhaseState';
import { Piece } from '../objects/Piece';
import { Action } from '../objects/Action';
import { PiecesMerkleWitness } from '../objects/PiecesMerkleTree';
import { ArenaMerkleWitness } from '../objects/ArenaMerkleTree';
import { Position } from '../objects/Position';

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
        oldPhaseProof: SelfProof<PhaseState>,
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
  },
});

export let PhaseProof_ = Experimental.ZkProgram.Proof(PhaseProgram);
export class PhaseProof extends PhaseProof_ {}

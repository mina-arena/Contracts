import { Experimental, SelfProof } from 'snarkyjs';
import { TurnState } from './TurnState';
import { PhaseProof } from '../phase/PhaseProof';

export const TurnProgram = Experimental.ZkProgram({
  publicInput: TurnState,

  methods: {
    init: {
      privateInputs: [TurnState],
      method(state: TurnState, initState: TurnState) {
        state.assertEquals(initState);
      },
    },
    applyPhase: {
      privateInputs: [SelfProof, PhaseProof],
      method(
        newState: TurnState,
        oldTurnProof: SelfProof<TurnState, TurnState>,
        phaseProof: PhaseProof
      ) {
        oldTurnProof.verify();
        phaseProof.verify();
        const stateAfterMove = oldTurnProof.publicInput.applyPhase(
          phaseProof.publicInput
        );
        stateAfterMove.assertEquals(newState);
      },
    },
  },
});

export let TurnProof_ = Experimental.ZkProgram.Proof(TurnProgram);
export class TurnProof extends TurnProof_ {}

import { Experimental, SelfProof } from 'snarkyjs';
import { GameState } from './GameState.js';
import { TurnProof } from '../turn/TurnProof.js';

export const GameProgram = Experimental.ZkProgram({
  publicInput: GameState,

  methods: {
    init: {
      privateInputs: [GameState],
      method(state: GameState, initState: GameState) {
        state.assertEquals(initState);
      },
    },
    applyTurn: {
      privateInputs: [SelfProof, TurnProof],
      method(
        newState: GameState,
        oldGameProof: SelfProof<GameState, GameState>,
        turnProof: TurnProof
      ) {
        oldGameProof.verify();
        turnProof.verify();
        const stateAfterMove = oldGameProof.publicInput.applyTurn(
          turnProof.publicInput
        );
        stateAfterMove.assertEquals(newState);
      },
    },
  },
});

export let GameProof_ = Experimental.ZkProgram.Proof(GameProgram);
export class GameProof extends GameProof_ {}

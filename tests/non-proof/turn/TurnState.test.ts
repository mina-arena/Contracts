import { PrivateKey, Field } from 'snarkyjs';
import { TurnState } from '../../../src/turn/TurnState';
import { PhaseState } from '../../../src/phase/PhaseState';

describe('TurnState', () => {
  let player1PrivateKey: PrivateKey;
  let initialTurnState: TurnState;

  beforeEach(async () => {
    player1PrivateKey = PrivateKey.random();

    initialTurnState = new TurnState({
      nonce: Field(0),
      phaseNonce: Field(0),
      startingPiecesState: Field(0),
      currentPiecesState: Field(0),
      startingArenaState: Field(0),
      currentArenaState: Field(0),
      playerPublicKey: player1PrivateKey.toPublicKey(),
    });
  });

  describe('init', () => {
    it('initalizes and serializes input', async () => {
      const expectedNonce = '0';
      const expectedPhaseNonce = '0';
      const expectedPiecesRoot = Field(0).toString();
      const expectedArenaRoot = Field(0).toString();
      const expectedPlayer = player1PrivateKey.toPublicKey().toBase58();

      expect(initialTurnState.toJSON()).toEqual({
        nonce: expectedNonce,
        phaseNonce: expectedPhaseNonce,
        startingPiecesState: expectedPiecesRoot,
        currentPiecesState: expectedPiecesRoot,
        startingArenaState: expectedArenaRoot,
        currentArenaState: expectedArenaRoot,
        playerPublicKey: expectedPlayer,
      });
    });
  });

  describe('fromJSON', () => {
    it('initalizes and serializes input', async () => {
      const toJSON = initialTurnState.toJSON();
      const fromJSON = TurnState.fromJSON(toJSON);
      expect(fromJSON.hash().toString()).toEqual(
        initialTurnState.hash().toString()
      );
    });
  });

  describe('applyPhase', () => {
    it('updates turn state', async () => {
      const dummyPhase = new PhaseState({
        nonce: Field(1),
        actionsNonce: Field(3),
        startingPiecesState: Field(0),
        currentPiecesState: Field(10),
        startingArenaState: Field(0),
        currentArenaState: Field(20),
        playerPublicKey: player1PrivateKey.toPublicKey(),
      });

      const newTurnState = initialTurnState.applyPhase(dummyPhase);

      const expectedNonce = '0';
      const expectedPhaseNonce = '1';
      const expectedPiecesRoot = Field(0).toString();
      const expectedArenaRoot = Field(0).toString();
      const expectedPlayer = player1PrivateKey.toPublicKey().toBase58();

      expect(newTurnState.toJSON()).toEqual({
        nonce: expectedNonce,
        phaseNonce: expectedPhaseNonce,
        startingPiecesState: expectedPiecesRoot,
        currentPiecesState: Field(10).toString(),
        startingArenaState: expectedArenaRoot,
        currentArenaState: Field(20).toString(),
        playerPublicKey: expectedPlayer,
      });
    });

    it('rejects a phase with nonce too small', async () => {
      const dummyPhase = new PhaseState({
        nonce: Field(0), // nonce should be >= 1
        actionsNonce: Field(3),
        startingPiecesState: Field(0),
        currentPiecesState: Field(10),
        startingArenaState: Field(0),
        currentArenaState: Field(20),
        playerPublicKey: player1PrivateKey.toPublicKey(),
      });

      expect(() => {
        initialTurnState.applyPhase(dummyPhase);
      }).toThrow();
    });

    it('rejects a phase where the starting state does not match ', async () => {
      const dummyPhase = new PhaseState({
        nonce: Field(1),
        actionsNonce: Field(3),
        startingPiecesState: Field(1), // starting state should be 0
        currentPiecesState: Field(10),
        startingArenaState: Field(0),
        currentArenaState: Field(20),
        playerPublicKey: player1PrivateKey.toPublicKey(),
      });

      expect(() => {
        initialTurnState.applyPhase(dummyPhase);
      }).toThrow();
    });
  });
});

import {
  Field,
  Struct,
  Signature,
  PublicKey,
  MerkleMapWitness,
} from 'snarkyjs';

import { GameState } from '../game/GameState';
import { Piece } from '../objects/Piece';
import { Position } from '../objects/Position';
import { Action } from '../objects/Action';

export class PhaseState extends Struct({
  actionsNonce: Field, // nonce of actions processed so far
  startingPiecesState: Field, // Pieces state before this turn
  currentPiecesState: Field, // Pieces state after the actions applied in this turn
  startingArenaState: Field, // Arena state before this turn
  currentArenaState: Field, // Arena state after the actions applied in this turn
  player: PublicKey, // the player this turn is for
}) {
  constructor(
    actionsNonce: Field,
    startingPiecesState: Field,
    currentPiecesState: Field,
    startingArenaState: Field,
    currentArenaState: Field,
    player: PublicKey
  ) {
    super({
      actionsNonce,
      startingPiecesState,
      currentPiecesState,
      startingArenaState,
      currentArenaState,
      player,
    });
  }

  static init(
    startingPiecesState: Field,
    startingArenaState: Field,
    player: PublicKey
  ): PhaseState {
    return new PhaseState(
      Field(0),
      startingPiecesState,
      startingPiecesState,
      startingArenaState,
      startingArenaState,
      player
    );
  }

  applyMoveAction(
    action: Action,
    actionSignature: Signature,
    piece: Piece,
    gameState: GameState,
    pieceWitness: MerkleMapWitness,
    oldPositionArenaWitness: MerkleMapWitness,
    newPositionArenaWitness: MerkleMapWitness,
    newPosition: Position
  ): PhaseState {
    const v = actionSignature.verify(this.player, action.signatureArguments());
    v.assertTrue();
    action.nonce.assertGreaterThan(this.actionsNonce);
    action.actionType.assertEquals(Field(0)); // action is a "move" action
    action.actionParams.assertEquals(newPosition.hash());

    let [proot, pkey] = pieceWitness.computeRootAndKey(piece.hash());
    proot.assertEquals(gameState.piecesRoot);
    proot.assertEquals(this.currentPiecesState);
    pkey.assertEquals(piece.id);

    let oldAroot: Field;
    let midAroot: Field;
    let newAroot: Field;
    let oldAkey: Field;
    let newAkey: Field;

    // Old Witness, old position is occupied
    [oldAroot, oldAkey] = oldPositionArenaWitness.computeRootAndKey(Field(1));
    oldAroot.assertEquals(gameState.arenaRoot);
    oldAroot.assertEquals(this.startingArenaState);
    oldAkey.assertEquals(piece.position.hash());

    // Old Witness, new position is un-occupied
    [midAroot, newAkey] = newPositionArenaWitness.computeRootAndKey(Field(0));
    // assert that the mid tree with new position un-occupied == the old tree with the old position un-occupied
    // e.g. every other leaf must be the same; they are the same tree outside of these 2 leaves
    midAroot.assertEquals(
      oldPositionArenaWitness.computeRootAndKey(Field(0))[0]
    );
    newAkey.assertEquals(newPosition.hash());

    // calculate new tree root based on the new position being occupied, this is the new root of the arena
    [newAroot, newAkey] = newPositionArenaWitness.computeRootAndKey(Field(1));

    const endingPiece = piece.clone();
    endingPiece.position = newPosition;
    [proot, pkey] = pieceWitness.computeRootAndKey(endingPiece.position.hash());

    return new PhaseState(
      action.nonce,
      this.startingPiecesState,
      proot,
      this.startingArenaState,
      newAroot,
      this.player
    );
  }

  // TODO: Add actions other than move based on turn ADR
  // applyAttackAction(
  //   action: Action,
  //   actionSignature: Signature,
  //   piece: Piece,
  //   gameState: GameState,
  //   pieceWitness: MerkleMapWitness,
  //   otherPieceWitness: MerkleMapWitness,
  //   otherPiece: Piece
  // ): PhaseState {
  //   const v = actionSignature.verify(this.player, action.signatureArguments());
  //   v.assertTrue();
  //   action.nonce.assertGt(this.actionsNonce);
  //   action.actionType.assertEquals(Field(1)); // action is an "attack" action
  //   action.actionParams.assertEquals(otherPiece.hash());

  //   let [root, key] = pieceWitness.computeRootAndKey(piece.hash());
  //   root.assertEquals(gameState.piecesRoot);
  //   root.assertEquals(this.currentPiecesState);
  //   key.assertEquals(piece.position.hash());

  //   [root, key] = otherPieceWitness.computeRootAndKey(otherPiece.hash());
  //   root.assertEquals(this.currentPiecesState);
  //   key.assertEquals(otherPiece.position.hash());

  //   // TODO: verify attack is valid
  //   // - Unit is within range
  //   // - Other checks?

  //   otherPiece.condition.health = otherPiece.condition.health.sub(1);

  //   [root, key] = otherPieceWitness.computeRootAndKey(otherPiece.hash());

  //   return new PhaseState(action.nonce, this.startingPiecesState, root, this.player);
  // }

  toJSON() {
    return {
      actionsNonce: Number(this.actionsNonce.toString()),
      startingPiecesState: this.startingPiecesState.toString(),
      currentPiecesState: this.currentPiecesState.toString(),
      startingArenaState: this.startingArenaState.toString(),
      currentArenaState: this.currentArenaState.toString(),
      player: this.player.toBase58(),
    };
  }
}

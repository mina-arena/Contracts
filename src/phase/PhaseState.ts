import {
  Field,
  Struct,
  Signature,
  PublicKey,
  UInt32,
  PrivateKey,
  Circuit,
  Bool,
} from 'snarkyjs';

import { GameState } from '../game/GameState';
import { Piece } from '../objects/Piece';
import { Position } from '../objects/Position';
import { Action } from '../objects/Action';
import { ArenaMerkleWitness } from '../objects/ArenaMerkleTree';
import { PiecesMerkleWitness } from '../objects/PiecesMerkleTree';
import { EncrytpedAttackRoll } from '../objects/AttackDiceRolls';

export class PhaseState extends Struct({
  nonce: Field,
  actionsNonce: Field, // nonce of actions processed so far
  startingPiecesState: Field, // Pieces state before this turn
  currentPiecesState: Field, // Pieces state after the actions applied in this turn
  startingArenaState: Field, // Arena state before this turn
  currentArenaState: Field, // Arena state after the actions applied in this turn
  playerPublicKey: PublicKey, // the player this turn is for
}) {
  constructor(
    nonce: Field,
    actionsNonce: Field,
    startingPiecesState: Field,
    currentPiecesState: Field,
    startingArenaState: Field,
    currentArenaState: Field,
    playerPublicKey: PublicKey
  ) {
    super({
      nonce,
      actionsNonce,
      startingPiecesState,
      currentPiecesState,
      startingArenaState,
      currentArenaState,
      playerPublicKey,
    });
  }

  static init(
    startingPiecesState: Field,
    startingArenaState: Field,
    playerPublicKey: PublicKey
  ): PhaseState {
    return new PhaseState(
      Field(0),
      Field(0),
      startingPiecesState,
      startingPiecesState,
      startingArenaState,
      startingArenaState,
      playerPublicKey
    );
  }

  applyMoveAction(
    action: Action,
    actionSignature: Signature,
    piece: Piece,
    pieceWitness: PiecesMerkleWitness,
    oldPositionArenaWitness: ArenaMerkleWitness,
    newPositionArenaWitness: ArenaMerkleWitness,
    newPosition: Position,
    assertedMoveDistance: UInt32
  ): PhaseState {
    this.playerPublicKey.assertEquals(piece.playerPublicKey);
    piece.position
      .verifyDistance(newPosition, assertedMoveDistance)
      .assertTrue();
    assertedMoveDistance.assertLessThanOrEqual(piece.condition.movement);
    const v = actionSignature.verify(
      this.playerPublicKey,
      action.signatureArguments()
    );
    v.assertTrue();
    action.nonce.assertGreaterThan(this.actionsNonce);
    action.actionType.assertEquals(Field(0)); // action is a "move" action
    action.actionParams.assertEquals(newPosition.hash());

    let proot = pieceWitness.calculateRoot(piece.hash());
    let pkey = pieceWitness.calculateIndex();
    proot.assertEquals(this.currentPiecesState);
    pkey.assertEquals(piece.id);

    let oldAroot: Field;
    let midAroot: Field;
    let newAroot: Field;
    let oldAkey: Field;
    let newAkey: Field;

    // Old Witness, old position is occupied
    oldAroot = oldPositionArenaWitness.calculateRoot(Field(1));
    oldAkey = oldPositionArenaWitness.calculateIndex();
    oldAroot.assertEquals(this.currentArenaState);
    oldAkey.assertEquals(Field(piece.position.getMerkleKey(800)));

    // Old Witness, new position is un-occupied
    midAroot = newPositionArenaWitness.calculateRoot(Field(0));
    newAkey = newPositionArenaWitness.calculateIndex();
    // assert that the mid tree with new position un-occupied == the old tree with the old position un-occupied
    // e.g. every other leaf must be the same; they are the same tree outside of these 2 leaves
    midAroot.assertEquals(oldPositionArenaWitness.calculateRoot(Field(0)));
    newAkey.assertEquals(Field(newPosition.getMerkleKey(800)));

    // calculate new tree root based on the new position being occupied, this is the new root of the arena
    newAroot = newPositionArenaWitness.calculateRoot(Field(1));

    const endingPiece = piece.clone();
    endingPiece.position = newPosition;
    proot = pieceWitness.calculateRoot(endingPiece.hash());

    return new PhaseState(
      this.nonce,
      action.nonce,
      this.startingPiecesState,
      proot,
      this.startingArenaState,
      newAroot,
      this.playerPublicKey
    );
  }

  applyRangedAttackAction(
    action: Action,
    actionSignature: Signature,
    attackingPiece: Piece,
    targetPiece: Piece,
    attackingPieceWitness: PiecesMerkleWitness,
    targetPieceWitness: PiecesMerkleWitness,
    assertedAttackDistance: UInt32,
    attackRoll: EncrytpedAttackRoll,
    serverSecretKey: PrivateKey
  ): PhaseState {
    const piecesRoot = attackingPieceWitness.calculateRoot(
      attackingPiece.hash()
    );
    piecesRoot.assertEquals(
      targetPieceWitness.calculateRoot(targetPiece.hash()),
      'Piece witnesses do not match each other'
    );
    piecesRoot.assertEquals(
      this.currentPiecesState,
      'Piece witnesses do not match the current game state'
    );
    this.playerPublicKey.assertEquals(attackingPiece.playerPublicKey);
    attackingPiece.position
      .verifyDistance(targetPiece.position, assertedAttackDistance)
      .assertTrue('Asserted attack distance is not correct');
    assertedAttackDistance.assertLessThanOrEqual(
      attackingPiece.condition.rangedAttackRange,
      'Asserted attack distance is out of range for attacking piece'
    );
    const v = actionSignature.verify(
      this.playerPublicKey,
      action.signatureArguments()
    );
    v.assertTrue('The action signature does not match the provided action');

    action.nonce.assertGreaterThan(
      this.actionsNonce,
      'The action nonce is LTE the most recent action nonce'
    );
    action.actionType.assertEquals(
      Field(1),
      'Action type must be 1 (ranged attack)'
    ); // action is a "ranged attack" action
    action.actionParams.assertEquals(
      targetPiece.hash(),
      'The action target is different than the proved target piece'
    );

    const decrytpedRolls = attackRoll.decryptRoll(serverSecretKey);
    // roll for hit
    const hit = Circuit.if(
      decrytpedRolls.hit.greaterThanOrEqual(
        attackingPiece.condition.hitRoll.value
      ),
      Bool(true),
      Bool(false)
    );

    // roll for wound
    const wound = Circuit.if(
      decrytpedRolls.wound.greaterThanOrEqual(
        attackingPiece.condition.woundRoll.value
      ),
      Bool(true),
      Bool(false)
    );

    // roll for save
    const notSave = Circuit.if(
      decrytpedRolls.save.greaterThanOrEqual(
        attackingPiece.condition.saveRoll.value
      ),
      Bool(false),
      Bool(true)
    );

    let healthDiff = Circuit.if(
      Bool.and(Bool.and(hit, wound), notSave),
      UInt32.from(2),
      UInt32.from(0)
    );

    const newHealth = Circuit.if(
      healthDiff.greaterThanOrEqual(targetPiece.condition.health),
      UInt32.from(0),
      targetPiece.condition.health.sub(healthDiff)
    );

    targetPiece.condition.health = newHealth;
    const newPiecesRoot = targetPieceWitness.calculateRoot(targetPiece.hash());

    return new PhaseState(
      this.nonce,
      action.nonce,
      this.startingPiecesState,
      newPiecesRoot,
      this.startingArenaState,
      this.currentArenaState,
      this.playerPublicKey
    );
  }

  toJSON() {
    return {
      nonce: Number(this.nonce.toString()),
      actionsNonce: Number(this.actionsNonce.toString()),
      startingPiecesState: this.startingPiecesState.toString(),
      currentPiecesState: this.currentPiecesState.toString(),
      startingArenaState: this.startingArenaState.toString(),
      currentArenaState: this.currentArenaState.toString(),
      playerPublicKey: this.playerPublicKey.toBase58(),
    };
  }
}

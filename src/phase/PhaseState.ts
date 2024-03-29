import {
  Field,
  Struct,
  Signature,
  PublicKey,
  UInt32,
  PrivateKey,
  Provable,
  Bool,
  Poseidon,
} from 'snarkyjs';

import { Piece } from '../objects/Piece.js';
import { Position } from '../objects/Position.js';
import { Action } from '../objects/Action.js';
import { ArenaMerkleWitness } from '../objects/ArenaMerkleTree.js';
import { PiecesMerkleWitness } from '../objects/PiecesMerkleTree.js';
import { EncrytpedAttackRoll } from '../objects/AttackDiceRolls.js';
import { MELEE_ATTACK_RANGE_U32 } from '../gameplay_constants.js';

export type PhaseStateJSON = {
  nonce: string;
  actionsNonce: string;
  startingPiecesState: string;
  currentPiecesState: string;
  startingArenaState: string;
  currentArenaState: string;
  playerPublicKey: string;
};

export class PhaseState extends Struct({
  nonce: Field,
  actionsNonce: Field, // nonce of actions processed so far
  startingPiecesState: Field, // Pieces state before this phase
  currentPiecesState: Field, // Pieces state after the actions applied in this phase
  startingArenaState: Field, // Arena state before this phase
  currentArenaState: Field, // Arena state after the actions applied in this phase
  playerPublicKey: PublicKey, // the player this phase is for
}) {
  static init(
    startingPiecesState: Field,
    startingArenaState: Field,
    playerPublicKey: PublicKey
  ): PhaseState {
    return new PhaseState({
      nonce: Field(0),
      actionsNonce: Field(0),
      startingPiecesState,
      currentPiecesState: startingPiecesState,
      startingArenaState,
      currentArenaState: startingArenaState,
      playerPublicKey,
    });
  }

  hash(): Field {
    return Poseidon.hash([
      this.nonce,
      this.actionsNonce,
      this.startingPiecesState,
      this.currentPiecesState,
      this.startingArenaState,
      this.currentArenaState,
      this.playerPublicKey.x,
      this.playerPublicKey.isOdd.toField(),
    ]);
  }

  assertEquals(other: PhaseState) {
    this.hash().assertEquals(other.hash());
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
    oldAkey.assertEquals(piece.position.getMerkleKey(800));

    // Old Witness, new position is un-occupied
    midAroot = newPositionArenaWitness.calculateRoot(Field(0));
    newAkey = newPositionArenaWitness.calculateIndex();
    // assert that the mid tree with new position un-occupied == the old tree with the old position un-occupied
    // e.g. every other leaf must be the same; they are the same tree outside of these 2 leaves
    midAroot.assertEquals(oldPositionArenaWitness.calculateRoot(Field(0)));
    newAkey.assertEquals(newPosition.getMerkleKey(800));

    // calculate new tree root based on the new position being occupied, this is the new root of the arena
    newAroot = newPositionArenaWitness.calculateRoot(Field(1));

    const endingPiece = piece.clone();
    endingPiece.position = newPosition;
    proot = pieceWitness.calculateRoot(endingPiece.hash());

    return new PhaseState({
      nonce: this.nonce,
      actionsNonce: action.nonce,
      startingPiecesState: this.startingPiecesState,
      currentPiecesState: proot,
      startingArenaState: this.startingArenaState,
      currentArenaState: newAroot,
      playerPublicKey: this.playerPublicKey,
    });
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
      targetPiece.id,
      'The action target is different than the proved target piece'
    );

    const decrytpedRolls = attackRoll.decryptRoll(serverSecretKey);
    // roll for hit
    const hit = Provable.if(
      decrytpedRolls.hit.greaterThanOrEqual(
        attackingPiece.condition.rangedHitRoll.value
      ),
      Bool(true),
      Bool(false)
    );

    // roll for wound
    const wound = Provable.if(
      decrytpedRolls.wound.greaterThanOrEqual(
        attackingPiece.condition.rangedWoundRoll.value
      ),
      Bool(true),
      Bool(false)
    );

    // roll for save
    const notSave = Provable.if(
      decrytpedRolls.save.greaterThanOrEqual(
        targetPiece.condition.saveRoll.value
      ),
      Bool(false),
      Bool(true)
    );

    let healthDiff = Provable.if(
      Bool.and(Bool.and(hit, wound), notSave),
      attackingPiece.condition.rangedDamage,
      UInt32.from(0)
    );

    healthDiff = Provable.if(
      healthDiff.greaterThanOrEqual(targetPiece.condition.health),
      targetPiece.condition.health,
      healthDiff
    );

    targetPiece.condition.health = targetPiece.condition.health.sub(healthDiff);
    const newPiecesRoot = targetPieceWitness.calculateRoot(targetPiece.hash());

    return new PhaseState({
      nonce: this.nonce,
      actionsNonce: action.nonce,
      startingPiecesState: this.startingPiecesState,
      currentPiecesState: newPiecesRoot,
      startingArenaState: this.startingArenaState,
      currentArenaState: this.currentArenaState,
      playerPublicKey: this.playerPublicKey,
    });
  }

  applyMeleeAttackAction(
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
      MELEE_ATTACK_RANGE_U32,
      'Asserted attack distance is out of melee range'
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
      Field(2),
      'Action type must be 2 (melee attack)'
    ); // action is a "ranged attack" action
    action.actionParams.assertEquals(
      targetPiece.id,
      'The action target is different than the proved target piece'
    );

    const decrytpedRolls = attackRoll.decryptRoll(serverSecretKey);
    // roll for hit
    const hit = Provable.if(
      decrytpedRolls.hit.greaterThanOrEqual(
        attackingPiece.condition.meleeHitRoll.value
      ),
      Bool(true),
      Bool(false)
    );

    // roll for wound
    const wound = Provable.if(
      decrytpedRolls.wound.greaterThanOrEqual(
        attackingPiece.condition.meleeWoundRoll.value
      ),
      Bool(true),
      Bool(false)
    );

    // roll for save
    const notSave = Provable.if(
      decrytpedRolls.save.greaterThanOrEqual(
        targetPiece.condition.saveRoll.value
      ),
      Bool(false),
      Bool(true)
    );

    let healthDiff = Provable.if(
      Bool.and(Bool.and(hit, wound), notSave),
      attackingPiece.condition.meleeDamage,
      UInt32.from(0)
    );

    healthDiff = Provable.if(
      healthDiff.greaterThanOrEqual(targetPiece.condition.health),
      targetPiece.condition.health,
      healthDiff
    );

    targetPiece.condition.health = targetPiece.condition.health.sub(healthDiff);
    const newPiecesRoot = targetPieceWitness.calculateRoot(targetPiece.hash());

    return new PhaseState({
      nonce: this.nonce,
      actionsNonce: action.nonce,
      startingPiecesState: this.startingPiecesState,
      currentPiecesState: newPiecesRoot,
      startingArenaState: this.startingArenaState,
      currentArenaState: this.currentArenaState,
      playerPublicKey: this.playerPublicKey,
    });
  }

  toJSON(): PhaseStateJSON {
    return {
      nonce: this.nonce.toString(),
      actionsNonce: this.actionsNonce.toString(),
      startingPiecesState: this.startingPiecesState.toString(),
      currentPiecesState: this.currentPiecesState.toString(),
      startingArenaState: this.startingArenaState.toString(),
      currentArenaState: this.currentArenaState.toString(),
      playerPublicKey: this.playerPublicKey.toBase58(),
    };
  }

  static fromJSON(j: PhaseStateJSON): PhaseState {
    return new PhaseState({
      nonce: Field(j.nonce),
      actionsNonce: Field(j.actionsNonce),
      startingPiecesState: Field(j.startingPiecesState),
      currentPiecesState: Field(j.currentPiecesState),
      startingArenaState: Field(j.startingArenaState),
      currentArenaState: Field(j.currentArenaState),
      playerPublicKey: PublicKey.fromBase58(j.playerPublicKey),
    });
  }
}

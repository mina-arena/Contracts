import { Field, Struct, PrivateKey, Signature } from 'snarkyjs';

export class Action extends Struct({
  nonce: Field, // order of action within turn
  actionType: Field, // e.g. 0 = move, 1 = attack
  actionParams: Field, // hash of params, e.g. for move, Position.hash(), for attack, otherPiece.hash(), something like this
  piece: Field, // hash of piece
}) {
  signatureArguments(): [Field, Field, Field, Field] {
    return [this.nonce, this.actionType, this.actionParams, this.piece];
  }

  sign(signer: PrivateKey): Signature {
    return Signature.create(signer, this.signatureArguments());
  }
}

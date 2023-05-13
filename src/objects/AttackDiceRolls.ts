import {
  Circuit,
  Encryption,
  Field,
  Group,
  PrivateKey,
  ProvableExtended,
  Signature,
  Struct,
} from 'snarkyjs';

export class DecrytpedAttackRoll extends Struct({
  hit: Field,
  wound: Field,
  save: Field,
}) {}

export class EncrytpedAttackRoll extends Struct({
  publicKey: Group,
  ciphertext: Circuit.array(Field, 4),
  signature: Signature,
}) {
  decryptRoll(privateKey: PrivateKey): DecrytpedAttackRoll {
    const decrypted = Encryption.decrypt(
      {
        publicKey: this.publicKey,
        cipherText: this.ciphertext,
      },
      privateKey
    );

    return new DecrytpedAttackRoll({
      hit: decrypted[0],
      wound: decrypted[1],
      save: decrypted[2],
    });
  }
}

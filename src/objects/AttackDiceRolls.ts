import {
  Circuit,
  Encryption,
  Field,
  Group,
  PrivateKey,
  ProvableExtended,
  PublicKey,
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
  rngPublicKey: PublicKey,
}) {
  static init(
    publicKey: Group,
    ciphertext: Field[],
    signature: Signature
  ): EncrytpedAttackRoll {
    const rngPublicKey = PublicKey.fromBase58(
      'B62qnxuQbhUSh6fGW6XX4kA2M3qr27trTA4xRhhyp1Aa9RQNdjpQH4G'
    ); // test value for now

    signature
      .verify(rngPublicKey, ciphertext)
      .assertTrue('Signature is not valid for provided ciphertext');

    return new EncrytpedAttackRoll({
      publicKey: publicKey,
      ciphertext: ciphertext,
      signature: signature,
      rngPublicKey: rngPublicKey,
    });
  }

  decryptRoll(privateKey: PrivateKey): DecrytpedAttackRoll {
    this.signature
      .verify(this.rngPublicKey, this.ciphertext)
      .assertTrue('Signature is not valid for provided ciphertext');

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

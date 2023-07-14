import {
  Provable,
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
}) {
  toJSON() {
    return {
      hit: Number(this.hit.toString()),
      wound: Number(this.wound.toString()),
      save: Number(this.save.toString()),
    };
  }
}

export class EncrytpedAttackRoll extends Struct({
  publicKey: Group,
  ciphertext: Provable.Array(Field, 4),
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
      .verify(rngPublicKey, [Field(3), Field(6), ...ciphertext])
      .assertTrue('Signature is not valid for provided ciphertext');

    return new EncrytpedAttackRoll({
      publicKey: publicKey,
      ciphertext: ciphertext,
      signature: signature,
      rngPublicKey: rngPublicKey,
    });
  }

  decryptRoll(privateKey: PrivateKey): DecrytpedAttackRoll {
    // 3D6 is hardcoded into the verification
    // A user may make a call to the dice roll service, e.g. a 3D20 to try to get a better roll
    // It will fail verification because 3 and 6 are built into the signature
    this.signature
      .verify(this.rngPublicKey, [Field(3), Field(6), ...this.ciphertext])
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

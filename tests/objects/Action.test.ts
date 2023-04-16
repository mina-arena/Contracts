import { isReady, PrivateKey, Field, Poseidon, Bool, shutdown } from 'snarkyjs';

import { Action } from '../../src/objects/Action';

await isReady;

describe('Action', () => {
  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('signs data correctly', async () => {
    const signer = PrivateKey.random();
    const nonce = Field(3);
    const actionType = Field(0);
    const actionParams = Poseidon.hash([Field(1), new Bool(true).toField()]);
    const pieceId = Poseidon.hash([Field(0)]);
    const action = new Action(nonce, actionType, actionParams, pieceId);

    expect(action.signatureArguments().toString()).toBe(
      [nonce, actionType, actionParams, pieceId].toString()
    );

    const signature = action.sign(signer);

    expect(
      signature
        .verify(signer.toPublicKey(), action.signatureArguments())
        .toBoolean()
    ).toBe(true);
  });
});

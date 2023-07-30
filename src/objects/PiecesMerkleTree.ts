import { Field, MerkleTree, MerkleWitness } from 'snarkyjs';

const TREE_HEIGHT = 6; // 2 ^ 5 = 32

export class PiecesMerkleWitness extends MerkleWitness(TREE_HEIGHT) {}

export class PiecesMerkleTree {
  tree = new MerkleTree(TREE_HEIGHT);
  obj: Record<string, string> = {};

  getWitness(n: bigint): PiecesMerkleWitness {
    return new PiecesMerkleWitness(this.tree.getWitness(n));
  }

  set(key: bigint, value: Field) {
    this.tree.setLeaf(key, value);
    this.obj[key.toString()] = value.toString();
  }

  clone(): PiecesMerkleTree {
    const newTree = new PiecesMerkleTree();
    newTree.tree = new MerkleTree(TREE_HEIGHT);
    Object.keys(this.obj).forEach((k) => {
      newTree.tree.setLeaf(BigInt(k), Field(this.obj[k]));
      newTree.obj[k] = this.obj[k];
    });
    return newTree;
  }
}

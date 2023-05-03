import { Field, MerkleTree, MerkleWitness } from 'snarkyjs';

const MAX_UNITS_PER_SQUAD = 8; // 16 total units
const TREE_HEIGHT = 5; // 2 ^ 4 = 16

export class PiecesMerkleWitness extends MerkleWitness(TREE_HEIGHT) {}

export class PiecesMerkleTree {
  tree = new MerkleTree(TREE_HEIGHT);
  obj: Record<string, string> = {};

  getWitness(n: bigint): PiecesMerkleWitness {
    return new PiecesMerkleWitness(this.tree.getWitness(n));
  }

  clone(): PiecesMerkleTree {
    const newTree = new PiecesMerkleTree();
    newTree.tree = new MerkleTree(TREE_HEIGHT);
    Object.keys(this.obj).forEach((k) => {
      newTree.tree.setLeaf(BigInt(k), Field(this.obj[k]));
    });
    return newTree;
  }
}

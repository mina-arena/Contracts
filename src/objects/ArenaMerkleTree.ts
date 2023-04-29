import { Field, MerkleTree, MerkleWitness } from 'snarkyjs';

// 800 x 800 = 640,000 < 1,048,576 = 2^20
const ARENA_HEIGHT = 800;
const ARENA_WIDTH = 800;
const TREE_HEIGHT = 21;

export class ArenaMerkleWitness extends MerkleWitness(TREE_HEIGHT) {}

export class ArenaMerkleTree {
  tree = new MerkleTree(TREE_HEIGHT);
  obj: Record<string, string> = {};

  get(i: number, j: number): Field {
    const key = this.calculateKey(i, j);
    return this.tree.getNode(0, key);
  }

  set(i: number, j: number, value: Field) {
    const key = this.calculateKey(i, j);
    this.tree.setLeaf(key, value);
    this.obj[key.toString()] = value.toString();
  }

  clone(): ArenaMerkleTree {
    const newTree = new ArenaMerkleTree();
    newTree.tree = new MerkleTree(TREE_HEIGHT);
    Object.keys(this.obj).forEach((k) => {
      newTree.tree.setLeaf(BigInt(k), Field(this.obj[k]));
    });
    return newTree;
  }

  getWitness(i: number, j: number): ArenaMerkleWitness {
    const key = this.calculateKey(i, j);
    return new ArenaMerkleWitness(this.tree.getWitness(key));
  }

  private calculateKey(i: number, j: number): bigint {
    if (i >= ARENA_HEIGHT) {
      throw 'Arena height out of bounds';
    }
    if (i >= ARENA_WIDTH) {
      throw 'Arena width out of bounds';
    }
    const rowIdx = j * ARENA_WIDTH;
    return BigInt(rowIdx + i);
  }
}

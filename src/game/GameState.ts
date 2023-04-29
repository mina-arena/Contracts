import { Field, Struct, MerkleMap, PublicKey, UInt32 } from 'snarkyjs';

import { Piece } from '../objects/Piece';
import { Position } from '../objects/Position';
import { Unit } from '../objects/Unit';

export class GameState extends Struct({
  piecesRoot: Field, // root hash of pieces in the arena keyed by their id
  arenaRoot: Field, // root hash of a merkle map of positions which are occupied
  playerTurn: Field,
  player1PublicKey: PublicKey,
  player2PublicKey: PublicKey,
  arenaLength: UInt32,
  arenaWidth: UInt32,
  turnsCompleted: UInt32,
}) {
  static empty(
    player1PublicKey: PublicKey,
    player2PublicKey: PublicKey
  ): GameState {
    const pieces = new MerkleMap();
    const arena = new MerkleMap();

    const pos1 = Position.fromXY(0, 0);
    const pos2 = Position.fromXY(0, 15);
    const pos3 = Position.fromXY(15, 0);
    const pos4 = Position.fromXY(15, 15);
    const piece1 = new Piece(Field(1), pos1, Unit.default());
    const piece2 = new Piece(Field(2), pos2, Unit.default());
    const piece3 = new Piece(Field(3), pos3, Unit.default());
    const piece4 = new Piece(Field(4), pos4, Unit.default());
    pieces.set(piece1.id, piece1.hash());
    pieces.set(piece2.id, piece2.hash());
    pieces.set(piece3.id, piece3.hash());
    pieces.set(piece4.id, piece4.hash());
    arena.set(pos1.hash(), Field(1));
    arena.set(pos2.hash(), Field(1));
    arena.set(pos3.hash(), Field(1));
    arena.set(pos4.hash(), Field(1));

    return new GameState({
      piecesRoot: pieces.getRoot(),
      arenaRoot: arena.getRoot(),
      playerTurn: Field(0),
      player1PublicKey,
      player2PublicKey,
      arenaLength: UInt32.from(800),
      arenaWidth: UInt32.from(800),
      turnsCompleted: UInt32.from(0),
    });
  }

  static emptyMerkleMaps(): { pieces: MerkleMap; arena: MerkleMap } {
    const pieces = new MerkleMap();
    const arena = new MerkleMap();

    const pos1 = Position.fromXY(0, 0);
    const pos2 = Position.fromXY(0, 15);
    const pos3 = Position.fromXY(15, 0);
    const pos4 = Position.fromXY(15, 15);
    const piece1 = new Piece(Field(1), pos1, Unit.default());
    const piece2 = new Piece(Field(2), pos2, Unit.default());
    const piece3 = new Piece(Field(3), pos3, Unit.default());
    const piece4 = new Piece(Field(4), pos4, Unit.default());
    pieces.set(piece1.id, piece1.hash());
    pieces.set(piece2.id, piece2.hash());
    pieces.set(piece3.id, piece3.hash());
    pieces.set(piece4.id, piece4.hash());
    arena.set(pos1.hash(), Field(1));
    arena.set(pos2.hash(), Field(1));
    arena.set(pos3.hash(), Field(1));
    arena.set(pos4.hash(), Field(1));

    return {
      pieces,
      arena,
    };
  }
}

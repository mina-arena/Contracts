import { Field, Struct, PublicKey, UInt32 } from 'snarkyjs';

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
}) {}

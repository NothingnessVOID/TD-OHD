import { v2PhaseA } from './penta-wa-v2-review.js';

// A remains the original immutable record, including its source head and zero additions.
export const v2PhaseB = Object.freeze({
  base: v2PhaseA.head,
  head: '20a7ba33952a078219c01524e4bfb8b6e1a2ba9b',
  paths: Object.freeze(['src/lib/wa/model.js', 'src/lib/wa/prepare.js',
    'src/lib/wa/repository.js', 'src/lib/wa/schema.json']),
  addedPaths: Object.freeze(['src/lib/wa/prepare.js']),
});
export const v2PhaseC = Object.freeze({
  base: v2PhaseB.head,
  head: '81ae135fad2bdd1b5b805d57e5c99b51a0b16bdf',
  // C explicitly includes post-B compatibility hardening of model and prepare.
  paths: Object.freeze(['src/lib/wa/analysis.js', 'src/lib/wa/model.js',
    'src/lib/wa/prepare.js', 'src/lib/wa/messages.js', 'src/styles/wa.css', 'src/views/wa.js']),
  addedPaths: Object.freeze([]),
});
export const finalPhases = Object.freeze({ A: v2PhaseA, B: v2PhaseB, C: v2PhaseC });
// This literal is activated only with parent-supplied final C approval, never from HEAD.
export const finalActivePhases = Object.freeze(['A', 'B', 'C']);

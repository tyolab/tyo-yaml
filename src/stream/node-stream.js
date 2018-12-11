/*

DIRECTIVE
  comment
  directive
  empty
  [other] -> NODE

NODE
  comment
  empty
  dir-end-marker
  doc-end-marker -> DIRECTIVE
  flow-map
  flow-seq
  block-map
  block-seq
  scalar
*/

import { Transform } from 'stream'

const Mode = {
  DIRECTIVE: 'DIRECTIVE',
  NODE: 'NODE'
}

const Type = {
  ALIAS: 'ALIAS',
  BLOCK_FOLDED: 'BLOCK_FOLDED',
  BLOCK_LITERAL: 'BLOCK_LITERAL',
  COMMENT: 'COMMENT',
  DIRECTIVE: 'DIRECTIVE',
  DOCUMENT: 'DOCUMENT',
  EMPTY_LINE: 'EMPTY_LINE',
  FLOW_MAP: 'FLOW_MAP',
  FLOW_SEQ: 'FLOW_SEQ',
  LINE_COMMENT: 'LINE_COMMENT',
  MAP: 'MAP',
  MAP_KEY: 'MAP_KEY',
  MAP_VALUE: 'MAP_VALUE',
  PLAIN: 'PLAIN',
  QUOTE_DOUBLE: 'QUOTE_DOUBLE',
  QUOTE_SINGLE: 'QUOTE_SINGLE',
  SEQ: 'SEQ',
  SEQ_ITEM: 'SEQ_ITEM'
}

function readCommentOrEmptyLine(line) {
  return !line.body
    ? { type: Type.EMPTY_LINE, line }
    : line.body[0] === '#'
    ? { type: Type.COMMENT, comment: line.body.slice(1), line }
    : null
}

export default class NodeStream extends Transform {
  constructor(options = {}) {
    super({ ...options, emitClose: true, objectMode: true })
    this.mode = Mode.DIRECTIVE
  }

  _flush(done) {}

  _transform(line, encoding, done) {
    switch (this.mode) {
      case Mode.DIRECTIVE: {
        const ce = readCommentOrEmptyLine(line)
        if (ce) return done(null, ce)
      }
    }
  }
}

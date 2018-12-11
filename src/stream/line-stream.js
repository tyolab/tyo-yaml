import { Transform } from 'stream'
import { StringDecoder } from 'string_decoder'
import { Buffer } from 'safe-buffer'

/**
 * Reads a line from the input data, building on prev results if available
 *
 * @param {string} data
 * @param {number} offset
 * @param {{ start: number, indent: number }} [prev]
 */
function readLine(data, offset, prev) {
  let ch, start, indent
  if (prev && typeof prev.start === 'number') {
    indent = prev.indent
    start = prev.start
  } else {
    start = offset
    ch = data[start]
    while (ch === ' ') ch = data[++start]
    indent = start - offset
    if (!ch) return { indent, offset }
    offset = start
  }
  ch = data[offset]
  while (ch && ch !== '\n') ch = data[++offset]
  if (!ch) return { indent, start, offset }
  return data[offset - 1] === '\r'
    ? {
        indent,
        body: data.slice(start, offset - 1),
        newline: '\r\n',
        _offset: offset + 1
      }
    : {
        indent,
        body: data.slice(start, offset),
        newline: '\n',
        _offset: offset + 1
      }
}

/**
 * @typedef {Object} Line
 * @property {number} start Index from beginning of stream
 * @property {number} indent Number of leading space characters
 * @property {string} body Line contents, trimmed of leading spaces & terminal newline
 * @property {string|undefined} newline '\n', '\r\n', or undefined for end-of-stream
 */

/**
 * Consumes string or buffer input, emits Line objects
 */
export default class LineStream extends Transform {
  constructor(options = {}) {
    super({
      ...options,
      decodeStrings: false,
      emitClose: true,
      objectMode: true
    })
    this._decoder = new StringDecoder(options.defaultEncoding || 'utf8')
    this.data = null
    this.next = null
    this.nextLineStart = 0
  }

  _flush(done) {
    if (!this.data) return done()
    const { indent } = this.next || readLine(this.data, 0)
    const body = this.data.slice(indent)
    done(null, { indent, body, start: this.nextLineStart })
  }

  _transform(chunk, encoding, done) {
    if (Buffer.isBuffer(chunk)) chunk = this._decoder.write(chunk)
    else if (typeof chunk !== 'string')
      return done(new Error('Only string and Buffer input is accepted'))
    if (this.data) chunk = this.data + chunk
    let offset = (this.next && this.next.offset) || 0
    let pushed = false
    while (offset < chunk.length) {
      const line = readLine(chunk, offset, this.next)
      if (!line.newline) {
        this.next = line
        break
      }
      line.start = this.nextLineStart
      this.nextLineStart += line._offset - offset
      offset = line._offset
      delete line._offset
      if (this.next) this.next = null
      this.push(line)
      pushed = true
    }
    if (offset < chunk.length) {
      if (pushed) {
        this.data = chunk.slice(offset)
        this.next.offset -= offset
        if (typeof this.next.start === 'number') this.next.start -= offset
      } else {
        this.data = chunk
      }
    } else {
      this.data = null
      this.next = null
    }
    done()
  }
}

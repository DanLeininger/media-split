'use strict'

const MediaSplit = require('../lib/es6/MediaSplit.js')
const expect = require('chai').expect
const path = require('path')
const fs = require('fs')
const duration = require('mp3-duration')

const outputPath = path.join(process.cwd(), 'spec', 'output')
const dataPath = path.join(process.cwd(), 'spec', 'data')

describe('MediaSplit', function () {
  let split

  describe('_isUrl', function () {
    afterEach(() => {
      split = null
    })
    beforeEach(() => {
      split = new MediaSplit()
    })

    it('should match url', () => {
      expect(split._isUrl('http://www.youtube.com/watch?v=-wtIMTCHWuI')).to.true
      expect(split._isUrl('https://www.youtube.com.br/v/-wtIMTCHWuI?version=3&autohide=1')).to.be.true
      expect(split._isUrl('http://www.youtu.be/-wtIMTCHWuI')).to.be.true
      expect(split._isUrl('http://youtu.be/-wtIMTCHWuI')).to.be.true
      expect(split._isUrl('youtube.com/watch?v=-wtIMTCHWuI')).to.be.true
      expect(split._isUrl('youtube.com.br/watch?v=-wtIMTCHWuI')).to.be.true
    })

    it('should not match url', () => {
      expect(split._isUrl('foo')).to.be.false
      expect(split._isUrl('foo.a')).to.be.false
    })
  })

  describe('_parseMedia', function () {
    afterEach(() => {
      split = null
    })

    it('should parse sections correctly', () => {
      split = new MediaSplit({
        format: 'm4a',
        sections: [
          '[00:00] foo',
          '[01:30] bar',
          '[03:28.222] Test _ file',
          '[05:52.1 - 07:24] Qux - abc',
          '[07:50] -[Song - tag][name]'
        ]
      })

      const parsed = split._parseMedia()
      expect(parsed).to.length(5)

      expect(parsed[ 0 ].trackName).to.be.equals('foo')
      expect(parsed[ 0 ].name).to.be.equals('foo.m4a')
      expect(parsed[ 0 ].start).to.be.equals('00:00')
      expect(parsed[ 0 ].end).to.be.equals('01:30')

      expect(parsed[ 1 ].trackName).to.be.equals('bar')
      expect(parsed[ 1 ].name).to.be.equals('bar.m4a')
      expect(parsed[ 1 ].start).to.be.equals('01:30')
      expect(parsed[ 1 ].end).to.be.equals('03:28.222')

      expect(parsed[ 2 ].trackName).to.be.equals('Test _ file')
      expect(parsed[ 2 ].name).to.be.equals('Test _ file.m4a')
      expect(parsed[ 2 ].start).to.be.equals('03:28.222')
      expect(parsed[ 2 ].end).to.be.equals('05:52.1')

      expect(parsed[ 3 ].trackName).to.be.equals('Qux - abc')
      expect(parsed[ 3 ].name).to.be.equals('Qux - abc.m4a')
      expect(parsed[ 3 ].start).to.be.equals('05:52.1')
      expect(parsed[ 3 ].end).to.be.equals('07:24')

      expect(parsed[ 4 ].trackName).to.be.equals('-[Song - tag][name]')
      expect(parsed[ 4 ].name).to.be.equals('-[Song - tag][name].m4a')
      expect(parsed[ 4 ].start).to.be.equals('07:50')
      expect(parsed[ 4 ].end).to.be.equals(null)
    })

    it('should throw on invalid start', () => {
      split = new MediaSplit({
        sections: [ '[00:AB.!] FOO' ]
      })
      expect(() => split._parseMedia()).to.throw('Line 1 does not contain a valid time range')
    })

    it('should throw on invalid end', () => {
      split = new MediaSplit({
        sections: [
          '[00:00] FOO',
          '[AB:CC] BAR'
        ]
      })
      expect(() => split._parseMedia()).to.throw('Line 2 does not contain a valid time range')
    })
  })

  describe('parse', function () {
    this.timeout(30000)

    beforeEach(() => {
      fs.readdirSync(outputPath).forEach((file) => {
        if (path.extname(file) === '.mp3') {
          fs.unlinkSync(path.join(outputPath, file))
        }
      })
    })

    afterEach(() => {
      split = null
    })

    it('should parse a local file', function () {
      let counter = 0

      split = new MediaSplit({
        format: 'mp3',
        output: outputPath,
        input: path.join(dataPath, 'video.mp4'),
        sections: [
          '[00:00] First',
          '[00:02.500 - 00:07] Second',
          '[00:10 - 00:11.400] Third'
        ]
      })

      split.on('afterSplit', () => {
        counter++
      })

      return split.parse().then(() => {
        expect(counter).to.be.equals(3)
        const values = [
          duration(path.join(outputPath, 'First.mp3')),
          duration(path.join(outputPath, 'Second.mp3')),
          duration(path.join(outputPath, 'Third.mp3'))
        ]
        return Promise.all(values)
      }).then(([ first, second, third ]) => {
        expect(first.toString().slice(0, 3)).to.be.equals('2.5')
        expect(second.toString().slice(0, 3)).to.be.equals('4.5')
        expect(third.toString().slice(0, 3)).to.be.equals('1.4')
      })
    })
  })
})

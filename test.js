/* global describe:false it:false before:false */
const assert = require('chai').assert
const btc = require('./index.js')

describe('btc', function () {
  it('generate', async function () {
    this.randkey = await btc.generate()
    assert.exists(this.randkey)
    assert.exists(this.randkey.publicAddress)
    assert.exists(this.randkey.privateWif)
    assert.notEqual((await btc.listKeys()).indexOf(this.randkey.publicAddress), -1)
  })
})

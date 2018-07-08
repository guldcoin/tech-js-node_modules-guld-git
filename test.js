/* eslint-env node, mocha */
const assert = require('chai').assert
const { init, status, add, remove, commit, log } = require('./index.js')
const { getFS } = require('guld-fs')
var fs

describe('guld-git', function () {
  before(async () => {
    fs = fs || await getFS()
    await fs.mkdirp('testrepo')
  })
  after(async () => {
    await fs.rimraf('testrepo')
  })
  it('init', async function () {
    var stat = await init('testrepo')
    assert.isTrue((await fs.stat('testrepo/.git')).isDirectory())
  })
  it('status empty', async function () {
    var stat = await status(undefined, 'testrepo')
    assert.equal(stat, undefined)
  })
  it('untracked new file status', async function () {
    await fs.writeFile('testrepo/file', '')
    var stat = await status(undefined, 'testrepo')
    assert.equal(stat[0], '?? file')
  })
  it('add', async function () {
    await add('file', 'testrepo')
    var stat = await status(undefined, 'testrepo')
    assert.equal(stat[0], 'A  file')
  })
  it('remove', async function () {
    await remove('file', 'testrepo')
    var stat = await status(undefined, 'testrepo')
    assert.equal(stat, undefined)
  })
  it('add all', async function () {
    await fs.writeFile('testrepo/file', '')
    await fs.writeFile('testrepo/file1', '')
    await add(undefined, 'testrepo')
    var stat = await status(undefined, 'testrepo')
    assert.equal(stat[0], 'A  file')
    assert.equal(stat[1], 'A  file1')
  })
  it('commit', async function () {
    await commit('testrepo', message='test message')
    var stat = await status(undefined, 'testrepo')
    assert.equal(stat, undefined)
  }).timeout(5000)
  it('log', async function () {
    var l = await log('testrepo')
    assert.equal(l.length, 1)
    assert.isTrue(l[0].endsWith(' test message'))
  })
  it('modify', async function () {
    await fs.writeFile('testrepo/file', 'a')
    var stat = await status(undefined, 'testrepo')
    assert.equal(stat[0], ' M file')
  })
  it('add modified', async function () {
    await add('file', 'testrepo')
    var stat = await status(undefined, 'testrepo')
    assert.equal(stat[0], 'M  file')
  })
})

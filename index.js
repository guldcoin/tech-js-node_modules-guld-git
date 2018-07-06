const isogit = require('isomorphic-git')
const spawn = require('guld-spawn')
const { getJS } = require('guld-env')
const { getFS } = require('guld-fs')
const { getPass } = require('guld-pass')
const home = require('user-home')
const path = require('path')
var fs

async function init () {
  await this.clonep(`ledger/prices`, `https://github.com/guldcoin/ledger-prices.git`).catch(e => console.error)
  await this.clonep(`keys/pgp`, `https://github.com/guldcoin/keys-pgp.git`).catch(e => console.error)
  await this.clonep(`ledger/GULD`, `https://github.com/guldcoin/ledger-guld.git`).catch(e => console.error)
}

async function isInitialized () {
  fs = fs || await getFS()
  var ps = await Promise.all([
    [`keys/pgp`, `keys-pgp`],
    [`ledger/GULD`, `ledger-GULD`],
    [`ledger/prices`, `token-prices`]
  ].map(d => {
    return this.isBehind(path.join(home, user, d[0]), `https://github.com/guldcoin/${d[1]}.git`)
  }))
  for (var p; p < ps.length; p++) {
    if (ps[p]) return false
  }
  return true
}

async function isBehind (p, url) {
  var exists = await fs.readdir(p).catch(e => false)
  if (exists === false) return exists
  var commit = await log({
    fs: fs || await getFS(),
    dir: p,
    gitdir: `${p}/.git`,
    depth: 1
  }).catch(e => false)
  if (!commit) return false
  var info = {'url': url}
  if (this.observer.hosts && this.observer.hosts.github && this.observer.hosts.github.auth) info = {'url': url, ...auth}
  var resp = true
  var resp = await getRemoteInfo(info).catch(e => resp = false)
  if (!resp) return false
  return commit[0].oid !== resp.refs.heads['master']
}

async function commit (partial, message, time) {
  var base = partial
  if (!partial.startsWith(home)) base = path.join(home, partial)
  if ((await getJS()).startsWith('node')) {
    return spawn('git', undefined, ['-C', path.join(home, partial), 'commit', '-m', message])
  } else {
    return isogit.commit({
      fs: fs || await getFS(),
      dir: path.join(home, partial),
      gitdir: path.join(home, partial, '.git'),
      message: `guld app transaction`,
      author: {
        name: observer['fullname'],
        email: observer['mail'],
        date: new Date(time * 1000),
        timestamp: time
      }
    })
  }
}

async function pull (partial, remote = 'origin', ref = 'master') {
  var base = partial
  if (!partial.startsWith(home)) base = path.join(home, partial)
  if ((await getJS()).startsWith('node')) {
    return spawn('git', undefined, ['-C', path.join(home, partial), 'pull', remote, ref])
  } else {
    var creds = await getPass(`${user}/git/github`)
    return isogit.pull({
      fs: fs || await getFS(),
      dir: path.join(home, partial),
      gitdir: path.join(home, partial, '.git'),
      ref: ref,
      authUsername: creds.login,
      authPassword: creds.password
    })
  }
}

async function push (partial, remote = 'origin', ref = 'master') {
  var base = partial
  if (!partial.startsWith(home)) base = path.join(home, partial)
  fs = fs || await getFS()
  if ((await getJS()).startsWith('node')) {
    spawn('git', undefined, ['-C', path.join(home, partial), 'push', remote, ref])
  } else {
    var creds = await getPass(`${user}/git/github`)
    return isogit.push({
      fs: fs || await getFS(),
      dir: path.join(home, partial),
      gitdir: path.join(home, partial, '.git'),
      remote: remote,
      ref: ref,
      authUsername: creds.login,
      authPassword: creds.password
    })
  }
}

async function add (partial, filepath) {
  var base = partial
  if (!partial.startsWith(home)) base = path.join(home, partial)
  if ((await getJS()).startsWith('node')) {
    spawn('git', undefined, ['-C', path.join(home, partial), 'add', filepath || '-A'])
  } else {
    return isogit.add({
      fs: fs || await getFS(),
      dir: base,
      gitdir: path.join(base, '.git'),
      filepath: filepath
    })
  }
}

async function clone (partial, url) {
  var base = partial
  if (!partial.startsWith(home)) base = path.join(home, partial)
  if ((await getJS()).startsWith('node')) {
    spawn('git', undefined, ['-C', base, 'add', filepath])
  } else {
    var creds = await getPass(`${user}/git/github`)
    return isogit.clone({
      fs: fs || await getFS(),
      dir: base,
      gitdir: path.join(base, '.git'),
      url: url,
      singleBranch: true,
      depth: 1,
      authUsername: creds.login,
      authPassword: creds.password
    })
  }
}

async function clonep (partial, url, ref = 'master') {
  /*
   * Clone or pull if already exists.
   */
  var p = partial
  if (!partial.startsWith(home)) p = path.join(home, partial)
  var stats
  try {
    stats = await fs.stat(p)
  } catch (e) {
    return clone(partial, url)
  }
  if (stats && !stats.isDirectory()) throw new DBError(`${p} already exists`, 'EEXIST')
  var commit = await git.log({
    fs: fs,
    dir: p,
    gitdir: `${p}/.git`,
    depth: 1
  })
  var info = await getRemoteInfo({'url': url})
  if (commit[0].oid !== info.refs.heads[ref]) {
    return pull(partial)
  }
}

module.exports = {
  // push: push,
  // clone: clone,
  // pull: pull,
  // commit: commit,
  add: add
}


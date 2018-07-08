const isogit = require('isomorphic-git')
const spawn = require('guld-spawn')
const { getJS } = require('guld-env')
const { getFS } = require('guld-fs')
const { getName } = require('guld-user')
const { getAddress } = require('guld-mail')
const { getPass } = require('guld-pass')
const home = require('user-home')
const path = require('path')
const ISOGITSHORT = {
  'added': 'A ',
  '*added': '??',
  'modified': 'M ',
  '*modified': ' M',
  'deleted': 'D ',
  '*deleted': ' D',
  'unmodified': null,
  '*unmodified': null,
  'ignored': null,
  'absent': null,
  '*absent': null
}
var fs
var pfs


/*
  await this.clonep(`ledger/prices`, `https://github.com/guldcoin/ledger-prices.git`).catch(e => console.error)
  await this.clonep(`keys/pgp`, `https://github.com/guldcoin/keys-pgp.git`).catch(e => console.error)
  await this.clonep(`ledger/GULD`, `https://github.com/guldcoin/ledger-guld.git`).catch(e => console.error)
*/

async function isInitialized () {
  fs = fs || await getFS(false)
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
  fs = fs || await getFS(false)
  pfs = pfs || await getFS()
  var exists = await pfs.readdir(p).catch(e => false)
  if (exists === false) return exists
  var commit = await log({
    fs: fs || await getFS(false),
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

async function init (cwd) {
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  if ((await getJS()).startsWith('node')) {
    await spawn('git', undefined, ['-C', cwd, 'init'])    
  } else {
    await isogit.init({
      fs: fs || await getFS(false),
      dir: cwd
    })
  }
}

async function log (cwd, ref='HEAD', depth=1) {
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  if ((await getJS()).startsWith('node')) {
    return (await spawn('git', undefined, ['-C', cwd, 'log', '-n', depth, '--pretty=oneline', ref])).trim().split('\n') 
  } else {
    return await isogit.log({
      fs: fs || await getFS(false),
      dir: cwd,
      ref: ref,
      depth: depth
    })
  }
}

async function status (filepath, cwd='.', short=true) {
  fs = fs || await getFS(false)
  if ((await getJS()).startsWith('node')) {
    var options = ['-C', cwd, 'status']
    if (short) options.push('-s')
    if (filepath) options.push(filepath)
    var result = await spawn('git', undefined, options)
    if (result !== '') return result.slice(0, -1).split('\n')
  } else {
    if (filepath) {
      var filestat = await isogit.status({
        fs: fs,
        dir: cwd,
        gitdir: path.join(cwd, '.git'),
        filepath: filepath
      })
      if (short) {
        filestat = statusIsogitToShort(filestat, filepath)
      }
      return filestat
    } else {
      return listFileStatuses(cwd, short)
    }
  }
}

async function listFileStatuses (cwd='.', short=true) {
  var fs = fs || await getFS(false)
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  var files = await isogit.listFiles({
    fs: fs,
    dir: cwd,
    gitdir: path.join(cwd, '.git')
  })
  var filestats = []
  await Promise.all(files.map(async (f) => {
    filestats.push(await isogit.status({
      fs: fs,
      dir: cwd,
      gitdir: path.join(cwd, '.git'),
      filepath: f
    }))
    if (short) filestats[-1] = statusIsogitToShort(filestats[-1], f)
  }))
  return filestats
}

function statusIsogitToShort (stat, filepath) {
  var short = ISOGITSHORT[stat]
  if (short) return `${short} ${filepath}`
}

async function add (filepath, cwd='.') {
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  if ((await getJS()).startsWith('node')) {
    spawn('git', undefined, ['-C', cwd, 'add', filepath || '-A'])
  } else {
    if (filepath) {
      return isogit.add({
        fs: fs || await getFS(false),
        dir: cwd,
        gitdir: path.join(cwd, '.git'),
        filepath: filepath
      })
    } else {
      var filestats = await listFileStatuses()
      for (var f in filestats) {
        if (/^[ ?]{1}[MD?]{1}"]/.match(filestats[f])) {
           await isogit.add({
            fs: fs || await getFS(false),
            dir: cwd,
            gitdir: path.join(cwd, '.git'),
            filepath: f
          })
        }
      }
    }
  }
}

async function remove (filepath, cwd='.', cached=false) {
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  if ((await getJS()).startsWith('node')) {
    var options = ['-C', cwd, 'rm', filepath]
    if (cached) options.push('--cached')
    else options.push('-f')
    spawn('git', undefined, options)
  } else {
    if (filepath) {
      return isogit.remove({
        fs: fs || await getFS(false),
        dir: cwd,
        gitdir: path.join(cwd, '.git'),
        filepath: filepath
      })
    } else throw new Error('Filepath required for remove.')
  }
}

async function commit (cwd, message='guld', user=null, time=null) {
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  user = user || await getName()
  if ((await getJS()).startsWith('node')) {
    return spawn('git', undefined, ['-C', cwd, 'commit', '-m', message])
  } else {
    time = time || Date.now() / 1000
    return isogit.commit({
      fs: fs || await getFS(false),
      dir: cwd,
      gitdir: path.join(cwd, '.git'),
      message: message,
      author: {
        name: user,
        email: await getAddress(user),
        date: new Date(time * 1000),
        timestamp: time
      }
    })
  }
}

async function fetch (cwd, remote, ref) {
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  if ((await getJS()).startsWith('node')) {
    return spawn('git', undefined, ['-C', cwd, 'fetch', remote, ref])
  } else {
    var creds = await getPass(`${user}/git/github`)
    return isogit.fetch({
      fs: fs || await getFS(false),
      dir: cwd,
      gitdir: path.join(cwd, '.git'),
      ref: ref,
      authUsername: creds.login,
      authPassword: creds.password
    })
  }
}

async function pull (cwd, remote, ref) {
  remote = remote || await getName()
  ref = ref || await getName()
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  if ((await getJS()).startsWith('node')) {
    return spawn('git', undefined, ['-C', cwd, 'pull', remote, ref])
  } else {
    var creds = await getPass(`${user}/git/github`)
    return isogit.pull({
      fs: fs || await getFS(false),
      dir: cwd,
      gitdir: path.join(cwd, '.git'),
      ref: ref,
      authUsername: creds.login,
      authPassword: creds.password
    })
  }
}

async function push (cwd, remote, ref) {
  remote = remote || await getName()
  ref = ref || await getName()
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  fs = fs || await getFS(false)
  if ((await getJS()).startsWith('node')) {
    spawn('git', undefined, ['-C', path.join(home, partial), 'push', remote, ref])
  } else {
    var creds = await getPass(`${user}/git/github`)
    return isogit.push({
      fs: fs || await getFS(false),
      dir: cwd,
      gitdir: path.join(cwd, '.git'),
      remote: remote,
      ref: ref,
      authUsername: creds.login,
      authPassword: creds.password
    })
  }
}

async function clone (cwd, filepath, url) {
  if (!cwd.startsWith(home)) cwd = path.resolve(cwd)
  if ((await getJS()).startsWith('node')) {
    spawn('git', undefined, ['-C', cwd, 'clone', filepath])
  } else {
    var creds = await getPass(`${user}/git/github`)
    return isogit.clone({
      fs: fs || await getFS(false),
      dir: cwd,
      gitdir: path.join(cwd, '.git'),
      url: url,
      singleBranch: true,
      depth: 1,
      authUsername: creds.login,
      authPassword: creds.password
    })
  }
}

async function clonep (partial, url, ref) {
  /*
   * Clone or pull if already exists.
   */
  pfs = pfs || await getFS()
  var p = partial
  if (!partial.startsWith(home)) p = path.join(home, partial)
  var stats
  try {
    stats = await pfs.stat(p)
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
  init: init,
  status: status,
  log: log,
  add: add,
  remove: remove,
  commit: commit,
  clone: clone,
  fetch: fetch,
  push: push,
  pull: pull
}


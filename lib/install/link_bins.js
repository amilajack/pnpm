var join = require('path').join
var relSymlink = require('../fs/rel_symlink')
var fs = require('mz/fs')
var mkdirp = require('../fs/mkdirp')
var debug = require('debug')('pnpm:link_bins')
var requireJson = require('../fs/require_json')

/*
 * Links executables into `node_modules/.bin`.
 *
 * - `modules` (String) - the node_modlules path
 * - `target` (String) - where the module is now; read package.json from here
 * - `fullname` (String) - fullname of the module (`rimraf@2.5.1`)
 *
 *     module = 'project/node_modules'
 *     target = 'project/node_modules/.tmp/a1b3c56...'
 *     finalTarget = 'project/node_modules/.store/rimraf@2.5.1'
 *     linkBins(module, target, finalTarget)
 *
 *     // node_modules/.bin/rimraf -> ../.store/rimraf@2.5.1/cmd.js
 */

module.exports = function linkBins (modules, target, finalTarget) {
  var pkg = tryRequire(join(target, 'package.json'))
  if (!pkg || !pkg.bin) return

  var bins = binify(pkg)

  return Object.keys(bins).map(bin => {
    var actualBin = bins[bin]

    return Promise.resolve()
      .then(_ => fs.chmod(join(target, actualBin), 0o755))
      .then(_ => mkdirp(join(modules, '.bin')))
      .then(_ => debug('linking %s -> %s',
        join(finalTarget, actualBin),
        join(modules, '.bin', bin)))
      .then(_ => relSymlink(
        join(finalTarget, actualBin),
        join(modules, '.bin', bin)))
  })
}

/*
 * Like `require()`, but returns `undefined` when it fails
 */

function tryRequire (path) {
  try { return requireJson(path) } catch (e) { }
}

/*
 * Returns bins for a package in a standard object format. This normalizes
 * between npm's string and object formats.
 *
 *    binify({ name: 'rimraf', bin: 'cmd.js' })
 *    => { rimraf: 'cmd.js' }
 *
 *    binify({ name: 'rmrf', bin: { rmrf: 'cmd.js' } })
 *    => { rmrf: 'cmd.js' }
 */

function binify (pkg) {
  if (typeof pkg.bin === 'string') {
    var obj = {}
    obj[pkg.name] = pkg.bin
    return obj
  }

  return pkg.bin
}

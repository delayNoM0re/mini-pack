const path = require('path')
const pack = require('../src/index')

const log = console.log.bind(console)

const __main = () => {
    // 获取 index.js 的绝对路径
    let entry = require.resolve('./src/index')
    // log('entry', entry)
    // log('path', path.resolve(__dirname, './dist'))
    let output = require.resolve('./dist/gua_bundle')
    // log('output', output)
    pack(entry, output)
}

if (require.main === module) {
    __main()
}

const fs = require('fs')
const path = require('path')
const espree = require('espree')
const acorn = require('acorn')
const codeGeneration = require('./code-generation')
const {
    log,
} = require('./utils')

const isFunction = o => Object.prototype.toString.call(o) === '[object Function]'

// 每个依赖单独的 id
const gidGenerator = (() => {
    let id = 0
    let f = () => {
        id++
        return id
    }
    return f
})()

const resolvePath = (base, relativePath) => {
    let absolute = path.resolve(base, relativePath)
    // log('absolute', absolute)
    // let p = require.resolve(absolute)
    return absolute
}

const codeFromAst = (ast) => {
    let code = codeGeneration(ast)
    return code
}

// 把代码转成 ast
const astForCode = (code) => {
    let ast = espree.parse(code, {
        ecmaVersion: 6,
        sourceType: 'module',
    })
    // let ast = acorn.parse(code, {
    //     ecmaVersion: 'latest',
    //     sourceType: 'module',
    // })
    return ast
}

const moduleTemplate = (graph, mapping) => {
    let g = graph
    let m = JSON.stringify(mapping)
    let s = `
${g.id}: [
    function(require, module, exports) {
        ${g.code}
    },
    ${m}
],
    `
    return s
}

// 拿到依赖图之后, 还需要处理成模块的形式才能直接运行
// 这里是直接使用 iife 的方式来解决模块问题
const moduleFromGraph = (graph) => {
    let modules = ''
    Object.values(graph).forEach(g => {
        let ds = g.dependencies

        let o = {}
        // [[k1, v1], [k2, v2], [k3, v3]]
        Object.entries(ds).forEach(([k, v]) => {
            o[k] = graph[v].id
        })

        // module 几乎是一样的, 用一个模板函数来生成
        modules += moduleTemplate(g, o)
    })
    return modules
}

// 最后生成的 bundle 文件
const bundleTemplate = (module) => {
    let s = `(function(modules) {
    const require = (id) => {
        let [fn, mapping] = modules[id]

        const localRequire = (name) => {
            return require(mapping[name])
        }

        const localModule = {
            exports: {

            }
        }

        fn(localRequire, localModule, localModule.exports)

        return localModule.exports
    }

    require(1)
})({${module}})`
    return s
}

const saveBundle = (bundle, file) => {
    fs.writeFileSync(file, bundle)
}

// 遍历 ast
const traverse = (ast, visitor) => {
    let nodes = ast.body
    for (let i = 0; i < nodes.length; i++) {
        let n = nodes[i]
        let type = n.type
        let func = visitor[type]
        if (isFunction(func)) {
            func(n)
        }
    }
}

// entry 作为起点, 先收集相关依赖
const collectedDeps = (entry) => {
    let s = fs.readFileSync(entry, 'utf8')
    let ast = astForCode(s)
    // log('ast', ast)

    let l = []

    traverse(ast, {
        // ImportDeclaration 是指遇到 import a from b 类型语句的时候
        // 进入这个函数
        ImportDeclaration(node) {
            // 这个时候的 module 就是 from 后面的值, 是一个相对路径
            let module = node.source.value
            l.push(module)
        },
    })
    // log('l', l)

    let o = {}
    l.forEach(e => {
        // 一个模块里面可以 import 其他模块, 子模块里面也可以引入更多模块
        // 所以需要遍历处理每一个 from 后面的模块
        // 而这些模块本身是一个相对路径, 不能读出代码, 所以要先处理成绝对路径

        // 先根据 entry 拿到 entry 所做的目录
        // 拿到目录之后根据相对路径可以计算出绝对路径
        let directory = path.dirname(entry)
        // log('directory', directory)
        // log('e', e)
        let p = resolvePath(directory, e)

        // 本来直接返回 p 表示的绝对路径就可以
        // 但是因为转码之后的代码还需要相对路径
        // 所以要把相对路径和绝对路径都返回, 返回字典很方便
        o[e] = p
    })
    // log('o', o)
    return o
}

const parsedEntry = (entry) => {
    let o = {}
    // 用 id 来标记每一个模块, 用 gidGenerator 来生成全局变量 id
    let id = gidGenerator()
    let ds = collectedDeps(entry)
    // 这里的代码需要多次用到, 其实应该封装成函数
    let s = fs.readFileSync(entry, 'utf8')
    let ast = astForCode(s)

    // 因为浏览器并不能直接处理 es6 的代码(现在的这种处理方式我们并不满意)
    // 所以转成 es5 代码
    let es5Code = codeFromAst(ast, s)

    o[entry] = {
        id: id,
        dependencies: ds,
        code: es5Code,
        content: s,
    }

    Object.values(ds).forEach(d => {
        // 依赖是一个树状图的关系, 遍历收集并且解析依赖
        let r = parsedEntry(d)
        // 把返回值与初始值合并
        Object.assign(o, r)
    })

    return o
}

const bundle = (entry, output) => {
    // 获取依赖图
    let graph = parsedEntry(entry)
    // 获取 iife 的参数
    let module = moduleFromGraph(graph)
    // 生成 bundle.js 的字符串代码
    let bundle = bundleTemplate(module)
    // log('bundle', bundle)
    saveBundle(bundle, output)
}

module.exports = bundle

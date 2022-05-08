const {
    log,
} = require('./utils')

const codeGeneration = (node) => {
    // log('n', node)
    if (node.type === 'Program') {
        let body = node.body
        let c = body.map(b => codeGeneration(b)).join('\n')
        // log('c', c)
        return c
    } else if (node.type === 'VariableDeclaration') {
        // 赋值类型
        let kind = node.kind
        // 变量名
        let declarations = codeGeneration(node.declarations[0])
        let c = `${kind} ${declarations}`
        return c
    } else if (node.type === 'VariableDeclarator') {
        // 变量名
        let id = codeGeneration(node.id)
        let c = id
        // 初始值
        // let init = codeGeneration(node.init)
        if (node.init) {
            let init = codeGeneration(node.init)
            c += ` = ${init}`
        }
        // let c = `${id} = ${init}`
        return c
    } else if (node.type === 'Identifier') {
        return node.name
    } else if (node.type === 'Literal') {
        return node.raw
    } else if (node.type === 'ImportDeclaration') {
        let specifiers = node.specifiers.map(s => codeGeneration(s))
        let source = codeGeneration(node.source)
        // let c = `import ${specifiers} from ${source}`
        // return c
        // 引入多个变量
        if (specifiers.length > 1) {
            let c = `let {${specifiers.join(',')}} = require(${source})`
            return c
        } else {
            let c = `let ${specifiers} = require(${source}).default`
            return c
        }
    } else if (node.type === 'ImportDefaultSpecifier') {
        let local = codeGeneration(node.local)
        return local
    } else if (node.type === 'ImportSpecifier') {
        let local = codeGeneration(node.local)
        return local
    } else if (node.type === 'ArrowFunctionExpression') {
        let params = node.params.map(p => codeGeneration(p)).join(',')
        let body = codeGeneration(node.body)
        
        if (node.body.type === 'BlockStatement') {
            let c = `(${params}) => { ${body} }`
            return c
        } else if (node.body.type === 'CallExpression') {
            let c = `(${params}) => ${body}`
            return c
        }
    } else if (node.type === 'BlockStatement') {
        let body = node.body.map(b => codeGeneration(b)).join('\n')
        return body
    } else if (node.type === 'CallExpression') {
        let callee = codeGeneration(node.callee)
        let arguments = node.arguments.map(a => codeGeneration(a)).join(',')
        let c = `${callee}(${arguments})`
        return c
    } else if (node.type === 'ExpressionStatement') {
        let expression = codeGeneration(node.expression)
        return expression
    } else if (node.type === 'MemberExpression') {
        let object = codeGeneration(node.object)
        let property = codeGeneration(node.property)
        let c = `${object}.${property}`
        return c
    } else if (node.type === 'ExportDefaultDeclaration') {
        let declaration = codeGeneration(node.declaration)
        // let c = `export default ${declaration}`
        let c = `exports['default'] = ${declaration}`
        return c
    } else if (node.type === 'ExportNamedDeclaration') {
        let specifiers = node.specifiers.map(s => codeGeneration(s))

        // let c = `export { ${specifiers} }`
        // let c = `exports = { ${specifiers} }`
        let c = []
        for (let i = 0; i < specifiers.length; i++) {
            let param = specifiers[i]
            c.push(`exports.${param} = ${param}`)
        }
        c = c.join('\n')
        return c
    } else if (node.type === 'ExportSpecifier') {
        let exported = codeGeneration(node.exported)
        return exported
    } else if (node.type === 'ReturnStatement') {
        let argument = codeGeneration(node.argument)
        let c = `return ${argument}`
        return c
    } else if (node.type === 'BinaryExpression') {
        let left = codeGeneration(node.left)
        let right = codeGeneration(node.right)
        let operator = node.operator
        let c = `${left}${operator}${right}`
        return c
    } else {
        console.log('错误 node', node)
        throw Error
    }
}

module.exports = codeGeneration

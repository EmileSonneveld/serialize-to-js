let acorn = require("acorn");
const utils = require("../src/internal/utils");
const world = utils.world
world.acorn = acorn


// derived from https://blog.bitsrc.io/build-a-js-interpreter-in-javascript-using-acorn-as-a-parser-5487bb53390c
function CustomEval(str) {
  const globalScope = new Map()
  // TODO: Use this whitelist:
  // https://chromium.googlesource.com/v8/v8.git/+/ba5bac8cebe91c585024c67687ced8fe1baed833/src/debug/debug-evaluate.cc#267
  const whiteListFunctions = new Set([console.log, console.time, console.timeEnd, Array, Date, Uint8Array, Set, Map])

  const programNode = acorn.parse(str, {
    ecmaVersion: 2020
  })

  function visitVariableDeclaration(node) {
    const nodeKind = node.kind
    return visitNodes(node.declarations)
  }

  function visitVariableDeclarator(node) {
    console.assert(node.id.type === "Identifier")
    // TODO: var, const, let
    const name = node.id.name
    const value = visitNode(node.init)
    globalScope.set(name, value)
    return value
  }

  function visitAssignmentExpression(node) {
    const value = visitNode(node.right)
    if (node.left.type === "Identifier"){
      const name = node.left.name
      // TODO: var, const, let
      if (!globalScope.has(name))
        throw new Error("Varibable '" + name + "' not found to assign to.");
      globalScope.set(name, value)
    } else if(node.left.type === "MemberExpression"){
      const obj = visitNode(node.left.object)
      const name = node.left.property.name

      const descs = Object.getOwnPropertyDescriptors(obj)
      if (descs[name] && descs[name].set != null) // Make exception for window.window?
        throw Error("Setters not implemnted yet")
      // TODO: don't allow this everywhere
      obj[name] = value
    } else {
        throw Error("left node unexpected type: "+node.left.type)
    }
    return value
  }

  function visitNewExpression(node) {
    const callee = visitNode(node.callee)
    const _arguments = evalArgs(node.arguments)
    if (whiteListFunctions.has(callee))
      return new callee(..._arguments)
    throw Error("TODO: Allow self defined functions")
  }


  function visitIdentifier(node) {
    const name = node.name
    if (globalScope.get(name))
      return globalScope.get(name)
    const descs = Object.getOwnPropertyDescriptors(world)
    if (descs[name].get == null) // Make exception for window.window?
      return world[name]
    throw new ReferenceError(name + "is not defined")
  }

  function visitLiteral(node) {
    return node.value
  }

  function visitBinaryExpression(node) {
    const leftNode = visitNode(node.left)
    const operator = node.operator
    const rightNode = visitNode(node.right)
    switch (operator) {
      case "+":
        return leftNode + rightNode
      case "-":
        return leftNode - rightNode
      case "/":
        return leftNode / rightNode
      case "*":
        return leftNode * rightNode
    }
  }

  function evalArgs(nodeArgs) {
    let g = []
    for (const nodeArg of nodeArgs) {
      g.push(visitNode(nodeArg))
    }
    return g
  }

  function visitCallExpression(node) {
    const callee = visitNode(node.callee)
    const _arguments = evalArgs(node.arguments)
    if (whiteListFunctions.has(callee))
      return callee(..._arguments)
    throw Error("TODO: Allow more functions: " + callee)
  }

  function visitNode(node) {
    console.log(node.type)
    switch (node.type) {
      case 'VariableDeclaration':
        return visitVariableDeclaration(node)
      case 'VariableDeclarator':
        return visitVariableDeclarator(node)
      case 'Literal':
        return visitLiteral(node)
      case 'Identifier':
        return visitIdentifier(node)
      case 'BinaryExpression':
        return visitBinaryExpression(node)
      case "CallExpression":
        return visitCallExpression(node)
      case "ExpressionStatement":
        return visitNode(node.expression)
      case "MemberExpression":
      {
        const obj = visitNode(node.object)
        const descs = Object.getOwnPropertyDescriptors(obj)
        if (descs.get == null) // 
          return obj[node.property.name]
        throw Error("TODO: also interpret getters")
      }
      case "AssignmentExpression":
        return visitAssignmentExpression(node)
      case "NewExpression":
        return visitNewExpression(node)
      case "ObjectExpression":
      {
        const obj = {}
        for (const propertyNode of node.properties) {
          obj[propertyNode.key.name] = visitNode(propertyNode.value)
        }
        return obj
      }
      case "ArrayExpression":
      {
        const arr = []
        for (const elementNode of node.elements) {
          arr.push(visitNode(elementNode))
        }
        return arr
      }
      case "FunctionExpression":
      default:
        throw Error("Not implemented yet: " + node.type)
    }
  }

  function visitNodes(nodes) {
    for (const node of nodes) {
      visitNode(node)
    }
  }
  let lastResult = undefined
  for (const node of programNode.body) {
    lastResult = visitNode(node)
  }
  return lastResult
}
world.CustomEval = CustomEval

module.exports = {
  CustomEval,
}

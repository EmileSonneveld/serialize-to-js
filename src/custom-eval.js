let acorn = require("acorn");
const utils = require("../src/internal/utils");
const world = utils.world
world.acorn = acorn


// derived from https://blog.bitsrc.io/build-a-js-interpreter-in-javascript-using-acorn-as-a-parser-5487bb53390c
function CustomEval(str) {
  const scopeChain = []
  function addScopeFrame(){
    const scopeFrame = new Map() // Map, because variable value could be undefined
    scopeChain.push(scopeFrame)
  }
  addScopeFrame();
  function getVariable(name) {
    for(let i = scopeChain.length -1; i>=0; i--){
        if(scopeChain[i].has(name)){
            return scopeChain[i].get(name)
        }
    }

    const descs = Object.getOwnPropertyDescriptors(world)
    if (descs[name].get == null) // Make exception for window.window?
      return {purelyInterpreted: false, value: world[name]}
    throw new ReferenceError(name + "is not defined")
  }
  function changeVariable(name, value){
      // TODO: var, const, let
    for(let i = scopeChain.length -1; i>=0; i--){
        if(scopeChain[i].has(name)){
            return scopeChain[i].set(name, value)
        }
    }
    throw new Error("Varibable '" + name + "' not found to assign to.");
  }
  

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
    scopeChain[scopeChain.length-1].set(name, value)
    return value
  }

  function visitAssignmentExpression(node) {
    const value = visitNode(node.right)
    if (node.left.type === "Identifier"){
      const name = node.left.name
      changeVariable(name, value)
    } else if (node.left.type === "MemberExpression"){
      const obj = visitNode(node.left.object)
      const name = node.left.property.name

      const descs = Object.getOwnPropertyDescriptors(obj.value)
      if (descs[name] && descs[name].set != null) // Make exception for window.window?
        throw Error("Setters not implemnted yet")
      if(!obj.purelyInterpreted)
        throw Error("Can't assign to objects outside the interpreter environement.")
      obj.value[name] = value
    } else {
        throw Error("left node unexpected type: "+node.left.type)
    }
    return value
  }


  function visitIdentifier(node) {
    const name = node.name
    return getVariable(name) 
  }

  function visitLiteral(node) {
    return {purelyInterpreted: true, value: node.value}
  }

  function visitBinaryExpression(node) {
    const leftNode = visitNode(node.left)
    const operator = node.operator
    const rightNode = visitNode(node.right)
    switch (operator) {
      case "+":
        return {purelyInterpreted: true, value: leftNode.value + rightNode.value}
      case "-":
        return {purelyInterpreted: true, value: leftNode.value - rightNode.value}
      case "/":
        return {purelyInterpreted: true, value: leftNode.value / rightNode.value}
      case "*":
        return {purelyInterpreted: true, value: leftNode.value * rightNode.value}
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
    const purelyInterpreted = _arguments.findIndex(x=>!x.purelyInterpreted) == -1 && callee.purelyInterpreted
    if (whiteListFunctions.has(callee.value))
      return {purelyInterpreted, value: callee.value.apply(null, _arguments.map(x=>x.value))}

    throw Error("TODO: Allow more functions: " + callee)
  }

  function visitNewExpression(node) {
    const callee = visitNode(node.callee)
    const _arguments = evalArgs(node.arguments)
    const purelyInterpreted = _arguments.findIndex(x=>!x.purelyInterpreted) == -1 && callee.purelyInterpreted
    if (whiteListFunctions.has(callee.value))
      return {purelyInterpreted, value: new callee.value(..._arguments.map(x=>x.value))}
    throw Error("TODO: Allow self defined functions")
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
        const descs = Object.getOwnPropertyDescriptors(obj.value)
        if (descs.get == null) // 
            // TODO: refine purelyInterpreted here
          return {purelyInterpreted: true, value: obj.value[node.property.name]}
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
        return {purelyInterpreted: true, value: obj}
      }
      case "ArrayExpression":
      {
        const arr = []
        for (const elementNode of node.elements) {
          arr.push(visitNode(elementNode))
        }
        return {purelyInterpreted: true, value: arr}
      }
      case "FunctionExpression":
        console.log(node)
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
  if (lastResult)
    return lastResult.value
}
world.CustomEval = CustomEval

module.exports = {
  CustomEval,
}

let acorn = require("acorn");
const utils = require("../src/internal/utils");
const world = utils.world
world.acorn = acorn


// derived from https://blog.bitsrc.io/build-a-js-interpreter-in-javascript-using-acorn-as-a-parser-5487bb53390c
function CustomEval(str) {
  // Attach metadata to objects with Map, because wrapping the objects is way to invasive.
  const purelyInterpreted = new Map()
  function isPurelyInterpreted(value){
    //if (typeof value !== "object" && typeof value !== "function")
    //    return true // TODO: Types that get copied by value are safe I think. But this is optimisation
    return purelyInterpreted.has(value)
  }

  function callNode(rootNode, scopeChain) {
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
      if (descs[name] && descs[name].get == null) // Make exception for window.window?
        return world[name]
      throw new ReferenceError(name + " is not defined")
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
    const whiteListFunctions = new Set([
      console.log, console.time, console.timeEnd,
      String,
      RegExp,
      Date,
      Error,
      Array,
      Int8Array,
      Uint8Array,
      Uint8ClampedArray,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array,
      Set,
      Map,
      Map.prototype.get,
      Object,
      Boolean,
      Number,
      URL,
      BigInt,
      Symbol,])
    if(typeof Buffer !== 'undefined'){
      whiteListFunctions.add(Buffer)
      whiteListFunctions.add(Buffer.from)
    }

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

        const descs = Object.getOwnPropertyDescriptors(obj)
        if (descs[name] && descs[name].set != null) // Make exception for window.window?
          throw Error("Setters not implemnted yet")
        if(!isPurelyInterpreted(obj))
          throw Error("Can't assign to objects outside the interpreter environement.")
        obj[name] = value
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
      // Maybe not needed, as literals get passed by value.
      if (typeof value === "object" || typeof value === "function")
        throw Error("Only expects value types!")
      purelyInterpreted.set(node.value, true)
      return node.value;
    }

    function visitBinaryExpression(node) {
      const leftNode = visitNode(node.left)
      const operator = node.operator
      const rightNode = visitNode(node.right)
      let value = undefined;
      switch (operator) {
        case "+":
          value = leftNode + rightNode
          break
        case "-":
          value = leftNode - rightNode
          break
        case "/":
          value = leftNode / rightNode
          break
        case "*":
          value = leftNode * rightNode
          break
      }
      if (isPurelyInterpreted(leftNode) && isPurelyInterpreted(rightNode))
        purelyInterpreted.set(value, true)
      return value
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
      let thisObject = null;
      if(node.callee.type === "MemberExpression"){
        thisObject = visitNode(node.callee.object)
      }
      const _arguments = evalArgs(node.arguments)
      // TODO: Make get alike functions also pure. Find out something for map.get()
      const pure = _arguments.findIndex(x=>!isPurelyInterpreted(x)) === -1 && isPurelyInterpreted(callee)
      let ret = undefined
      if (whiteListFunctions.has(callee)){
        ret = callee.apply(thisObject, _arguments)
      } else if(typeof callee == 'function') {
        throw Error("function not in whitelist: " + callee.name)
      }else {
        if (callee.functionNode == null)
          throw TypeError(callee + "is not a function")
        // TODO: manage 'this'
        ret = callNode(callee.functionNode.body, callee.capturedScopeChain)
      }
      if (pure && ret != null)
        purelyInterpreted.set(ret, true)
      return ret
    }

    function visitNewExpression(node) {
      const callee = visitNode(node.callee)
      const _arguments = evalArgs(node.arguments)
      const pure = _arguments.findIndex(x=>!x.purelyInterpreted) == -1 && callee.purelyInterpreted
      if (whiteListFunctions.has(callee)){
        const ret = new callee(..._arguments)
        if (pure)
          isPurelyInterpreted.set(ret, true)
        return ret
      }
      throw Error("TODO: Allow self defined functions")
    }

    function visitNode(node) {
      //console.log(node.type)
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
          let name = node.property.name
          if (name == null) name = visitNode(node.property)
          if (descs[name] == null || descs[name].get == null) // 
              // No object get created here, so no need to manage 'pure'
            return obj[name]
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
          purelyInterpreted.set(obj, true)
          return obj
        }
        case "ArrayExpression":
        {
          const arr = []
          for (const elementNode of node.elements) {
            arr.push(visitNode(elementNode))
          }
          purelyInterpreted.set(arr, true)
          return arr
        }
        case "FunctionExpression":
        case "ArrowFunctionExpression":
          const functionObject = {
            message: "Functions can not be exported.",
            functionNode: node,
            capturedScopeChain: [...scopeChain]
          }
          purelyInterpreted.set(functionObject, true)
          return functionObject
        case "BlockStatement":
        case "Program":
          let lastResult = undefined
          for (const childNode of node.body) {
            lastResult = visitNode(childNode)
            if (childNode.type == "ReturnStatement")
              break
          }
          return lastResult
        case "ReturnStatement":
          return visitNode(node.argument)
        case "UnaryExpression":
          return -visitNode(node.argument)
        default:
          throw Error("Not implemented yet: " + node.type)
      }
    }

    function visitNodes(nodes) {
      for (const node of nodes) {
        visitNode(node)
      }
    }
    console.log(scopeChain)
    return visitNode(rootNode)
  }

  const programNode = acorn.parse(str, {
    ecmaVersion: 2020
  })
  const ret= callNode(programNode, [])
  return ret
}
world.CustomEval = CustomEval

module.exports = {
  CustomEval,
}

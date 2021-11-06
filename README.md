# serialize-to-js

[![NPM version](https://badge.fury.io/js/serialize-to-js.svg)](https://www.npmjs.com/package/serialize-to-js/)
[![Build Status](https://secure.travis-ci.org/commenthol/serialize-to-js.svg?branch=master)](https://travis-ci.org/commenthol/serialize-to-js)

Serialize objects into a string while keeping circular structures and references.
This string happens to be legimite JavaScript and can be parsed back with `eval()`.

Like JSON, but supporting Sets, Maps, Dates, circular references and more.

```js
const str = serialize(source, opts={})
eval(str) // gives back the object!
```

serializes an object to JavaScript

#### Example

```js
const serialize = require('serialize-to-js')
const reusedObject = { key: 'value' }
reusedObject.cyclicSelf = reusedObject
const obj = {
  str: 'hello world!',
  num: 3.1415,
  bool: true,
  nil: null,
  undef: undefined,
  obj: { foo: 'bar', reusedObject },
  arr: [1, '2', reusedObject],
  regexp: /^test?$/,
  date: new Date(),
  buffer: new Uint8Array([1, 2, 3]),
  set: new Set([1, 2, 3]),
  map: new Map([['a', 1], ['b', reusedObject]])
}
console.log(serialize(obj))
```

This gives the following string as result:

```js     
(function () {
  const root = {
    str: "hello world!",
    num: 3.1415,
    bool: true,
    nil: null,
    undef: undefined,
    obj: {
      foo: "bar",
      reusedObject: {
        key: "value",
        cyclicSelf: undefined /* Linked later*/
      }
    },
    arr: [
      1,
      "2",
      undefined /* Linked later*/
    ],
    regexp: new RegExp("^test?$", ""),
    date: new Date("2021-10-15T19:50:12.958Z"),
    buffer: undefined /*  Error: Buffer is not defined. Breadcrumb: root.buffer */,
    set: new Set([
      1,
      2,
      3
    ]),
    map: new Map([
      ["a", 1],
      ["b", undefined /* Linked later*/]
    ])
  };
  root.obj.reusedObject.cyclicSelf = root.obj.reusedObject;
  root.arr["2"] = root.obj.reusedObject;
  root.map.set("b", root.obj.reusedObject);
  return root;
})()
```

You can parse this results with `eval(str)` to get back a real JS object.

Take a look to [the tests](test/index.test.js.md) for more examples.

**Parameters**

**source**: `Object | Array | function | Any`, source to serialize  
**opts**: `Object`, options  
**opts.unsafe**: `Boolean`, do not escape chars `<>/`  
**opts.ignoreFunction**: `Boolean`, do not serialise functions, as they do not capture the scope correctly anyway. 
**opts.objectsToLinkTo**: `Array`, what objects can be linked to instead of serialised
**opts.maxDepth**: `Number`, how deep may the object graph be searched
**Returns**: `String`, serialized representation of `source`

## Use cases

- Dump the whole application state with `serialise(window)`. You can Ctrl-F trough the generated code to find property
  names and values.
- Make a dump before and after you pressed a button. You can diff the two dumps to see what changed.
- Serialise your application state as a save file.
- Check if your application has no unexpected duplicated objects. For example, when a bug lets an object be passed by
  reference instead of a copy. Those instances will clearly be visible at the end of the dump.

## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code to be distributed under the MIT license.
You are also implicitly verifying that all code is your original work or correctly attributed with the source of its
origin and licence.

## License

Copyright (c) 2016- commenthol (MIT License)
Copyright (c) 2021- EmileSonneveld (MIT License)

See [LICENSE][] for more info.

[LICENSE]: ./LICENSE

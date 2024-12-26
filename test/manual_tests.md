manual_tests
============


Test too hard to automate can be documented here.

Open Chrome Open https://en.wikipedia.org/wiki/Main_Page
Paste the code from `main.js` in the console. Paste the following in the console. Test if the logged code is valid

```JS
{
  const opts = {
    ignoreFunction: true,
    maxDepth: 50,
  }
  const test_property = "unique string here" + Math.random()
  window.test_property = test_property
  const str = serialize(window, opts)

  if (str.indexOf(test_property) === -1) {
    throw Error("test_property not found!")
  }

  console.log(str) // Manually test if this code is runnable
    
    // function looseJsonParse(obj) {
    // // EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script
    //   return Function('"use strict";return (' + obj + ')')()
    // }
    //looseJsonParse(str)
}
```

Do the same for https://www.facebook.com/
https://twitter.com/
https://www.autotorio.com/blueprint
http://localhost:44444/test/iframe_holder.html

Open `mocha.html` in a locally run server. All tests here should pass
Example command to launch local server:
`docker run -p 80:80 -v "%CD%":/usr/local/apache2/htdocs/ httpd`

And repeat everything in Firefox too

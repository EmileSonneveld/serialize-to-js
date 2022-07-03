JS Search
=========
_Emile Sonneveld_

This addon helps to find variable paths in your JavaScript application. There are 2 ways of doing this:
- "Value search"': When you know what value the variable has, you can use this to find how to acces this variable.
- "Change search": When you want to find what variables are changed after performing an action.

Second option works by serialising all that is accessible from withing the window object in a big JavaScript string 2 times. Once before a user interaction and once after. A simple diff algorithm is used to see what variables changed. An optional 3th capture can be done to remove noisy variables from the selection that changed without user interaction.


![](screenshot.png)

Uploaded to chrome store here: https://chrome.google.com/webstore/detail/js-picking/jjljfhnjkinelaaagkkamlaaflhfmlpc/

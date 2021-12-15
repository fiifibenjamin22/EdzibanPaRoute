# foreach-async-await

> An async/await compatible method with a forEach style signature

[![Dependencies](http://img.shields.io/david/codearoni/async-foreach.svg)](https://david-dm.org/codearoni/async-foreach)
[![Build Status](https://travis-ci.org/codearoni/async-foreach.svg?branch=master)](https://travis-ci.org/codearoni/async-foreach)
[![Build status](https://ci.appveyor.com/api/projects/status/tho4t7yfg6t5oylt?svg=true)](https://ci.appveyor.com/project/codearoni/async-foreach)
[![Coverage Status](https://coveralls.io/repos/github/codearoni/async-foreach/badge.svg)](https://coveralls.io/github/codearoni/async-foreach)
[![Maintainability](https://api.codeclimate.com/v1/badges/dcd0c5541ad92ce8206e/maintainability)](https://codeclimate.com/github/codearoni/async-foreach/maintainability)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm i foreach-async-await
```

## About

There may have been times where you would like to use an async function inside a forEach loop.

```js
[1, 2, 3, 4].forEach(async (num) => {
    await someAsyncFunction(num);
});
```

As we know, the above example does not work. @async/foreach is a no frills, no dependencies module that makes iterating with async functions easier.
@async/foreach takes advantage of Promise.all under the hood, so your invocations will run concurrently.

## Usage

```js
const asyncForEach = require('@async/foreach');
const fs = require('fs');

(async () => {

    const files = ['./path/to/file1.js', './path/to/file2.js', './path/to/file3.js'];

    const filesContent = await asyncForEach(files, async (file, index, array) => {
        console.log('The current index in the array:', index);
        console.log('The entire array:', array);
        await fs.readFile(file, 'utf8');
    });

    // Prints the contents of the files read
    console.log(filesContent);
})();
```
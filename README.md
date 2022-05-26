# JSCE
a cheat engine like program written in javascript for web games

## Features
- [Speed manipulation](#speed-manipulation)
- [RNG manipulation]()
- variable searching and modification

### Speed manipulation

Rewrites default timing functions `setTimeout`, `setInterval` with modified time delay
Overwrites `requestAnimationFrame` with a function that passes in a different timestamp then the actual timestamp

### RNG manipulation

overwrites `Math.random` with a function that returns a number based on input 
supports stack tracing

### variable searching

generates a reference (pseudo reference using read and write functions for storage) to the object to be search. Then iterates over the object recursivly and checks the value based on an operation function.

## Stack tracing

uses a `try catch` block to throw an `Error` object and read it's stack property

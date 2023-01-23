# JSCE
a cheat engine like program written in javascript for web games

## Features
- [Speed manipulation](#speed-manipulation)
- [RNG manipulation](#rng-manipulation)
- [Variable Search](#variable-searching)

### Speed manipulation

Applies changes to the functions below

- `performance.now`: Returns a fake timestamp which is in the future
- `Date.now`: Returns a fake timestamp which is in the future
- `setTimeout`: Executes more quickly 
- `setInterval`: Executes more quickly 
- `requestAnimationFrame`: Passes in a fake timestamp which is furthur in the future then the actual value

### RNG manipulation

overwrites `Math.random` with a function that returns a custom number. The number can either be globally modified or modified based on call stack

### variable searching

generates a reference (pseudo reference using read and write functions for storage) to the object to be search. Then iterates over the object recursivly and checks the value based on an operation function. Then stores the result in a array with the path as a string. Accessor properties as well as cyclic references will be filtered out.

#### Operators:
> Note: v in format field represents input  
> value refers to the value of the variable

  Name | Symbol | Format | Description
  ---  | :---:  | :---:  | ---
Universal | `**` | `**` | Matches all values
Equal  | `==`   | <code>===<b>v</b></code> |Checks if value is the same as the query, typecasting if nessesary
Strict Equal | `===` | <code>===<b>v</b></code> |Compares values without typecasting (the type of the search is auto type casted)
Path | `.` | <code>.<b>v</b></code> | Matches if path includes input 
Range | `~` | <code><b>v</b>~<b>v</b></code>  | Check if the first value is between the first and second input
Greater/Equal | `>=` | <code>>=<b>v</b></code>  | -
Greater | `>` | <code>><b>v</b></code>  | -
Less/Equal | `<=` | <code><=<b>v</b></code>  | - 
Less | `<` | <code><<b>v</b></code>  | - 
Includes | `?` | <code>?<b>v</b></code>  | Check if value includes input
Regex | `/` | <code>/<b>v</b></code> | Where input is a regex check if value matches the regex 

**Refine Operators**:
> These operators may only be used for refine
> The following operators are relative and have no input

  Name | Symbol | Description
  ---  | :---:  | ---
Change | `/\`   | Check if the value has changed when compared to previous search
Increase | `/\>` | Check if value has increased when compared to previous search
Decrease | `/\<` | Check if value has decreased when compared to previous search

#### Multi Select  
`Shift+Click` to select range of items
`Alt+Click` to select and deselect range of items 
`Alt+Shift+Click` to select and deselect multiple ranges of items 

## Stack tracing

uses a `try catch` block to throw an `Error` object and read it's stack property

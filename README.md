# JSCE
a cheat engine like program written in javascript for web games

## Features
- [Speed manipulation](#speed-manipulation)
- [RNG manipulation](#rng-manipulation)
- [Variable Search](#variable-searching)
- [Macros](#macros)
- [Modules](./modules.md)

### Speed manipulation

Applies changes to the functions below

- `performance.now`: Returns a fake timestamp which is in the future
- `Date.now`: Returns a fake timestamp which is in the future
- `setTimeout`: Executes more quickly 
- `setInterval`: Executes more quickly 
- `requestAnimationFrame`: Passes in a fake timestamp which is furthur in the future then the actual value

#### timeskip

changes the timestamp returned by `performance.now` and `Date.now`. Will not work in games that limit the time between frames.
The input field uses a duration syntax as follows:

> <number><unit>...

where `unit` is one of the following

- `h` - hour
- `m` - minute
- `s` - second
- `ms` - millisecond

An unlimited amount of number - unit pairs may be used in series. Example: `1h20m30s`  
The list of pairs are unordered as such `1h30s` is the same as `30s1h`

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
Equal  | `==`   | <code>===<b>v</b></code> | Checks if value is the same as **`v`**, typecasting if nessesary
Strict Equal | `===` | <code>===<b>v</b></code> | Compares values without typecasting (the type of the search is auto type casted)
Path | `.` | <code>.<b>v</b></code> | Matches if path includes **`v`** 
Range | `~` | <code><b>v<sub>1</sub></b>~<b>v<sub>2</sub></b></code>  | Check if the value is between <code><b>v<sub>1</sub></b></code> and <code><b>v<sub>2</sub></b></code>
Greater/Equal | `>=` | <code>>=<b>v</b></code>  | -
Greater | `>` | <code>><b>v</b></code>  | -
Less/Equal | `<=` | <code><=<b>v</b></code>  | - 
Less | `<` | <code><<b>v</b></code>  | - 
Includes | `?` | <code>?<b>v</b></code>  | Check if value includes **`v`**
Regex | `/` | <code>/<b>v</b></code> | Where **`v`** is a regex check if value matches the regex 
Approx Equals | `~~` | <code><b>v<sub>1</sub></b>~~<b>v<sub>2</sub></b></code> | Check if value is equal to <code><b>v<sub>1</sub></b></code> correct to <code><b>v<sub>2</sub></b></code> significant figures

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

### Macros 

Use javascript Event interface to automate simple tasks 

Supported events 

- Press keyboard key
- Click element at point 


## Stack tracing

uses a `try catch` block to throw an `Error` object and read it's stack property

# Modules 

Modules are external, user-created JS programs. An API is provided by JSCE to make it easier to create scripts more quickly.

## Context 

The context of the module is an eval run within JSCE's context  
However, a pre-run script is added which defines the document and window objects to that of the target page

## script object

The `script` object is an object which is defined by JSCE and accesable in the scope of the script  
note that `script` objects are local and are unique to each script 

## Methods 

- [bindFunction](#bind-function)
- [bindHotkeysToElement](#bindhotkeystoelement)
- [requestSpeeder](#requestspeeder)
- [sleep](#sleep)

### Bind Function

```
script.bindFunction(name, function [, parameters])
```

Creates a user interface containing a label, function and any parameters the function has

#### `name`

the label of what the hotPkey is for. Will be displayed next to the hotkey input

#### `function`

callback function to be binded may be a function or a object with the keys being the event name to bind to  
Note: when `function` is a function it will be binded to the keydown event 

#### `parameters`
An array of parameters for that hotkeys. The input created will be based on the data type specified. Each parameter should be a string with an optional colon to add a label to the input  
Parameter format: `[label:]type`

Types 

- string
- number
- boolean
- [duration](#duration)

Example:  
```js
// bind function that prints the name in the input when pressing hotkey 
script.bindFunction('say hi', name => console.log(name), ['string']);

// add a label to the input
script.bindFunction('say hi', name => console.log(name), ['name:string']);

// add multiple inputs
script.bindFunction('say hi', (firstName, lastName) => {
    console.log(firstName + ' ' + lastName)
}, ['first:string', 'last:string']);

// using object format
// note: this format requires that all properties be named
script.bindFunction('say hi', (firstName, lastName) => {
    console.log(firstName + ' ' + lastName)
}, {first: 'string', last: 'string'});
```

### bindHotkeysToElement

```
script.bindHotkeysToElement([bindingElement])
```

Defines the target element to bind hotkeys defined in `bindFunction` to 

#### bindingElement 
The element to bind to should be a selector string like the one in `document.querySelector`.  
Special string values

- `document`: bind to document (default)
- `auto`: attempts to find and bind to the page's main game canvas

If by the end of the script this function is not called it will be called with the default parameters

### requestSpeeder

```
script.requestSpeeder()
```

Creates a confirmation message that requests the user turn on the speeder module  
Will not be shown if the speeder module is already on

#### return value 
Whether the user accepted the confirmation message. Will return true if the speeder module is already on
  

### sleep 

```
await script.sleep(ms)
```

Sleep for `ms` amount of miliseconds in a async function 

#### `ms` 

The amount of time in miliseconds to sleep

## Duration

> <number><unit>...

where `unit` is one of the following

- `h` - hour
- `m` - minute
- `s` - second
- `ms` - millisecond

An unlimited amount of number - unit pairs may be used in series. Example: `1h20m30s`  
The list of pairs are unordered as such `1h30s` is the same as `30s1h`

In duration input parameters, the duration will be converted to miliseconds

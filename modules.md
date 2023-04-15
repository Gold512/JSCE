# Modules 

Modules are external, user-created JS programs. An API is provided by JSCE to make it easier to create scripts more quickly.

## Context 

The context of the module is an eval run within JSCE's context  
However, a pre-run script is added which switches the document and window objects to that of the target page

## script object

The `script` object is an object which is defined by JSCE and accesable in the scope of the script  
note that `script` objects are local and are unique to each script 

### Methods 

- [bindFunction](#bind-function)

#### Bind Function

> script.bindFunction(name, function [, parameters])

Creates a user interface containing a label, function and any parameters the function has

##### name 
the label of what the hotkey is for. Will be displayed next to the hotkey input
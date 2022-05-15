start /w cmd.exe /c html-inline -i index.html -o jsce.min.html
html-minifier --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --remove-tag-whitespace --minify-css true --minify-js true --output jsce.min.html jsce.min.html
pause
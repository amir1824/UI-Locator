declare module 'launch-editor/guess.js' {
  function guessEditor(specifiedEditor?: string): string[]
  export = guessEditor
}

declare module 'launch-editor/get-args.js' {
  function getArgumentsForPosition(
    editor: string,
    fileName: string,
    lineNumber: string | number,
    columnNumber?: string | number,
  ): string[]
  export = getArgumentsForPosition
}

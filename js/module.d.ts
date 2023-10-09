declare namespace script {
    type validTypeStrs = 'string'|'number'|'boolean'|'duration'
    type typedLabel = `${string}:${validTypeStrs}`;
    
    function bindFunction(name: string, fn: function|Object<keyof HTMLElementEventMap>, params: typedLabel[] | Record<string, validTypeStrs>): void
    
    function bindHotkeysToElement(bindingElement:'document'|'auto'|string = 'document'): void

    function requestSpeeder(): boolean

    function sleep(ms: number): Promise<void>

    function log(msg: string): void

    class JSBot {
        constructor(windowCtx: Window, key: string|object, interval: number): void
        setElement(element: HTMLElement|String|(() => HTMLElement)): void
        selectElement():Promise<HTMLElement>
        click(postion:[number, number] = [0, 0], button:number|('main'|'middle'|'secondary') = 0):void
        mouseMove(x: number, y: number): void
        start(): void
        stop(): void
        toggle(): void
        target: HTMLElement|null
        active: boolean
        bubbles: boolean
        repeats: boolean
    }
}


declare namespace script {
    type typedLabel = `${string}:${'string'|'number'|'boolean'|'duration'}`;
    function bindFunction(name: string, fn: function|Object<keyof HTMLElementEventMap>, params: typedLabel[]): void
    
    function bindHotkeysToElement(bindingElement:'document'|'auto'|string = 'document'): void

    function requestSpeeder(): boolean

    function sleep(ms: number): Promise<void>

    function log(msg: string): void

    class JSBot {
        constructor(windowCtx: Window, key: string|object, interval: number): void
        setElement(element: HTMLElement|String|Function): void
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


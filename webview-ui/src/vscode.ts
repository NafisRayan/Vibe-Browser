declare global {
    interface Window {
        acquireVsCodeApi: () => any;
    }
}

let vscodeApi: any;

export function getVsCodeApi() {
    if (!vscodeApi) {
        if (typeof window.acquireVsCodeApi === 'function') {
            vscodeApi = window.acquireVsCodeApi();
        } else {
            vscodeApi = {
                postMessage: () => {},
                getState: () => ({}),
                setState: () => {}
            };
        }
    }
    return vscodeApi;
}







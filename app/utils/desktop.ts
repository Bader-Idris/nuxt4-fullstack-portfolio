export const isElectron = typeof window !== "undefined" && !!window.ipcRenderer;
export const isElectrobun = typeof window !== "undefined" && !!(window as any).electrobun;
export const isDesktop = isElectron || isElectrobun;

export async function invokeNative(channel: string, payload: any = {}) {
  if (isElectron) {
    // Electron's invoke takes channel and variadic args
    // We'll assume the first arg is the payload for consistency
    return await window.ipcRenderer.invoke(channel, payload);
  } else if (isElectrobun) {
    const electrobun = (window as any).electrobun;
    if (electrobun && electrobun.rpc && electrobun.rpc.request) {
      // Map Electron channel names to Electrobun RPC methods if they differ
      // Or just use them as is if we keep them identical
      const method = channel.startsWith("msgRequest") ? channel : channel; 
      
      if (typeof electrobun.rpc.request[method] === "function") {
          return await electrobun.rpc.request[method](payload);
      } else {
          console.warn(`Electrobun RPC method ${method} not found.`);
      }
    }
  }
  
  console.warn("Not running in a desktop environment or bridge not initialized.");
  return null;
}

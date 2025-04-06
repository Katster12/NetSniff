import { WebPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { ToyVpnPlugin, PacketData } from './ToyVpn';

class ToyVpnPluginWebImpl extends WebPlugin implements ToyVpnPlugin {
  constructor() {
    super();
  }
  
  async startVpn(options?: { 
    serverAddress?: string; 
    serverPort?: string; 
    sharedSecret?: string;
  }): Promise<{ status: string }> {
    console.log('Web implementation of startVpn called with options:', options);
    
    // On web, we can't capture real packets due to browser security restrictions
    // Instead, we'll just return a status indicating this is not supported
    return { status: 'not_supported' };
  }
  
  async stopVpn(): Promise<{ status: string }> {
    console.log('Web implementation of stopVpn called');
    
    // On web, there's nothing to stop since we don't capture packets
    return { status: 'not_running' };
  }
  
  async addListener(
    eventName: 'packetCaptured',
    listenerFunc: (packet: PacketData) => void
  ): Promise<PluginListenerHandle> {
    console.log('Adding listener for packet capture');
    
    // On web, we can't capture packets, so we'll just return a no-op listener
    return {
      remove: () => Promise.resolve()
    };
  }
  
  async removeAllListeners(): Promise<void> {
    console.log('Removing all listeners');
    return Promise.resolve();
  }
}

// Create a singleton instance of the web implementation
const webPlugin = new ToyVpnPluginWebImpl();

export const ToyVpnPluginWeb = webPlugin;

package com.netsniff.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.ConnectivityManager;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.DatagramChannel;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.lang.reflect.Method;
import java.util.concurrent.atomic.AtomicBoolean;

public class ToyVpnService extends VpnService {
    private static final String TAG = "ToyVpnService";
    private static final int BUFFER_SIZE = 32767;
    private static final int MAX_PACKET_SIZE = 1500;
    private static final String VPN_ADDRESS = "10.0.0.2";
    private static final String VPN_ROUTE = "0.0.0.0";
    
    // Action constants
    public static final String ACTION_CONNECT = "com.netsniff.app.START";
    public static final String ACTION_DISCONNECT = "com.netsniff.app.STOP";
    private static final int VPN_PREFIX_LENGTH = 32;
    private static final int ROUTE_PREFIX_LENGTH = 0;
    
    private static final int NOTIFICATION_ID = 1234;
    private static final String CHANNEL_ID = "NetSniffVpnChannel";
    
    private ParcelFileDescriptor vpnInterface = null;
    private ExecutorService executorService;
    private AtomicBoolean running = new AtomicBoolean(false);
    private Queue<ByteBuffer> deviceToNetworkQueue;
    private Queue<ByteBuffer> networkToDeviceQueue;
    private Network underlyingNetwork;
    private boolean isFirstPacket = true;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "NetSniff VPN Service",
                NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("NetSniff VPN Service Channel");
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);
            
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("NetSniff VPN")
            .setContentText("Capturing network packets")
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
            
        return builder.build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Check if intent is null
        if (intent == null) {
            Log.d(TAG, "Intent is null, keep running if already running");
            return START_STICKY;
        }
        
        // Check for disconnect action
        String action = intent.getAction();
        if (action != null && action.equals(ACTION_DISCONNECT)) {
            Log.d(TAG, "Received DISCONNECT action, stopping VPN service");
            stopVpn();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        
        // Don't restart if already running
        if (running.get()) {
            Log.w(TAG, "VPN already running");
            return START_STICKY;
        }
        
        // Start as a foreground service with notification
        startForeground(NOTIFICATION_ID, createNotification());

        deviceToNetworkQueue = new ConcurrentLinkedQueue<>();
        networkToDeviceQueue = new ConcurrentLinkedQueue<>();
        executorService = Executors.newFixedThreadPool(3);
        establishVpn();
        
        return START_STICKY;
    }

    private void establishVpn() {
        try {
            Builder builder = new Builder()
                .addAddress(VPN_ADDRESS, VPN_PREFIX_LENGTH)
                .addRoute(VPN_ROUTE, ROUTE_PREFIX_LENGTH)
                .setSession("NetSniff")
                .setMtu(MAX_PACKET_SIZE)
                .allowFamily(android.system.OsConstants.AF_INET)
                .allowFamily(android.system.OsConstants.AF_INET6);

            builder.addDnsServer("8.8.8.8");
            builder.addDnsServer("8.8.4.4");

            // Exclude our app from the VPN to avoid loops
            builder.addDisallowedApplication(getPackageName());

            vpnInterface = builder.establish();
            if (vpnInterface == null) {
                Log.e(TAG, "Failed to establish VPN connection");
                stopForeground(true);
                stopSelf();
                return;
            }

            ConnectivityManager cm = getSystemService(ConnectivityManager.class);
            underlyingNetwork = cm.getActiveNetwork();
            setUnderlyingNetworks(new Network[]{underlyingNetwork});

            running.set(true);
            
            executorService.submit(new VPNRunnable());
            executorService.submit(new NetworkRunnable());
            
            Log.d(TAG, "VPN connection established successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "Error establishing VPN", e);
            cleanup();
            stopForeground(true);
            stopSelf();
        }
    }

    private class VPNRunnable implements Runnable {
        @Override
        public void run() {
            FileInputStream in = new FileInputStream(vpnInterface.getFileDescriptor());
            FileOutputStream out = new FileOutputStream(vpnInterface.getFileDescriptor());
            ByteBuffer packet = ByteBuffer.allocate(MAX_PACKET_SIZE);

            while (running.get()) {
                try {
                    packet.clear();
                    int length = in.read(packet.array());
                    if (length > 0) {
                        packet.limit(length);
                        ByteBuffer copy = ByteBuffer.allocate(length);
                        copy.put(packet.array(), 0, length);
                        copy.flip();
                        
                        // Process outgoing packets
                        processPacket(copy, "outgoing");
                        
                        deviceToNetworkQueue.offer(copy);
                    }
                    
                    // Check for incoming packets
                    ByteBuffer received = networkToDeviceQueue.poll();
                    if (received != null) {
                        out.write(received.array(), 0, received.limit());
                    }
                } catch (IOException e) {
                    Log.e(TAG, "VPN thread error", e);
                    if (!running.get()) break;
                }
            }
        }
    }

    private class NetworkRunnable implements Runnable {
        @Override
        public void run() {
            try {
                DatagramChannel tunnel = DatagramChannel.open();
                tunnel.configureBlocking(false);
                protect(tunnel.socket());
                
                Selector selector = Selector.open();
                tunnel.register(selector, SelectionKey.OP_READ);
                ByteBuffer packet = ByteBuffer.allocate(MAX_PACKET_SIZE);

                while (running.get()) {
                    // Send outgoing packets
                    ByteBuffer toSend = deviceToNetworkQueue.poll();
                    if (toSend != null) {
                        int protocol = toSend.get(9) & 0xFF;
                        ByteBuffer payload = ByteBuffer.allocate(toSend.limit());
                        payload.put(toSend.array(), 0, toSend.limit());
                        payload.flip();

                        if (selector.select(100) > 0) {
                            Set<SelectionKey> keys = selector.selectedKeys();
                            for (SelectionKey key : keys) {
                                if (key.isReadable()) {
                                    tunnel.receive(packet);
                                    packet.flip();
                                    int length = packet.limit();
                                    
                                    // Process incoming packets
                                    ByteBuffer copy = ByteBuffer.allocate(length);
                                    copy.put(packet.array(), 0, length);
                                    copy.flip();
                                    processPacket(copy, "incoming");
                                    
                                    networkToDeviceQueue.offer(copy);
                                }
                            }
                            keys.clear();
                        }
                    }
                }
            } catch (IOException e) {
                Log.e(TAG, "Network thread error", e);
            }
        }
    }

    private void processPacket(ByteBuffer packet, String direction) {
        try {
            packet.position(0);
            byte versionAndIHL = packet.get();
            int version = (versionAndIHL >> 4) & 0xF;
            int ihl = versionAndIHL & 0xF;
            
            if (version != 4) {
                return;
            }

            packet.position(2);
            int totalLength = ((packet.get() & 0xFF) << 8) | (packet.get() & 0xFF);

            packet.position(9);
            int protocol = packet.get() & 0xFF;

            packet.position(12);
            byte[] sourceAddr = new byte[4];
            byte[] destAddr = new byte[4];
            packet.get(sourceAddr);
            packet.get(destAddr);

            int headerLength = ihl * 4;
            String sourcePort = "";
            String destPort = "";
            if (protocol == 6 || protocol == 17) {
                packet.position(headerLength);
                sourcePort = String.valueOf(((packet.get() & 0xFF) << 8) | (packet.get() & 0xFF));
                destPort = String.valueOf(((packet.get() & 0xFF) << 8) | (packet.get() & 0xFF));
            }

            JSObject packetInfo = new JSObject();
            packetInfo.put("source", ipToString(sourceAddr) + (sourcePort.isEmpty() ? "" : ":" + sourcePort));
            packetInfo.put("destination", ipToString(destAddr) + (destPort.isEmpty() ? "" : ":" + destPort));
            packetInfo.put("protocol", getProtocolName(protocol));
            packetInfo.put("direction", direction);
            packetInfo.put("size", totalLength);

            StringBuilder payload = new StringBuilder();
            int payloadStart = headerLength;
            int payloadLength = Math.min(totalLength - payloadStart, 64);
            packet.position(payloadStart);
            for (int i = 0; i < payloadLength && packet.hasRemaining(); i++) {
                payload.append(String.format("%02X ", packet.get()));
                if ((i + 1) % 16 == 0) payload.append("\n");
            }
            packetInfo.put("payload", payload.toString().trim());

            if (isFirstPacket) {
                Log.d(TAG, "First packet captured: " + packetInfo.toString());
                isFirstPacket = false;
            }

            ToyVpnPlugin.notifyPacketCaptured(packetInfo);

        } catch (Exception e) {
            Log.e(TAG, "Error processing packet", e);
        }
    }

    private String ipToString(byte[] addr) {
        return String.format("%d.%d.%d.%d", addr[0] & 0xFF, addr[1] & 0xFF, addr[2] & 0xFF, addr[3] & 0xFF);
    }

    private String getProtocolName(int protocol) {
        switch (protocol) {
            case 1: return "ICMP";
            case 6: return "TCP";
            case 17: return "UDP";
            case 50: return "ESP";
            case 89: return "OSPF";
            default: return "IP(" + protocol + ")";
        }
    }

    /**
     * Stops the VPN connection
     */
    public void stopVpn() {
        Log.d(TAG, "Stopping VPN connection");
        cleanup();
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "VPN service being destroyed");
        cleanup();
        stopForeground(true);
        super.onDestroy();
    }

    private void cleanup() {
        Log.d(TAG, "Performing safe VPN cleanup");
        
        // Mark as not running to ensure no new packets are processed
        running.set(false);
        
        // Close the VPN interface properly
        if (vpnInterface != null) {
            try {
                Log.d(TAG, "Closing VPN interface");
                vpnInterface.close();
                Log.d(TAG, "VPN interface closed successfully");
            } catch (IOException e) {
                Log.e(TAG, "Error closing VPN interface", e);
            } finally {
                vpnInterface = null;
            }
        }
        
        // Safely shut down the executor service
        if (executorService != null && !executorService.isTerminated()) {
            try {
                Log.d(TAG, "Shutting down executor service");
                // First try gentle shutdown
                executorService.shutdown();
                
                // Wait for tasks to complete with reasonable timeout
                if (!executorService.awaitTermination(500, TimeUnit.MILLISECONDS)) {
                    Log.w(TAG, "Executor not responding to gentle shutdown, using shutdownNow");
                    List<Runnable> pendingTasks = executorService.shutdownNow();
                    Log.d(TAG, "Cancelled " + pendingTasks.size() + " pending executor tasks");
                    
                    // Wait again with longer timeout
                    if (!executorService.awaitTermination(500, TimeUnit.MILLISECONDS)) {
                        Log.e(TAG, "Executor service did not terminate");
                    }
                }
            } catch (InterruptedException ie) {
                Log.e(TAG, "Interrupted while waiting for executor shutdown", ie);
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                Log.e(TAG, "Error during executor service shutdown", e);
            } finally {
                executorService = null;
            }
        }
        
        // Clear queues
        if (deviceToNetworkQueue != null) {
            try {
                deviceToNetworkQueue.clear();
            } catch (Exception e) {
                Log.e(TAG, "Error clearing deviceToNetworkQueue", e);
            }
            deviceToNetworkQueue = null;
        }
        
        if (networkToDeviceQueue != null) {
            try {
                networkToDeviceQueue.clear();
            } catch (Exception e) {
                Log.e(TAG, "Error clearing networkToDeviceQueue", e);
            }
            networkToDeviceQueue = null;
        }
        
        // Notify JavaScript layer that VPN is stopped
        try {
            if (ToyVpnPlugin.instance != null) {
                ToyVpnPlugin.notifyVpnStopped();
                Log.d(TAG, "Notified JS layer that VPN is stopped");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error notifying JS layer about VPN stop", e);
        }
        
        // Release network
        underlyingNetwork = null;
        
        // Reset state
        isFirstPacket = true;
        
        // Force garbage collection to clean up resources
        try {
            System.gc();
            Log.d(TAG, "EXTREME VPN TERMINATION: Requested garbage collection");
        } catch (Exception e) {
            Log.e(TAG, "Error requesting garbage collection", e);
        }
        
        Log.d(TAG, "EXTREME VPN TERMINATION: VPN cleanup completed");
        
        // Forcefully stop the service immediately after cleanup
        stopSelf();
        
        // LAST RESORT: Detect if we're still active after cleanup and force kill
        try {
            // Staggered checks to ensure termination
            // First check quickly
            new android.os.Handler().postDelayed(() -> {
                if (isProcessStillActive()) {
                    Log.w(TAG, "EXTREME VPN TERMINATION: VPN still running after 200ms, trying additional cleanup");
                    // Try one more aggressive interruption of ALL threads
                    Thread.getAllStackTraces().keySet().forEach(thread -> {
                        if (thread != Thread.currentThread()) {
                            try {
                                thread.interrupt();
                            } catch (Exception ignored) {}
                        }
                    });
                    
                    // Second check with a more drastic action
                    new android.os.Handler().postDelayed(() -> {
                        if (isProcessStillActive()) {
                            Log.e(TAG, "EXTREME VPN TERMINATION: VPN STILL RUNNING AFTER MULTIPLE CLEANUPS - FORCE KILLING PROCESS!");
                            try {
                                // Signal the plugin about imminent termination
                                if (ToyVpnPlugin.instance != null) {
                                    ToyVpnPlugin.notifyVpnStopped();
                                }
                            } catch (Exception ignored) {}
                            
                            // Absolutely final resort - kill the entire process
                            android.os.Process.killProcess(android.os.Process.myPid());
                        }
                    }, 300);
                }
            }, 200);
        } catch (Exception e) {
            Log.e(TAG, "Error setting up process kill safety mechanism", e);
        }
    }
    
    private boolean isProcessStillActive() {
        // Check if we're still receiving packets or if threads are still active
        // This is a safety mechanism to detect if cleanup failed
        try {
            // First check if executor is still active
            if (executorService != null && !executorService.isTerminated()) {
                Log.d(TAG, "EXTREME VPN TERMINATION: Executor service still active");
                return true;
            }
            
            // Check if VPN interface is still active
            if (vpnInterface != null) {
                Log.d(TAG, "EXTREME VPN TERMINATION: VPN interface still active");
                return true;
            }
            
            // More thorough thread checking - look for ANY thread related to network or VPN
            Set<Thread> threadSet = Thread.getAllStackTraces().keySet();
            for (Thread thread : threadSet) {
                // Only check other threads, not the current one
                if (thread != Thread.currentThread()) {
                    // More extensive name check including internal IDs
                    String threadName = thread.getName().toLowerCase();
                    if (threadName.contains("vpn") || 
                        threadName.contains("toy") || 
                        threadName.contains("network") || 
                        threadName.contains("packet") || 
                        threadName.contains("pool") || 
                        threadName.contains("executor") || 
                        threadName.contains("interface") || 
                        threadName.contains("tunnel")) {
                        
                        Log.d(TAG, "EXTREME VPN TERMINATION: Found active related thread: " + thread.getName());
                        return true;
                    }
                    
                    // Check thread status for potentially blocked states
                    if (thread.getState() == Thread.State.BLOCKED || 
                        thread.getState() == Thread.State.WAITING || 
                        thread.getState() == Thread.State.TIMED_WAITING) {
                        
                        // Get stack trace to check what this thread is doing
                        StackTraceElement[] stack = thread.getStackTrace();
                        for (StackTraceElement element : stack) {
                            // Check if the thread is blocked in our VPN code
                            String className = element.getClassName();
                            if (className.contains("netsniff") || 
                                className.contains("ToyVpn") || 
                                className.contains("vpn")) {
                                
                                Log.d(TAG, "EXTREME VPN TERMINATION: Found thread blocked in VPN code: " + 
                                      thread.getName() + " at " + element);
                                return true;
                            }
                        }
                    }
                }
            }
            
            // Check if running flag is still true (shouldn't be at this point)
            if (running.get()) {
                Log.d(TAG, "EXTREME VPN TERMINATION: Running flag is still true");
                return true;
            }
            
            Log.d(TAG, "EXTREME VPN TERMINATION: No active VPN processes found - all clean");
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Error checking if process is still active", e);
            // Default to false in case of error, to prevent infinite loops
            return false;
        }
    }
}

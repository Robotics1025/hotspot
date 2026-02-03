// MikroTik RouterOS API integration for FASTNET
// Note: This uses dynamic imports to avoid build issues

interface MikroTikConfig {
    host: string;
    user: string;
    password: string;
    port?: number;
}

const config: MikroTikConfig = {
    host: process.env.MIKROTIK_HOST || '192.168.88.1',
    user: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD || '',
    port: parseInt(process.env.MIKROTIK_PORT || '8728')
};

// Check if we're in demo mode
const isDemoMode = process.env.DEMO_MODE === 'true';

// Add hotspot user
export async function addHotspotUser(data: {
    username: string;
    password?: string;
    macAddress?: string;
    limitUptime?: string;
    profile?: string;
}): Promise<boolean> {
    // Demo mode
    if (isDemoMode) {
        console.log(`[DEMO] Adding hotspot user: ${data.username}`);
        return true;
    }

    try {
        // Dynamic import to avoid build issues
        const { RouterOSClient } = await import('routeros-client');
        const client = new RouterOSClient({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port
        });

        await client.connect();

        const userCommand: Record<string, string> = {
            name: data.username,
            password: data.password || generatePassword(),
            profile: data.profile || 'default'
        };

        if (data.macAddress) {
            userCommand['mac-address'] = data.macAddress;
        }

        if (data.limitUptime) {
            userCommand['limit-uptime'] = data.limitUptime;
        }

        await (client as any).write('/ip/hotspot/user/add', userCommand);
        await client.close();

        console.log(`Hotspot user ${data.username} created successfully`);
        return true;
    } catch (error) {
        console.error('Error adding hotspot user:', error);
        return false;
    }
}

// Remove hotspot user
export async function removeHotspotUser(username: string): Promise<boolean> {
    if (isDemoMode) {
        console.log(`[DEMO] Removing hotspot user: ${username}`);
        return true;
    }

    try {
        const { RouterOSClient } = await import('routeros-client');
        const client = new RouterOSClient({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port
        });

        await client.connect();

        const users = await (client as any).write('/ip/hotspot/user/print', {
            '?name': username
        });

        if (users.length > 0) {
            await (client as any).write('/ip/hotspot/user/remove', {
                '.id': users[0]['.id']
            });
            console.log(`Hotspot user ${username} removed successfully`);
        }

        await client.close();
        return true;
    } catch (error) {
        console.error('Error removing hotspot user:', error);
        return false;
    }
}

// Login user to hotspot (authorize MAC address)
export async function loginHotspotUser(data: {
    username: string;
    password: string;
    ipAddress: string;
    macAddress: string;
}): Promise<boolean> {
    if (isDemoMode) {
        console.log(`[DEMO] Authorizing user: ${data.username} at ${data.ipAddress}`);
        return true;
    }

    try {
        const { RouterOSClient } = await import('routeros-client');
        const client = new RouterOSClient({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port
        });

        await client.connect();

        await (client as any).write('/ip/hotspot/ip-binding/add', {
            address: data.ipAddress,
            'mac-address': data.macAddress,
            type: 'bypassed',
            comment: `FASTNET: ${data.username}`
        });

        await client.close();

        console.log(`User ${data.username} authorized on IP ${data.ipAddress}`);
        return true;
    } catch (error) {
        console.error('Error logging in hotspot user:', error);
        return false;
    }
}

// Remove IP binding (disconnect user)
export async function disconnectUser(macAddress: string): Promise<boolean> {
    if (isDemoMode) {
        console.log(`[DEMO] Disconnecting user with MAC: ${macAddress}`);
        return true;
    }

    try {
        const { RouterOSClient } = await import('routeros-client');
        const client = new RouterOSClient({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port
        });

        await client.connect();

        const bindings = await (client as any).write('/ip/hotspot/ip-binding/print', {
            '?mac-address': macAddress
        });

        for (const binding of bindings) {
            await (client as any).write('/ip/hotspot/ip-binding/remove', {
                '.id': binding['.id']
            });
        }

        const sessions = await (client as any).write('/ip/hotspot/active/print', {
            '?mac-address': macAddress
        });

        for (const session of sessions) {
            await (client as any).write('/ip/hotspot/active/remove', {
                '.id': session['.id']
            });
        }

        await client.close();
        return true;
    } catch (error) {
        console.error('Error disconnecting user:', error);
        return false;
    }
}

// Get active hotspot users
export async function getActiveUsers(): Promise<Array<{
    user: string;
    macAddress: string;
    ipAddress: string;
    uptime: string;
    bytesIn: string;
    bytesOut: string;
}>> {
    if (isDemoMode) {
        return [
            { user: 'demo-user-1', macAddress: 'AA:BB:CC:DD:EE:F1', ipAddress: '192.168.88.100', uptime: '2h30m', bytesIn: '150MB', bytesOut: '25MB' },
            { user: 'demo-user-2', macAddress: 'AA:BB:CC:DD:EE:F2', ipAddress: '192.168.88.101', uptime: '45m', bytesIn: '80MB', bytesOut: '10MB' },
        ];
    }

    try {
        const { RouterOSClient } = await import('routeros-client');
        const client = new RouterOSClient({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port
        });

        await client.connect();
        const active = await (client as any).write('/ip/hotspot/active/print');
        await client.close();

        return active.map((session: Record<string, string>) => ({
            user: session.user || 'unknown',
            macAddress: session['mac-address'] || '',
            ipAddress: session.address || '',
            uptime: session.uptime || '0s',
            bytesIn: session['bytes-in'] || '0',
            bytesOut: session['bytes-out'] || '0'
        }));
    } catch (error) {
        console.error('Error getting active users:', error);
        return [];
    }
}

// Generate random password
function generatePassword(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Convert hours to MikroTik uptime format
export function hoursToUptime(hours: number): string {
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }
    return `${hours}h`;
}

export default {
    addHotspotUser,
    removeHotspotUser,
    loginHotspotUser,
    disconnectUser,
    getActiveUsers,
    hoursToUptime
};

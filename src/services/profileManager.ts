import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface DaytonaProfile {
    name: string;
    url: string;
    port: number;
    apiKey: string;
    isDefault?: boolean;
}

export class ProfileManager {
    private configPath: string;

    constructor() {
        const configDir = path.join(os.homedir(), '.daytona-community', 'profiles');
        this.configPath = path.join(configDir, 'config.json');
    }

    getConfigPath(): string {
        return this.configPath;
    }

    async ensureConfigDir(): Promise<void> {
        const configDir = path.dirname(this.configPath);
        await fs.mkdir(configDir, { recursive: true });
    }

    async getProfiles(): Promise<DaytonaProfile[]> {
        try {
            await this.ensureConfigDir();
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // File doesn't exist yet, return empty array
                return [];
            }
            throw error;
        }
    }

    async profileNameExists(name: string): Promise<boolean> {
        const profiles = await this.getProfiles();
        return profiles.some(profile => profile.name.toLowerCase() === name.toLowerCase());
    }

    async addProfile(profile: DaytonaProfile): Promise<void> {
        // Check if profile name already exists
        if (await this.profileNameExists(profile.name)) {
            throw new Error(`A profile with the name "${profile.name}" already exists`);
        }

        const profiles = await this.getProfiles();
        // Set isDefault to true if this is the first profile
        profile.isDefault = profiles.length === 0;
        profiles.push(profile);
        await this.ensureConfigDir();
        await fs.writeFile(this.configPath, JSON.stringify(profiles, null, 2));
    }

    async setDefaultProfile(profileName: string): Promise<void> {
        const profiles = await this.getProfiles();
        const index = profiles.findIndex(p => 
            p.name.toLowerCase() === profileName.toLowerCase()
        );
        
        if (index === -1) {
            throw new Error(`Profile "${profileName}" not found`);
        }

        // Set all profiles to non-default
        profiles.forEach(p => p.isDefault = false);
        
        // Set selected profile as default
        profiles[index].isDefault = true;

        // Save changes
        await this.ensureConfigDir();
        await fs.writeFile(this.configPath, JSON.stringify(profiles, null, 2));

        console.log('Default profile set:', profiles[index]);        

    }

    async getDefaultProfile(): Promise<DaytonaProfile | undefined> {
        const profiles = await this.getProfiles();
        return profiles.find(p => p.isDefault);
    }

    async deleteProfileByName(name: string): Promise<void> {
        let profiles = await this.getProfiles();
        const profileExists = profiles.some(p => p.name.toLowerCase() === name.toLowerCase());
        
        if (!profileExists) {
            throw new Error(`Profile "${name}" not found`);
        }
        
        profiles = profiles.filter(p => p.name.toLowerCase() !== name.toLowerCase());
        await this.ensureConfigDir();
        await fs.writeFile(this.configPath, JSON.stringify(profiles, null, 2));
    }

    async getProfileByName(name: string): Promise<DaytonaProfile | undefined> {
        const profiles = await this.getProfiles();
        return profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
    }
}
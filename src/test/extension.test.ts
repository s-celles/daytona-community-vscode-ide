import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { ProfileManager } from '../services/profileManager';
import { ProfilesProvider } from '../providers/profilesProvider';

suite('Extension Test Suite', () => {
    let profileManager: ProfileManager;
    let profilesProvider: ProfilesProvider;
    let configPath: string;

    setup(async () => {
        // Use a test-specific config file
        configPath = path.join(os.homedir(), '.daytona-community', 'profiles', 'config.test.json');
        profileManager = new ProfileManager();
        profilesProvider = new ProfilesProvider(profileManager);

        // Clean up before each test
        try {
            await fs.unlink(configPath);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    });

    test('Command should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('daytona-community.addProfile'));
    });

    test('Should show empty profile message initially', async () => {
        const items = await profilesProvider.getChildren();
        assert.strictEqual(items.length, 1);
        assert.strictEqual(items[0].label, 'No profiles found. To get started:');
    });

    test('Should add new profile', async () => {
        const profile = {
            name: 'Test Profile',
            url: 'localhost',
            port: 3986,
            apiKey: 'test-key'
        };

        await profileManager.addProfile(profile);
        const profiles = await profileManager.getProfiles();
        
        assert.strictEqual(profiles.length, 1);
        assert.deepStrictEqual(profiles[0], profile);
    });

    test('Should update tree view after adding profile', async () => {
        const profile = {
            name: 'Test Profile',
            url: 'localhost',
            port: 3986,
            apiKey: 'test-key'
        };

        await profileManager.addProfile(profile);
        const items = await profilesProvider.getChildren();
        
        assert.strictEqual(items.length, 1);
        assert.strictEqual(items[0].label, profile.name);
        assert.strictEqual(items[0].description, profile.url);
    });


    test('Should delete profile by name', async () => {
        const profile = {
            name: 'Test Profile',
            url: 'localhost',
            port: 3986,
            apiKey: 'test-key'
        };

        await profileManager.addProfile(profile);
        await profileManager.deleteProfileByName(profile.name);
        const profiles = await profileManager.getProfiles();
        
        assert.strictEqual(profiles.length, 0);
    });

    test('Should handle case-insensitive profile deletion', async () => {
        const profile = {
            name: 'Test Profile',
            url: 'localhost',
            port: 3986,
            apiKey: 'test-key'
        };

        await profileManager.addProfile(profile);
        await profileManager.deleteProfileByName('TEST PROFILE');
        const profiles = await profileManager.getProfiles();
        
        assert.strictEqual(profiles.length, 0);
    });

    test('Should throw error when deleting non-existent profile', async () => {
        await assert.rejects(
            async () => await profileManager.deleteProfileByName('Non Existent Profile'),
            Error,
            'Profile "Non Existent Profile" not found'
        );
    });

    test('Should handle deletion of default profile', async () => {
        const profile = {
            name: 'Test Profile',
            url: 'localhost',
            port: 3986,
            apiKey: 'test-key',
            isDefault: true
        };

        await profileManager.addProfile(profile);
        await profileManager.deleteProfileByName(profile.name);
        const profiles = await profileManager.getProfiles();
        
        assert.strictEqual(profiles.length, 0);
        const defaultProfile = await profileManager.getDefaultProfile();
        assert.strictEqual(defaultProfile, undefined);
    });

    test('Should set first profile as default', async () => {
        const profile1 = {
            name: 'First Profile',
            url: 'localhost',
            port: 3986,
            apiKey: 'test-key'
        };
    
        const profile2 = {
            name: 'Second Profile',
            url: 'localhost',
            port: 3987,
            apiKey: 'test-key-2'
        };
    
        await profileManager.addProfile(profile1);
        await profileManager.addProfile(profile2);
        
        const profiles = await profileManager.getProfiles();
        assert.strictEqual(profiles.length, 2);
        assert.strictEqual(profiles[0].isDefault, true);
        assert.strictEqual(profiles[1].isDefault, false);
    });
    
    test('TreeItem should show default profile in bold', async () => {
        const profile = {
            name: 'Test Profile',
            url: 'localhost',
            port: 3986,
            apiKey: 'test-key'
        };
    
        await profileManager.addProfile(profile);
        const items = await profilesProvider.getChildren();
        
        assert.strictEqual(items.length, 1);
        // Ensure it's a TreeItemLabel object and not a string
        assert.ok(typeof items[0].label === 'object' && items[0].label !== null);
        const label = items[0].label as vscode.TreeItemLabel;
        assert.ok(Array.isArray(label.highlights));
        assert.deepStrictEqual(label.highlights, [[0, profile.name.length]]);
    });

});
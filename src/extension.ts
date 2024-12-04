import * as vscode from 'vscode';
import { spawn, execSync } from 'child_process';
import { ProfileManager } from './services/profileManager';
import { WorkspaceManager } from './services/workspaceManager';
import { ProfilesProvider } from './providers/profilesProvider';
import { WorkspacesProvider } from './providers/workspacesProvider';
import { SamplesProvider } from './providers/samplesProvider';
import { extractRepoName, generateUniqueName } from './services/workspaceManager';
import { ApiService } from './services/apiService';
import { CreateWorkspaceRequest } from './services/apiService';
import { promisify } from 'util';
import * as path from 'path';
import { TreeDataProvider } from 'vscode';
import { HelpTreeProvider } from './providers/helpTreeItem';

export function activate(context: vscode.ExtensionContext) {
    console.log('Daytona Community extension is now active!');

    
    // Initialize managers and providers
    const profileManager = new ProfileManager();
    //const workspaceManager = new WorkspaceManager();

    // Subscribe to configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async () => {
            const profiles = await profileManager.getProfiles();
            vscode.commands.executeCommand('setContext', 'hasProfiles', profiles.length > 0);
        })
    );

    // Initial context setup for hasProfiles
    profileManager.getProfiles().then(profiles => {
        vscode.commands.executeCommand('setContext', 'hasProfiles', profiles.length > 0);
    });

    const profilesProvider = new ProfilesProvider(profileManager);

    // Register tree data providers
    vscode.window.registerTreeDataProvider('daytonaProfiles', profilesProvider);

    // Register the addProfile command
    const addProfile = vscode.commands.registerCommand('daytona-community.addProfile', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Profile name',
            placeHolder: 'Press \'Enter\' to confirm or \'Escape\' to cancel'
        });
        
        if (name) {
            const url = await vscode.window.showInputBox({
                prompt: 'Server URL', 
                value: 'localhost'
            });
            const portStr = await vscode.window.showInputBox({
                prompt: 'Port', 
                value: '3986'
            });
            const apiKey = await vscode.window.showInputBox({
                prompt: 'API Key',
                password: true
            });
        
            if (url && portStr && apiKey) {
                await profileManager.addProfile({
                    name,
                    url,
                    port: parseInt(portStr),
                    apiKey
                });
                // Refresh the tree view to show the new profile
                profilesProvider.refresh();
            }
        }
    });
    
    // Register commands in subscriptions
    context.subscriptions.push(addProfile);


    // Command for deleting profile directly from tree view
    const deleteProfileCommand = vscode.commands.registerCommand(
        'daytona-community.deleteProfile',
        async (item: vscode.TreeItem) => {
            if (!item.label || typeof item.label !== 'string') {
                return;
            }

            const profileName = item.label;
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete the profile "${profileName}"?`,
                { modal: true },
                'Yes',
                'No'
            );

            if (answer === 'Yes') {
                try {
                    await profileManager.deleteProfileByName(profileName);
                    vscode.window.showInformationMessage(`Profile "${profileName}" deleted successfully`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to delete profile`);
                }
                profilesProvider.refresh();
            }
        }
    );

    // Command for deleting profile by name via command palette
    const deleteProfileByNameCommand = vscode.commands.registerCommand(
        'daytona-community.deleteProfileByName',
        async () => {
            const profiles = await profileManager.getProfiles();
            const profileNames = profiles.map(p => p.name);

            if (profileNames.length === 0) {
                vscode.window.showInformationMessage('No profiles exist to delete');
                return;
            }

            const selectedName = await vscode.window.showQuickPick(profileNames, {
                placeHolder: 'Select a profile to delete'
            });

            if (!selectedName) {
                return;
            }

            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete the profile "${selectedName}"?`,
                { modal: true },
                'Yes',
                'No'
            );

            if (answer === 'Yes') {
                try {
                    await profileManager.deleteProfileByName(selectedName);
                    profilesProvider.refresh();
                    vscode.window.showInformationMessage(`Profile "${selectedName}" deleted successfully`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to delete profile`);
                }
            }
        }
    );

    // Register the setDefaultProfile command 
    const setDefaultProfile = vscode.commands.registerCommand(
        'daytona-community.setDefaultProfile',
        async (item: vscode.TreeItem) => {
            if (!item.label) {
                return;
            }

            const profileName = typeof item.label === 'string' 
                ? item.label 
                : item.label.label;

            try {
                await profileManager.setDefaultProfile(profileName);
                profilesProvider.refresh();
                vscode.window.showInformationMessage(`Set "${profileName}" as default profile`);
                samplesProvider.refresh();
                workspacesProvider.refresh();
                
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to set default profile`);
            }
        }
    );

    // Register edit profile command
    const editProfile = vscode.commands.registerCommand(
        'daytona-community.editProfile',
        async (item: vscode.TreeItem) => {
            if (!item.label || typeof item.label !== 'string') {
                return;
            }

            const configPath = profileManager.getConfigPath();
            try {
                const document = await vscode.workspace.openTextDocument(configPath);
                await vscode.window.showTextDocument(document);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open profile configuration: ${error}`);
            }
        }
    );

    // Register delete profile config command
    const deleteProfileConfig = vscode.commands.registerCommand(
        'daytona-community.deleteProfileConfig',
        async (item: vscode.TreeItem) => {
            if (!item.label || typeof item.label !== 'string') {
                return;
            }

            const profileName = item.label;
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete the profile "${profileName}"?`,
                { modal: true },
                'Yes',
                'No'
            );

            if (answer === 'Yes') {
                try {
                    await profileManager.deleteProfileByName(profileName);
                    profilesProvider.refresh();
                    vscode.window.showInformationMessage(
                        `Profile "${profileName}" deleted successfully`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to delete profile`);
                }
            }
        }
    );

    // Add to subscriptions
    context.subscriptions.push(setDefaultProfile);

    // Add both commands to subscriptions
    context.subscriptions.push(deleteProfileCommand, deleteProfileByNameCommand);

    // Add commands to subscriptions
    context.subscriptions.push(editProfile, deleteProfileConfig);

    // Register workspaces provider
    const workspacesProvider = new WorkspacesProvider(profileManager);
    vscode.window.registerTreeDataProvider('daytonaWorkspaces', workspacesProvider);

    const addWorkspace = vscode.commands.registerCommand('daytona-community.addWorkspace', async () => {
        // First get Git repository URL
        const gitUrl = await vscode.window.showInputBox({
            prompt: 'Git repository URL',
            placeHolder: 'https://github.com/user/repo.git',
            validateInput: (value) => {
                // Basic URL validation
                if (!value) {
                    return 'Repository URL is required';
                }
                if (!value.includes('/')) {
                    return 'Invalid repository URL format';
                }
                return null;
            }
        });
    
        if (!gitUrl) {
            return;
        }
    
        try {
            const workspaceManager = new WorkspaceManager(profileManager);
            
            // Get existing workspaces to check for name conflicts
            const existingWorkspaces = await workspaceManager.getWorkspaces();
            
            // Extract base name from URL and generate unique name
            const baseName = extractRepoName(gitUrl);
            const uniqueName = await generateUniqueName(baseName, existingWorkspaces);
    
            // Get target (optional)
            //const target = await vscode.window.showInputBox({
            //    prompt: 'Target (optional)',
            //    placeHolder: 'Press Enter to skip'
            //});
    
            await workspaceManager.createWorkspace({
                name: uniqueName,
                gitUrl,
            });
            
            vscode.window.showInformationMessage(`Workspace "${uniqueName}" created successfully`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create workspace: ${error}`);
        }

        // Refresh the tree view to show the new workspace
        workspacesProvider.refresh();
    });

    const deleteWorkspace = vscode.commands.registerCommand(
        'daytona-community.deleteWorkspace',
        async (item: vscode.TreeItem) => {
            if (!item.label || typeof item.label !== 'string' || !item.id) {
                vscode.window.showErrorMessage('Invalid workspace selected');
                return;
            }
    
            const workspaceName = item.label;
            const workspaceId = item.id;
    
            // Ask for confirmation with force option
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete the workspace "${workspaceName}"?`,
                { modal: true },
                'Yes (Force)',
                'Yes',
                'No'
            );
    
            if (answer === 'Yes' || answer === 'Yes (Force)') {
                try {
                    const defaultProfile = await profileManager.getDefaultProfile();
                    if (!defaultProfile) {
                        throw new Error('No default profile selected');
                    }
    
                    const apiService = new ApiService(defaultProfile);
                    await apiService.deleteWorkspace(workspaceId, answer === 'Yes (Force)');
                    
                    vscode.window.showInformationMessage(
                        `Workspace "${workspaceName}" deleted successfully`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to delete workspace "${workspaceName}": ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }

                // Refresh the workspaces view
                workspacesProvider.refresh();
            }
        }
    );

    // Register commands in subscriptions
    context.subscriptions.push(addWorkspace);
    context.subscriptions.push(deleteWorkspace);

    // Register samples provider
    const samplesProvider = new SamplesProvider(profileManager);
    vscode.window.registerTreeDataProvider('daytonaSamples', samplesProvider);

    // Register openWorkspace command
    const openWorkspace = vscode.commands.registerCommand(
        'daytona-community.openWorkspace',
        async (item: any) => {
            if (!item.name) {
                vscode.window.showErrorMessage('Invalid workspace selected');
                return;
            }

            const workspaceName = item.name;
            
            vscode.window.showInformationMessage(`Opening workspace "${workspaceName}"...`);

        }
    );

    // Add to subscriptions
    context.subscriptions.push(openWorkspace);

    // Register cloneSample command
    const cloneSample = vscode.commands.registerCommand(
        'daytona-community.cloneSample',
        //async (item: any) => {
        async (item: any) => {
            if (!item.name) {
                vscode.window.showErrorMessage('Invalid sample selected');
                return;
            }

            console.log('Item:', item);

            try {
                const workspaceManager = new WorkspaceManager(profileManager);
                const defaultProfile = await profileManager.getDefaultProfile();
                if (!defaultProfile) {
                    throw new Error('No default profile selected');
                }

                const apiService = new ApiService(defaultProfile);
                
                // Get existing workspaces to check for name conflicts
                const existingWorkspaces = await workspaceManager.getWorkspaces();
                const uniqueName = await generateUniqueName(extractRepoName(item.gitUrl), existingWorkspaces);

                // Get target using WorkspaceManager's selectTarget
                const targetName = await workspaceManager.selectTarget(apiService);

                const request: CreateWorkspaceRequest = {
                    name: uniqueName,
                    gitUrl: item.gitUrl,
                    target: targetName
                };

                apiService.createWorkspace(request);
                vscode.window.showInformationMessage(`Sample workspace "${uniqueName}" created successfully`);

            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to clone sample: ${message}`);
            }

            workspacesProvider.refresh();

        }
    );

    // Add to subscriptions
    context.subscriptions.push(cloneSample);

    // Register help tree provider
    const helpProvider = new HelpTreeProvider();
    vscode.window.registerTreeDataProvider('daytonaHelp', helpProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
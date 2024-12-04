import * as vscode from 'vscode';
import { ApiService, Workspace } from './apiService';
import { ProfileManager } from './profileManager';
import { CreateWorkspaceRequest, WorkspaceResponse } from './apiService';

// Helper function to extract repository name from Git URL
export function extractRepoName(gitUrl: string): string {
    // Handle different URL formats:
    // - https://github.com/user/repo.git
    // - git@github.com:user/repo.git
    // - https://github.com/user/repo
    try {
        let repoName = '';
        if (gitUrl.includes('://')) {
            // Handle HTTPS URLs
            const parts = gitUrl.split('/');
            repoName = parts[parts.length - 1].replace('.git', '');
        } else if (gitUrl.includes('@')) {
            // Handle SSH URLs
            const parts = gitUrl.split(':')[1];
            repoName = parts.split('/')[1].replace('.git', '');
        }
        return repoName || 'workspace'; // Fallback name if parsing fails
    } catch (error) {
        return 'workspace'; // Default fallback
    }
}

// Helper function to generate unique name based on existing workspaces
export async function generateUniqueName(
    baseName: string,
    existingWorkspaces: Workspace[]
): Promise<string> {
    const existingNames = new Set(existingWorkspaces.map(w => w.name));

    // If the base name is available, use it
    if (!existingNames.has(baseName)) {
        return baseName;
    }

    // Try adding numbers until we find an available name
    let counter = 2;
    while (existingNames.has(`${baseName}${counter}`)) {
        counter++;
    }
    return `${baseName}${counter}`;
}

export class WorkspaceManager {
    constructor(private profileManager: ProfileManager) {}

    async getWorkspaces(): Promise<Workspace[]> {
        const defaultProfile = await this.profileManager.getDefaultProfile();
        if (!defaultProfile) {
            throw new Error('No default profile selected');
        }

        const apiService = new ApiService(defaultProfile);
        return apiService.getWorkspaces();
    }

    async selectTarget(apiService: ApiService): Promise<string> {
        // Get available targets
        const targets = await apiService.getTargets();
        if (!targets || targets.length === 0) {
            throw new Error('No targets available');
        }

        // Create QuickPick items from targets
        const targetItems = targets.map(target => ({
            label: target.name,
            description: target.isDefault ? '(Default)' : '',
            detail: `Provider: ${target.providerInfo.name} (${target.providerInfo.version})`,
            target: target
        }));

        // Show QuickPick for target selection
        const selectedItem = await vscode.window.showQuickPick(targetItems, {
            placeHolder: 'Select a target for the workspace',
            title: 'Available Targets'
        });

        if (!selectedItem) {
            throw new Error('Target selection cancelled');
        }

        return selectedItem.target.name;
    }

    async createWorkspace(params: {
        name: string;
        gitUrl: string;
    }): Promise<WorkspaceResponse> {
        const defaultProfile = await this.profileManager.getDefaultProfile();
        if (!defaultProfile) {
            throw new Error('No default profile selected. Please set a default profile first.');
        }

        const apiService = new ApiService(defaultProfile);
        
        // Get target selection from user
        const targetName = await this.selectTarget(apiService);

        // Convert to API request format with selected target
        const request: CreateWorkspaceRequest = {
            name: params.name,
            gitUrl: params.gitUrl,
            target: targetName
        };

        return apiService.createWorkspace(request);
    }
}
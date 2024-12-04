import * as vscode from 'vscode';
import { ProfileManager } from '../services/profileManager';

export class ProfilesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private profileManager: ProfileManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
        this.profileManager.getProfiles().then(profiles => {
            vscode.commands.executeCommand('setContext', 'hasProfiles', profiles.length > 0);
        });
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        // Add command that will be executed on click
        element.command = {
            command: 'daytona-community.setDefaultProfile',
            title: 'Set as Default Profile',
            arguments: [element]
        };
        return element;
    }

    async getChildren(): Promise<vscode.TreeItem[]> {
        const profiles = await this.profileManager.getProfiles();
        
        return profiles.map(profile => {
            const item = new vscode.TreeItem(
                profile.name,
                vscode.TreeItemCollapsibleState.None
            );
            item.tooltip = new vscode.MarkdownString(
                `**${profile.name}**\n\nUrl: ${profile.url}\n\nPort: ${profile.port}`
            );
            
            // Set description to show (Default) indicator
            item.description = profile.isDefault ? '(Default)' : '';

            // Make default profile bold using ThemeIcon
            if (profile.isDefault) {
                item.label = {
                    label: profile.name,
                    highlights: [[0, profile.name.length]]  // Highlight entire name
                };
            }
            
            // Important: Set the contextValue for menu items to work
            item.contextValue = 'profile';
            item.iconPath = new vscode.ThemeIcon('account');
            
            return item;
        });
    }
}
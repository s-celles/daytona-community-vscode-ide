import * as vscode from 'vscode';
//import { Project } from '../services/apiService';
import { ProfileManager } from '../services/profileManager';
import { ApiService } from '../services/apiService';

export class WorkspacesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private profileManager: ProfileManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<vscode.TreeItem[]> {
        try {
            const defaultProfile = await this.profileManager.getDefaultProfile();
            
            if (!defaultProfile) {
                return [new vscode.TreeItem(
                    'Please select a default profile to view workspaces',
                    vscode.TreeItemCollapsibleState.None
                )];
            }
    
            const apiService = new ApiService(defaultProfile);
            const workspaces = await apiService.getWorkspaces();
    
            if (workspaces.length === 0) {
                return [new vscode.TreeItem(
                    'No workspaces found',
                    vscode.TreeItemCollapsibleState.None
                )];
            }
    
            return workspaces.map(workspace => {
                const item = new vscode.TreeItem(
                    workspace.name,
                    vscode.TreeItemCollapsibleState.None
                );
    
                let projectsList = '';
                if (workspace.projects && Array.isArray(workspace.projects)) {
                    projectsList = workspace.projects
                        .map(project => ` - ${project.name || project}`)
                        .join('\n');
                }
    
                item.tooltip = new vscode.MarkdownString(
                    `**${workspace.name}**\n\n` +
                    `ID: ${workspace.id}\n\n` +
                    `Target: ${workspace.target}\n\n` +
                    `Info: ${workspace.info}\n\n` +
                    `Projects:\n${projectsList || ' No projects'}`
                );
    
                // Store workspace ID in the item's id property
                item.id = workspace.id;
                
                item.contextValue = 'workspace';
                item.iconPath = new vscode.ThemeIcon('vm');
                
                item.command = {
                    command: 'daytona-community.openWorkspace',
                    title: 'Open Workspace',
                    arguments: [workspace]
                };
                
                return item;
            });
        } catch (error) {
            return [new vscode.TreeItem(
                'Error loading workspaces',
                vscode.TreeItemCollapsibleState.None
            )];
        }
    }
}
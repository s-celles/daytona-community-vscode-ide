import * as vscode from 'vscode';
import { ProfileManager } from '../services/profileManager';
import { ApiService, Sample } from '../services/apiService';

export class SamplesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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
                    'Please select a default profile to view samples',
                    vscode.TreeItemCollapsibleState.None
                )];
            }

            const apiService = new ApiService(defaultProfile);
            const samples = await apiService.getSamples();

            if (samples.length === 0) {
                return [new vscode.TreeItem(
                    'No sample projects available',
                    vscode.TreeItemCollapsibleState.None
                )];
            }

            return samples.map(sample => {
                const item = new vscode.TreeItem(
                    sample.name,
                    vscode.TreeItemCollapsibleState.None
                );
                item.description = sample.description;
                item.tooltip = new vscode.MarkdownString(
                    `**${sample.name}**\n\n` +
                    `${sample.description}\n\n` +
                    `Repository: ${sample.gitUrl}`
                );
                item.contextValue = 'sample';
                item.iconPath = new vscode.ThemeIcon('repo');
                
                item.command = {
                    command: 'daytona-community.cloneSample',
                    title: 'Clone Sample',
                    arguments: [sample]
                };
                
                return item;
            });
        } catch (error) {
            return [new vscode.TreeItem(
                'Error loading samples',
                vscode.TreeItemCollapsibleState.None
            )];
        }
    }
}
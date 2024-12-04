import * as vscode from 'vscode';
import { Sample } from '../services/apiService';

export async function handleCloneSample(sample: Sample): Promise<void> {
    try {
        const workspaceUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Clone Location',
            title: 'Select where to clone the sample project'
        });

        if (!workspaceUri) {
            return;
        }

        // TODO: Implement actual clone logic
        vscode.window.showInformationMessage(
            `Will clone ${sample.name} to ${workspaceUri[0].fsPath}`
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to clone sample: ${error}`);
    }
}
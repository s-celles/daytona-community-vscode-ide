import * as vscode from 'vscode';

export class HelpTreeItem extends vscode.TreeItem {
    constructor() {
        super('Help and Feedback', vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('question');
    }
}

export class HelpLinkItem extends vscode.TreeItem {
    constructor(label: string, url: string, icon: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: 'vscode.open',
            title: 'Open',
            arguments: [vscode.Uri.parse(url)]
        };
        this.iconPath = new vscode.ThemeIcon(icon);
    }
}

export class HelpTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            return Promise.resolve([
                new HelpLinkItem('Documentation', 'https://docs.daytona.io/', 'book'),
                new HelpLinkItem('Getting Started', 'https://www.daytona.io/docs/about/getting-started/', 'rocket'),
                new HelpLinkItem('Daytona Website', 'https://daytona.io', 'globe'),
                new HelpLinkItem('GitHub Repository', 'https://github.com/daytonaio/daytona', 'github'),
                new HelpLinkItem('Report Issue', 'https://github.com/daytonaio/daytona/issues/new', 'bug')
            ]);
        }
        return Promise.resolve([]);
    }
}

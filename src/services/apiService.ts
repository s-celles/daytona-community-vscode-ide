import * as vscode from 'vscode';
import { DaytonaProfile } from './profileManager';
import axios, { AxiosInstance } from 'axios';
import { generateUniqueName } from './workspaceManager';
import { randomUUID } from 'crypto';

export interface Repository {
    url: string;
    branch: string;
    id: string;
    name: string;
    owner: string;
    sha: string;
    source: string;
}

export interface Source {
    repository: Repository;
}

export interface Project {
    name: string;
    //image: string;
    //user: string;
    //repository: Repository;
    source: Source;
    envVars: object;  // TOFIX: should be an object
    //workspaceId: string;
    //target: string;
    //gitProviderConfigId: string;
}

export interface Sample {
    id: string;
    name: string;
    description: string;
    gitUrl: string;
}

export interface Workspace {
    id: string;
    name: string;
    projects: Project[];
    target: string;
    info: string;
}

interface CreateWorkspaceDTO {
    id: string;           // Required unique identifier
    name: string;         // Workspace name
    projects: Project[];  // Array of project configurations
    target: string;       // Target configuration
}

export interface CreateWorkspaceRequest {
    name: string;           // Workspace name
    gitUrl: string;        // Git repository URL (required)
    target?: string;       // Optional target configuration
}

export interface WorkspaceResponse {
    id: string;
    name: string;
    projects: Project[];
    target?: string;
    info?: string;
}

interface ProviderInfo {
    name: string;
    version: string;
    label?: string | null;
  }
  
interface Target {
    name: string;
    isDefault: boolean;
    options: string; // Can be JSON string or error message
    providerInfo: ProviderInfo;
}


/*
function generateUniqueId(): string {
    return Array(64).fill(0).map(() => 
        Math.random().toString(36).charAt(2)
    ).join('');
}
*/

function generateUniqueId(): string {
    return Array(12).fill(0).map(() => 
        Math.random().toString(36).charAt(2)
    ).join('');
}

export class ApiService {
    private client: AxiosInstance;

    constructor(private readonly profile: DaytonaProfile) {
        this.client = axios.create({
            baseURL: `http://${this.profile.url}:${this.profile.port}`,
            headers: {
                'Authorization': `Bearer ${this.profile.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // Increased timeout to 10 seconds
        });

        // Enhanced error handling
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.response) {
                    // Get detailed error message from response if available
                    const errorMessage = error.response.data?.message || 
                                       error.response.data?.error || 
                                       'Unknown error';
                    
                    // Log detailed error information for debugging
                    console.error('API Error Details:', {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        message: errorMessage,
                        data: error.response.data,
                        url: error.config.url,
                        method: error.config.method,
                        params: error.config.params,
                        headers: error.config.headers
                    });

                    // Show user-friendly error message
                    vscode.window.showErrorMessage(
                        `API error (${error.response.status}): ${errorMessage}`
                    );
                } else if (error.request) {
                    console.error('Network Error:', error.message);
                    vscode.window.showErrorMessage(
                        'Unable to connect to server. Please check your connection and profile settings.'
                    );
                } else {
                    console.error('Request Configuration Error:', error.message);
                    vscode.window.showErrorMessage(
                        `Request failed: ${error.message}`
                    );
                }
                throw error;
            }
        );
    }

    async getSamples(): Promise<Sample[]> {
        try {
            const response = await this.client.get<Sample[]>('/sample');
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to fetch samples');
            throw error;
        }
    }

    async getWorkspaces(): Promise<Workspace[]> {
        try {
            const response = await this.client.get<Workspace[]>('/workspace');
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to fetch workspaces');
            throw error;
        }
    }

    async getTargets(): Promise<Target[]> {
        try {
            const response = await this.client.get<Target[]>('/target');
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to fetch targets');
            throw error;
        }
    }

    async createWorkspace(params: CreateWorkspaceRequest): Promise<WorkspaceResponse> {
        try {
            // Validate required fields
            if (!params.name) {
                throw new Error('Workspace name is required');
            }
            if (!params.gitUrl) {
                throw new Error('Git repository URL is required');
            }

            // Clean and validate URL
            const gitUrl = params.gitUrl.trim();
            if (!gitUrl.includes('/')) {
                throw new Error('Invalid Git repository URL format');
            }

            // Prepare the workspace DTO with all required fields
            let id = generateUniqueId();
            const projects: Project[] = [
                {
                    name: 'project1',
                    source: {
                        repository: {
                            url: gitUrl,
                            branch: 'main',
                            id: id,
                            name: 'my-repo',
                            owner: 'my-org',
                            sha: '123',
                            source: 'github',
                        }
                    },
                    envVars: {}
                }
            ];
            const workspaceDto: CreateWorkspaceDTO = {
                id: id,
                name: params.name,
                projects: projects,
                target: params.target || 'default',
            };

            // Make API request with properly formatted payload
            const response = await this.client.post<WorkspaceResponse>(
                '/workspace', 
                workspaceDto
            );

            return response.data;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 400) {
                    const errorMessage = error.response.data?.message || 
                        'Invalid workspace configuration. Please verify your input.';
                    throw new Error(errorMessage);
                } else if (error.response?.status === 401) {
                    throw new Error('Authentication failed. Please check your API key.');
                } else if (error.response?.status === 409) {
                    throw new Error('A workspace with this name already exists.');
                }
            }
            throw error;
        }
    }

    async deleteWorkspace(workspaceId: string, force: boolean = false): Promise<void> {
        try {
            // Build query string for optional force parameter
            const queryString = force ? '?force=true' : '';
            
            await this.client.delete(`/workspace/${workspaceId}${queryString}`);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to delete workspace');
            throw error;
        }
    }

}

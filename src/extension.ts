'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext, TextDocumentContentProvider, EventEmitter, Event, Uri, TextDocument, ViewColumn } from "vscode";
var http = require('http');

export function activate(context: vscode.ExtensionContext) {
    let provider = new JekyllDocumentContentProvider(context);
    let registration = vscode.workspace.registerTextDocumentContentProvider('jekyll', provider);

    let d1 = vscode.commands.registerCommand('extension.previewJekyll', () => openPreview());
    let d2 = vscode.commands.registerCommand('extension.previewJekyllSide', () => openPreview(true));

    context.subscriptions.push(d1, d2, registration);
}

function openPreview(sideBySide?: boolean): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.commands.executeCommand('workbench.action.navigateBack');
        return;
    }

    let markdownPreviewUri = Uri.parse(`jekyll://${activeEditor.document.uri.path}`);
    vscode.commands.executeCommand('vscode.previewHtml', markdownPreviewUri, getViewColumn(sideBySide));
}

function getViewColumn(sideBySide): ViewColumn {
    const active = vscode.window.activeTextEditor;
    if (!active) {
        return ViewColumn.One;
    }

    if (!sideBySide) {
        return active.viewColumn;
    }

    switch (active.viewColumn) {
        case ViewColumn.One:
            return ViewColumn.Two;
        case ViewColumn.Two:
            return ViewColumn.Three;
    }

    return active.viewColumn;
}



// this method is called when your extension is deactivated
export function deactivate() {
}

class JekyllDocumentContentProvider implements TextDocumentContentProvider {
    private context;
    private _onDidChange = new EventEmitter<Uri>();

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    private getMediaPath(mediaFile) {
        return this.context.asAbsolutePath(path.join('media', mediaFile));
    }

    private fixHref(resource: Uri, href: string) {
        if (href) {
            // Return early if href is already a URL
            if (Uri.parse(href).scheme) {
                return href;
            }
            // Otherwise convert to a file URI by joining the href with the resource location
            return Uri.file(path.join(path.dirname(resource.fsPath), href)).toString();
        }
        return href;
    }


    public provideTextDocumentContent(uri: Uri): Thenable<string> {
        return new Promise((approve, reject) => {
            var options = {
                host: '127.0.0.1',
                port: '4000',
                path: '/'
            }
            var request = http.request(options, function (res) {
                var data = '';
                res.on('data', function (chunk) {
                    data += chunk;
                });
                res.on('end', function () {
                    approve(data);
                });
            });
            request.on('error', function (e) {
                reject(e.message);
            });
            request.end();
        });
    }

    get onDidChange(): Event<Uri> {
        return this._onDidChange.event;
    }

    public update(uri: Uri) {
        this._onDidChange.fire(uri);
    }
}

import * as vscode from 'vscode';

// Import validation functions
// Note: In production, these would be bundled. For now we import directly.

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('fetchtype');
  context.subscriptions.push(diagnosticCollection);

  // Validate on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (isTokenFile(document)) {
        validateDocument(document);
      }
    })
  );

  // Validate on open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isTokenFile(document)) {
        validateDocument(document);
      }
    })
  );

  // Validate all open token files on activation
  vscode.workspace.textDocuments.forEach((document) => {
    if (isTokenFile(document)) {
      validateDocument(document);
    }
  });

  // Register code actions for quick fixes
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { pattern: '**/*.tokens.json' },
      new FetchtypeCodeActionProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );
}

export function deactivate() {
  diagnosticCollection?.dispose();
}

function isTokenFile(document: vscode.TextDocument): boolean {
  return document.fileName.endsWith('.tokens.json') ||
         document.fileName === 'tokens.json';
}

async function validateDocument(document: vscode.TextDocument) {
  try {
    const text = document.getText();
    const parsed = JSON.parse(text);

    // Dynamic import to avoid bundling issues
    const { validateDesignTokenSet, validateFonts, parseDesignTokenSet } = await import('@fetchtype/core');

    const report = validateDesignTokenSet(parsed);

    // Try font validation too
    try {
      const tokenSet = parseDesignTokenSet(parsed);
      const fontDiags = validateFonts(tokenSet);
      report.diagnostics.push(...fontDiags);
    } catch {
      // Ignore font validation failures
    }

    const diagnostics: vscode.Diagnostic[] = report.diagnostics.map((diag) => {
      const range = findRangeForPath(document, diag.path);
      const severity = diag.severity === 'error'
        ? vscode.DiagnosticSeverity.Error
        : diag.severity === 'warning'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

      const diagnostic = new vscode.Diagnostic(range, diag.message, severity);
      diagnostic.source = 'fetchtype';
      diagnostic.code = diag.rule;
      return diagnostic;
    });

    diagnosticCollection.set(document.uri, diagnostics);
  } catch {
    // Invalid JSON — clear diagnostics
    diagnosticCollection.set(document.uri, []);
  }
}

function findRangeForPath(document: vscode.TextDocument, path: string): vscode.Range {
  // Try to find the JSON key in the document
  if (!path || path === '<root>') {
    return new vscode.Range(0, 0, 0, 0);
  }

  const segments = path.split('.');
  const lastSegment = segments[segments.length - 1];
  const text = document.getText();

  // Search for the key in quotes
  const searchPattern = `"${lastSegment}"`;
  const index = text.indexOf(searchPattern);

  if (index >= 0) {
    const position = document.positionAt(index);
    return new vscode.Range(position, position.translate(0, searchPattern.length));
  }

  return new vscode.Range(0, 0, 0, 0);
}

class FetchtypeCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'fetchtype') continue;

      // Add quick fix suggestions based on rule
      if (diagnostic.code === 'font.display-strategy') {
        const fix = new vscode.CodeAction(
          'Set fontDisplay to "swap"',
          vscode.CodeActionKind.QuickFix
        );
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;
        actions.push(fix);
      }

      if (diagnostic.code === 'color.dark-mode') {
        const fix = new vscode.CodeAction(
          'Add dark mode color tokens',
          vscode.CodeActionKind.QuickFix
        );
        fix.diagnostics = [diagnostic];
        actions.push(fix);
      }
    }

    return actions;
  }
}

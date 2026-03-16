import type { ValidationReport } from '@fetchtype/types';

export type SarifLog = {
  $schema: string;
  version: string;
  runs: SarifRun[];
};

type SarifRun = {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
};

type SarifRule = {
  id: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: string };
};

type SarifResult = {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number };
    };
  }>;
};

function toSarifLevel(severity: 'error' | 'warning' | 'info'): 'error' | 'warning' | 'note' {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'note';
}

export function formatSarifReport(report: ValidationReport, tokenFilePath: string): SarifLog {
  // Deduplicate rules from diagnostics
  const ruleMap = new Map<string, SarifRule>();
  for (const diagnostic of report.diagnostics) {
    if (!ruleMap.has(diagnostic.rule)) {
      ruleMap.set(diagnostic.rule, {
        id: diagnostic.rule,
        shortDescription: { text: diagnostic.message },
        defaultConfiguration: { level: toSarifLevel(diagnostic.severity) },
      });
    }
  }

  const rules = Array.from(ruleMap.values());

  const results: SarifResult[] = report.diagnostics.map((diagnostic) => {
    const messageParts = [diagnostic.message];
    if (diagnostic.path) {
      messageParts.push(`path: ${diagnostic.path}`);
    }
    if (diagnostic.actual) {
      messageParts.push(`actual: ${diagnostic.actual}`);
    }
    if (diagnostic.expected) {
      messageParts.push(`expected: ${diagnostic.expected}`);
    }

    return {
      ruleId: diagnostic.rule,
      level: toSarifLevel(diagnostic.severity),
      message: { text: messageParts.join('; ') },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: tokenFilePath },
          },
        },
      ],
    };
  });

  return {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'fetchtype',
            version: '0.0.0',
            informationUri: 'https://fetchtype.com',
            rules,
          },
        },
        results,
      },
    ],
  };
}

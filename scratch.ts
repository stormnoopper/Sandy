import { fixMermaidQuotedLabels } from './lib/mermaid-quote-fix'

const source1 = `graph TD;
  A[Admin] --> B((Start));
  B --> C{Check};
  C -->|Yes| D[(Database)];
  D --> E[[Subroutine]];
  E --> F{{Hexagon}};
`

console.log(fixMermaidQuotedLabels(source1));
